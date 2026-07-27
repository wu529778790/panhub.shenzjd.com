interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta?: { changes?: number } } | unknown>;
}

interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown[]>;
}

interface AiBindingLike {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface VectorizeBindingLike {
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
}

export interface GeoPipelineEnv {
  RESOURCE_DB: D1DatabaseLike;
  AI?: AiBindingLike;
  GEO_VECTOR?: VectorizeBindingLike;
  GEO_TEXT_MODEL?: string;
  GEO_EMBED_MODEL?: string;
  SEO_SITE_URL?: string;
  INDEXNOW_KEY?: string;
}

export interface GeoKeywordClassification {
  category: string;
  intent: string;
  platform: string;
}

export interface GeneratedGeoContent {
  title: string;
  seoTitle: string;
  description: string;
  summary: string;
  answer: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
    points?: string[];
  }>;
  faq: Array<{ question: string; answer: string }>;
  searchExamples: string[];
}

export interface GeoContentAssessment {
  score: number;
  wordCount: number;
  duplicateScore: number;
  keywordRatio: number;
  issues: string[];
  publishable: boolean;
}

interface KeywordSignalRow {
  query: string;
  search_count: number;
  no_result_count: number;
  result_count: number;
  click_count: number;
}

interface KnowledgeDocument {
  document_id: string;
  title: string;
  body: string;
  source_url: string;
}

interface CatalogEvidenceRow {
  title: string;
  type: string;
  category: string;
  status: string;
  last_seen_at: number;
}

interface GeoJobRow {
  job_id: string;
  keyword_id: string;
  keyword: string;
  slug: string;
  category: string;
  intent: string;
  platform: string;
  attempt_count: number;
}

const DEFAULT_TEXT_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const DEFAULT_EMBED_MODEL = "@cf/baai/bge-m3";
const DEFAULT_SITE_URL = "https://haosouku.com";
const DEFAULT_INDEXNOW_KEY = "354ab0e4f5b524289a256cffd8618500";
const MIN_CONTENT_LENGTH = 700;
const MIN_ANSWER_LENGTH = 80;
const MIN_DESCRIPTION_LENGTH = 60;
const MIN_QUALITY_SCORE = 72;
export const GEO_CONTENT_REVISION = 4;

const PLATFORM_CODE_LABELS: Record<string, string> = {
  quark: "夸克网盘",
  xunlei: "迅雷网盘",
  baidu: "百度网盘",
  aliyun: "阿里云盘",
  uc: "UC网盘",
  tianyi: "天翼云盘",
  mobile: "移动云盘",
};

const PLATFORM_PATTERNS: Array<[RegExp, string, string]> = [
  [/115\s*网盘|115盘/i, "115", "115"],
  [/夸克|quark/i, "夸克网盘", "quark"],
  [/阿里云盘|阿里盘/i, "阿里云盘", "aliyun"],
  [/百度网盘|百度盘/i, "百度网盘", "baidu"],
  [/迅雷/i, "迅雷云盘", "xunlei"],
  [/\bUC\b|UC网盘/i, "UC网盘", "uc"],
  [/天翼/i, "天翼云盘", "tianyi"],
  [/123\s*网盘|123盘/i, "123网盘", "123pan"],
  [/移动云盘|和彩云/i, "移动云盘", "mobile"],
];

const CATEGORY_PATTERNS: Array<[RegExp, string, string]> = [
  [/电影|影片|4K|蓝光|原盘|字幕/i, "电影", "movie"],
  [/电视剧|剧集|短剧|美剧|韩剧|日剧|国产剧/i, "电视剧", "tv"],
  [/动漫|动画|番剧|漫画/i, "动漫", "animation"],
  [/课程|教程|考研|雅思|托福|考试|学习/i, "学习课程", "course"],
  [/电子书|图书|小说|有声书/i, "电子书", "ebook"],
  [/软件|工具|插件|安装包|源码/i, "软件工具", "software"],
  [/素材|模板|字体|模型|贴图|音效|预设/i, "设计素材", "design"],
  [/音乐|无损|专辑|歌曲|播客/i, "音乐音频", "audio"],
  [/磁力|torrent|BT/i, "磁力资源", "magnet"],
];

const CATEGORY_SLUGS: Record<string, string> = {
  电影: "movie",
  电视剧: "tv",
  动漫: "animation",
  学习课程: "course",
  电子书: "ebook",
  软件工具: "software",
  设计素材: "design",
  音乐音频: "audio",
  磁力资源: "magnet",
  综合资源: "resource",
};

const INTENT_SLUGS: Record<string, string> = {
  how_to: "guide",
  comparison: "compare",
  troubleshooting: "help",
  freshness: "latest",
  resource_discovery: "search",
};

