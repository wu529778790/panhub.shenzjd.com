import type {
  D1DatabaseLike,
  D1StatementLike,
} from "../../utils/cloudflareBindings";
import type {
  TrafficClientContext,
  TrafficEventBody,
  TrafficWebVitals,
} from "../../../types/analytics";
import {
  normalizeLandingPath,
  sanitizeSeoAttribution,
} from "../../../utils/seoAttribution";
import { getSearchQualitySummary } from "./searchQualityService";
import { getSeoGrowthReport } from "./seoAnalyticsService";

const EVENT_TTL_MS = 35 * 24 * 60 * 60 * 1_000;
const MAX_ENGAGEMENT_MS = 30 * 60 * 1_000;
const ALLOWED_VITALS = new Set(["lcp", "cls", "inp", "fcp", "ttfb"]);

interface RequestDimensions {
  country?: string;
  userAgent?: string;
}

interface TrafficIdentity {
  sessionHash: string;
  visitorHash: string;
}

function shanghaiDay(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function dayOffset(now: number, offset: number): string {
  return shanghaiDay(now + offset * 24 * 60 * 60 * 1_000);
}

function boundedNumber(value: unknown, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(maximum, parsed));
}

function cleanDimension(
  value: unknown,
  fallback: string,
  maximum = 48
): string {
  const normalized = String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximum);
  return normalized || fallback;
}

