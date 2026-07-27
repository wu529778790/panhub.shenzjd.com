import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import {
  sanitizeSeoAttribution,
  type SeoAttribution,
} from "../../../utils/seoAttribution";

const EVENT_TTL_MS = 32 * 24 * 60 * 60 * 1_000;

export type SeoEventType = "landing" | "search" | "result_click";

export interface SeoEventInput {
  eventId: string;
  event: SeoEventType;
  attribution?: Partial<SeoAttribution> | null;
}

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function dayOffset(now: number, offset: number): string {
  return shanghaiDay(now + offset * 24 * 60 * 60 * 1_000);
}

async function claimSeoEvent(
  database: D1DatabaseLike,
  eventId: string,
  now: number
): Promise<boolean> {
  const normalizedId = String(eventId || "").trim().slice(0, 96);
  if (!/^[A-Za-z0-9:_-]{8,96}$/.test(normalizedId)) return false;
  const result = await database
    .prepare(
      `INSERT OR IGNORE INTO seo_event_receipts (event_id, created_at)
       VALUES (?, ?)`
    )
    .bind(normalizedId, now)
    .run();
  return Number(result.meta?.changes || 0) > 0;
}

export async function recordSeoEvent(
  database: D1DatabaseLike | undefined,
  input: SeoEventInput,
  now = Date.now()
): Promise<boolean> {
  if (!database || !(await claimSeoEvent(database, input.eventId, now))) {
    return false;
  }
  const value = sanitizeSeoAttribution(input.attribution);
  const day = shanghaiDay(now);
  const landingCount = input.event === "landing" ? 1 : 0;
  const searchCount = input.event === "search" ? 1 : 0;
  const resultClickCount = input.event === "result_click" ? 1 : 0;

  const statements = [
    database
      .prepare(
        `INSERT INTO seo_landing_daily
           (day, landing_path, channel, source, medium, campaign,
            landing_count, search_count, result_click_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(day, landing_path, channel, source, medium, campaign)
         DO UPDATE SET
           landing_count = landing_count + excluded.landing_count,
           search_count = search_count + excluded.search_count,
           result_click_count = result_click_count + excluded.result_click_count,
           updated_at = excluded.updated_at`
      )
      .bind(
        day,
        value.landingPath,
        value.channel,
        value.source,
        value.medium,
        value.campaign,
        landingCount,
        searchCount,
        resultClickCount,
        now
      ),
    database
      .prepare("DELETE FROM seo_event_receipts WHERE created_at < ?")
      .bind(now - EVENT_TTL_MS),
  ];
  if (database.batch) await database.batch(statements);
  else await Promise.all(statements.map((statement) => statement.run()));
  return true;
}

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0
    ? Math.round((numerator / denominator) * 10_000) / 100
    : 0;
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 10_000) / 100;
}

function metricsFromRow(row: Record<string, unknown> | null) {
  const landings = numberValue(row?.landings);
  const organicLandings = numberValue(row?.organic_landings);
  const searches = numberValue(row?.searches);
  const resultClicks = numberValue(row?.result_clicks);
  return {
    landings,
    organicLandings,
    searches,
    resultClicks,
    organicShare: percent(organicLandings, landings),
    searchConversionRate: percent(searches, landings),
    resultClickRate: percent(resultClicks, landings),
  };
}

async function loadMetrics(
  database: D1DatabaseLike,
  from: string,
  through: string
) {
  const row = await database
    .prepare(
      `SELECT COALESCE(SUM(landing_count), 0) AS landings,
              COALESCE(SUM(CASE WHEN channel = 'organic'
                                THEN landing_count ELSE 0 END), 0)
                AS organic_landings,
              COALESCE(SUM(search_count), 0) AS searches,
              COALESCE(SUM(result_click_count), 0) AS result_clicks
       FROM seo_landing_daily
       WHERE day >= ? AND day <= ?`
    )
    .bind(from, through)
    .first<Record<string, unknown>>();
  return metricsFromRow(row);
}