function stringValue(value: unknown): string {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeGeoKeyword(value: string): string {
  return stringValue(value)
    .toLowerCase()
    .replace(/\p{P}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function classifyGeoKeyword(value: string): GeoKeywordClassification {
  const keyword = stringValue(value);
  const platform =
    PLATFORM_PATTERNS.find(([pattern]) => pattern.test(keyword))?.[1] || "";
  const category =
    CATEGORY_PATTERNS.find(([pattern]) => pattern.test(keyword))?.[1] ||
    "综合资源";
  let intent = "resource_discovery";
  if (/怎么|如何|方法|技巧|教程|指南/i.test(keyword)) intent = "how_to";
  else if (/对比|区别|哪个好|选择/i.test(keyword)) intent = "comparison";
  else if (/失效|打不开|提取码|没有结果|搜不到/i.test(keyword)) {
    intent = "troubleshooting";
  } else if (/最新|更新|近期|新发布/i.test(keyword)) intent = "freshness";
  return { category, intent, platform };
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function geoKeywordSlug(value: string): string {
  const normalized = normalizeGeoKeyword(value);
  const classification = classifyGeoKeyword(normalized);
  const platformSlug =
    PLATFORM_PATTERNS.find(([pattern]) => pattern.test(normalized))?.[2] || "";
  const parts = [
    platformSlug,
    CATEGORY_SLUGS[classification.category] || "resource",
    INTENT_SLUGS[classification.intent] || "search",
    fnv1a(normalized).slice(0, 7),
  ].filter(Boolean);
  return parts.join("-").slice(0, 72);
}

function coreKeyword(value: string): string {
  return stringValue(value)
    .replace(
      /115\s*网盘|夸克网盘?|阿里云盘|百度网盘|迅雷云盘?|UC网盘|天翼云盘|123\s*网盘|移动云盘/gi,
      " "
    )
    .replace(
      /资源搜索|资源怎么找|怎么搜索|如何搜索|搜索技巧|搜索指南|哪里找|最新版|最新资源/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function ftsPhrase(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function platformTypeLabel(value: string): string {
  const normalized = stringValue(value).toLowerCase();
  return PLATFORM_CODE_LABELS[normalized] || stringValue(value);
}

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

async function incrementMetric(
  env: GeoPipelineEnv,
  column:
    | "keywords_discovered"
    | "jobs_processed"
    | "pages_published"
    | "pages_rejected"
    | "ai_requests"
    | "ai_failures"
    | "vector_upserts"
    | "vector_queries"
    | "index_submitted",
  amount: number,
  now = Date.now()
): Promise<void> {
  if (amount <= 0) return;
  const allowed = new Set([
    "keywords_discovered",
    "jobs_processed",
    "pages_published",
    "pages_rejected",
    "ai_requests",
    "ai_failures",
    "vector_upserts",
    "vector_queries",
    "index_submitted",
  ]);
  if (!allowed.has(column)) return;
  await env.RESOURCE_DB.prepare(
    `INSERT INTO geo_metrics_daily (day, ${column}, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       ${column} = ${column} + excluded.${column},
       updated_at = excluded.updated_at`
  )
    .bind(shanghaiDay(now), amount, now)
    .run();
}

export function candidateVariants(row: KeywordSignalRow): string[] {
  const keyword = stringValue(row.query);
  if (keyword.length < 2 || keyword.length > 80) return [];
  const classification = classifyGeoKeyword(keyword);
  const core = coreKeyword(keyword) || keyword;
  if (classification.intent === "resource_discovery") {
    const platform =
      classification.platform === "115"
        ? "115网盘"
        : classification.platform || "网盘";
    return [`${core}${platform}搜索技巧`];
  }
  return [keyword];
}

function opportunityScore(
  searchCount: number,
  noResultCount: number,
  resultCount: number,
  clickCount: number
): number {
  const demand = Math.log2(searchCount + 1) * 18;
  const gap = searchCount > 0 ? (noResultCount / searchCount) * 38 : 0;
  const evidence = Math.min(24, Math.log2(resultCount + 1) * 5);
  const engagement = Math.min(12, Math.log2(clickCount + 1) * 4);
  return Math.round(Math.min(100, demand + gap + evidence + engagement));
}

export async function discoverGeoKeywords(
  env: GeoPipelineEnv,
  now = Date.now(),
  limit = 120
): Promise<number> {
  const searchRows = await env.RESOURCE_DB.prepare(
    `SELECT query,
            SUM(search_count) AS search_count,
            SUM(no_result_count) AS no_result_count,
            SUM(result_count) AS result_count,
            SUM(click_count) AS click_count
     FROM search_query_daily
     WHERE day >= date('now', '-30 days')
       AND length(trim(query)) BETWEEN 2 AND 80
     GROUP BY query
     HAVING SUM(search_count) >= 1
     ORDER BY SUM(search_count) DESC, SUM(no_result_count) DESC
     LIMIT ?`
  )
    .bind(Math.max(10, Math.min(300, limit)))
    .all<KeywordSignalRow>();

  const rows = searchRows.results || [];
  const candidates = new Map<
    string,
    {
      keyword: string;
      row: KeywordSignalRow;
      source: string;
    }
  >();
  for (const row of rows) {
    for (const keyword of candidateVariants(row)) {
      const normalized = normalizeGeoKeyword(keyword);
      if (!normalized) continue;
      candidates.set(normalized, { keyword, row, source: "search_signal" });
    }
  }

  const categoryRows = await env.RESOURCE_DB.prepare(
    `SELECT category, COUNT(*) AS result_count
     FROM resource_catalog
     WHERE status <> 'dead' AND trim(category) <> ''
     GROUP BY category
     HAVING COUNT(*) >= 8
     ORDER BY COUNT(*) DESC
     LIMIT 24`
  ).all<{ category: string; result_count: number }>();
  for (const row of categoryRows.results || []) {
    const category = stringValue(row.category).slice(0, 30);
    if (!category) continue;
    const keyword = `${category}网盘资源怎么找`;
    const normalized = normalizeGeoKeyword(keyword);
    if (!candidates.has(normalized)) {
      candidates.set(normalized, {
        keyword,
        source: "catalog_signal",
        row: {
          query: keyword,
          search_count: 0,
          no_result_count: 0,
          result_count: numberValue(row.result_count),
          click_count: 0,
        },
      });
    }
  }

  const statements: D1StatementLike[] = [];
  for (const [normalized, candidate] of candidates) {
    const classification = classifyGeoKeyword(candidate.keyword);
    const searchCount = numberValue(candidate.row.search_count);
    const noResultCount = numberValue(candidate.row.no_result_count);
    const resultCount = numberValue(candidate.row.result_count);
    const clickCount = numberValue(candidate.row.click_count);
    const demandScore = Math.round(
      Math.min(100, Math.log2(searchCount + 1) * 22 + Math.log2(clickCount + 1) * 6)
    );
    const opportunity = opportunityScore(
      searchCount,
      noResultCount,
      resultCount,
      clickCount
    );
    const keywordId = `kw_${fnv1a(normalized)}`;
    statements.push(
      env.RESOURCE_DB.prepare(
        `INSERT INTO geo_keywords
           (keyword_id, keyword, normalized_keyword, slug, category, intent,
            platform, source, demand_score, opportunity_score, search_count,
            no_result_count, result_count, status, discovered_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered', ?, ?)
         ON CONFLICT(normalized_keyword) DO UPDATE SET
           demand_score = MAX(demand_score, excluded.demand_score),
           opportunity_score = MAX(opportunity_score, excluded.opportunity_score),
           search_count = MAX(search_count, excluded.search_count),
           no_result_count = MAX(no_result_count, excluded.no_result_count),
           result_count = MAX(result_count, excluded.result_count),
           updated_at = excluded.updated_at`
      ).bind(
        keywordId,
        candidate.keyword,
        normalized,
        geoKeywordSlug(candidate.keyword),
        classification.category,
        classification.intent,
        classification.platform,
        candidate.source,
        demandScore,
        opportunity,
        searchCount,
        noResultCount,
        resultCount,
        now,
        now
      )
    );
  }
  for (let index = 0; index < statements.length; index += 40) {
    await env.RESOURCE_DB.batch(statements.slice(index, index + 40));
  }

  const activeQueue = await env.RESOURCE_DB.prepare(
    `SELECT COUNT(*) AS count
     FROM geo_content_jobs
     WHERE status IN ('queued', 'generating', 'reviewing')`
  ).first<{ count: number }>();
  const queueCapacity = Math.max(
    0,
    24 - numberValue(activeQueue?.count)
  );
  if (queueCapacity === 0) return 0;

  const queued = await env.RESOURCE_DB.prepare(
    `INSERT OR IGNORE INTO geo_content_jobs
       (job_id, keyword_id, status, created_at, updated_at)
     SELECT 'job_' || keyword_id, keyword_id, 'queued', ?, ?
     FROM geo_keywords
     WHERE status = 'discovered'
       AND opportunity_score >= 28
       AND result_count > 0
     ORDER BY opportunity_score DESC, demand_score DESC
     LIMIT ?`
  )
    .bind(now, now, queueCapacity)
    .run() as { meta?: { changes?: number } };
  await env.RESOURCE_DB.prepare(
    `UPDATE geo_keywords SET status = 'queued', updated_at = ?
     WHERE keyword_id IN (
       SELECT keyword_id FROM geo_content_jobs WHERE status = 'queued'
     ) AND status = 'discovered'`
  )
    .bind(now)
    .run();

  const discovered = Number(queued?.meta?.changes || 0);
  await incrementMetric(env, "keywords_discovered", discovered, now);
  return discovered;
}

async function upsertKnowledgeDocument(
  env: GeoPipelineEnv,
  document: {
    documentId: string;
    sourceType: string;
    sourceId: string;
    title: string;
    body: string;
    sourceUrl?: string;
    metadata?: Record<string, unknown>;
  },
  now: number
): Promise<void> {
  const hash = fnv1a(`${document.title}\n${document.body}`);
  await env.RESOURCE_DB.prepare(
    `INSERT INTO geo_knowledge_documents
       (document_id, source_type, source_id, title, body, source_url,
        content_hash, metadata_json, vector_status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
     ON CONFLICT(document_id) DO UPDATE SET
       title = excluded.title,
       body = excluded.body,
       source_url = excluded.source_url,
       metadata_json = excluded.metadata_json,
       vector_status = CASE
         WHEN content_hash = excluded.content_hash THEN vector_status
         ELSE 'pending'
       END,
       content_hash = excluded.content_hash,
       updated_at = excluded.updated_at`
  )
    .bind(
      document.documentId,
      document.sourceType,
      document.sourceId,
      document.title,
      document.body,
      document.sourceUrl || "",
      hash,
      JSON.stringify(document.metadata || {}),
      now
    )
    .run();
}

export async function syncGeoKnowledge(
  env: GeoPipelineEnv,
  now = Date.now()
): Promise<number> {
  const rows = await env.RESOURCE_DB.prepare(
    `SELECT category, type,
            COUNT(*) AS total_count,
            SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) AS alive_count,
            SUM(CASE WHEN status = 'password' THEN 1 ELSE 0 END) AS password_count,
            MAX(last_seen_at) AS last_seen_at
     FROM resource_catalog
     WHERE status <> 'dead'
     GROUP BY category, type
     HAVING COUNT(*) >= 3
     ORDER BY COUNT(*) DESC
     LIMIT 180`
  ).all<Record<string, unknown>>();

  for (const row of rows.results || []) {
    const category = stringValue(row.category) || "综合资源";
    const type = stringValue(row.type) || "其他";
    const sourceId = `${category}:${type}`;
    const body = [
      `好搜库公开索引中的分类为${category}，平台或链接类型为${type}。`,
      `当前可用于检索和核对的非失效记录共${numberValue(row.total_count)}条。`,
      `其中已确认可访问${numberValue(row.alive_count)}条，需要提取信息或登录确认${numberValue(row.password_count)}条。`,
      "记录数量会随公开来源更新和链接状态检查变化，页面不承诺某一条分享长期有效。",
    ].join("");
    await upsertKnowledgeDocument(
      env,
      {
        documentId: `catalog_${fnv1a(sourceId)}`,
        sourceType: "catalog_summary",
        sourceId,
        title: `${category}与${type}公开索引概况`,
        body,
        sourceUrl: `${String(env.SEO_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "")}/category`,
        metadata: {
          category,
          platform: type,
          updatedAt: numberValue(row.last_seen_at),
        },
      },
      now
    );
  }

  if (!env.AI || !env.GEO_VECTOR) return rows.results?.length || 0;
  const pending = await env.RESOURCE_DB.prepare(
    `SELECT document_id, title, body, source_url
     FROM geo_knowledge_documents
     WHERE vector_status = 'pending'
     ORDER BY updated_at DESC
     LIMIT 32`
  ).all<KnowledgeDocument>();
  const documents = pending.results || [];
  if (documents.length === 0) return rows.results?.length || 0;

  try {
    const response = await env.AI.run(
      env.GEO_EMBED_MODEL || DEFAULT_EMBED_MODEL,
      { text: documents.map((document) => `${document.title}\n${document.body}`) }
    ) as { data?: number[][] };
    const vectors = Array.isArray(response?.data) ? response.data : [];
    const upserts = documents.flatMap((document, index) => {
      const values = vectors[index];
      return Array.isArray(values) && values.length > 0
        ? [{
            id: document.document_id,
            values,
            metadata: { sourceType: "knowledge", updatedAt: now },
          }]
        : [];
    });
    if (upserts.length > 0) {
      await env.GEO_VECTOR.upsert(upserts);
      await env.RESOURCE_DB.batch(
        upserts.map((vector) =>
          env.RESOURCE_DB.prepare(
            `UPDATE geo_knowledge_documents
             SET vector_status = 'indexed', indexed_at = ?
             WHERE document_id = ?`
          ).bind(now, vector.id)
        )
      );
      await incrementMetric(env, "vector_upserts", upserts.length, now);
    }
  } catch {
    await env.RESOURCE_DB.batch(
      documents.map((document) =>
        env.RESOURCE_DB.prepare(
          `UPDATE geo_knowledge_documents SET vector_status = 'failed'
           WHERE document_id = ?`
        ).bind(document.document_id)
      )
    );
  }
  return rows.results?.length || 0;
}

async function retrieveKnowledge(
  env: GeoPipelineEnv,
  keyword: string,
  now = Date.now()
): Promise<KnowledgeDocument[]> {
  const catalogEvidence = await retrieveCatalogEvidence(env, keyword);
  if (catalogEvidence.length > 0) return catalogEvidence;
  const ids: string[] = [];
  if (env.AI && env.GEO_VECTOR) {
    try {
      const response = await env.AI.run(
        env.GEO_EMBED_MODEL || DEFAULT_EMBED_MODEL,
        {
          queries: [keyword],
          instruction: "检索能够回答中文网盘资源搜索与使用问题的事实材料",
        }
      ) as { data?: number[][] };
      const vector = response?.data?.[0];
      if (Array.isArray(vector) && vector.length > 0) {
        const matches = await env.GEO_VECTOR.query(vector, {
          topK: 8,
          returnMetadata: "none",
          returnValues: false,
        });
        ids.push(...(matches.matches || []).map((match) => match.id));
        await incrementMetric(env, "vector_queries", 1, now);
      }
    } catch {
      // D1 fallback below keeps the publishing pipeline available.
    }
  }

  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const response = await env.RESOURCE_DB.prepare(
      `SELECT document_id, title, body, source_url
       FROM geo_knowledge_documents
       WHERE document_id IN (${placeholders})
       LIMIT 8`
    )
      .bind(...ids)
      .all<KnowledgeDocument>();
    if ((response.results || []).length > 0) {
      return mergeKnowledgeDocuments(
        catalogEvidence,
        response.results || []
      );
    }
  }

  const core = coreKeyword(keyword);
  const classification = classifyGeoKeyword(keyword);
  const fallback = await env.RESOURCE_DB.prepare(
    `SELECT document_id, title, body, source_url
     FROM geo_knowledge_documents
     WHERE instr(title, ?) > 0
        OR instr(body, ?) > 0
        OR instr(title, ?) > 0
        OR instr(body, ?) > 0
     ORDER BY updated_at DESC
     LIMIT 8`
  )
    .bind(
      core || keyword,
      core || keyword,
      classification.category,
      classification.platform || classification.category
    )
    .all<KnowledgeDocument>();
  return mergeKnowledgeDocuments(catalogEvidence, fallback.results || []);
}

function mergeKnowledgeDocuments(
  primary: KnowledgeDocument[],
  secondary: KnowledgeDocument[]
): KnowledgeDocument[] {
  const output = new Map<string, KnowledgeDocument>();
  for (const document of [...primary, ...secondary]) {
    if (!document.document_id || output.has(document.document_id)) continue;
    output.set(document.document_id, {
      ...document,
      title: removeUnsupportedAggregateSentences(document.title),
      body: removeUnsupportedAggregateSentences(document.body),
    });
    if (output.size >= 8) break;
  }
  return Array.from(output.values());
}

async function retrieveCatalogEvidence(
  env: GeoPipelineEnv,
  keyword: string
): Promise<KnowledgeDocument[]> {
  const term = coreKeyword(keyword) || stringValue(keyword);
  if (Array.from(term).length < 2) return [];
  try {
    let rows: CatalogEvidenceRow[] = [];
    try {
      const response = await env.RESOURCE_DB.prepare(
        `SELECT c.title, c.type, c.category, c.status, c.last_seen_at
         FROM resource_catalog_fts
         JOIN resource_catalog c ON c.rowid = resource_catalog_fts.rowid
         WHERE resource_catalog_fts MATCH ?
           AND c.status <> 'dead'
           AND NOT EXISTS (
             SELECT 1 FROM link_health h
             WHERE h.normalized_url = c.normalized_url
               AND h.status = 'dead'
           )
         ORDER BY
           CASE WHEN c.title = ? THEN 0 ELSE 1 END,
           bm25(resource_catalog_fts),
           c.last_seen_at DESC
         LIMIT 16`
      )
        .bind(ftsPhrase(term), term)
        .all<CatalogEvidenceRow>();
      rows = response.results || [];
    } catch {
      // A bounded LIKE fallback keeps keyword-level evidence available if FTS
      // is temporarily rebuilding or rejects a short phrase.
    }
    if (rows.length === 0) {
      const response = await env.RESOURCE_DB.prepare(
        `SELECT c.title, c.type, c.category, c.status, c.last_seen_at
         FROM resource_catalog c
         WHERE c.title LIKE ? ESCAPE '\\'
           AND c.status <> 'dead'
           AND NOT EXISTS (
             SELECT 1 FROM link_health h
             WHERE h.normalized_url = c.normalized_url
               AND h.status = 'dead'
           )
         ORDER BY
           CASE WHEN c.title = ? THEN 0 ELSE 1 END,
           c.last_seen_at DESC
         LIMIT 16`
      )
        .bind(`%${term.replace(/[\\%_]/g, "\\$&")}%`, term)
        .all<CatalogEvidenceRow>();
      rows = response.results || [];
    }
    if (rows.length === 0) return [];

    const titles = Array.from(
      new Set(
        rows
          .map((row) => stringValue(row.title).slice(0, 120))
          .filter(Boolean)
      )
    ).slice(0, 8);
    const types = Array.from(
      new Set(rows.map((row) => platformTypeLabel(row.type)).filter(Boolean))
    ).slice(0, 6);
    const categories = Array.from(
      new Set(rows.map((row) => stringValue(row.category)).filter(Boolean))
    ).slice(0, 4);
    const siteUrl = String(env.SEO_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
    return [{
      document_id: `query_${fnv1a(normalizeGeoKeyword(term))}`,
      title: `“${term}”的站内公开索引检索快照`,
      body: [
        `站内公开索引中与“${term}”直接匹配的标题写法包括：${titles.join("；")}。`,
        types.length > 0 ? `匹配记录涉及${types.join("、")}。` : "",
        categories.length > 0 ? `现有索引分类包括${categories.join("、")}。` : "",
        "这些信息只用于核对名称、年份、季数、版本和平台写法，不代表任一分享链接会长期有效。",
      ].filter(Boolean).join(""),
      source_url: `${siteUrl}/?q=${encodeURIComponent(term)}`,
    }];
  } catch {
    return [];
  }
}

function extractJson(value: string): Record<string, unknown> {
  const trimmed = value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response is not JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

export function extractGeneratedGeoJson(
  value: unknown
): Record<string, unknown> {
  if (typeof value === "string") return extractJson(value);
  if (!value || typeof value !== "object") {
    throw new Error("AI response is not JSON");
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      try {
        return extractGeneratedGeoJson(item);
      } catch {
        // Continue through structured content blocks.
      }
    }
    throw new Error("AI response is not JSON");
  }

  const object = value as Record<string, unknown>;
  if (
    "title" in object ||
    "sections" in object ||
    "answer" in object
  ) {
    return object;
  }

  const choices = Array.isArray(object.choices) ? object.choices : [];
  const firstChoice = (choices[0] || {}) as Record<string, unknown>;
  const message = (firstChoice.message || {}) as Record<string, unknown>;
  const candidates = [
    object.response,
    object.output_text,
    object.result,
    message.content,
    message.reasoning_content,
    object.reasoning,
    object.text,
    object.content,
    firstChoice.text,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === value) {
      continue;
    }
    try {
      return extractGeneratedGeoJson(candidate);
    } catch {
      // Try the next response shape supported by Workers AI.
    }
  }
  throw new Error("AI response is not JSON");
}

function stringArray(value: unknown, limit: number, maximum: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => stringValue(item).slice(0, maximum))
    .filter(Boolean)
    .slice(0, limit);
}

export function sanitizeGeneratedGeoContent(
  raw: Record<string, unknown>,
  keyword: string
): GeneratedGeoContent {
  const sections = Array.isArray(raw.sections)
    ? raw.sections
        .map((item) => {
          const section = (item || {}) as Record<string, unknown>;
          const title = stringValue(section.title).slice(0, 48);
          const paragraphs = stringArray(section.paragraphs, 4, 360);
          const points = stringArray(section.points, 6, 120);
          return title && paragraphs.length > 0
            ? { title, paragraphs, ...(points.length > 0 ? { points } : {}) }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 6)
    : [];
  const faq = Array.isArray(raw.faq)
    ? raw.faq
        .map((item) => {
          const entry = (item || {}) as Record<string, unknown>;
          const question = stringValue(entry.question).slice(0, 100);
          const answer = stringValue(entry.answer).slice(0, 360);
          return question && answer ? { question, answer } : null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 5)
    : [];
  return {
    title: stringValue(raw.title || keyword).slice(0, 68),
    seoTitle: stringValue(raw.seoTitle || `${keyword} - 好搜库`).slice(0, 78),
    description: stringValue(raw.description).slice(0, 160),
    summary: stringValue(raw.summary).slice(0, 220),
    answer: stringValue(raw.answer).slice(0, 900),
    sections,
    faq,
    searchExamples: stringArray(raw.searchExamples, 8, 80),
  };
}

function replacePlatformCodes(value: string): string {
  let output = stringValue(value);
  for (const [code, label] of Object.entries(PLATFORM_CODE_LABELS)) {
    output = output.replace(new RegExp(`\\b${code}\\b`, "gi"), label);
  }
  return output;
}

function removeUnsupportedAggregateSentences(value: string): string {
  return replacePlatformCodes(value)
    .split(/(?<=[。！？!?])/u)
    .filter(
      (sentence) =>
        !/\d{1,9}\s*条(?:记录|链接|索引|资源|数据)?/.test(sentence) &&
        !/(?:均|全部|全都)(?:不可访问|已经失效)/.test(sentence) &&
        !/(?:其他|该|此)平台暂无可用链接/.test(sentence) &&
        !/(?:不同|各)平台.{0,24}(?:记录数量|收录情况|索引数据|可访问性).{0,18}(?:差异|不同|更多|较多)/.test(
          sentence
        ) &&
        !/(?:平台|网盘).{0,24}(?:记录数量|收录情况|索引数据|可访问性).{0,18}(?:差异|不同|更多|较多)/.test(
          sentence
        )
    )
    .join("")
    .trim();
}

export function finalizeGeneratedGeoContent(
  content: GeneratedGeoContent,
  keyword: string
): GeneratedGeoContent {
  const core = coreKeyword(keyword) || stringValue(keyword);
  const classification = classifyGeoKeyword(keyword);
  const platform = classification.platform
    ? `，需要指定平台时再加入“${classification.platform}”`
    : "";
  const cleaned: GeneratedGeoContent = {
    ...content,
    title: removeUnsupportedAggregateSentences(content.title),
    seoTitle: removeUnsupportedAggregateSentences(content.seoTitle),
    description: removeUnsupportedAggregateSentences(content.description),
    summary: removeUnsupportedAggregateSentences(content.summary),
    answer: removeUnsupportedAggregateSentences(content.answer),
    sections: content.sections.map((section) => ({
      ...section,
      title: removeUnsupportedAggregateSentences(section.title),
      paragraphs: section.paragraphs
        .map(removeUnsupportedAggregateSentences)
        .filter(Boolean),
      ...(section.points
        ? {
            points: section.points
              .map(removeUnsupportedAggregateSentences)
              .filter(Boolean),
          }
        : {}),
    })).filter((section) => section.title && section.paragraphs.length > 0),
    faq: content.faq
      .map((item) => ({
        question: removeUnsupportedAggregateSentences(item.question),
        answer: removeUnsupportedAggregateSentences(item.answer),
      }))
      .filter((item) => item.question && item.answer),
    searchExamples: content.searchExamples
      .map(removeUnsupportedAggregateSentences)
      .filter(Boolean),
  };
  if (cleaned.description.length < MIN_DESCRIPTION_LENGTH) {
    cleaned.description =
      `整理${core}的公开索引搜索方法，说明关键词拆分、年份与版本筛选、平台过滤、失效链接判断和安全核对步骤，帮助减少无关结果与重复尝试。`;
  }
  if (cleaned.answer.length < MIN_ANSWER_LENGTH) {
    cleaned.answer =
      `查找${core}时，先用完整名称搜索，再根据结果逐步加入年份、季数、作者、版本或文件格式${platform}。打开结果后核对标题、目录和分享页状态；登录提示不等于失效，只有明确显示分享取消或文件不存在时再提交失效反馈。`;
  }
  const examples = [
    ...cleaned.searchExamples,
    core,
    `${core} 年份 版本`,
    `${core} 字幕 格式`,
    `${core} 网盘`,
  ];
  cleaned.searchExamples = Array.from(new Set(examples))
    .filter(Boolean)
    .slice(0, 8);
  return cleaned;
}

async function generateContent(
  env: GeoPipelineEnv,
  job: GeoJobRow,
  evidence: KnowledgeDocument[],
  now: number
): Promise<GeneratedGeoContent> {
  if (!env.AI) throw new Error("Workers AI binding is unavailable");
  const evidenceText = evidence
    .map(
      (document, index) =>
        `[材料${index + 1}] ${document.title}\n${document.body}`
    )
    .join("\n\n")
    .slice(0, 8_000);
  const prompt = [
    "你是好搜库的中文内容编辑。根据给定关键词和材料，写一篇帮助用户更准确搜索公开网盘索引的实用指南。",
    "只能引用材料能支持的事实。不要虚构具体资源、数量、更新时间或可用状态。不要承诺一定能找到或下载。",
    "文案简洁自然，不使用营销套话，不写“在数字化时代”“一站式”“无缝”“赋能”等表达。",
    "不要堆砌关键词。关键词自然出现2到5次即可。不要使用长破折号。",
    "材料里的分类总量和平台总量不是该关键词的命中数量。正文不要引用任何记录数、链接数或资源数，也不要据此判断某个平台有无该关键词资源。",
    "不要根据平台总量推荐优先搜索哪个平台。材料不是关键词级结果，不能写某个平台可能有或没有该关键词资源。",
    "不要输出quark、xunlei、baidu、aliyun等内部代码，平台名称使用夸克网盘、迅雷网盘、百度网盘、阿里云盘等中文名称。",
    "全文写900到1300个中文字符。description写70到120字，answer写100到180字并直接回答问题。",
    "sections提供可执行步骤、筛选方法、失效链接处理和安全提醒。每节写2到3段，每段80到160字。",
    "输出严格JSON，字段为title、seoTitle、description、summary、answer、sections、faq、searchExamples。",
    "sections为3到5项，每项包含title、paragraphs数组和可选points数组。faq为2到4项，每项包含question和answer。",
    `关键词：${job.keyword}`,
    `分类：${job.category}`,
    `搜索意图：${job.intent}`,
    `平台：${job.platform || "未限定"}`,
    `事实材料：\n${evidenceText || "暂无足够材料，保持保守表述，只提供通用搜索方法。"}`,
  ].join("\n\n");
  await incrementMetric(env, "ai_requests", 1, now);
  try {
    const response = await env.AI.run(
      env.GEO_TEXT_MODEL || DEFAULT_TEXT_MODEL,
      {
        messages: [
          {
            role: "system",
            content:
              "/no_think\n只输出符合要求的JSON对象，不输出Markdown代码块。",
          },
          { role: "user", content: `/no_think\n${prompt}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 3200,
        repetition_penalty: 1.08,
      }
    );
    return finalizeGeneratedGeoContent(
      sanitizeGeneratedGeoContent(
        extractGeneratedGeoJson(response),
        job.keyword
      ),
      job.keyword
    );
  } catch (error) {
    await incrementMetric(env, "ai_failures", 1, now);
    throw error;
  }
}

function contentText(content: GeneratedGeoContent): string {
  return [
    content.title,
    content.description,
    content.summary,
    content.answer,
    ...content.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.points || []),
    ]),
    ...content.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");
}

function keywordEvaluationText(content: GeneratedGeoContent): string {
  return [
    content.title,
    content.description,
    content.summary,
    content.answer,
    ...content.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.points || []),
    ]),
    ...content.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");
}

function characterBigrams(value: string): Set<string> {
  const normalized = normalizeGeoKeyword(value).replace(/\s+/g, "");
  const output = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    output.add(normalized.slice(index, index + 2));
    if (output.size >= 2_000) break;
  }
  return output;
}

export function contentSimilarity(left: string, right: string): number {
  const leftSet = characterBigrams(left);
  const rightSet = characterBigrams(right);
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  let overlap = 0;
  for (const item of leftSet) if (rightSet.has(item)) overlap += 1;
  const union = leftSet.size + rightSet.size - overlap;
  return union > 0 ? overlap / union : 0;
}

export function assessGeoContent(
  content: GeneratedGeoContent,
  keyword: string,
  evidenceCount: number,
  duplicateScore = 0
): GeoContentAssessment {
  const text = contentText(content);
  const compact = text.replace(/\s+/g, "");
  const keywordText = keywordEvaluationText(content).replace(/\s+/g, "");
  const normalizedKeyword = normalizeGeoKeyword(keyword).replace(/\s+/g, "");
  const occurrences = normalizedKeyword
    ? keywordText.toLowerCase().split(normalizedKeyword).length - 1
    : 0;
  const keywordRatio =
    keywordText.length > 0 && normalizedKeyword
      ? (occurrences * normalizedKeyword.length) / keywordText.length
      : 0;
  const wordCount = compact.length;
  const promiseComparable = text.replace(
    /(?:不|无法|不能|难以)(?:作出)?(?:保证|确保|承诺)/g,
    ""
  );
  const hasUnsupportedPromise =
    /(?:保证|确保|承诺).{0,12}(?:找到|可用|有效|下载)|百分百|全网最全|永久免费|一定能找到/.test(
      promiseComparable
    );
  const hasAggregateCountClaim =
    /\d{1,9}\s*条(?:记录|链接|索引|资源)?/.test(text) ||
    /(?:其他|该|此)平台暂无可用链接/.test(text);
  const hasInternalPlatformCode =
    /\b(?:quark|xunlei|baidu|aliyun)\b/i.test(text);
  const hasUnsupportedAvailabilityInference =
    /(?:平台|网盘).{0,24}(?:可能存在|可能有).{0,24}(?:资源|内容)/.test(text) ||
    /优先.{0,16}(?:记录|索引).{0,12}(?:多|较多).{0,8}平台/.test(text) ||
    /(?:不同|各)平台.{0,24}(?:记录数量|收录情况|索引数据|可访问性).{0,18}(?:差异|不同|更多|较多)/.test(
      text
    );
  const issues: string[] = [];
  const hasKeywordStuffing =
    occurrences > 8 || (occurrences > 5 && keywordRatio > 0.06);
  let score = 0;
  score += Math.min(24, Math.round((wordCount / 900) * 24));
  score += Math.min(16, content.sections.length * 4);
  score += Math.min(10, content.faq.length * 3);
  score += Math.min(18, evidenceCount * 5);
  score += content.answer.length >= 80 ? 10 : 4;
  score += content.description.length >= 60 ? 6 : 2;
  score += Math.max(0, Math.round((1 - duplicateScore) * 16));

  if (wordCount < MIN_CONTENT_LENGTH) issues.push("内容长度不足");
  if (content.sections.length < 3) issues.push("正文结构不足");
  if (content.faq.length < 2) issues.push("常见问题不足");
  if (evidenceCount < 1) issues.push("缺少可核对材料");
  if (duplicateScore >= 0.72) issues.push("与已发布页面过于相似");
  if (hasKeywordStuffing) {
    score -= 18;
    issues.push("关键词重复比例过高");
  }
  if (hasUnsupportedPromise) {
    score -= 18;
    issues.push("存在无法证实的承诺");
  }
  if (hasAggregateCountClaim) {
    score -= 20;
    issues.push("把聚合统计写成关键词结果");
  }
  if (hasInternalPlatformCode) {
    score -= 10;
    issues.push("包含内部平台代码");
  }
  if (hasUnsupportedAvailabilityInference) {
    score -= 18;
    issues.push("从聚合材料推断关键词可用性");
  }
  if (/在数字化时代|一站式|无缝|赋能|开启.*新篇章/.test(text)) {
    score -= 10;
    issues.push("存在模板化文案");
  }
  if (/[—–]/.test(text)) {
    score -= 4;
    issues.push("包含不符合品牌文风的破折号");
  }
  if (content.answer.length < MIN_ANSWER_LENGTH) {
    issues.push("直接回答过短");
  }
  if (content.description.length < MIN_DESCRIPTION_LENGTH) {
    issues.push("页面描述过短");
  }
  if (content.searchExamples.length < 3) {
    issues.push("搜索示例不足");
  }
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: finalScore,
    wordCount,
    duplicateScore: Math.round(duplicateScore * 10_000) / 10_000,
    keywordRatio: Math.round(keywordRatio * 10_000) / 10_000,
    issues,
    publishable:
      finalScore >= MIN_QUALITY_SCORE &&
      wordCount >= MIN_CONTENT_LENGTH &&
      evidenceCount >= 1 &&
      duplicateScore < 0.72 &&
      !hasKeywordStuffing &&
      !hasUnsupportedPromise &&
      !hasAggregateCountClaim &&
      !hasInternalPlatformCode &&
      !hasUnsupportedAvailabilityInference &&
      content.answer.length >= MIN_ANSWER_LENGTH &&
      content.description.length >= MIN_DESCRIPTION_LENGTH &&
      content.searchExamples.length >= 3,
  };
}

async function repairGeoContent(
  env: GeoPipelineEnv,
  job: GeoJobRow,
  evidence: KnowledgeDocument[],
  content: GeneratedGeoContent,
  assessment: GeoContentAssessment,
  now: number
): Promise<GeneratedGeoContent> {
  if (!env.AI) return content;
  const evidenceText = evidence
    .map(
      (document, index) =>
        `[材料${index + 1}] ${document.title}\n${document.body}`
    )
    .join("\n\n")
    .slice(0, 6_000);
  const prompt = [
    "你是好搜库的中文内容终审编辑。下面这篇搜索指南没有通过自动审核，请在不改变主题的前提下完整重写。",
    `审核问题：${assessment.issues.join("；") || "质量分不足"}`,
    "只能使用所给材料支持的事实。删除无法证实的数量、可用性推断、平台优先级和结果承诺。",
    "全文写1000到1400个中文字符。description写70到120字；answer写110到180字，并先给结论。",
    "sections写4到5节，每节2到3段，每段80到160字；faq写3到4项；searchExamples至少4项。",
    "避免模板化套话、关键词堆砌、内部平台代码和长破折号。关键词自然出现2到4次即可。",
    "输出严格JSON，字段仍为title、seoTitle、description、summary、answer、sections、faq、searchExamples。",
    `关键词：${job.keyword}`,
    `分类：${job.category}`,
    `搜索意图：${job.intent}`,
    `平台：${job.platform || "未限定"}`,
    `可核对材料：\n${evidenceText}`,
    `待修订内容：\n${JSON.stringify(content)}`,
  ].join("\n\n");
  await incrementMetric(env, "ai_requests", 1, now);
  try {
    const response = await env.AI.run(
      env.GEO_TEXT_MODEL || DEFAULT_TEXT_MODEL,
      {
        messages: [
          {
            role: "system",
            content:
              "/no_think\n只输出修订后的JSON对象，不解释修改过程，不输出Markdown代码块。",
          },
          { role: "user", content: `/no_think\n${prompt}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.15,
        max_tokens: 3800,
        repetition_penalty: 1.1,
      }
    );
    return finalizeGeneratedGeoContent(
      sanitizeGeneratedGeoContent(
        extractGeneratedGeoJson(response),
        job.keyword
      ),
      job.keyword
    );
  } catch (error) {
    await incrementMetric(env, "ai_failures", 1, now);
    throw error;
  }
}

async function maximumDuplicateScore(
  env: GeoPipelineEnv,
  content: GeneratedGeoContent
): Promise<number> {
  const response = await env.RESOURCE_DB.prepare(
    `SELECT answer, sections_json
     FROM geo_pages
     WHERE status = 'published'
     ORDER BY updated_at DESC
     LIMIT 80`
  ).all<{ answer: string; sections_json: string }>();
  const incoming = contentText(content);
  let maximum = 0;
  for (const row of response.results || []) {
    maximum = Math.max(
      maximum,
      contentSimilarity(incoming, `${row.answer}\n${row.sections_json}`)
    );
  }
  return maximum;
}

async function requeueOutdatedGeoContent(
  env: GeoPipelineEnv,
  now: number,
  limit = 12
): Promise<number> {
  const response = await env.RESOURCE_DB.prepare(
    `SELECT j.job_id, j.keyword_id
     FROM geo_content_jobs j
     JOIN geo_pages p ON p.keyword_id = j.keyword_id
     JOIN geo_keywords k ON k.keyword_id = j.keyword_id
     WHERE p.status IN ('published', 'rejected')
       AND p.content_revision < ?
       AND j.status IN ('published', 'rejected', 'failed')
     ORDER BY k.opportunity_score DESC, p.updated_at
     LIMIT ?`
  )
    .bind(
      GEO_CONTENT_REVISION,
      Math.max(1, Math.min(24, Math.round(limit)))
    )
    .all<{ job_id: string; keyword_id: string }>();
  const rows = response.results || [];
  if (rows.length === 0) return 0;
  await env.RESOURCE_DB.batch(
    rows.flatMap((row) => [
      env.RESOURCE_DB.prepare(
        `UPDATE geo_content_jobs
         SET status = 'queued', attempt_count = 0, locked_at = 0,
             last_error = '', updated_at = ?
         WHERE job_id = ?`
      ).bind(now, row.job_id),
      env.RESOURCE_DB.prepare(
        `UPDATE geo_keywords SET status = 'queued', updated_at = ?
         WHERE keyword_id = ?`
      ).bind(now, row.keyword_id),
    ])
  );
  return rows.length;
}

async function submitIndexNow(
  env: GeoPipelineEnv,
  urls: string[]
): Promise<number> {
  if (urls.length === 0) return 0;
  const siteUrl = String(env.SEO_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  const key = env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key,
        keyLocation: `${siteUrl}/${key}.txt`,
        urlList: urls,
      }),
    });
    return response.status;
  } catch {
    return -1;
  }
}

async function recordIndexNowState(
  env: GeoPipelineEnv,
  urls: string[],
  status: number,
  now: number
): Promise<void> {
  if (urls.length === 0) return;
  await env.RESOURCE_DB.batch(
    urls.map((url) =>
      env.RESOURCE_DB.prepare(
        `INSERT INTO seo_index_state
           (url, lastmod, last_audited_at, last_submitted_at,
            indexnow_status, baidu_status)
         VALUES (?, ?, 0, ?, ?, 0)
         ON CONFLICT(url) DO UPDATE SET
           lastmod = excluded.lastmod,
           last_submitted_at = excluded.last_submitted_at,
           indexnow_status = excluded.indexnow_status`
      ).bind(url, shanghaiDay(now), now, status)
    )
  );
}

async function claimJobs(
  env: GeoPipelineEnv,
  now: number,
  limit: number
): Promise<GeoJobRow[]> {
  await env.RESOURCE_DB.prepare(
    `UPDATE geo_content_jobs
     SET status = 'queued', locked_at = 0, updated_at = ?
     WHERE status IN ('generating', 'reviewing')
       AND locked_at > 0
       AND locked_at < ?`
  )
    .bind(now, now - 30 * 60 * 1_000)
    .run();
  const response = await env.RESOURCE_DB.prepare(
    `SELECT j.job_id, j.keyword_id, j.attempt_count,
            k.keyword, k.slug, k.category, k.intent, k.platform
     FROM geo_content_jobs j
     JOIN geo_keywords k ON k.keyword_id = j.keyword_id
     WHERE j.status = 'queued' AND j.attempt_count < 3
     ORDER BY k.opportunity_score DESC, j.created_at
     LIMIT ?`
  )
    .bind(Math.max(1, Math.min(4, limit)))
    .all<GeoJobRow>();
  const rows = response.results || [];
  for (const row of rows) {
    await env.RESOURCE_DB.batch([
      env.RESOURCE_DB.prepare(
        `UPDATE geo_content_jobs
         SET status = 'generating', attempt_count = attempt_count + 1,
             locked_at = ?, updated_at = ?
         WHERE job_id = ? AND status = 'queued'`
      ).bind(now, now, row.job_id),
      env.RESOURCE_DB.prepare(
        `UPDATE geo_keywords SET status = 'generating', updated_at = ?
         WHERE keyword_id = ?`
      ).bind(now, row.keyword_id),
    ]);
  }
  return rows;
}

async function failJob(
  env: GeoPipelineEnv,
  job: GeoJobRow,
  error: unknown,
  now: number
): Promise<void> {
  const failed = job.attempt_count + 1 >= 3;
  await env.RESOURCE_DB.batch([
    env.RESOURCE_DB.prepare(
      `UPDATE geo_content_jobs
       SET status = ?, last_error = ?, locked_at = 0, updated_at = ?
       WHERE job_id = ?`
    ).bind(
      failed ? "failed" : "queued",
      stringValue(error instanceof Error ? error.message : error).slice(0, 500),
      now,
      job.job_id
    ),
    env.RESOURCE_DB.prepare(
      `UPDATE geo_keywords SET status = ?, updated_at = ?
       WHERE keyword_id = ?`
    ).bind(failed ? "paused" : "queued", now, job.keyword_id),
  ]);
}

export async function processGeoJobs(
  env: GeoPipelineEnv,
  now = Date.now(),
  limit = 2
): Promise<{ processed: number; published: number; rejected: number }> {
  const jobs = await claimJobs(env, now, limit);
  const publishedUrls: string[] = [];
  let processed = 0;
  let published = 0;
  let rejected = 0;
  for (const job of jobs) {
    try {
      const evidence = await retrieveKnowledge(env, job.keyword, now);
      let content = await generateContent(env, job, evidence, now);
      let duplicateScore = await maximumDuplicateScore(env, content);
      let assessment = assessGeoContent(
        content,
        job.keyword,
        evidence.length,
        duplicateScore
      );
      if (!assessment.publishable) {
        content = await repairGeoContent(
          env,
          job,
          evidence,
          content,
          assessment,
          now
        );
        duplicateScore = await maximumDuplicateScore(env, content);
        assessment = assessGeoContent(
          content,
          job.keyword,
          evidence.length,
          duplicateScore
        );
      }
      const path = `/guide/${job.slug}`;
      const hash = fnv1a(contentText(content));
      const references = evidence.map((document) => ({
        id: document.document_id,
        title: document.title,
        url: document.source_url,
      }));
      await env.RESOURCE_DB.batch([
        env.RESOURCE_DB.prepare(
          `INSERT INTO geo_pages
             (slug, keyword_id, path, title, seo_title, description, summary,
              answer, sections_json, faq_json, search_examples_json,
              references_json, content_hash, quality_score, word_count,
              duplicate_score, content_revision, status, published_at,
              updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET
             title = excluded.title,
             seo_title = excluded.seo_title,
             description = excluded.description,
             summary = excluded.summary,
             answer = excluded.answer,
             sections_json = excluded.sections_json,
             faq_json = excluded.faq_json,
             search_examples_json = excluded.search_examples_json,
             references_json = excluded.references_json,
             content_hash = excluded.content_hash,
             quality_score = excluded.quality_score,
             word_count = excluded.word_count,
             duplicate_score = excluded.duplicate_score,
             content_revision = excluded.content_revision,
             status = excluded.status,
             published_at = excluded.published_at,
             updated_at = excluded.updated_at`
        ).bind(
          job.slug,
          job.keyword_id,
          path,
          content.title,
          content.seoTitle,
          content.description,
          content.summary,
          content.answer,
          JSON.stringify(content.sections),
          JSON.stringify(content.faq),
          JSON.stringify(content.searchExamples),
          JSON.stringify(references),
          hash,
          assessment.score,
          assessment.wordCount,
          assessment.duplicateScore,
          GEO_CONTENT_REVISION,
          assessment.publishable ? "published" : "rejected",
          assessment.publishable ? now : 0,
          now
        ),
        env.RESOURCE_DB.prepare(
          `INSERT INTO geo_content_reviews
             (review_id, job_id, slug, quality_score, word_count,
              duplicate_score, evidence_count, keyword_ratio, decision,
              issues_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          `review_${job.job_id}_${now}`,
          job.job_id,
          job.slug,
          assessment.score,
          assessment.wordCount,
          assessment.duplicateScore,
          evidence.length,
          assessment.keywordRatio,
          assessment.publishable ? "publish" : "reject",
          JSON.stringify(assessment.issues),
          now
        ),
        env.RESOURCE_DB.prepare(
          `UPDATE geo_content_jobs
           SET status = ?, locked_at = 0, last_error = '', updated_at = ?
           WHERE job_id = ?`
        ).bind(
          assessment.publishable ? "published" : "rejected",
          now,
          job.job_id
        ),
        env.RESOURCE_DB.prepare(
          `UPDATE geo_keywords SET status = ?, updated_at = ?
           WHERE keyword_id = ?`
        ).bind(
          assessment.publishable ? "published" : "rejected",
          now,
          job.keyword_id
        ),
      ]);
      processed += 1;
      if (assessment.publishable) {
        published += 1;
        publishedUrls.push(
          `${String(env.SEO_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "")}${path}`
        );
        await upsertKnowledgeDocument(
          env,
          {
            documentId: `page_${fnv1a(job.slug)}`,
            sourceType: "published_page",
            sourceId: job.slug,
            title: content.title,
            body: `${content.answer}\n${content.sections
              .flatMap((section) => section.paragraphs)
              .join("\n")}`,
            sourceUrl: publishedUrls[publishedUrls.length - 1],
            metadata: {
              category: job.category,
              platform: job.platform,
              qualityScore: assessment.score,
            },
          },
          now
        );
      } else {
        rejected += 1;
      }
    } catch (error) {
      await failJob(env, job, error, now);
    }
  }
  if (publishedUrls.length > 0) {
    const status = await submitIndexNow(env, publishedUrls);
    await recordIndexNowState(env, publishedUrls, status, now);
    if ([200, 202].includes(status)) {
      await incrementMetric(env, "index_submitted", publishedUrls.length, now);
    }
  }
  await Promise.all([
    incrementMetric(env, "jobs_processed", processed, now),
    incrementMetric(env, "pages_published", published, now),
    incrementMetric(env, "pages_rejected", rejected, now),
  ]);
  return { processed, published, rejected };
}

export async function runGeoPipeline(
  env: GeoPipelineEnv,
  runId = `manual_${Date.now()}`,
  now = Date.now()
) {
  const claimed = await env.RESOURCE_DB.prepare(
    `INSERT OR IGNORE INTO geo_pipeline_runs
       (run_id, status, started_at)
     VALUES (?, 'running', ?)`
  )
    .bind(runId.slice(0, 120), now)
    .run() as { meta?: { changes?: number } };
  if (Number(claimed?.meta?.changes || 0) === 0) {
    return { status: "duplicate" as const, runId };
  }

  let discovered = 0;
  let processed = 0;
  let published = 0;
  let rejected = 0;
  let status: "success" | "partial" | "failed" = "success";
  let errorMessage = "";
  try {
    await requeueOutdatedGeoContent(env, now);
    discovered = await discoverGeoKeywords(env, now);
    await syncGeoKnowledge(env, now);
    const result = await processGeoJobs(env, now, 2);
    processed = result.processed;
    published = result.published;
    rejected = result.rejected;
    if (!env.AI || !env.GEO_VECTOR) {
      status = "partial";
      errorMessage = "Workers AI or Vectorize binding is unavailable";
    }
  } catch (error) {
    status = "failed";
    errorMessage = stringValue(
      error instanceof Error ? error.message : error
    ).slice(0, 500);
  }
  await env.RESOURCE_DB.prepare(
    `UPDATE geo_pipeline_runs
     SET status = ?, discovered_count = ?, processed_count = ?,
         published_count = ?, rejected_count = ?, error_message = ?,
         finished_at = ?
     WHERE run_id = ?`
  )
    .bind(
      status,
      discovered,
      processed,
      published,
      rejected,
      errorMessage,
      Date.now(),
      runId.slice(0, 120)
    )
    .run();
  return {
    status,
    runId,
    discovered,
    processed,
    published,
    rejected,
    error: errorMessage,
  };
}

export async function runRequestedGeoPipeline(
  env: GeoPipelineEnv,
  now = Date.now()
) {
  const response = await env.RESOURCE_DB.prepare(
    `SELECT control_key, control_value
     FROM geo_pipeline_control
     WHERE control_key IN ('run_requested_at', 'run_completed_at')`
  ).all<{ control_key: string; control_value: string }>();
  const controls = new Map(
    (response.results || []).map((row) => [row.control_key, row.control_value])
  );
  const requested = numberValue(controls.get("run_requested_at"));
  const completed = numberValue(controls.get("run_completed_at"));
  if (!requested || requested <= completed) {
    return { status: "idle" as const };
  }
  const result = await runGeoPipeline(env, `requested_${requested}`, now);
  await env.RESOURCE_DB.prepare(
    `INSERT INTO geo_pipeline_control
       (control_key, control_value, updated_at)
     VALUES ('run_completed_at', ?, ?)
     ON CONFLICT(control_key) DO UPDATE SET
       control_value = excluded.control_value,
       updated_at = excluded.updated_at`
  )
    .bind(String(requested), Date.now())
    .run();
  return result;
}

export async function getGeoPipelineStatus(env: GeoPipelineEnv) {
  const [summary, runs, controls] = await Promise.all([
    env.RESOURCE_DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM geo_keywords) AS keywords,
         (SELECT COUNT(*) FROM geo_content_jobs WHERE status = 'queued') AS queued,
         (SELECT COUNT(*) FROM geo_pages WHERE status = 'published') AS published,
         (SELECT COUNT(*) FROM geo_pages WHERE status = 'rejected') AS rejected,
         (SELECT COUNT(*) FROM geo_knowledge_documents) AS knowledge_documents,
         (SELECT COUNT(*) FROM geo_knowledge_documents
          WHERE vector_status = 'indexed') AS indexed_documents`
    ).first(),
    env.RESOURCE_DB.prepare(
      `SELECT run_id, status, discovered_count, processed_count,
              published_count, rejected_count, error_message,
              started_at, finished_at
       FROM geo_pipeline_runs
       ORDER BY started_at DESC LIMIT 20`
    ).all(),
    env.RESOURCE_DB.prepare(
      `SELECT control_key, control_value, updated_at
       FROM geo_pipeline_control`
    ).all(),
  ]);
  return {
    summary: summary || {},
    runs: runs.results || [],
    controls: controls.results || [],
    bindings: {
      ai: Boolean(env.AI),
      vectorize: Boolean(env.GEO_VECTOR),
      textModel: env.GEO_TEXT_MODEL || DEFAULT_TEXT_MODEL,
      embedModel: env.GEO_EMBED_MODEL || DEFAULT_EMBED_MODEL,
    },
  };
}