function normalizeClientId(value: unknown): string {
  const normalized = String(value || "").trim().slice(0, 128);
  return /^[A-Za-z0-9:_-]{8,128}$/.test(normalized) ? normalized : "";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function identityFromContext(
  context: Partial<TrafficClientContext> | null | undefined
): Promise<TrafficIdentity | null> {
  const sessionId = normalizeClientId(context?.sessionId);
  const visitorId = normalizeClientId(context?.visitorId);
  if (!sessionId || !visitorId) return null;
  const [sessionHash, visitorHash] = await Promise.all([
    sha256Hex(`session:${sessionId}`),
    sha256Hex(`visitor:${visitorId}`),
  ]);
  return { sessionHash, visitorHash };
}

function browserFromUserAgent(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "edge";
  if (/firefox\//i.test(userAgent)) return "firefox";
  if (/opr\/|opera/i.test(userAgent)) return "opera";
  if (/micromessenger/i.test(userAgent)) return "wechat";
  if (/qqbrowser/i.test(userAgent)) return "qq";
  if (/chrome\/|crios\//i.test(userAgent)) return "chrome";
  if (/safari\//i.test(userAgent)) return "safari";
  return "other";
}

function osFromUserAgent(userAgent: string): string {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/windows/i.test(userAgent)) return "windows";
  if (/macintosh|mac os x/i.test(userAgent)) return "macos";
  if (/linux/i.test(userAgent)) return "linux";
  return "other";
}

function deviceFromUserAgent(userAgent: string): string {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function sanitizeTrafficError(value: unknown): string {
  return String(value || "未知客户端错误")
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/(?:\+?86[-\s]?)?1[3-9]\d{9}/g, "[phone]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "未知客户端错误";
}

function normalizedContext(
  context: Partial<TrafficClientContext> | null | undefined
) {
  return {
    path: normalizeLandingPath(context?.path || "/"),
    attribution: sanitizeSeoAttribution(context?.attribution),
    language: cleanDimension(context?.language, "unknown", 24),
    screen: cleanDimension(context?.screen, "unknown", 24),
  };
}

async function claimEvent(
  database: D1DatabaseLike,
  eventId: unknown,
  now: number
): Promise<boolean> {
  const normalized = normalizeClientId(eventId);
  if (!normalized) return false;
  const result = await database
    .prepare(
      `INSERT OR IGNORE INTO traffic_event_receipts (event_id, created_at)
       VALUES (?, ?)`
    )
    .bind(normalized, now)
    .run();
  return Number(result.meta?.changes || 0) > 0;
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

function vitalRating(
  metric: string,
  value: number
): "good" | "needs" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    lcp: [2_500, 4_000],
    cls: [0.1, 0.25],
    inp: [200, 500],
    fcp: [1_800, 3_000],
    ttfb: [800, 1_800],
  };
  const [good, poor] = thresholds[metric] || [0, 0];
  if (value <= good) return "good";
  if (value <= poor) return "needs";
  return "poor";
}

function vitalStatements(
  database: D1DatabaseLike,
  day: string,
  path: string,
  vitals: TrafficWebVitals | undefined,
  now: number
): D1StatementLike[] {
  return Object.entries(vitals || {})
    .filter(([metric, value]) => {
      return ALLOWED_VITALS.has(metric) && Number.isFinite(Number(value));
    })
    .map(([metric, rawValue]) => {
      const maximum = metric === "cls" ? 10 : 120_000;
      const value = boundedNumber(rawValue, maximum);
      const rating = vitalRating(metric, value);
      return database
        .prepare(
          `INSERT INTO traffic_vitals_daily
             (day, path, metric, sample_count, value_sum, good_count,
              needs_improvement_count, poor_count, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
           ON CONFLICT(day, path, metric) DO UPDATE SET
             sample_count = sample_count + 1,
             value_sum = value_sum + excluded.value_sum,
             good_count = good_count + excluded.good_count,
             needs_improvement_count =
               needs_improvement_count + excluded.needs_improvement_count,
             poor_count = poor_count + excluded.poor_count,
             updated_at = excluded.updated_at`
        )
        .bind(
          day,
          path,
          metric,
          value,
          rating === "good" ? 1 : 0,
          rating === "needs" ? 1 : 0,
          rating === "poor" ? 1 : 0,
          now
        );
    });
}

async function recordPageView(
  database: D1DatabaseLike,
  event: Extract<TrafficEventBody, { event: "page_view" }>,
  dimensions: RequestDimensions,
  now: number
): Promise<boolean> {
  const identity = await identityFromContext(event.context);
  if (
    !identity ||
    !(await claimEvent(database, event.eventId, now))
  ) {
    return false;
  }
  const value = normalizedContext(event.context);
  const userAgent = String(dimensions.userAgent || "").slice(0, 512);
  const country = cleanDimension(dimensions.country, "unknown", 8);
  const inserted = await database
    .prepare(
      `INSERT OR IGNORE INTO traffic_sessions
         (session_hash, visitor_hash, day, started_at, last_seen_at,
          entry_path, exit_path, page_views, engagement_ms,
          channel, source, medium, campaign, country, browser, os,
          device, language, screen)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      identity.sessionHash,
      identity.visitorHash,
      shanghaiDay(now),
      now,
      now,
      value.path,
      value.path,
      value.attribution.channel,
      value.attribution.source,
      value.attribution.medium,
      value.attribution.campaign,
      country,
      browserFromUserAgent(userAgent),
      osFromUserAgent(userAgent),
      deviceFromUserAgent(userAgent),
      value.language,
      value.screen
    )
    .run();
  const isNewSession = Number(inserted.meta?.changes || 0) > 0;
  const statements: D1StatementLike[] = [];
  if (!isNewSession) {
    statements.push(
      database
        .prepare(
          `UPDATE traffic_sessions
           SET last_seen_at = ?, exit_path = ?, page_views = page_views + 1
           WHERE session_hash = ?`
        )
        .bind(now, value.path, identity.sessionHash)
    );
  }
  statements.push(
    database
      .prepare(
        `INSERT INTO traffic_page_daily
           (day, path, page_views, entrance_count, updated_at)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(day, path) DO UPDATE SET
           page_views = page_views + 1,
           entrance_count = entrance_count + excluded.entrance_count,
           updated_at = excluded.updated_at`
      )
      .bind(shanghaiDay(now), value.path, isNewSession ? 1 : 0, now),
    database
      .prepare("DELETE FROM traffic_event_receipts WHERE created_at < ?")
      .bind(now - EVENT_TTL_MS)
  );
  await runStatements(database, statements);
  return true;
}

async function recordPageLeave(
  database: D1DatabaseLike,
  event: Extract<TrafficEventBody, { event: "page_leave" }>,
  now: number
): Promise<boolean> {
  const identity = await identityFromContext(event.context);
  if (
    !identity ||
    !(await claimEvent(database, event.eventId, now))
  ) {
    return false;
  }
  const value = normalizedContext(event.context);
  const day = shanghaiDay(now);
  const engagementMs = Math.round(
    boundedNumber(event.durationMs, MAX_ENGAGEMENT_MS)
  );
  const errorCount = Math.round(boundedNumber(event.errorCount, 100));
  const statements: D1StatementLike[] = [
    database
      .prepare(
        `UPDATE traffic_sessions
         SET last_seen_at = ?, exit_path = ?,
             engagement_ms = engagement_ms + ?,
             error_count = error_count + ?
         WHERE session_hash = ?`
      )
      .bind(
        now,
        value.path,
        engagementMs,
        errorCount,
        identity.sessionHash
      ),
    database
      .prepare(
        `INSERT INTO traffic_page_daily
           (day, path, leave_count, engagement_ms, error_count, updated_at)
         VALUES (?, ?, 1, ?, ?, ?)
         ON CONFLICT(day, path) DO UPDATE SET
           leave_count = leave_count + 1,
           engagement_ms = engagement_ms + excluded.engagement_ms,
           error_count = error_count + excluded.error_count,
           updated_at = excluded.updated_at`
      )
      .bind(day, value.path, engagementMs, errorCount, now),
    ...vitalStatements(database, day, value.path, event.vitals, now),
  ];
  await runStatements(database, statements);
  return true;
}

async function recordClientError(
  database: D1DatabaseLike,
  event: Extract<TrafficEventBody, { event: "client_error" }>,
  now: number
): Promise<boolean> {
  const identity = await identityFromContext(event.context);
  if (
    !identity ||
    !(await claimEvent(database, event.eventId, now))
  ) {
    return false;
  }
  const value = normalizedContext(event.context);
  const message = sanitizeTrafficError(event.message);
  const fingerprint = (await sha256Hex(message)).slice(0, 24);
  await runStatements(database, [
    database
      .prepare(
        `INSERT INTO traffic_errors_daily
           (day, path, fingerprint, message, error_count, last_seen_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(day, path, fingerprint) DO UPDATE SET
           error_count = error_count + 1,
           last_seen_at = excluded.last_seen_at`
      )
      .bind(shanghaiDay(now), value.path, fingerprint, message, now),
    database
      .prepare(
        `UPDATE traffic_sessions
         SET error_count = error_count + 1, last_seen_at = ?
         WHERE session_hash = ?`
      )
      .bind(now, identity.sessionHash),
    database
      .prepare(
        `INSERT INTO traffic_page_daily
           (day, path, error_count, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(day, path) DO UPDATE SET
           error_count = error_count + 1,
           updated_at = excluded.updated_at`
      )
      .bind(shanghaiDay(now), value.path, now),
  ]);
  return true;
}

export async function recordTrafficEvent(
  database: D1DatabaseLike | undefined,
  event: TrafficEventBody,
  dimensions: RequestDimensions = {},
  now = Date.now()
): Promise<boolean> {
  if (!database) return false;
  if (event.event === "page_view") {
    return recordPageView(database, event, dimensions, now);
  }
  if (event.event === "page_leave") {
    return recordPageLeave(database, event, now);
  }
  if (event.event === "client_error") {
    return recordClientError(database, event, now);
  }
  return false;
}

export async function recordTrafficInteraction(
  database: D1DatabaseLike | undefined,
  context: Partial<TrafficClientContext> | null | undefined,
  interaction: "search" | "result_click",
  now = Date.now()
): Promise<void> {
  if (!database) return;
  const identity = await identityFromContext(context);
  if (!identity) return;
  const value = normalizedContext(context);
  const searchCount = interaction === "search" ? 1 : 0;
  const resultClickCount = interaction === "result_click" ? 1 : 0;
  await runStatements(database, [
    database
      .prepare(
        `UPDATE traffic_sessions
         SET last_seen_at = ?,
             search_count = search_count + ?,
             result_click_count = result_click_count + ?
         WHERE session_hash = ?`
      )
      .bind(now, searchCount, resultClickCount, identity.sessionHash),
    database
      .prepare(
        `INSERT INTO traffic_page_daily
           (day, path, search_count, result_click_count, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(day, path) DO UPDATE SET
           search_count = search_count + excluded.search_count,
           result_click_count =
             result_click_count + excluded.result_click_count,
           updated_at = excluded.updated_at`
      )
      .bind(
        shanghaiDay(now),
        value.path,
        searchCount,
        resultClickCount,
        now
      ),
  ]);
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

async function loadTrafficSummary(
  database: D1DatabaseLike,
  since: string,
  through: string
) {
  const row = await database
    .prepare(
      `SELECT COUNT(*) AS sessions,
              COUNT(DISTINCT visitor_hash) AS visitors,
              COALESCE(SUM(page_views), 0) AS page_views,
              SUM(CASE WHEN page_views > 1 OR engagement_ms >= 10000
                       THEN 1 ELSE 0 END) AS engaged_sessions,
              COALESCE(SUM(engagement_ms), 0) AS engagement_ms,
              COALESCE(SUM(error_count), 0) AS errors,
              COALESCE(SUM(search_count), 0) AS searches,
              COALESCE(SUM(result_click_count), 0) AS result_clicks
       FROM traffic_sessions
       WHERE day >= ? AND day <= ?`
    )
    .bind(since, through)
    .first<Record<string, unknown>>();
  const sessions = numberValue(row?.sessions);
  const engagedSessions = numberValue(row?.engaged_sessions);
  return {
    sessions,
    visitors: numberValue(row?.visitors),
    pageViews: numberValue(row?.page_views),
    engagedSessions,
    bounceRate: percent(sessions - engagedSessions, sessions),
    averageEngagementSeconds: sessions
      ? Math.round(numberValue(row?.engagement_ms) / sessions / 100) / 10
      : 0,
    errors: numberValue(row?.errors),
    searches: numberValue(row?.searches),
    resultClicks: numberValue(row?.result_clicks),
    searchConversionRate: percent(numberValue(row?.searches), sessions),
    resultClickRate: percent(numberValue(row?.result_clicks), sessions),
  };
}

export async function getTrafficAnalyticsReport(
  database: D1DatabaseLike,
  days = 28,
  now = Date.now()
) {
  const safeDays = Math.max(1, Math.min(90, Math.round(days)));
  const through = dayOffset(now, 0);
  const since = dayOffset(now, -(safeDays - 1));
  const previousThrough = dayOffset(now, -safeDays);
  const previousSince = dayOffset(now, -(safeDays * 2 - 1));

  const [
    summary,
    previous,
    dailyResponse,
    pagesResponse,
    acquisitionResponse,
    countriesResponse,
    devicesResponse,
    browsersResponse,
    systemsResponse,
    vitalsResponse,
    errorsResponse,
    realtime,
    searchQuality,
    seoGrowth,
  ] = await Promise.all([
    loadTrafficSummary(database, since, through),
    loadTrafficSummary(database, previousSince, previousThrough),
    database
      .prepare(
        `SELECT day, COUNT(*) AS sessions,
                COUNT(DISTINCT visitor_hash) AS visitors,
                COALESCE(SUM(page_views), 0) AS page_views,
                SUM(CASE WHEN page_views > 1 OR engagement_ms >= 10000
                         THEN 1 ELSE 0 END) AS engaged_sessions,
                COALESCE(SUM(search_count), 0) AS searches,
                COALESCE(SUM(result_click_count), 0) AS result_clicks
         FROM traffic_sessions
         WHERE day >= ? AND day <= ?
         GROUP BY day ORDER BY day`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT path, SUM(page_views) AS page_views,
                SUM(entrance_count) AS entrances,
                SUM(leave_count) AS leaves,
                SUM(engagement_ms) AS engagement_ms,
                SUM(error_count) AS errors,
                SUM(search_count) AS searches,
                SUM(result_click_count) AS result_clicks
         FROM traffic_page_daily
         WHERE day >= ? AND day <= ?
         GROUP BY path ORDER BY page_views DESC, path LIMIT 80`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT channel, source, medium, campaign,
                COUNT(*) AS sessions,
                COUNT(DISTINCT visitor_hash) AS visitors,
                SUM(page_views) AS page_views,
                SUM(search_count) AS searches,
                SUM(result_click_count) AS result_clicks
         FROM traffic_sessions
         WHERE day >= ? AND day <= ?
         GROUP BY channel, source, medium, campaign
         ORDER BY sessions DESC LIMIT 60`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT country AS name, COUNT(*) AS sessions
         FROM traffic_sessions WHERE day >= ? AND day <= ?
         GROUP BY country ORDER BY sessions DESC LIMIT 30`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT device AS name, COUNT(*) AS sessions
         FROM traffic_sessions WHERE day >= ? AND day <= ?
         GROUP BY device ORDER BY sessions DESC`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT browser AS name, COUNT(*) AS sessions
         FROM traffic_sessions WHERE day >= ? AND day <= ?
         GROUP BY browser ORDER BY sessions DESC`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT os AS name, COUNT(*) AS sessions
         FROM traffic_sessions WHERE day >= ? AND day <= ?
         GROUP BY os ORDER BY sessions DESC`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT metric, SUM(sample_count) AS sample_count,
                SUM(value_sum) AS value_sum,
                SUM(good_count) AS good_count,
                SUM(needs_improvement_count) AS needs_improvement_count,
                SUM(poor_count) AS poor_count
         FROM traffic_vitals_daily
         WHERE day >= ? AND day <= ?
         GROUP BY metric ORDER BY metric`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT path, fingerprint, message,
                SUM(error_count) AS error_count,
                MAX(last_seen_at) AS last_seen_at
         FROM traffic_errors_daily
         WHERE day >= ? AND day <= ?
         GROUP BY path, fingerprint, message
         ORDER BY error_count DESC, last_seen_at DESC LIMIT 50`
      )
      .bind(since, through)
      .all<Record<string, unknown>>(),
    database
      .prepare(
        `SELECT
           SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END) AS active_now,
           SUM(CASE WHEN last_seen_at >= ? THEN 1 ELSE 0 END) AS last_30_minutes
         FROM traffic_sessions WHERE last_seen_at >= ?`
      )
      .bind(now - 5 * 60_000, now - 30 * 60_000, now - 30 * 60_000)
      .first<Record<string, unknown>>(),
    getSearchQualitySummary(database, Math.min(safeDays, 31), true, now),
    getSeoGrowthReport(database, safeDays, now),
  ]);

  const vitals = (vitalsResponse.results || []).map((row) => {
    const sampleCount = numberValue(row.sample_count);
    return {
      metric: String(row.metric || ""),
      sampleCount,
      average: sampleCount
        ? Math.round((numberValue(row.value_sum) / sampleCount) * 100) / 100
        : 0,
      goodRate: percent(numberValue(row.good_count), sampleCount),
      needsImprovementRate: percent(
        numberValue(row.needs_improvement_count),
        sampleCount
      ),
      poorRate: percent(numberValue(row.poor_count), sampleCount),
    };
  });

  return {
    generatedAt: now,
    period: { days: safeDays, since, through },
    realtime: {
      activeNow: numberValue(realtime?.active_now),
      last30Minutes: numberValue(realtime?.last_30_minutes),
    },
    summary,
    comparison: {
      previous: { since: previousSince, through: previousThrough, ...previous },
      change: {
        visitors: changePercent(summary.visitors, previous.visitors),
        sessions: changePercent(summary.sessions, previous.sessions),
        pageViews: changePercent(summary.pageViews, previous.pageViews),
        searches: changePercent(summary.searches, previous.searches),
        resultClicks: changePercent(
          summary.resultClicks,
          previous.resultClicks
        ),
      },
    },
    daily: dailyResponse.results || [],
    pages: pagesResponse.results || [],
    acquisition: acquisitionResponse.results || [],
    dimensions: {
      countries: countriesResponse.results || [],
      devices: devicesResponse.results || [],
      browsers: browsersResponse.results || [],
      systems: systemsResponse.results || [],
    },
    vitals,
    errors: errorsResponse.results || [],
    searchQuality,
    seoGrowth,
  };
}
