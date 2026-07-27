import {
  extractLinkedMarkdownPaths,
  parseApiResourcePage,
  parseCatalogDocument,
  parseOpenDataFeed,
  readTarTextFiles,
  type CatalogItem,
} from "./catalog";
import { parsePublicDetailPage, parseSitemapUrls } from "./feed";
import { runSeoAudit } from "./seo";
import { syncEntertainmentLatest } from "./entertainment";
import { syncMagnetSearchCache } from "./magnet";
import {
  discoverGeoKeywords,
  getGeoPipelineStatus,
  runGeoPipeline,
  runRequestedGeoPipeline,
  syncGeoKnowledge,
} from "./geo";
import {
  classifyAutomaticLinkResponse,
  classifyQuarkShareTokenResponse,
  confirmAutomaticLinkDecision,
  nextAutomaticCheckDelayMs,
  type AutomaticLinkHealthDecision,
} from "../../../utils/autoLinkHealth";

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
}

interface Env {
  RESOURCE_DB: D1DatabaseLike;
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  };
  GEO_VECTOR?: {
    query(
      vector: number[],
      options: Record<string, unknown>
    ): Promise<{ matches?: Array<{ id: string; score?: number }> }>;
    upsert(
      vectors: Array<{
        id: string;
        values: number[];
        metadata?: Record<string, string | number | boolean>;
      }>
    ): Promise<unknown>;
  };
  GITHUB_TOKEN?: string;
  SYNC_TOKEN?: string;
  SEO_AUDIT_TOKEN?: string;
  SEO_SITE_URL?: string;
  INDEXNOW_KEY?: string;
  GEO_TEXT_MODEL?: string;
  GEO_EMBED_MODEL?: string;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledEventLike {
  cron?: string;
  scheduledTime?: number;
}

interface DueHealthCheckRow {
  url_hash: string;
  normalized_url: string;
  original_url: string;
  platform: string;
  failure_streak: number;
  click_count: number;
  report_count: number;
  checked_at: number;
  status: string;
}

type SourceMode = "index" | "raw" | "tree" | "archive";

interface SourceDefinition {
  key: string;
  label: string;
  category: string;
  repo: string;
  branch: string;
  mode: SourceMode;
  path?: string;
  pathPattern?: RegExp;
  version?: string;
  appendOnly?: boolean;
  initialOnly?: boolean;
}

interface RollingSourceDefinition {
  key: string;
  label: string;
  category: string;
  url: string;
  retentionMs: number;
}

interface SitemapSourceDefinition {
  key: string;
  label: string;
  category: string;
  origin: string;
  sitemapUrl: string;
  locationOrigin?: string;
  sitemapPathPattern?: RegExp;
  fallbackIndexedSitemapCount?: number;
  newestSitemapAtEnd?: boolean;
  newestPageAtEnd?: boolean;
  pathPattern: RegExp;
  headSize: number;
  backfillSize: number;
  concurrency?: number;
  maxItemsPerPage?: number;
  minimumIntervalMs?: number;
}

export interface ApiPageSourceDefinition {
  key: string;
  label: string;
  category: string;
  endpoint: string;
  pageSize: number;
  headPages: number;
  backfillPages: number;
  minimumIntervalMs: number;
}

const SOURCES: SourceDefinition[] = [
  { key: "library-01", label: "电子书资料库", category: "书籍", repo: "mswnlz/book", branch: "main", mode: "index", path: "README.md" },
  { key: "library-02", label: "影视资料库", category: "影视", repo: "mswnlz/movies", branch: "main", mode: "index", path: "README.md" },
  { key: "library-03", label: "学习资料库", category: "课程", repo: "mswnlz/curriculum", branch: "main", mode: "index", path: "README.md" },
  { key: "library-04", label: "学习资料库", category: "跨境电商", repo: "mswnlz/cross-border", branch: "main", mode: "index", path: "README.md" },
  { key: "library-05", label: "学习资料库", category: "AI学习", repo: "mswnlz/AIknowledge", branch: "main", mode: "index", path: "README.md" },
  { key: "library-06", label: "软件资料库", category: "软件工具", repo: "mswnlz/tools", branch: "main", mode: "index", path: "README.md" },
  { key: "library-07", label: "学习资料库", category: "教育", repo: "mswnlz/edu-knowlege", branch: "main", mode: "index", path: "README.md" },
  { key: "library-08", label: "影视资料库", category: "影视", repo: "mvcheap/mvcheap", branch: "main", mode: "archive", pathPattern: /\/movies\/.*\.md$/i },
  { key: "library-09", label: "软件资料库", category: "软件与游戏", repo: "jikcc/jikcc.github.io", branch: "master", mode: "tree", pathPattern: /^_posts\/.*\.md$/i },
  { key: "library-10", label: "综合资料库", category: "综合资源", repo: "leobba/quark-share", branch: "main", mode: "archive", pathPattern: /\/.*\.md$/i, version: "2" },
  { key: "library-11", label: "动画资料库", category: "动画", repo: "MDsub/mdsub.top", branch: "main", mode: "tree", pathPattern: /^docs\/collection\/.*\.md$/i },
  { key: "library-12", label: "电子书资料库", category: "电子书", repo: "mzhren/ebooks", branch: "main", mode: "archive", pathPattern: /\/.*\.md$/i, version: "2" },
  { key: "library-13", label: "115资料库", category: "115影视合集", repo: "har01d5/tvbox", branch: "master", mode: "raw", path: "115_shares.md" },
  { key: "library-14", label: "影视资料库", category: "影视", repo: "OsGits/open", branch: "main", mode: "raw", path: "影视目录.md" },
  { key: "library-15", label: "影视资料库", category: "影视与阅读", repo: "acoooder/aliyunpanshare", branch: "main", mode: "raw", path: "今日新增合集.md", appendOnly: true },
  { key: "library-16", label: "影视资料库", category: "影视与阅读", repo: "acoooder/aliyunpanshare", branch: "main", mode: "raw", path: "今日更新合集.md", appendOnly: true },
  { key: "library-17", label: "影视资料库", category: "影视与阅读", repo: "acoooder/aliyunpanshare", branch: "main", mode: "archive", pathPattern: /\/更新历史\/.*\.md$/i, initialOnly: true },
  { key: "library-18", label: "中医资料库", category: "中医课程", repo: "mswnlz/chinese-traditional", branch: "main", mode: "index", path: "README.md" },
  { key: "library-19", label: "健康资料库", category: "健康与健身", repo: "mswnlz/healthy", branch: "main", mode: "index", path: "README.md" },
  { key: "library-20", label: "自媒体资料库", category: "自媒体运营", repo: "mswnlz/self-media", branch: "main", mode: "index", path: "README.md" },
];