export async function getSeoGrowthReport(
  database: D1DatabaseLike,
  days = 28,
  now = Date.now()
) {
  const safeDays = Math.max(1, Math.min(90, Math.round(days)));
  const through = dayOffset(now, 0);
  const since = dayOffset(now, -(safeDays - 1));
  const recentFrom = dayOffset(now, -6);
  const previousFrom = dayOffset(now, -13);
  const previousThrough = dayOffset(now, -7);

  const [
    summary,
    recent,
    previous,
    channelsResponse,
    pagesResponse,
    dailyResponse,
    latestAudit,
    auditHistoryResponse,
  ] = await Promise.all([
    loadMetrics(database, since, through),
    loadMetrics(database, recentFrom, through),
    loadMetrics(database, previousFrom, previousThrough),
    database
      .prepare(
        `SELECT channel, source, medium, campaign,
                SUM(landing_count) AS landings,
                SUM(search_count) AS searches,
                SUM(result_click_count) AS result_clicks
         FROM seo_landing_daily
         WHERE day >= ?
         GROUP BY channel, source, medium, campaign
         ORDER BY landings DESC, searches DESC
         LIMIT 40`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT landing_path,
                SUM(landing_count) AS landings,
                SUM(CASE WHEN channel = 'organic'
                         THEN landing_count ELSE 0 END) AS organic_landings,
                SUM(search_count) AS searches,
                SUM(result_click_count) AS result_clicks
         FROM seo_landing_daily
         WHERE day >= ?
         GROUP BY landing_path
         ORDER BY organic_landings DESC, landings DESC
         LIMIT 40`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT day,
                SUM(landing_count) AS landings,
                SUM(CASE WHEN channel = 'organic'
                         THEN landing_count ELSE 0 END) AS organic_landings,
                SUM(search_count) AS searches,
                SUM(result_click_count) AS result_clicks
         FROM seo_landing_daily
         WHERE day >= ?
         GROUP BY day ORDER BY day`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT day, sitemap_url_count, healthy_url_count, error_url_count,
                submitted_url_count, indexnow_status, baidu_status,
                duration_ms, audited_at
         FROM seo_audit_daily ORDER BY day DESC LIMIT 1`
      )
      .first<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT day, sitemap_url_count, healthy_url_count, error_url_count,
                submitted_url_count, indexnow_status, baidu_status,
                duration_ms, audited_at
         FROM seo_audit_daily
         WHERE day >= ? ORDER BY day`
      )
      .bind(since)
      .all<Record<string, unknown>>(),
  ]);

  const latestAuditDay = String(latestAudit?.day || "");
  const issueResponse = latestAuditDay
    ? await database
        .prepare(
          `SELECT path, http_status, issues
           FROM seo_page_audit_daily
           WHERE day = ? AND issues <> ''
           ORDER BY path LIMIT 100`
        )
        .bind(latestAuditDay)
        .all<Record<string, unknown>>()
    : { results: [] };

  return {
    generatedAt: now,
    period: { days: safeDays, since, through },
    summary,
    comparison: {
      recent: { from: recentFrom, through, ...recent },
      previous: { from: previousFrom, through: previousThrough, ...previous },
      change: {
        landings: changePercent(recent.landings, previous.landings),
        organicLandings: changePercent(
          recent.organicLandings,
          previous.organicLandings
        ),
        searches: changePercent(recent.searches, previous.searches),
        resultClicks: changePercent(
          recent.resultClicks,
          previous.resultClicks
        ),
      },
    },
    channels: channelsResponse.results || [],
    landingPages: pagesResponse.results || [],
    daily: dailyResponse.results || [],
    technical: {
      latest: latestAudit || null,
      history: auditHistoryResponse.results || [],
      issues: issueResponse.results || [],
    },
  };
}
