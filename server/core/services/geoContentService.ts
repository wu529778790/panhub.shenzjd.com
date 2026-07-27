import type {
  SeoFaqItem,
  SeoPage,
  SeoReference,
} from "../../../config/seoContent";
import type { D1DatabaseLike } from "../../utils/cloudflareBindings";

interface GeoPageRow {
  slug: string;
  path: string;
  keyword: string;
  category: string;
  intent: string;
  platform: string;
  title: string;
  seo_title: string;
  description: string;
  summary: string;
  answer: string;
  sections_json: string;
  faq_json: string;
  search_examples_json: string;
  references_json: string;
  quality_score: number;
  word_count: number;
  published_at: number;
  updated_at: number;
}

export interface WorkersAiBindingLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface VectorizeBindingLike {
  query(
    vector: number[],
    options: Record<string, unknown>
  ): Promise<{ matches?: Array<{ id: string; score?: number }> }>;
}

function safeJson<T>(value: unknown, fallback: T): T {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed as T;
  } catch {
    return fallback;
  }
}

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updatedDate(value: unknown): string {
  const timestamp = numberValue(value);
  return timestamp > 0
    ? new Date(timestamp).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

function intentLabel(intent: string): string {
  return (
    {
      how_to: "使用方法",
      comparison: "平台对比",
      troubleshooting: "问题处理",
      freshness: "近期更新",
      resource_discovery: "资源查找",
    }[intent] || "资源查找"
  );
}

function relatedGeoPaths(row: GeoPageRow): string[] {
  const platformPaths: Record<string, string> = {
    "115": "/pan/115",
    "夸克网盘": "/pan/quark",
    "阿里云盘": "/pan/aliyun",
    "百度网盘": "/pan/baidu",
    "迅雷云盘": "/pan/xunlei",
    "UC网盘": "/pan/uc",
    "天翼云盘": "/pan/tianyi",
    "123网盘": "/pan/123pan",
    "移动云盘": "/pan/mobile",
  };
  const categoryPaths: Record<string, string> = {
    "电影": "/category/movie",
    "电视剧": "/category/tv",
    "动漫": "/category/animation",
    "学习课程": "/category/education",
    "电子书": "/category/ebooks",
    "软件工具": "/category/software",
    "设计素材": "/category/design",
    "音乐音频": "/category/audio",
    "磁力资源": "/topic/magnet-search",
  };
  const intentPaths: Record<string, string> = {
    "how_to": "/guide/search-tips",
    "comparison": "/guide/platform-filter",
    "troubleshooting": "/guide/no-results",
    "freshness": "/guide/file-version",
    "resource_discovery": "/guide/search-modes",
  };
  return Array.from(
    new Set([
      platformPaths[row.platform],
      categoryPaths[row.category],
      intentPaths[row.intent],
      "/guide/dead-links",
    ].filter((path): path is string => Boolean(path)))
  ).slice(0, 4);
}

function mapGeoPage(row: GeoPageRow): SeoPage {
  const sections = safeJson<SeoPage["sections"]>(row.sections_json, []);
  const faq = safeJson<SeoFaqItem[]>(row.faq_json, []);
  const references = safeJson<SeoReference[]>(row.references_json, []);
  const examples = safeJson<string[]>(row.search_examples_json, []);
  return {
    kind: "guide",
    slug: row.slug,
    path: row.path,
    eyebrow: `${row.category}搜索指南`,
    title: row.title,
    seoTitle: row.seo_title,
    description: row.description,
    summary: row.summary,
    answer: row.answer,
    searchKeyword: row.keyword,
    searchExamples: examples,
    publishedAt: updatedDate(row.published_at || row.updated_at),
    updatedAt: updatedDate(row.updated_at),
    indexable: true,
    facts: [
      { label: "内容分类", value: row.category },
      { label: "搜索意图", value: intentLabel(row.intent) },
      {
        label: "适用平台",
        value: row.platform || "多个网盘平台",
      },
      {
        label: "内容审核",
        value: `${Math.round(numberValue(row.quality_score))} 分`,
      },
    ],
    sections,
    faq,
    references,
    generated: true,
    related: relatedGeoPaths(row),
  };
}

const GEO_PAGE_SELECT = `
  SELECT p.slug, p.path, p.title, p.seo_title, p.description, p.summary,
         p.answer, p.sections_json, p.faq_json, p.search_examples_json,
         p.references_json, p.quality_score, p.word_count, p.updated_at,
         p.published_at,
         k.keyword, k.category, k.intent, k.platform
  FROM geo_pages p
  JOIN geo_keywords k ON k.keyword_id = p.keyword_id
`;

export async function getPublishedGeoPage(
  database: D1DatabaseLike,
  slug: string
): Promise<SeoPage | null> {
  const normalized = String(slug || "").trim().slice(0, 80);
  if (!/^[a-z0-9-]{6,80}$/.test(normalized)) return null;
  const row = await database
    .prepare(
      `${GEO_PAGE_SELECT}
       WHERE p.slug = ? AND p.status = 'published' AND p.quality_score >= 72
       LIMIT 1`
    )
    .bind(normalized)
    .first<GeoPageRow>();
  return row ? mapGeoPage(row) : null;
}

export async function listPublishedGeoPages(
  database: D1DatabaseLike,
  limit = 100
): Promise<SeoPage[]> {
  const response = await database
    .prepare(
      `${GEO_PAGE_SELECT}
       WHERE p.status = 'published' AND p.quality_score >= 72
       ORDER BY p.updated_at DESC
       LIMIT ?`
    )
    .bind(Math.max(1, Math.min(500, Math.round(limit))))
    .all<GeoPageRow>();
  return (response.results || []).map(mapGeoPage);
}

export async function listPublishedGeoSitemapEntries(
  database: D1DatabaseLike,
  limit = 10_000
): Promise<Array<{ path: string; updatedAt: string }>> {
  const response = await database
    .prepare(
      `SELECT path, updated_at
       FROM geo_pages
       WHERE status = 'published' AND quality_score >= 72
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(Math.max(1, Math.min(20_000, Math.round(limit))))
    .all<{ path: string; updated_at: number }>();
  return (response.results || []).map((row) => ({
    path: String(row.path || ""),
    updatedAt: updatedDate(row.updated_at),
  }));
}

export async function requestGeoPipelineRun(
  database: D1DatabaseLike,
  now = Date.now()
): Promise<number> {
  await database
    .prepare(
      `INSERT INTO geo_pipeline_control
         (control_key, control_value, updated_at)
       VALUES ('run_requested_at', ?, ?)
       ON CONFLICT(control_key) DO UPDATE SET
         control_value = excluded.control_value,
         updated_at = excluded.updated_at`
    )
    .bind(String(now), now)
    .run();
  return now;
}

function dayOffset(now: number, offset: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000 + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export async function getGeoOpsReport(
  database: D1DatabaseLike,
  days = 28,
  now = Date.now()
) {
  const safeDays = Math.max(1, Math.min(90, Math.round(days)));
  const since = dayOffset(now, -(safeDays - 1));
  const [
    summary,
    metrics,
    classifications,
    pages,
    jobs,
    runs,
    performance,
    reviewIssues,
  ] = await Promise.all([
    database
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM geo_keywords) AS keyword_count,
           (SELECT COUNT(*) FROM geo_keywords
            WHERE status = 'queued') AS queued_keyword_count,
           (SELECT COUNT(*) FROM geo_pages
            WHERE status = 'published') AS published_page_count,
           (SELECT COUNT(*) FROM geo_pages
            WHERE status = 'rejected') AS rejected_page_count,
           (SELECT AVG(quality_score) FROM geo_pages
            WHERE status = 'published') AS average_quality_score,
           (SELECT COUNT(*) FROM geo_knowledge_documents)
             AS knowledge_document_count,
           (SELECT COUNT(*) FROM geo_knowledge_documents
            WHERE vector_status = 'indexed') AS vector_document_count`
      )
      .first<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT day, keywords_discovered, jobs_processed, pages_published,
                pages_rejected, ai_requests, ai_failures, vector_upserts,
                vector_queries, index_submitted
         FROM geo_metrics_daily
         WHERE day >= ? ORDER BY day`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT category, intent, platform, status, COUNT(*) AS keyword_count,
                ROUND(AVG(opportunity_score), 1) AS opportunity_score,
                SUM(search_count) AS search_count,
                SUM(result_count) AS result_count
         FROM geo_keywords
         GROUP BY category, intent, platform, status
         ORDER BY keyword_count DESC, opportunity_score DESC
         LIMIT 80`
      )
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT p.path, p.title, p.quality_score, p.word_count,
                p.duplicate_score, p.status, p.updated_at,
                k.keyword, k.category, k.platform
         FROM geo_pages p
         JOIN geo_keywords k ON k.keyword_id = p.keyword_id
         ORDER BY p.updated_at DESC LIMIT 50`
      )
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT j.job_id, j.status, j.attempt_count, j.last_error,
                j.created_at, j.updated_at, k.keyword, k.opportunity_score
         FROM geo_content_jobs j
         JOIN geo_keywords k ON k.keyword_id = j.keyword_id
         ORDER BY j.updated_at DESC LIMIT 50`
      )
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT run_id, status, discovered_count, processed_count,
                published_count, rejected_count, error_message,
                started_at, finished_at
         FROM geo_pipeline_runs
         ORDER BY started_at DESC LIMIT 30`
      )
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT p.path, p.title,
                COALESCE(SUM(s.landing_count), 0) AS landings,
                COALESCE(SUM(CASE WHEN s.channel = 'organic'
                                  THEN s.landing_count ELSE 0 END), 0)
                  AS organic_landings,
                COALESCE(SUM(s.search_count), 0) AS searches,
                COALESCE(SUM(s.result_click_count), 0) AS result_clicks
         FROM geo_pages p
         LEFT JOIN seo_landing_daily s
           ON s.landing_path = p.path AND s.day >= ?
         WHERE p.status = 'published'
         GROUP BY p.path, p.title
         ORDER BY organic_landings DESC, landings DESC
         LIMIT 50`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT issues_json, COUNT(*) AS issue_count
         FROM geo_content_reviews
         WHERE decision = 'reject' AND created_at >= ?
         GROUP BY issues_json
         ORDER BY issue_count DESC
         LIMIT 30`
      )
      .bind(now - safeDays * 86_400_000)
      .all<Record<string, unknown>>(),
  ]);
  return {
    generatedAt: now,
    period: { days: safeDays, since, through: dayOffset(now, 0) },
    summary: summary || {},
    metrics: metrics.results || [],
    classifications: classifications.results || [],
    pages: pages.results || [],
    jobs: jobs.results || [],
    runs: runs.results || [],
    performance: performance.results || [],
    reviewIssues: reviewIssues.results || [],
  };
}

async function incrementVectorQueryMetric(
  database: D1DatabaseLike,
  now: number
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO geo_metrics_daily (day, vector_queries, updated_at)
       VALUES (?, 1, ?)
       ON CONFLICT(day) DO UPDATE SET
         vector_queries = vector_queries + 1,
         updated_at = excluded.updated_at`
    )
    .bind(dayOffset(now, 0), now)
    .run();
}