const ROLLING_SOURCE: RollingSourceDefinition = {
  key: "rolling-01",
  label: "实时资料库",
  category: "实时分享",
  url: "https://www.yunso.net/api/opendata.php?page=1",
  retentionMs: 30 * 24 * 60 * 60 * 1000,
};

const SITEMAP_SOURCES: SitemapSourceDefinition[] = [
  {
    key: "rolling-02",
    label: "多网盘增量资料库",
    category: "多网盘影视",
    origin: "https://dapanso.com",
    sitemapUrl: "https://dapanso.com/sitemap.xml",
    pathPattern: /^\/s\/[A-Za-z0-9_-]+\/?$/,
    headSize: 30,
    backfillSize: 0,
  },
  {
    key: "rolling-03",
    label: "百度增量资料库",
    category: "影视与短剧",
    origin: "https://dagehao889.cn",
    sitemapUrl: "https://dagehao889.cn/sitemap.xml",
    pathPattern: /^\/d\/\d+\.html$/,
    headSize: 24,
    backfillSize: 72,
  },
  {
    key: "rolling-04",
    label: "夸克增量资料库",
    category: "影视与短剧",
    origin: "https://www.haitunsou.com",
    sitemapUrl: "https://www.haitunsou.com/sitemap.xml",
    pathPattern: /^\/d\/\d+\.html$/,
    headSize: 24,
    backfillSize: 72,
  },
  {
    key: "rolling-05",
    label: "综合增量资料库",
    category: "影视与软件",
    origin: "https://xiaojiwo.top",
    sitemapUrl: "https://xiaojiwo.top/sitemap.xml",
    pathPattern: /^\/d\/\d+\.html$/,
    headSize: 12,
    backfillSize: 24,
    concurrency: 2,
  },
  {
    key: "rolling-06",
    label: "多网盘影视资料库",
    category: "影视",
    origin: "https://www.zlxapp.top",
    sitemapUrl: "https://www.zlxapp.top/sitemap.xml",
    locationOrigin: "http://208.92.225.208:8888",
    pathPattern: /^\/d\/\d+\.html$/,
    headSize: 18,
    backfillSize: 48,
    concurrency: 4,
  },
  {
    key: "rolling-08",
    label: "夸克综合增量资料库",
    category: "综合资源",
    origin: "https://pan.xiaozi.cc",
    sitemapUrl: "https://pan.xiaozi.cc/sitemap.xml",
    sitemapPathPattern: /^\/sitemap\/[2-9]\d*\.xml$/,
    pathPattern: /^\/resource\/\d+$/,
    headSize: 20,
    backfillSize: 48,
    concurrency: 5,
    maxItemsPerPage: 1,
  },
  {
    key: "rolling-09",
    label: "多网盘追剧增量资料库",
    category: "影视与动漫",
    origin: "https://www.zhuiju.us",
    sitemapUrl: "https://www.zhuiju.us/sitemap.xml",
    sitemapPathPattern: /^\/sitemap_\d+\.xml$/,
    pathPattern: /^\/d\/\d+\.html$/,
    headSize: 40,
    backfillSize: 0,
    concurrency: 4,
    maxItemsPerPage: 1,
  },
  {
    key: "rolling-10",
    label: "多网盘综合增量资料库",
    category: "影视与阅读",
    origin: "https://www.kuakeku.com",
    sitemapUrl: "https://www.kuakeku.com/sitemap.xml",
    locationOrigin: "http://103.97.176.244:5004",
    pathPattern: /^\/resource\/\d+$/,
    newestPageAtEnd: true,
    headSize: 24,
    backfillSize: 48,
    concurrency: 4,
    minimumIntervalMs: 60 * 60 * 1_000,
  },
  {
    key: "rolling-11",
    label: "百度综合增量资料库",
    category: "综合资源",
    origin: "https://www.esoua.com",
    sitemapUrl: "https://www.esoua.com/static/sitemap/sitemap-index.xml",
    sitemapPathPattern: /^\/static\/sitemap\/disk-\d+\.xml$/,
    newestSitemapAtEnd: true,
    newestPageAtEnd: true,
    pathPattern: /^\/doc\/[a-z0-9]+$/i,
    headSize: 30,
    backfillSize: 0,
    concurrency: 3,
    maxItemsPerPage: 1,
    minimumIntervalMs: 60 * 60 * 1_000,
  },
];

const API_PAGE_SOURCES: ApiPageSourceDefinition[] = [
  {
    key: "rolling-12",
    label: "多网盘大型增量资料库",
    category: "综合资源",
    endpoint: "https://pan.l9.lc/api/resources",
    pageSize: 100,
    headPages: 2,
    backfillPages: 3,
    minimumIntervalMs: 60 * 60 * 1_000,
  },
];

const GITHUB_API = "https://api.github.com";
const BATCH_SIZE = 40;
const PUBLIC_SOURCE_CONCURRENCY = 8;
const PUBLIC_SOURCE_TIMEOUT_MS = 20_000;
const HEALTH_CHECK_BATCH_SIZE = 30;
const HEALTH_CHECK_CONCURRENCY = 6;
const HEALTH_CHECK_TIMEOUT_MS = 7_000;
const OPERATIONS_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

