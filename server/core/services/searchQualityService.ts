import type {
  D1DatabaseLike,
  D1StatementLike,
} from "../../utils/cloudflareBindings";
import {
  getLinkPlatform,
  normalizeLinkHealthUrl,
} from "../../../utils/linkHealth";
import { sha256Hex } from "./linkHealthService";

const EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_QUERY_LENGTH = 80;
const MAX_TITLE_LENGTH = 180;
const SOURCE_POLICY_CACHE_MS = 5 * 60 * 1_000;
const SOURCE_PROBE_COOLDOWN_MS = 30 * 60 * 1_000;

export interface SearchQualityInput {
  eventId: string;
  query: string;
  resultCount: number;
  latencyMs: number;
  matchMode: "exact" | "fuzzy";
}

export interface SourcePerformanceInput {
  sourceKey: string;
  resultCount: number;
  uniqueResultCount?: number;
  duplicateCount?: number;
  latencyMs: number;
  success: boolean;
  timedOut?: boolean;
  cached?: boolean;
}

export type SourceQualityState =
  | "warming"
  | "active"
  | "degraded"
  | "disabled"
  | "probe";

export interface SourceQualityStats {
  sourceKey: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  resultCount: number;
  uniqueResultCount: number;
  duplicateCount: number;
  emptyCount: number;
  timeoutCount: number;
  cachedCount: number;
  latencyMs: number;
  lastRequestedAt: number;
}

export interface SourceQualityPolicy {
  sourceKey: string;
  score: number;
  state: SourceQualityState;
  sampleCount: number;
  successRate: number;
  timeoutRate: number;
  duplicateRate: number;
  averageResultCount: number;
  averageLatencyMs: number;
  maxVariants: number;
  timeoutMs?: number;
  retryAt?: number;
}

export interface ResultClickInput {
  eventId: string;
  query?: string;
  url: string;
  platform?: string;
  title?: string;
}

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function boundedInteger(value: unknown, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(maximum, Math.round(parsed)));
}

function latencyBuckets(latencyMs: number) {
  return {
    le500: latencyMs <= 500 ? 1 : 0,
    le1000: latencyMs <= 1_000 ? 1 : 0,
    le2000: latencyMs <= 2_000 ? 1 : 0,
    le5000: latencyMs <= 5_000 ? 1 : 0,
    le10000: latencyMs <= 10_000 ? 1 : 0,
    over10000: latencyMs > 10_000 ? 1 : 0,
  };
}

function approximateLatencyPercentile(
  row: Record<string, unknown> | null,
  count: number,
  percentile: number
): number {
  if (!row || count <= 0) return 0;
  const threshold = Math.max(1, Math.ceil(count * percentile));
  const buckets: Array<[string, number]> = [
    ["latency_le_500", 500],
    ["latency_le_1000", 1_000],
    ["latency_le_2000", 2_000],
    ["latency_le_5000", 5_000],
    ["latency_le_10000", 10_000],
  ];
  for (const [key, upperBound] of buckets) {
    if (Number(row[key] || 0) >= threshold) return upperBound;
  }
  return 120_000;
}

