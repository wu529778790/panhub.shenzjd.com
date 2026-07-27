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

export interface SeoAuditEnv {
  RESOURCE_DB: D1DatabaseLike;
  SEO_SITE_URL?: string;
  INDEXNOW_KEY?: string;
}

export interface SitemapEntry {
  url: string;
  lastmod: string;
}

export interface PageAudit {
  url: string;
  path: string;
  lastmod: string;
  httpStatus: number;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  h1Count: number;
  hasStructuredData: boolean;
  issues: string[];
}

export interface SeoIndexState {
  url: string;
  lastmod: string;
  last_audited_at: number;
  last_submitted_at: number;
  indexnow_status: number;
}

const DEFAULT_SITE_URL = "https://haosouku.com";
const DEFAULT_INDEXNOW_KEY = "354ab0e4f5b524289a256cffd8618500";
const FETCH_TIMEOUT_MS = 12_000;
const INDEXNOW_RETRY_DELAY_MS = 48 * 60 * 60 * 1_000;
const PAGE_REAUDIT_DELAY_MS = 7 * 24 * 60 * 60 * 1_000;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanText(value: string, maximum: number): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const match of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)) {
    const body = match[1] || "";
    const loc = body.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1] || "";
    const lastmod =
      body.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i)?.[1] || "";
    const url = decodeXml(loc.trim());
    if (/^https?:\/\//i.test(url)) {
      entries.push({ url, lastmod: cleanText(lastmod, 40) });
    }
  }
  return entries;
}

function attributes(tag: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const match of tag.matchAll(
    /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  )) {
    output[String(match[1] || "").toLowerCase()] =
      match[2] || match[3] || match[4] || "";
  }
  return output;
}

function metaContent(html: string, name: string): string {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (
      String(attrs.name || attrs.property || "").toLowerCase() ===
      name.toLowerCase()
    ) {
      return cleanText(attrs.content || "", 320);
    }
  }
  return "";
}

function canonicalHref(html: string): string {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const rel = String(attrs.rel || "").toLowerCase().split(/\s+/);
    if (rel.includes("canonical")) return String(attrs.href || "").trim();
  }
  return "";
}

function normalizedComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value;
  }
}

export function inspectSeoHtml(
  html: string,
  entry: SitemapEntry,
  httpStatus = 200
): PageAudit {
  const title = cleanText(
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "",
    180
  );
  const description = metaContent(html, "description");
  const canonical = canonicalHref(html);
  const robots = metaContent(html, "robots");
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const hasStructuredData =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
  const issues: string[] = [];

  if (httpStatus !== 200) issues.push(`http:${httpStatus}`);
  if (!title) issues.push("title:missing");
  if (!description) issues.push("description:missing");
  if (!canonical) issues.push("canonical:missing");
  else if (
    normalizedComparableUrl(canonical) !== normalizedComparableUrl(entry.url)
  ) {
    issues.push("canonical:mismatch");
  }
  if (/noindex/i.test(robots)) issues.push("robots:noindex");
  if (h1Count !== 1) issues.push(`h1:${h1Count}`);
  if (!hasStructuredData) issues.push("structured-data:missing");

  return {
    url: entry.url,
    path: new URL(entry.url).pathname,
    lastmod: entry.lastmod,
    httpStatus,
    title,
    description,
    canonical,
    robots,
    h1Count,
    hasStructuredData,
    issues,
  };
}

async function fetchWithTimeout(
  url: string,
  accept: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        accept,
        "user-agent": "Haosouku-SEO-Audit/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function auditPage(entry: SitemapEntry): Promise<PageAudit> {
  try {
    const response = await fetchWithTimeout(
      entry.url,
      "text/html,application/xhtml+xml"
    );
    const html = await response.text();
    return inspectSeoHtml(html, entry, response.status);
  } catch {
    return {
      url: entry.url,
      path: new URL(entry.url).pathname,
      lastmod: entry.lastmod,
      httpStatus: 0,
      title: "",
      description: "",
      canonical: "",
      robots: "",
      h1Count: 0,
      hasStructuredData: false,
      issues: ["fetch:failed"],
    };
  }
}