async function recordOperationsSnapshot(
  database: D1DatabaseLike,
  now = Date.now()
): Promise<void> {
  try {
    const [catalog, health] = await Promise.all([
      database
        .prepare(
          `SELECT COUNT(*) AS resource_count,
                  SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) AS alive_count,
                  SUM(CASE WHEN status = 'password' THEN 1 ELSE 0 END) AS password_count,
                  SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) AS unknown_count,
                  SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) AS dead_count
           FROM resource_catalog`
        )
        .first<Record<string, number>>(),
      database
        .prepare(
          `SELECT COUNT(*) AS due_check_count
           FROM link_health_checks WHERE next_check_at <= ?`
        )
        .bind(now)
        .first<Record<string, number>>(),
    ]);
    await database.batch([
      database
        .prepare(
          `INSERT INTO operations_snapshot_daily
             (day, resource_count, alive_count, password_count,
              unknown_count, dead_count, due_check_count, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(day) DO UPDATE SET
             resource_count = excluded.resource_count,
             alive_count = excluded.alive_count,
             password_count = excluded.password_count,
             unknown_count = excluded.unknown_count,
             dead_count = excluded.dead_count,
             due_check_count = excluded.due_check_count,
             recorded_at = excluded.recorded_at`
        )
        .bind(
          shanghaiDay(now),
          Number(catalog?.resource_count || 0),
          Number(catalog?.alive_count || 0),
          Number(catalog?.password_count || 0),
          Number(catalog?.unknown_count || 0),
          Number(catalog?.dead_count || 0),
          Number(health?.due_check_count || 0),
          now
        ),
      database
        .prepare("DELETE FROM operations_snapshot_daily WHERE recorded_at < ?")
        .bind(now - OPERATIONS_RETENTION_MS),
      database
        .prepare("DELETE FROM link_health_history WHERE checked_at < ?")
        .bind(now - OPERATIONS_RETENTION_MS),
    ]);
  } catch (error) {
    if (/no such table/i.test(String(error))) return;
    throw error;
  }
}

async function readResponsePrefix(
  response: Response,
  limit = 120_000
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (bytes < limit) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      text += decoder.decode(chunk.value, { stream: true });
      if (bytes >= limit) break;
    }
    text += decoder.decode();
  } finally {
    if (bytes >= limit) await reader.cancel().catch(() => undefined);
  }
  return text.slice(0, limit);
}