async function knowledgeRowsByIds(
  database: D1DatabaseLike,
  ids: string[]
) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const response = await database
    .prepare(
      `SELECT document_id, title, body, source_url, source_type, updated_at
       FROM geo_knowledge_documents
       WHERE document_id IN (${placeholders})
       LIMIT 10`
    )
    .bind(...ids)
    .all<Record<string, unknown>>();
  const order = new Map(ids.map((id, index) => [id, index]));
  return (response.results || []).sort(
    (left, right) =>
      (order.get(String(left.document_id)) || 0) -
      (order.get(String(right.document_id)) || 0)
  );
}

async function fallbackKnowledgeSearch(
  database: D1DatabaseLike,
  query: string
) {
  const response = await database
    .prepare(
      `SELECT document_id, title, body, source_url, source_type, updated_at
       FROM geo_knowledge_documents
       WHERE instr(title, ?) > 0 OR instr(body, ?) > 0
       ORDER BY updated_at DESC
       LIMIT 10`
    )
    .bind(query, query)
    .all<Record<string, unknown>>();
  return response.results || [];
}

export async function searchGeoKnowledge(
  database: D1DatabaseLike,
  ai: WorkersAiBindingLike | undefined,
  vectorize: VectorizeBindingLike | undefined,
  query: string,
  model = "@cf/baai/bge-m3",
  now = Date.now()
) {
  const normalized = String(query || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (normalized.length < 2) return { mode: "empty", results: [] };
  if (ai && vectorize) {
    try {
      const response = await ai.run(model, {
        queries: [normalized],
        instruction: "检索能够回答中文网盘资源搜索与使用问题的事实材料",
      }) as { data?: number[][] };
      const embedding = response?.data?.[0];
      if (Array.isArray(embedding) && embedding.length > 0) {
        const matches = await vectorize.query(embedding, {
          topK: 10,
          returnMetadata: "none",
          returnValues: false,
        });
        const ids = (matches.matches || []).map((match) => match.id);
        const rows = await knowledgeRowsByIds(database, ids);
        await incrementVectorQueryMetric(database, now);
        return {
          mode: "vector",
          results: rows.map((row) => ({
            ...row,
            body: String(row.body || "").slice(0, 420),
          })),
        };
      }
    } catch {
      // Fallback below provides a useful result while bindings recover.
    }
  }
  const rows = await fallbackKnowledgeSearch(database, normalized);
  return {
    mode: "text",
    results: rows.map((row) => ({
      ...row,
      body: String(row.body || "").slice(0, 420),
    })),
  };
}