async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await mapper(items[index]);
      }
    }
  );
  await Promise.all(workers);
  return output;
}

function markDuplicateIssues(audits: PageAudit[]): void {
  const titleCounts = new Map<string, number>();
  const descriptionCounts = new Map<string, number>();
  for (const audit of audits) {
    if (audit.title) {
      titleCounts.set(audit.title, (titleCounts.get(audit.title) || 0) + 1);
    }
    if (audit.description) {
      descriptionCounts.set(
        audit.description,
        (descriptionCounts.get(audit.description) || 0) + 1
      );
    }
  }
  for (const audit of audits) {
    if ((titleCounts.get(audit.title) || 0) > 1) {
      audit.issues.push("title:duplicate");
    }
    if ((descriptionCounts.get(audit.description) || 0) > 1) {
      audit.issues.push("description:duplicate");
    }
  }
}

async function submitIndexNow(
  siteUrl: string,
  key: string,
  urls: string[]
): Promise<number> {
  if (urls.length === 0) return 0;
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

async function runBatches(
  database: D1DatabaseLike,
  statements: D1StatementLike[],
  size = 40
): Promise<void> {
  for (let index = 0; index < statements.length; index += size) {
    await database.batch(statements.slice(index, index + size));
  }
}

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

export function selectIndexNowUrls(
  entries: SitemapEntry[],
  states: SeoIndexState[],
  now = Date.now(),
  limit = 100
): string[] {
  const previous = new Map(states.map((row) => [row.url, row]));
  return entries
    .filter((entry) => {
      const state = previous.get(entry.url);
      if (!state || state.lastmod !== entry.lastmod) return true;
      if ([200, 202].includes(Number(state.indexnow_status || 0))) return false;
      return Number(state.last_submitted_at || 0) <=
        now - INDEXNOW_RETRY_DELAY_MS;
    })
    .slice(0, Math.max(1, Math.min(1_000, Math.round(limit))))
    .map((entry) => entry.url);
}

function selectAuditEntries(
  entries: SitemapEntry[],
  states: SeoIndexState[],
  now: number,
  limit = 300
): SitemapEntry[] {
  const previous = new Map(states.map((row) => [row.url, row]));
  return entries
    .filter((entry) => {
      const state = previous.get(entry.url);
      return (
        !state ||
        state.lastmod !== entry.lastmod ||
        Number(state.last_audited_at || 0) <= now - PAGE_REAUDIT_DELAY_MS
      );
    })
    .slice(0, Math.max(1, Math.min(500, Math.round(limit))));
}

export async function runSeoAudit(env: SeoAuditEnv, now = Date.now()) {
  const startedAt = Date.now();
  const siteUrl = String(env.SEO_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const sitemapResponse = await fetchWithTimeout(
    sitemapUrl,
    "application/xml,text/xml"
  );
  if (!sitemapResponse.ok) {
    throw new Error(`SEO sitemap returned ${sitemapResponse.status}`);
  }
  const entries = parseSitemapEntries(await sitemapResponse.text()).filter(
    (entry) => new URL(entry.url).origin === new URL(siteUrl).origin
  );
  if (entries.length === 0) throw new Error("SEO sitemap contains no URLs");

  const stateResponse = await env.RESOURCE_DB
    .prepare(
      `SELECT url, lastmod, last_audited_at, last_submitted_at,
              indexnow_status
       FROM seo_index_state`
    )
    .all<SeoIndexState>();
  const states = stateResponse.results || [];
  const changedUrls = selectIndexNowUrls(entries, states, now, 100);
  const auditEntries = selectAuditEntries(entries, states, now, 300);
  const audits = await mapLimit(auditEntries, 5, auditPage);
  markDuplicateIssues(audits);
  const indexNowStatus = await submitIndexNow(
    siteUrl,
    env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY,
    changedUrls
  );
  const baiduStatus = 0;
  const day = shanghaiDay(now);

  const pageStatements = audits.flatMap((audit) => [
    env.RESOURCE_DB
      .prepare(
        `INSERT INTO seo_page_audit_daily
           (day, url, path, lastmod, http_status, title, description,
            canonical, robots, h1_count, has_structured_data, issues, audited_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(day, url) DO UPDATE SET
           path = excluded.path,
           lastmod = excluded.lastmod,
           http_status = excluded.http_status,
           title = excluded.title,
           description = excluded.description,
           canonical = excluded.canonical,
           robots = excluded.robots,
           h1_count = excluded.h1_count,
           has_structured_data = excluded.has_structured_data,
           issues = excluded.issues,
           audited_at = excluded.audited_at`
      )
      .bind(
        day,
        audit.url,
        audit.path,
        audit.lastmod,
        audit.httpStatus,
        audit.title,
        audit.description,
        audit.canonical,
        audit.robots,
        audit.h1Count,
        audit.hasStructuredData ? 1 : 0,
        audit.issues.join(","),
        now
      ),
    env.RESOURCE_DB
      .prepare(
        `INSERT INTO seo_index_state
           (url, lastmod, last_audited_at, last_submitted_at,
            indexnow_status, baidu_status)
         VALUES (?, ?, ?, 0, 0, 0)
         ON CONFLICT(url) DO UPDATE SET
           lastmod = excluded.lastmod,
           last_audited_at = excluded.last_audited_at`
      )
      .bind(audit.url, audit.lastmod, now),
  ]);
  await runBatches(env.RESOURCE_DB, pageStatements);

  if (changedUrls.length > 0) {
    await runBatches(
      env.RESOURCE_DB,
      changedUrls.map((url) =>
        env.RESOURCE_DB
          .prepare(
            `UPDATE seo_index_state
             SET last_submitted_at = ?, indexnow_status = ?, baidu_status = ?
             WHERE url = ?`
          )
          .bind(now, indexNowStatus, baiduStatus, url)
      )
    );
  }

  const healthyCount = audits.filter((audit) => audit.issues.length === 0).length;
  const durationMs = Date.now() - startedAt;
  await env.RESOURCE_DB.batch([
    env.RESOURCE_DB
      .prepare(
        `INSERT INTO seo_audit_daily
           (day, sitemap_url_count, healthy_url_count, error_url_count,
            submitted_url_count, indexnow_status, baidu_status,
            duration_ms, audited_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(day) DO UPDATE SET
           sitemap_url_count = excluded.sitemap_url_count,
           healthy_url_count = excluded.healthy_url_count,
           error_url_count = excluded.error_url_count,
           submitted_url_count = excluded.submitted_url_count,
           indexnow_status = excluded.indexnow_status,
           baidu_status = excluded.baidu_status,
           duration_ms = excluded.duration_ms,
           audited_at = excluded.audited_at`
      )
      .bind(
        day,
        entries.length,
        healthyCount,
        audits.length - healthyCount,
        changedUrls.length,
        indexNowStatus,
        baiduStatus,
        durationMs,
        now
      ),
    env.RESOURCE_DB
      .prepare(
        `DELETE FROM seo_page_audit_daily
         WHERE day < date(?, '-120 days')`
      )
      .bind(day),
  ]);

  return {
    day,
    sitemapUrlCount: entries.length,
    auditedUrlCount: audits.length,
    healthyUrlCount: healthyCount,
    errorUrlCount: audits.length - healthyCount,
    submittedUrlCount: changedUrls.length,
    indexNowStatus,
    baiduStatus,
    durationMs,
    issues: audits
      .filter((audit) => audit.issues.length > 0)
      .map((audit) => ({ path: audit.path, issues: audit.issues })),
  };
}