/** Keep aggregate queries useful without retaining obvious personal data. */
export function normalizeQualityQuery(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, " ")
    .replace(/(?:\+?86[-\s]?)?1[3-9]\d{9}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function normalizeSourceKey(value: string): string {
  return String(value || "unknown")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "unknown";
}

async function runStatements(
  database: D1DatabaseLike,
  statements: D1StatementLike[]
): Promise<void> {
  if (database.batch) {
    await database.batch(statements);
    return;
  }
  await Promise.all(statements.map((statement) => statement.run()));
}

async function claimEvent(
  database: D1DatabaseLike,
  eventId: string,
  now: number
): Promise<boolean> {
  const normalizedId = String(eventId || "").trim().slice(0, 96);
  if (!/^[A-Za-z0-9:_-]{8,96}$/.test(normalizedId)) return false;
  const result = await database
    .prepare(
      `INSERT OR IGNORE INTO search_quality_events (event_id, created_at)
       VALUES (?, ?)`
    )
    .bind(normalizedId, now)
    .run();
  return Number(result.meta?.changes || 0) > 0;
}

export async function recordSearchQuality(
  database: D1DatabaseLike | undefined,
  input: SearchQualityInput,
  now = Date.now()
): Promise<boolean> {
  if (!database) return false;
  const query = normalizeQualityQuery(input.query);
  if (!query || !(await claimEvent(database, input.eventId, now))) return false;

  const day = shanghaiDay(now);
  const resultCount = boundedInteger(input.resultCount, 20_000);
  const latencyMs = boundedInteger(input.latencyMs, 120_000);
  const buckets = latencyBuckets(latencyMs);
  const exact = input.matchMode === "exact" ? 1 : 0;
  const fuzzy = exact ? 0 : 1;
  await runStatements(database, [
    database
      .prepare(
        `INSERT INTO search_quality_daily
           (day, search_count, no_result_count, result_count, latency_ms,
            exact_search_count, fuzzy_search_count, click_count, updated_at,
            latency_le_500, latency_le_1000, latency_le_2000,
            latency_le_5000, latency_le_10000, latency_over_10000)
         VALUES (?, 1, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(day) DO UPDATE SET
           search_count = search_count + 1,
           no_result_count = no_result_count + excluded.no_result_count,
           result_count = result_count + excluded.result_count,
           latency_ms = latency_ms + excluded.latency_ms,
           exact_search_count = exact_search_count + excluded.exact_search_count,
           fuzzy_search_count = fuzzy_search_count + excluded.fuzzy_search_count,
           latency_le_500 = latency_le_500 + excluded.latency_le_500,
           latency_le_1000 = latency_le_1000 + excluded.latency_le_1000,
           latency_le_2000 = latency_le_2000 + excluded.latency_le_2000,
           latency_le_5000 = latency_le_5000 + excluded.latency_le_5000,
           latency_le_10000 = latency_le_10000 + excluded.latency_le_10000,
           latency_over_10000 = latency_over_10000 + excluded.latency_over_10000,
           updated_at = excluded.updated_at`
      )
      .bind(
        day,
        resultCount === 0 ? 1 : 0,
        resultCount,
        latencyMs,
        exact,
        fuzzy,
        now,
        buckets.le500,
        buckets.le1000,
        buckets.le2000,
        buckets.le5000,
        buckets.le10000,
        buckets.over10000
      ),
    database
      .prepare(
        `INSERT INTO search_query_daily
           (day, query, search_count, no_result_count, result_count,
            latency_ms, click_count, last_searched_at)
         VALUES (?, ?, 1, ?, ?, ?, 0, ?)
         ON CONFLICT(day, query) DO UPDATE SET
           search_count = search_count + 1,
           no_result_count = no_result_count + excluded.no_result_count,
           result_count = result_count + excluded.result_count,
           latency_ms = latency_ms + excluded.latency_ms,
           last_searched_at = excluded.last_searched_at`
      )
      .bind(day, query, resultCount === 0 ? 1 : 0, resultCount, latencyMs, now),
    database
      .prepare("DELETE FROM search_quality_events WHERE created_at < ?")
      .bind(now - EVENT_TTL_MS),
  ]);
  return true;
}

export async function recordSourcePerformance(
  database: D1DatabaseLike | undefined,
  input: SourcePerformanceInput,
  now = Date.now()
): Promise<void> {
  if (!database) return;
  const day = shanghaiDay(now);
  const sourceKey = normalizeSourceKey(input.sourceKey);
  const resultCount = boundedInteger(input.resultCount, 20_000);
  const uniqueResultCount = boundedInteger(
    input.uniqueResultCount ?? input.resultCount,
    20_000
  );
  const duplicateCount = boundedInteger(input.duplicateCount, 20_000);
  const latencyMs = boundedInteger(input.latencyMs, 120_000);
  await database
    .prepare(
       `INSERT INTO source_performance_daily
         (day, source_key, request_count, success_count, error_count,
          result_count, latency_ms, last_requested_at, unique_result_count,
          duplicate_count, empty_count, timeout_count, cached_count)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(day, source_key) DO UPDATE SET
         request_count = request_count + 1,
         success_count = success_count + excluded.success_count,
         error_count = error_count + excluded.error_count,
         result_count = result_count + excluded.result_count,
         latency_ms = latency_ms + excluded.latency_ms,
         unique_result_count = unique_result_count + excluded.unique_result_count,
         duplicate_count = duplicate_count + excluded.duplicate_count,
         empty_count = empty_count + excluded.empty_count,
         timeout_count = timeout_count + excluded.timeout_count,
         cached_count = cached_count + excluded.cached_count,
         last_requested_at = CASE
           WHEN excluded.cached_count > 0 THEN last_requested_at
           ELSE excluded.last_requested_at
         END`
    )
    .bind(
      day,
      sourceKey,
      input.success ? 1 : 0,
      input.success ? 0 : 1,
      resultCount,
      latencyMs,
      now,
      uniqueResultCount,
      duplicateCount,
      !input.cached && uniqueResultCount === 0 ? 1 : 0,
      input.timedOut ? 1 : 0,
      input.cached ? 1 : 0
    )
    .run();
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateSourceQualityPolicy(
  stats: SourceQualityStats,
  now = Date.now()
): SourceQualityPolicy {
  const totalRequestCount = Math.max(0, Number(stats.requestCount || 0));
  const requestCount = Math.max(
    0,
    totalRequestCount - Number(stats.cachedCount || 0)
  );
  const successCount = Math.max(
    0,
    Number(stats.successCount || 0) - Number(stats.cachedCount || 0)
  );
  const successRate = ratio(successCount, requestCount);
  const timeoutRate = ratio(Number(stats.timeoutCount || 0), requestCount);
  const duplicateBase =
    Number(stats.uniqueResultCount || 0) + Number(stats.duplicateCount || 0);
  const duplicateRate = ratio(Number(stats.duplicateCount || 0), duplicateBase);
  const averageResultCount = ratio(
    Number(stats.uniqueResultCount || stats.resultCount || 0),
    requestCount
  );
  const averageLatencyMs = Math.round(
    ratio(Number(stats.latencyMs || 0), requestCount)
  );
  const score = clampScore(
    successRate * 45 +
      Math.min(1, averageResultCount / 8) * 25 +
      Math.max(0, 1 - averageLatencyMs / 8_000) * 20 +
      (1 - duplicateRate) * 10 -
      timeoutRate * 20
  );

  let state: SourceQualityState = "active";
  let retryAt: number | undefined;
  if (requestCount < 8) {
    state = "warming";
  } else if (
    timeoutRate >= 0.75 ||
    (successRate < 0.25 && timeoutRate >= 0.4)
  ) {
    retryAt = Number(stats.lastRequestedAt || 0) + SOURCE_PROBE_COOLDOWN_MS;
    state = retryAt <= now ? "probe" : "disabled";
  } else if (
    score < 45 ||
    successRate < 0.6 ||
    averageLatencyMs > 8_000 ||
    duplicateRate > 0.8
  ) {
    state = "degraded";
  }

  return {
    sourceKey: stats.sourceKey,
    score,
    state,
    sampleCount: requestCount,
    successRate,
    timeoutRate,
    duplicateRate,
    averageResultCount,
    averageLatencyMs,
    maxVariants: state === "degraded" || state === "probe" ? 1 : 3,
    timeoutMs:
      state === "degraded" || state === "probe" ? 4_000 : undefined,
    ...(retryAt ? { retryAt } : {}),
  };
}

function sourceStatsFromRow(row: Record<string, any>): SourceQualityStats {
  return {
    sourceKey: String(row.source_key || "unknown"),
    requestCount: Number(row.request_count || 0),
    successCount: Number(row.success_count || 0),
    errorCount: Number(row.error_count || 0),
    resultCount: Number(row.result_count || 0),
    uniqueResultCount: Number(row.unique_result_count || row.result_count || 0),
    duplicateCount: Number(row.duplicate_count || 0),
    emptyCount: Number(row.empty_count || 0),
    timeoutCount: Number(row.timeout_count || 0),
    cachedCount: Number(row.cached_count || 0),
    latencyMs: Number(row.latency_ms || 0),
    lastRequestedAt: Number(row.last_requested_at || 0),
  };
}

let sourcePolicyCache:
  | { expiresAt: number; value: Record<string, SourceQualityPolicy> }
  | undefined;

export function clearSourceQualityPolicyCache(): void {
  sourcePolicyCache = undefined;
}

export async function getSourceQualityPolicies(
  database: D1DatabaseLike | undefined,
  days = 7,
  now = Date.now()
): Promise<Record<string, SourceQualityPolicy>> {
  if (!database) return {};
  if (sourcePolicyCache && sourcePolicyCache.expiresAt > now) {
    return sourcePolicyCache.value;
  }
  const safeDays = Math.max(1, Math.min(31, Math.round(days)));
  const since = shanghaiDay(now - (safeDays - 1) * 24 * 60 * 60 * 1_000);
  const response = await database
    .prepare(
      `SELECT source_key,
              SUM(request_count) AS request_count,
              SUM(success_count) AS success_count,
              SUM(error_count) AS error_count,
              SUM(result_count) AS result_count,
              SUM(unique_result_count) AS unique_result_count,
              SUM(duplicate_count) AS duplicate_count,
              SUM(empty_count) AS empty_count,
              SUM(timeout_count) AS timeout_count,
              SUM(cached_count) AS cached_count,
              SUM(latency_ms) AS latency_ms,
              MAX(last_requested_at) AS last_requested_at
       FROM source_performance_daily
       WHERE day >= ? GROUP BY source_key`
    )
    .bind(since)
    .all<Record<string, any>>();
  const policies = Object.fromEntries(
    (response.results || []).map((row) => {
      const policy = calculateSourceQualityPolicy(sourceStatsFromRow(row), now);
      return [normalizeSourceKey(policy.sourceKey).toLowerCase(), policy];
    })
  );
  sourcePolicyCache = {
    expiresAt: now + SOURCE_POLICY_CACHE_MS,
    value: policies,
  };
  return policies;
}

export async function recordResultClick(
  database: D1DatabaseLike | undefined,
  input: ResultClickInput,
  now = Date.now()
): Promise<boolean> {
  if (!database || !(await claimEvent(database, input.eventId, now))) return false;
  const normalizedUrl = normalizeLinkHealthUrl(input.url);
  if (!normalizedUrl) return false;
  const urlHash = await sha256Hex(normalizedUrl);
  const platform = getLinkPlatform(normalizedUrl) || normalizeSourceKey(input.platform || "others");
  const query = normalizeQualityQuery(input.query || "");
  const title = String(input.title || "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
  const day = shanghaiDay(now);
  const statements: D1StatementLike[] = [
    database
      .prepare(
        `INSERT INTO result_click_daily
           (day, url_hash, platform, title, click_count, last_clicked_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(day, url_hash) DO UPDATE SET
           platform = excluded.platform,
           title = CASE WHEN excluded.title = '' THEN title ELSE excluded.title END,
           click_count = click_count + 1,
           last_clicked_at = excluded.last_clicked_at`
      )
      .bind(day, urlHash, platform, title, now),
    database
      .prepare(
        `UPDATE search_quality_daily
         SET click_count = click_count + 1, updated_at = ?
         WHERE day = ?`
      )
      .bind(now, day),
  ];
  if (query) {
    statements.push(
      database
        .prepare(
          `UPDATE search_query_daily
           SET click_count = click_count + 1
           WHERE day = ? AND query = ?`
        )
        .bind(day, query)
    );
  }
  if (platform !== "magnet") {
    statements.push(
      database
        .prepare(
          `INSERT INTO link_health_checks
             (url_hash, normalized_url, original_url, platform, status,
              reason, confidence, http_status, failure_streak, checked_at,
              next_check_at, first_seen_at, last_seen_at, last_alive_at,
              click_count, report_count, last_clicked_at)
           VALUES (?, ?, ?, ?, 'unknown', '', 0, 0, 0, 0, ?, ?, ?, 0, 1, 0, ?)
           ON CONFLICT(url_hash) DO UPDATE SET
             click_count = click_count + 1,
             last_clicked_at = excluded.last_clicked_at,
             last_seen_at = excluded.last_seen_at,
             next_check_at = CASE
               WHEN link_health_checks.status IN ('unknown', 'suspect')
               THEN MIN(link_health_checks.next_check_at, excluded.next_check_at)
               ELSE link_health_checks.next_check_at
             END`
        )
        .bind(urlHash, normalizedUrl, input.url.slice(0, 2_048), platform, now, now, now, now)
    );
  }
  await runStatements(database, statements);
  return true;
}

export function friendlySourceName(value: string): string {
  const key = normalizeSourceKey(value).toLowerCase();
  const names: Record<string, string> = {
    "精选资料库": "精选资料库",
    "好搜聚合": "综合搜索",
    "影视速搜": "影视搜索",
    "影视直达": "影视直达",
    "资源补充": "补充索引",
    "磁力索引": "磁力索引",
    "全网索引": "全网索引",
    pansearch: "网盘索引",
    nyaa: "动漫索引",
    solidtorrents: "磁力补充",
    "6v电影": "6v电影",
    "电影港": "电影港",
    eztv: "EZTV",
    tg: "频道索引",
  };
  return names[key] || (/^(library|rolling)-\d+$/i.test(key) ? "公开资料索引" : "补充索引");
}

export async function getSearchQualitySummary(
  database: D1DatabaseLike,
  days = 7,
  includeQueries = false,
  now = Date.now()
) {
  const safeDays = Math.max(1, Math.min(31, Math.round(days)));
  const since = shanghaiDay(now - (safeDays - 1) * 24 * 60 * 60 * 1_000);
  const [totals, sources, queries, health, snapshots, transitions] = await Promise.all([
    database
      .prepare(
        `SELECT COALESCE(SUM(search_count), 0) AS search_count,
                COALESCE(SUM(no_result_count), 0) AS no_result_count,
                COALESCE(SUM(result_count), 0) AS result_count,
                COALESCE(SUM(latency_ms), 0) AS latency_ms,
                COALESCE(SUM(click_count), 0) AS click_count,
                COALESCE(SUM(latency_le_500), 0) AS latency_le_500,
                COALESCE(SUM(latency_le_1000), 0) AS latency_le_1000,
                COALESCE(SUM(latency_le_2000), 0) AS latency_le_2000,
                COALESCE(SUM(latency_le_5000), 0) AS latency_le_5000,
                COALESCE(SUM(latency_le_10000), 0) AS latency_le_10000,
                COALESCE(SUM(latency_over_10000), 0) AS latency_over_10000
         FROM search_quality_daily WHERE day >= ?`
      )
      .bind(since)
      .first<Record<string, number>>(),
    database
      .prepare(
        `SELECT source_key,
                SUM(request_count) AS request_count,
                SUM(success_count) AS success_count,
                SUM(error_count) AS error_count,
                SUM(result_count) AS result_count,
                SUM(unique_result_count) AS unique_result_count,
                SUM(duplicate_count) AS duplicate_count,
                SUM(empty_count) AS empty_count,
                SUM(timeout_count) AS timeout_count,
                SUM(cached_count) AS cached_count,
                SUM(latency_ms) AS latency_ms,
                MAX(last_requested_at) AS last_requested_at
         FROM source_performance_daily
         WHERE day >= ? GROUP BY source_key
         ORDER BY request_count DESC`
      )
      .bind(since)
      .all<Record<string, any>>(),
    includeQueries
      ? database
          .prepare(
            `SELECT query, SUM(search_count) AS search_count,
                    SUM(no_result_count) AS no_result_count,
                    SUM(result_count) AS result_count,
                    SUM(click_count) AS click_count
             FROM search_query_daily
             WHERE day >= ? GROUP BY query
             ORDER BY search_count DESC, query ASC LIMIT 50`
          )
          .bind(since)
          .all<Record<string, any>>()
      : Promise.resolve({ results: [] }),
    database
      .prepare(
        `SELECT COUNT(*) AS total_count,
                SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) AS alive_count,
                SUM(CASE WHEN status = 'password' THEN 1 ELSE 0 END) AS password_count,
                SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) AS dead_count,
                SUM(CASE WHEN status = 'suspect' THEN 1 ELSE 0 END) AS suspect_count,
                SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END) AS unknown_count,
                SUM(CASE WHEN next_check_at <= ? THEN 1 ELSE 0 END) AS due_count
         FROM link_health_checks`
      )
      .bind(now)
      .first<Record<string, number>>()
      .catch(() => null),
    database
      .prepare(
        `SELECT day, resource_count, alive_count, password_count,
                unknown_count, dead_count, due_check_count, recorded_at
         FROM operations_snapshot_daily
         WHERE day >= ? ORDER BY day ASC`
      )
      .bind(since)
      .all<Record<string, any>>()
      .catch(() => ({ results: [] })),
    database
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'dead' AND previous_status <> 'dead'
                    THEN 1 ELSE 0 END) AS quarantined_count,
           SUM(CASE WHEN previous_status = 'dead'
                         AND status IN ('alive', 'password')
                    THEN 1 ELSE 0 END) AS revived_count
         FROM link_health_history WHERE checked_at >= ?`
      )
      .bind(now - safeDays * 24 * 60 * 60 * 1_000)
      .first<Record<string, number>>()
      .catch(() => null),
  ]);
  const searchCount = Number(totals?.search_count || 0);
  const sourceRows = (sources.results || []).map((row) => {
    const stats = sourceStatsFromRow(row);
    const policy = calculateSourceQualityPolicy(stats, now);
    return {
      key: stats.sourceKey,
      name: friendlySourceName(stats.sourceKey),
      requestCount: stats.requestCount,
      successRate: policy.successRate,
      resultCount: stats.resultCount,
      uniqueResultCount: stats.uniqueResultCount,
      duplicateRate: policy.duplicateRate,
      emptyRate: ratio(stats.emptyCount, stats.requestCount),
      timeoutRate: policy.timeoutRate,
      cachedRate: ratio(stats.cachedCount, stats.requestCount),
      averageLatencyMs: policy.averageLatencyMs,
      score: policy.score,
      state: policy.state,
      lastRequestedAt: stats.lastRequestedAt,
    };
  });
  const knownHealthCount =
    Number(health?.alive_count || 0) +
    Number(health?.password_count || 0) +
    Number(health?.dead_count || 0);
  const snapshotRows = snapshots.results || [];
  const firstSnapshot = snapshotRows[0];
  const lastSnapshot = snapshotRows[snapshotRows.length - 1];
  return {
    days: safeDays,
    searchCount,
    noResultCount: Number(totals?.no_result_count || 0),
    noResultRate: searchCount
      ? Number(totals?.no_result_count || 0) / searchCount
      : 0,
    averageResultCount: searchCount
      ? Number(totals?.result_count || 0) / searchCount
      : 0,
    averageLatencyMs: searchCount
      ? Math.round(Number(totals?.latency_ms || 0) / searchCount)
      : 0,
    p50LatencyMs: approximateLatencyPercentile(totals, searchCount, 0.5),
    p95LatencyMs: approximateLatencyPercentile(totals, searchCount, 0.95),
    clickCount: Number(totals?.click_count || 0),
    linkHealth: {
      totalCount: Number(health?.total_count || 0),
      knownCount: knownHealthCount,
      validCount:
        Number(health?.alive_count || 0) + Number(health?.password_count || 0),
      validRate: ratio(
        Number(health?.alive_count || 0) + Number(health?.password_count || 0),
        knownHealthCount
      ),
      aliveCount: Number(health?.alive_count || 0),
      passwordCount: Number(health?.password_count || 0),
      deadCount: Number(health?.dead_count || 0),
      suspectCount: Number(health?.suspect_count || 0),
      unknownCount: Number(health?.unknown_count || 0),
      dueCount: Number(health?.due_count || 0),
      quarantinedCount: Number(transitions?.quarantined_count || 0),
      revivedCount: Number(transitions?.revived_count || 0),
    },
    catalog: {
      currentCount: Number(lastSnapshot?.resource_count || 0),
      growth:
        snapshotRows.length > 1
          ? Number(lastSnapshot?.resource_count || 0) -
            Number(firstSnapshot?.resource_count || 0)
          : 0,
      snapshots: snapshotRows,
    },
    sources: sourceRows,
    queries: queries.results || [],
  };
}