async function inspectShareLink(row: DueHealthCheckRow): Promise<{
  decision: AutomaticLinkHealthDecision;
  httpStatus: number;
}> {
  if (row.platform === "quark") {
    const shareId = (() => {
      try {
        const match = new URL(row.original_url).pathname.match(/^\/s\/([^/?#]+)/i);
        return match?.[1] || "";
      } catch {
        return "";
      }
    })();
    if (shareId) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      try {
        const response = await fetch(
          "https://drive-pc.quark.cn/1/clouddrive/share/sharepage/token?pr=ucpro&fr=pc&uc_param_str=",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "https://pan.quark.cn",
              referer: "https://pan.quark.cn/",
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            },
            body: JSON.stringify({ pwd_id: shareId, passcode: "" }),
            signal: controller.signal,
          }
        );
        const body = await readResponsePrefix(response, 32_000);
        return {
          decision: classifyQuarkShareTokenResponse(response.status, body),
          httpStatus: response.status,
        };
      } catch (error) {
        return {
          decision: {
            status: "suspect",
            reason:
              error instanceof Error && error.name === "AbortError"
                ? "quark_timeout"
                : "quark_network_error",
            confidence: 10,
          },
          httpStatus: 0,
        };
      } finally {
        clearTimeout(timer);
      }
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(row.original_url, {
      method: "GET",
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
      signal: controller.signal,
    });
    const body = await readResponsePrefix(response);
    return {
      decision: classifyAutomaticLinkResponse(
        response.status,
        body,
        response.url
      ),
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      decision: {
        status: "suspect",
        reason:
          error instanceof Error && error.name === "AbortError"
            ? "timeout"
            : "network_error",
        confidence: 10,
      },
      httpStatus: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function dueHealthChecks(
  database: D1DatabaseLike,
  now: number
): Promise<DueHealthCheckRow[]> {
  const response = await database
    .prepare(
      `SELECT url_hash, normalized_url, original_url, platform, failure_streak,
              status,
              click_count, report_count, checked_at
       FROM link_health_checks
       WHERE platform <> 'magnet' AND next_check_at <= ?
       ORDER BY
         report_count DESC,
         click_count DESC,
         CASE status
           WHEN 'unknown' THEN 0
           WHEN 'suspect' THEN 1
           WHEN 'alive' THEN 2
           WHEN 'password' THEN 3
           ELSE 4
         END,
         checked_at ASC,
         last_seen_at DESC
       LIMIT ?`
    )
    .bind(now, HEALTH_CHECK_BATCH_SIZE)
    .all<DueHealthCheckRow>();
  return response.results || [];
}

async function saveHealthCheck(
  database: D1DatabaseLike,
  row: DueHealthCheckRow,
  result: Awaited<ReturnType<typeof inspectShareLink>>,
  now: number
): Promise<void> {
  const { decision, httpStatus } = result;
  const confirmed = confirmAutomaticLinkDecision(
    Number(row.failure_streak || 0),
    decision
  );
  const effectiveDecision = confirmed.decision;
  const failureStreak = confirmed.failureStreak;
  const nextCheckDelayMs = effectiveDecision.reason.startsWith(
    "awaiting_confirmation:"
  )
    ? 60 * 60 * 1_000
    : nextAutomaticCheckDelayMs(effectiveDecision.status);
  const catalogStatus = ["alive", "dead", "password"].includes(effectiveDecision.status)
    ? effectiveDecision.status
    : "";
  const statements = [
    database
      .prepare(
        `UPDATE link_health_checks
         SET status = ?, reason = ?, confidence = ?, http_status = ?,
             failure_streak = ?, checked_at = ?, next_check_at = ?,
             last_alive_at = CASE
               WHEN ? IN ('alive', 'password') THEN ? ELSE last_alive_at
             END
         WHERE url_hash = ?`
      )
      .bind(
        effectiveDecision.status,
        effectiveDecision.reason,
        effectiveDecision.confidence,
        httpStatus,
        failureStreak,
        now,
        now + nextCheckDelayMs,
        effectiveDecision.status,
        now,
        row.url_hash
      ),
  ];
  if (catalogStatus) {
    statements.push(
      database
        .prepare(
          `UPDATE resource_catalog SET status = ? WHERE normalized_url = ?`
        )
        .bind(catalogStatus, row.normalized_url)
    );
  }
  if (row.status !== effectiveDecision.status) {
    statements.push(
      database
        .prepare(
          `INSERT INTO link_health_history
             (url_hash, platform, previous_status, status, reason, checked_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          row.url_hash,
          row.platform,
          row.status || "unknown",
          effectiveDecision.status,
          effectiveDecision.reason,
          now
        )
    );
  }
  await database.batch(statements);
}

async function runAutomaticHealthChecks(env: Env) {
  const now = Date.now();
  let rows: DueHealthCheckRow[] = [];
  try {
    rows = await dueHealthChecks(env.RESOURCE_DB, now);
  } catch (error) {
    if (/no such table/i.test(String(error))) {
      return { checked: 0, status: "migration_required" as const };
    }
    throw error;
  }
  const results = await mapLimit(
    rows,
    HEALTH_CHECK_CONCURRENCY,
    async (row) => {
      const result = await inspectShareLink(row);
      await saveHealthCheck(env.RESOURCE_DB, row, result, now);
      return confirmAutomaticLinkDecision(
        Number(row.failure_streak || 0),
        result.decision
      ).decision.status;
    }
  );
  await recordOperationsSnapshot(env.RESOURCE_DB, now);
  return {
    checked: rows.length,
    status: "success" as const,
    counts: results.reduce<Record<string, number>>((counts, status) => {
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {}),
  };
}

function githubHeaders(env: Env): Record<string, string> {
  return {
    accept: "application/vnd.github+json",
    "user-agent": "haosouku-resource-sync",
    ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
  };
}

function rawUrl(source: SourceDefinition, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${source.repo}/${source.branch}/${encodedPath}`;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).hostname}`);
  return response.text();
}

async function fetchPublicText(url: string, accept = "text/html"): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_SOURCE_TIMEOUT_MS);
  try {
    return await fetchText(url, {
      headers: {
        accept,
        "accept-language": "zh-CN,zh;q=0.9",
        "user-agent": "haosouku-resource-sync/1.0 (+https://haosouku.com/about)",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function currentRevision(source: SourceDefinition, env: Env): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${source.repo}/commits/${encodeURIComponent(source.branch)}`,
    { headers: githubHeaders(env) }
  ).catch(() => undefined);
  if (!response?.ok) return "";
  const payload = (await response.json()) as { sha?: string };
  return String(payload.sha || "");
}

async function storedRevision(database: D1DatabaseLike, sourceKey: string): Promise<string> {
  const row = await database
    .prepare("SELECT revision FROM resource_sync_state WHERE source_key = ?")
    .bind(sourceKey)
    .first<{ revision?: string }>();
  return String(row?.revision || "");
}

interface StoredSyncState {
  revision: string;
  status: string;
  finishedAt: number;
}

async function storedSyncState(
  database: D1DatabaseLike,
  sourceKey: string
): Promise<StoredSyncState> {
  const row = await database
    .prepare(
      `SELECT revision, status, finished_at
       FROM resource_sync_state WHERE source_key = ?`
    )
    .bind(sourceKey)
    .first<{ revision?: string; status?: string; finished_at?: number }>();
  return {
    revision: String(row?.revision || ""),
    status: String(row?.status || ""),
    finishedAt: Number(row?.finished_at || 0),
  };
}

export function isSitemapSyncDue(
  minimumIntervalMs: number | undefined,
  state: Pick<StoredSyncState, "status" | "finishedAt">,
  now = Date.now()
): boolean {
  if (!minimumIntervalMs || minimumIntervalMs <= 0) return true;
  if (state.status !== "success" || state.finishedAt <= 0) return true;
  return now - state.finishedAt >= minimumIntervalMs;
}

export function orderSitemapPages(
  urls: string[],
  newestPageAtEnd = false
): string[] {
  return newestPageAtEnd ? [...urls].reverse() : urls;
}

async function markRunning(database: D1DatabaseLike, sourceKey: string, now: number) {
  await database
    .prepare(
      `INSERT INTO resource_sync_state
         (source_key, status, started_at, error_message)
       VALUES (?, 'running', ?, '')
       ON CONFLICT(source_key) DO UPDATE SET
         status = 'running', started_at = excluded.started_at, error_message = ''`
    )
    .bind(sourceKey, now)
    .run();
}

async function markFinished(
  database: D1DatabaseLike,
  sourceKey: string,
  revision: string,
  itemCount: number,
  error?: unknown
) {
  const message = error ? String(error instanceof Error ? error.message : error).slice(0, 400) : "";
  await database
    .prepare(
      `UPDATE resource_sync_state
       SET revision = CASE WHEN ? = '' THEN revision ELSE ? END,
           status = ?, item_count = ?, finished_at = ?, error_message = ?
       WHERE source_key = ?`
    )
    .bind(
      error ? "" : revision,
      error ? "" : revision,
      error ? "error" : "success",
      itemCount,
      Date.now(),
      message,
      sourceKey
    )
    .run();
}

async function mapLimit<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadDocuments(
  source: SourceDefinition,
  env: Env
): Promise<Array<{ path: string; text: string }>> {
  if (source.mode === "raw") {
    const path = source.path || "README.md";
    return [{ path, text: await fetchText(rawUrl(source, path)) }];
  }

  if (source.mode === "index") {
    const indexPath = source.path || "README.md";
    const indexText = await fetchText(rawUrl(source, indexPath));
    const paths = extractLinkedMarkdownPaths(indexText);
    const linked = await mapLimit(paths, 8, async (path) => ({
      path,
      text: await fetchText(rawUrl(source, path)),
    }));
    return [{ path: indexPath, text: indexText }, ...linked];
  }

  if (source.mode === "tree") {
    const treeText = await fetchText(
      `${GITHUB_API}/repos/${source.repo}/git/trees/${encodeURIComponent(source.branch)}?recursive=1`,
      { headers: githubHeaders(env) }
    );
    const tree = JSON.parse(treeText) as {
      truncated?: boolean;
      tree?: Array<{ path?: string; type?: string }>;
    };
    if (tree.truncated) throw new Error("source tree was truncated");
    const paths = (tree.tree || [])
      .filter((entry) => entry.type === "blob" && source.pathPattern?.test(entry.path || ""))
      .map((entry) => String(entry.path));
    return mapLimit(paths, 8, async (path) => ({
      path,
      text: await fetchText(rawUrl(source, path)),
    }));
  }

  const archiveResponse = await fetch(
    `https://codeload.github.com/${source.repo}/tar.gz/refs/heads/${encodeURIComponent(source.branch)}`
  );
  if (!archiveResponse.ok || !archiveResponse.body) {
    throw new Error(`archive HTTP ${archiveResponse.status}`);
  }
  const decompressed = archiveResponse.body.pipeThrough(new DecompressionStream("gzip"));
  const archive = await new Response(decompressed).arrayBuffer();
  return readTarTextFiles(archive, (path) => Boolean(source.pathPattern?.test(path)));
}

function mergeItems(documents: Array<{ path: string; text: string }>, source: SourceDefinition) {
  const merged = new Map<string, CatalogItem>();
  for (const document of documents) {
    const parsed = parseCatalogDocument(document.text, {
      category: source.category,
      fallbackTitle: source.category,
    });
    for (const item of parsed) {
      const current = merged.get(item.normalizedUrl);
      if (!current || item.title.length > current.title.length) merged.set(item.normalizedUrl, item);
    }
  }
  return Array.from(merged.values());
}

async function runBatch(database: D1DatabaseLike, statements: D1StatementLike[]) {
  if (statements.length) await database.batch(statements);
}

async function upsertItems(
  database: D1DatabaseLike,
  source: Pick<SourceDefinition, "key" | "label">,
  revision: string,
  items: CatalogItem[],
  now: number,
  pruneMissing = true
) {
  for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
    const statements: D1StatementLike[] = [];
    for (const item of items.slice(offset, offset + BATCH_SIZE)) {
      statements.push(
        database
          .prepare(
            `INSERT INTO resource_catalog
               (normalized_url, url, type, password, title, category,
                status, first_seen_at, last_seen_at)
             VALUES (?, ?, ?, ?, ?, ?, 'unknown', ?, ?)
             ON CONFLICT(normalized_url) DO UPDATE SET
               url = CASE
                 WHEN excluded.password <> '' OR resource_catalog.password = ''
                 THEN excluded.url ELSE resource_catalog.url END,
               type = excluded.type,
               password = CASE WHEN excluded.password <> ''
                 THEN excluded.password ELSE resource_catalog.password END,
               title = CASE WHEN length(excluded.title) > length(resource_catalog.title)
                 THEN excluded.title ELSE resource_catalog.title END,
               category = CASE WHEN length(excluded.title) > length(resource_catalog.title)
                 THEN excluded.category ELSE resource_catalog.category END,
               last_seen_at = excluded.last_seen_at`
          )
          .bind(
            item.normalizedUrl,
            item.url,
            item.type,
            item.password,
            item.title,
            item.category,
            now,
            now
          ),
        database
          .prepare(
            `INSERT INTO resource_catalog_sources
               (normalized_url, source_key, source_label, sync_revision, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(normalized_url, source_key) DO UPDATE SET
               source_label = excluded.source_label,
               sync_revision = excluded.sync_revision,
               updated_at = excluded.updated_at`
          )
          .bind(item.normalizedUrl, source.key, source.label, revision, now)
      );
    }
    await runBatch(database, statements);
  }

  if (pruneMissing) {
    await database
      .prepare(
        `DELETE FROM resource_catalog_sources
         WHERE source_key = ? AND sync_revision <> ?`
      )
      .bind(source.key, revision)
      .run();
    await deleteOrphanedCatalogItems(database);
  }
}

async function deleteOrphanedCatalogItems(database: D1DatabaseLike) {
  await database
    .prepare(
      `DELETE FROM resource_catalog
       WHERE NOT EXISTS (
         SELECT 1 FROM resource_catalog_sources s
         WHERE s.normalized_url = resource_catalog.normalized_url
       )`
    )
    .run();
}

async function cleanupRollingItems(database: D1DatabaseLike, now: number) {
  await database
    .prepare(
      `DELETE FROM resource_catalog_sources
       WHERE source_key = ? AND updated_at < ?`
    )
    .bind(ROLLING_SOURCE.key, now - ROLLING_SOURCE.retentionMs)
    .run();
  await deleteOrphanedCatalogItems(database);
}

async function syncSource(source: SourceDefinition, env: Env) {
  const database = env.RESOURCE_DB;
  const previousRevision = await storedRevision(database, source.key);
  if (source.initialOnly && previousRevision) {
    return { key: source.key, status: "unchanged" as const };
  }
  const upstreamRevision = await currentRevision(source, env);
  const revision = upstreamRevision && source.version
    ? `${source.version}:${upstreamRevision}`
    : upstreamRevision;
  if (revision && revision === previousRevision) {
    return { key: source.key, status: "unchanged" as const };
  }

  const now = Date.now();
  const runRevision = revision || `fallback-${now}`;
  await markRunning(database, source.key, now);
  let itemCount = 0;
  try {
    const documents = await loadDocuments(source, env);
    const items = mergeItems(documents, source);
    if (items.length === 0) throw new Error("source produced no supported links");
    itemCount = items.length;
    await upsertItems(
      database,
      source,
      runRevision,
      items,
      now,
      !source.appendOnly
    );
    await markFinished(database, source.key, runRevision, itemCount);
    return { key: source.key, status: "success" as const, itemCount };
  } catch (error) {
    await markFinished(database, source.key, "", itemCount, error);
    return {
      key: source.key,
      status: "error" as const,
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

async function syncRollingSource(env: Env) {
  const database = env.RESOURCE_DB;
  const now = Date.now();
  await markRunning(database, ROLLING_SOURCE.key, now);
  let itemCount = 0;
  try {
    const response = await fetch(ROLLING_SOURCE.url, {
      headers: {
        accept: "application/json",
        "user-agent": "haosouku-resource-sync",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for www.yunso.net`);
    const payload = (await response.json()) as {
      code?: unknown;
      time?: unknown;
      Data?: unknown;
    };
    const items = parseOpenDataFeed(payload, ROLLING_SOURCE.category);
    if (items.length === 0) throw new Error("rolling source produced no supported links");
    itemCount = items.length;

    const revision = String(payload.time || `fallback-${now}`);
    const previousRevision = await storedRevision(database, ROLLING_SOURCE.key);
    if (revision === previousRevision) {
      await cleanupRollingItems(database, now);
      await markFinished(database, ROLLING_SOURCE.key, revision, itemCount);
      return { key: ROLLING_SOURCE.key, status: "unchanged" as const, itemCount };
    }

    await upsertItems(database, ROLLING_SOURCE, revision, items, now, false);
    await cleanupRollingItems(database, now);
    await markFinished(database, ROLLING_SOURCE.key, revision, itemCount);
    return { key: ROLLING_SOURCE.key, status: "success" as const, itemCount };
  } catch (error) {
    await markFinished(database, ROLLING_SOURCE.key, "", itemCount, error);
    return {
      key: ROLLING_SOURCE.key,
      status: "error" as const,
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

interface SitemapCursor {
  offset?: number;
  sitemap?: string;
}

function readSitemapCursor(value: string, source: SitemapSourceDefinition): number {
  try {
    const parsed = JSON.parse(value) as SitemapCursor;
    const offset = Number(parsed.offset);
    if (Number.isFinite(offset)) return Math.max(source.headSize, offset);
  } catch {
    // Older revisions were not cursor-shaped. Start after the always-refreshed head.
  }
  return source.headSize;
}

function sitemapWorkset(
  source: SitemapSourceDefinition,
  urls: string[],
  previousRevision: string
): { urls: string[]; nextOffset: number } {
  const selected = new Set(urls.slice(0, source.headSize));
  let nextOffset = source.headSize;
  if (source.backfillSize > 0) {
    const offset = readSitemapCursor(previousRevision, source);
    for (const url of urls.slice(offset, offset + source.backfillSize)) {
      selected.add(url);
    }
    nextOffset = Math.min(urls.length, offset + source.backfillSize);
  }
  return { urls: Array.from(selected), nextOffset };
}

export function selectIndexedSitemapPages(
  sitemaps: string[],
  pagesBySitemap: Map<string, string[]>,
  previousRevision: string,
  headSize: number,
  backfillSize: number
): {
  urls: string[];
  nextSitemap: string;
  nextOffset: number;
  currentSitemap: string;
} {
  const newestSitemap = sitemaps[0] || "";
  let currentSitemap = newestSitemap;
  let offset = headSize;
  try {
    const cursor = JSON.parse(previousRevision) as SitemapCursor;
    if (cursor.sitemap && sitemaps.includes(cursor.sitemap)) {
      currentSitemap = cursor.sitemap;
      offset = Math.max(
        currentSitemap === newestSitemap ? headSize : 0,
        Number(cursor.offset) || 0
      );
    }
  } catch {
    // Start from the newest indexed sitemap.
  }

  const selected = new Set(
    (pagesBySitemap.get(newestSitemap) || []).slice(0, headSize)
  );
  const currentPages = pagesBySitemap.get(currentSitemap) || [];
  for (const url of currentPages.slice(offset, offset + backfillSize)) {
    selected.add(url);
  }

  let nextSitemap = currentSitemap;
  let nextOffset = Math.min(currentPages.length, offset + backfillSize);
  if (nextOffset >= currentPages.length) {
    const currentIndex = Math.max(0, sitemaps.indexOf(currentSitemap));
    if (currentIndex + 1 < sitemaps.length) {
      nextSitemap = sitemaps[currentIndex + 1];
      nextOffset = 0;
    }
  }

  return {
    urls: Array.from(selected),
    nextSitemap,
    nextOffset,
    currentSitemap,
  };
}

async function indexedSitemapWorkset(
  source: SitemapSourceDefinition,
  indexXml: string,
  previousRevision: string
): Promise<{
  urls: string[];
  revision: string;
  nextOffset: number;
  totalSitemaps: number;
}> {
  let sitemaps = parseSitemapUrls(
    indexXml,
    source.origin,
    source.sitemapPathPattern as RegExp
  );
  if (sitemaps.length === 0 && source.fallbackIndexedSitemapCount) {
    sitemaps = Array.from(
      { length: source.fallbackIndexedSitemapCount },
      (_, index) => new URL(`/sitemaps/sitemap-${index + 1}.xml`, source.origin).href
    );
  }
  if (source.newestSitemapAtEnd) sitemaps = sitemaps.reverse();
  if (sitemaps.length === 0) {
    const locCount = Array.from(indexXml.matchAll(/<loc\b/gi)).length;
    throw new Error(
      `sitemap index produced no child sitemaps (bytes=${indexXml.length}, locs=${locCount}, html=${/<html\b/i.test(indexXml)})`
    );
  }

  let cursorSitemap = sitemaps[0];
  try {
    const cursor = JSON.parse(previousRevision) as SitemapCursor;
    if (cursor.sitemap && sitemaps.includes(cursor.sitemap)) {
      cursorSitemap = cursor.sitemap;
    }
  } catch {
    // Start from the newest child sitemap.
  }

  const needed = Array.from(new Set([sitemaps[0], cursorSitemap]));
  const pageCollections = await mapLimit(needed, 2, async (url) => {
    const xml = await fetchPublicText(url, "application/xml,text/xml");
    const urls = orderSitemapPages(
      parseSitemapUrls(xml, source.origin, source.pathPattern),
      source.newestPageAtEnd
    );
    return {
      url,
      urls,
      bytes: xml.length,
      locs: Array.from(xml.matchAll(/<loc\b/gi)).length,
      html: /<html\b/i.test(xml),
    };
  });
  const pagesBySitemap = new Map<string, string[]>(
    pageCollections.map((page) => [page.url, page.urls])
  );
  const selection = selectIndexedSitemapPages(
    sitemaps,
    pagesBySitemap,
    previousRevision,
    source.headSize,
    source.backfillSize
  );
  if (selection.urls.length === 0) {
    const diagnostics = pageCollections
      .map((page) => `${new URL(page.url).pathname}:bytes=${page.bytes},locs=${page.locs},html=${page.html}`)
      .join(";");
    throw new Error(`child sitemaps produced no detail pages (${diagnostics})`);
  }
  return {
    urls: selection.urls,
    revision: JSON.stringify({
      head: selection.urls[0],
      sitemap: selection.nextSitemap,
      offset: selection.nextOffset,
      totalSitemaps: sitemaps.length,
    }),
    nextOffset: selection.nextOffset,
    totalSitemaps: sitemaps.length,
  };
}

async function syncSitemapSource(source: SitemapSourceDefinition, env: Env) {
  const database = env.RESOURCE_DB;
  const now = Date.now();
  const previousState = await storedSyncState(database, source.key);
  if (!isSitemapSyncDue(source.minimumIntervalMs, previousState, now)) {
    return {
      key: source.key,
      status: "unchanged" as const,
      reason: "minimum_interval",
      retryAfterMs:
        source.minimumIntervalMs! - (now - previousState.finishedAt),
    };
  }
  await markRunning(database, source.key, now);
  let itemCount = 0;
  try {
    const xml = await fetchPublicText(source.sitemapUrl, "application/xml,text/xml");
    const previousRevision = previousState.revision;
    let workset: { urls: string[]; nextOffset: number };
    let revision = "";
    let totalPages = 0;
    let totalSitemaps = 0;
    if (source.sitemapPathPattern) {
      const indexed = await indexedSitemapWorkset(source, xml, previousRevision);
      workset = { urls: indexed.urls, nextOffset: indexed.nextOffset };
      revision = indexed.revision;
      totalSitemaps = indexed.totalSitemaps;
    } else {
      let urls = parseSitemapUrls(
        xml,
        source.origin,
        source.pathPattern,
        source.locationOrigin
      );
      urls = orderSitemapPages(urls, source.newestPageAtEnd);
      if (urls.length === 0) {
        throw new Error("public sitemap produced no detail pages");
      }
      workset = sitemapWorkset(source, urls, previousRevision);
      totalPages = urls.length;
      revision = JSON.stringify({
        head: urls[0],
        offset: workset.nextOffset,
        total: urls.length,
      });
    }
    const collections = await mapLimit(
      workset.urls,
      source.concurrency || PUBLIC_SOURCE_CONCURRENCY,
      async (url) => {
        try {
          return parsePublicDetailPage(
            await fetchPublicText(url),
            source.category,
            source.maxItemsPerPage,
            source.maxItemsPerPage === 1
              ? new URL(url).pathname.split("/").filter(Boolean).at(-1) || ""
              : ""
          );
        } catch {
          return [];
        }
      }
    );

    const merged = new Map<string, CatalogItem>();
    for (const item of collections.flat()) {
      const current = merged.get(item.normalizedUrl);
      if (!current || item.title.length > current.title.length) {
        merged.set(item.normalizedUrl, item);
      } else if (!current.password && item.password) {
        current.password = item.password;
        current.url = item.url;
      }
    }
    const items = Array.from(merged.values());
    if (items.length === 0) throw new Error("public detail pages produced no supported links");
    itemCount = items.length;

    await upsertItems(database, source, revision, items, now, false);
    await markFinished(database, source.key, revision, itemCount);
    return {
      key: source.key,
      status: "success" as const,
      itemCount,
      scanned: workset.urls.length,
      backfillOffset: workset.nextOffset,
      totalPages,
      totalSitemaps,
    };
  } catch (error) {
    await markFinished(database, source.key, "", itemCount, error);
    return {
      key: source.key,
      status: "error" as const,
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

interface ApiPageCursor {
  cursorPage?: number;
}

export function selectApiPageNumbers(
  source: Pick<ApiPageSourceDefinition, "headPages" | "backfillPages">,
  previousRevision: string,
  totalPages: number
): { pages: number[]; nextCursorPage: number } {
  const safeTotalPages = Math.max(0, Math.floor(totalPages));
  const firstBackfillPage = Math.max(1, Math.floor(source.headPages) + 1);
  const pages = new Set<number>();
  for (
    let page = 1;
    page <= Math.min(source.headPages, safeTotalPages);
    page += 1
  ) {
    pages.add(page);
  }

  let cursorPage = firstBackfillPage;
  try {
    const parsed = JSON.parse(previousRevision) as ApiPageCursor;
    const storedPage = Math.floor(Number(parsed.cursorPage));
    if (storedPage >= firstBackfillPage && storedPage <= safeTotalPages) {
      cursorPage = storedPage;
    }
  } catch {
    // Start immediately after the always-refreshed head pages.
  }

  const availableBackfillPages = Math.max(
    0,
    safeTotalPages - firstBackfillPage + 1
  );
  const backfillCount = Math.min(
    Math.max(0, Math.floor(source.backfillPages)),
    availableBackfillPages
  );
  for (let index = 0; index < backfillCount; index += 1) {
    if (cursorPage > safeTotalPages) cursorPage = firstBackfillPage;
    pages.add(cursorPage);
    cursorPage += 1;
  }
  if (cursorPage > safeTotalPages && availableBackfillPages > 0) {
    cursorPage = firstBackfillPage;
  }

  return { pages: Array.from(pages), nextCursorPage: cursorPage };
}

async function fetchApiResourcePage(
  source: ApiPageSourceDefinition,
  page: number
) {
  const url = new URL(source.endpoint);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(source.pageSize));
  url.searchParams.set("is_valid", "true");
  const payload = JSON.parse(
    await fetchPublicText(url.href, "application/json")
  );
  return parseApiResourcePage(payload, source.category);
}

async function syncApiPageSource(source: ApiPageSourceDefinition, env: Env) {
  const database = env.RESOURCE_DB;
  const now = Date.now();
  const previousState = await storedSyncState(database, source.key);
  if (!isSitemapSyncDue(source.minimumIntervalMs, previousState, now)) {
    return {
      key: source.key,
      status: "unchanged" as const,
      reason: "minimum_interval",
      retryAfterMs:
        source.minimumIntervalMs - (now - previousState.finishedAt),
    };
  }

  await markRunning(database, source.key, now);
  let itemCount = 0;
  try {
    const firstPage = await fetchApiResourcePage(source, 1);
    if (firstPage.items.length === 0 || firstPage.total <= 0) {
      throw new Error("API source produced no supported links");
    }
    const totalPages = Math.max(
      1,
      Math.ceil(firstPage.total / (firstPage.pageSize || source.pageSize))
    );
    const selection = selectApiPageNumbers(
      source,
      previousState.revision,
      totalPages
    );
    const additionalPages = await mapLimit(
      selection.pages.filter((page) => page !== 1),
      3,
      (page) => fetchApiResourcePage(source, page)
    );

    const merged = new Map<string, CatalogItem>();
    for (const item of [firstPage, ...additionalPages].flatMap(
      (page) => page.items
    )) {
      const current = merged.get(item.normalizedUrl);
      if (!current || item.title.length > current.title.length) {
        merged.set(item.normalizedUrl, item);
      } else if (!current.password && item.password) {
        current.password = item.password;
        current.url = item.url;
      }
    }
    const items = Array.from(merged.values());
    if (items.length === 0) {
      throw new Error("API pages produced no supported links");
    }
    itemCount = items.length;
    const revision = JSON.stringify({
      cursorPage: selection.nextCursorPage,
      totalPages,
      headUpdatedAt: firstPage.headUpdatedAt,
    });
    await upsertItems(database, source, revision, items, now, false);
    await markFinished(database, source.key, revision, itemCount);
    return {
      key: source.key,
      status: "success" as const,
      itemCount,
      scannedPages: selection.pages,
      nextCursorPage: selection.nextCursorPage,
      totalPages,
    };
  } catch (error) {
    await markFinished(database, source.key, "", itemCount, error);
    return {
      key: source.key,
      status: "error" as const,
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

async function syncIncrementalSources(env: Env) {
  const results: Array<Record<string, unknown>> = [await syncRollingSource(env)];
  for (const source of SITEMAP_SOURCES) {
    results.push(await syncSitemapSource(source, env));
  }
  for (const source of API_PAGE_SOURCES) {
    results.push(await syncApiPageSource(source, env));
  }
  await recordOperationsSnapshot(env.RESOURCE_DB);
  return results;
}

async function syncAll(env: Env) {
  const results = [];
  for (const source of SOURCES) results.push(await syncSource(source, env));
  results.push(...await syncIncrementalSources(env));
  return results;
}

async function health(database: D1DatabaseLike) {
  const response = await database
    .prepare(
      `SELECT source_key, status, item_count, started_at, finished_at, error_message
       FROM resource_sync_state ORDER BY source_key`
    )
    .all();
  return response.results || [];
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const authorization = request.headers.get("authorization") || "";
    const authorized = Boolean(
      env.SYNC_TOKEN && authorization === `Bearer ${env.SYNC_TOKEN}`
    );
    const seoAuditAuthorized = Boolean(
      authorized ||
      (env.SEO_AUDIT_TOKEN &&
        authorization === `Bearer ${env.SEO_AUDIT_TOKEN}`)
    );
    if (request.method === "GET" && url.pathname === "/health") {
      if (!authorized) return json({ ok: false }, 401);
      return json({ ok: true, sources: await health(env.RESOURCE_DB) });
    }
    if (request.method === "POST" && url.pathname === "/sync") {
      if (!authorized) return json({ ok: false }, 401);
      return json({ ok: true, results: await syncAll(env) });
    }
    if (request.method === "POST" && url.pathname === "/check-links") {
      if (!authorized) return json({ ok: false }, 401);
      return json({ ok: true, result: await runAutomaticHealthChecks(env) });
    }
    if (request.method === "POST" && url.pathname === "/entertainment/sync") {
      if (!authorized) return json({ ok: false }, 401);
      return json({ ok: true, result: await syncEntertainmentLatest(env) });
    }
    if (request.method === "POST" && url.pathname === "/magnet/sync") {
      if (!authorized) return json({ ok: false }, 401);
      return json({ ok: true, result: await syncMagnetSearchCache(env) });
    }
    if (request.method === "POST" && url.pathname === "/seo/audit") {
      if (!seoAuditAuthorized) return json({ ok: false }, 401);
      return json({ ok: true, result: await runSeoAudit(env) });
    }
    if (request.method === "GET" && url.pathname === "/geo/status") {
      if (!seoAuditAuthorized) return json({ ok: false }, 401);
      return json({ ok: true, result: await getGeoPipelineStatus(env) });
    }
    if (request.method === "POST" && url.pathname === "/geo/discover") {
      if (!seoAuditAuthorized) return json({ ok: false }, 401);
      return json({
        ok: true,
        result: { discovered: await discoverGeoKeywords(env) },
      });
    }
    if (request.method === "POST" && url.pathname === "/geo/knowledge") {
      if (!seoAuditAuthorized) return json({ ok: false }, 401);
      return json({
        ok: true,
        result: { documents: await syncGeoKnowledge(env) },
      });
    }
    if (request.method === "POST" && url.pathname === "/geo/run") {
      if (!seoAuditAuthorized) return json({ ok: false }, 401);
      return json({
        ok: true,
        result: await runGeoPipeline(env, `http_${Date.now()}`),
      });
    }
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event: ScheduledEventLike, env: Env, ctx: ExecutionContextLike) {
    if (event.cron === "29 */2 * * *") {
      ctx.waitUntil(
        runGeoPipeline(
          env,
          `cron_${event.scheduledTime || Date.now()}`,
          event.scheduledTime || Date.now()
        )
      );
      return;
    }
    if (event.cron === "17 */2 * * *") {
      ctx.waitUntil(
        Promise.all([
          syncEntertainmentLatest(env),
          syncMagnetSearchCache(env),
        ])
      );
      return;
    }
    if (event.cron === "*/10 * * * *") {
      ctx.waitUntil(
        Promise.all([
          syncIncrementalSources(env),
          runRequestedGeoPipeline(env),
        ])
      );
      return;
    }
    if (event.cron === "7,22,37,52 * * * *") {
      ctx.waitUntil(runAutomaticHealthChecks(env));
      return;
    }
    if (event.cron === "43 2 * * *") {
      ctx.waitUntil(runSeoAudit(env));
      return;
    }
    ctx.waitUntil(Promise.all([syncAll(env), runAutomaticHealthChecks(env)]));
  },
};

export {
  API_PAGE_SOURCES,
  ROLLING_SOURCE,
  SITEMAP_SOURCES,
  SOURCES,
  runAutomaticHealthChecks,
  recordOperationsSnapshot,
  syncAll,
  syncApiPageSource,
  syncIncrementalSources,
  syncRollingSource,
  syncSitemapSource,
  syncEntertainmentLatest,
  syncMagnetSearchCache,
  runSeoAudit,
  discoverGeoKeywords,
  getGeoPipelineStatus,
  runGeoPipeline,
  runRequestedGeoPipeline,
  syncGeoKnowledge,
};
