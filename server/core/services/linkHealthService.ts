import type {
  D1DatabaseLike,
  D1StatementLike,
} from "../../utils/cloudflareBindings";
import {
  getLinkPlatform,
  normalizeLinkHealthUrl,
  type LinkHealthInfo,
  type LinkHealthReportStatus,
  type LinkHealthStatus,
} from "../../../utils/linkHealth";

const HEALTH_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const AUTOMATIC_HEALTH_TTL_MS = 45 * 24 * 60 * 60 * 1_000;
export const MAX_LINK_HEALTH_BATCH = 100;

interface HealthRow {
  url_hash: string;
  normalized_url: string;
  platform: string;
  status: LinkHealthStatus;
  fail_count: number;
  success_count: number;
  checked_at: number;
}

interface ReportAggregateRow {
  url_hash: string;
  fail_count: number;
  success_count: number;
  password_count: number;
  checked_at: number;
}

interface AutomaticHealthRow {
  url_hash: string;
  normalized_url: string;
  platform: string;
  status: LinkHealthStatus;
  reason: string;
  confidence: number;
  checked_at: number;
}

interface PreparedLink {
  originalUrl: string;
  normalizedUrl: string;
  platform: string;
  urlHash: string;
}

export interface LinkHealthReportInput {
  url: string;
  status: LinkHealthReportStatus;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function prepareLinks(urls: string[]): Promise<PreparedLink[]> {
  const unique = new Map<string, string>();
  for (const rawUrl of urls.slice(0, MAX_LINK_HEALTH_BATCH)) {
    const normalizedUrl = normalizeLinkHealthUrl(rawUrl);
    if (normalizedUrl && !unique.has(normalizedUrl)) {
      unique.set(normalizedUrl, rawUrl);
    }
  }

  return Promise.all(
    Array.from(unique, async ([normalizedUrl, originalUrl]) => ({
      originalUrl,
      normalizedUrl,
      platform: getLinkPlatform(normalizedUrl) || "others",
      urlHash: await sha256Hex(normalizedUrl),
    }))
  );
}

async function runStatements(
  database: D1DatabaseLike,
  statements: D1StatementLike[]
): Promise<void> {
  if (statements.length === 0) return;
  if (database.batch) {
    await database.batch(statements);
    return;
  }
  await Promise.all(statements.map((statement) => statement.run()));
}

function unknownHealth(link: PreparedLink): LinkHealthInfo {
  return {
    url: link.originalUrl,
    normalizedUrl: link.normalizedUrl,
    platform: link.platform,
    status: "unknown",
    failCount: 0,
    successCount: 0,
    checkedAt: 0,
  };
}

function toHealthInfo(link: PreparedLink, row?: HealthRow): LinkHealthInfo {
  if (!row) return unknownHealth(link);
  return {
    url: link.originalUrl,
    normalizedUrl: link.normalizedUrl,
    platform: row.platform,
    status: row.status,
    failCount: Number(row.fail_count || 0),
    successCount: Number(row.success_count || 0),
    checkedAt: Number(row.checked_at || 0),
    source: "community",
  };
}

function toAutomaticHealthInfo(
  link: PreparedLink,
  row: AutomaticHealthRow
): LinkHealthInfo {
  const successful = row.status === "alive" || row.status === "password";
  return {
    url: link.originalUrl,
    normalizedUrl: link.normalizedUrl,
    platform: row.platform,
    status: row.status,
    failCount: row.status === "dead" ? 1 : 0,
    successCount: successful ? 1 : 0,
    checkedAt: Number(row.checked_at || 0),
    reason: row.reason || undefined,
    confidence: Number(row.confidence || 0),
    source: "automatic",
  };
}

function chooseHealthInfo(
  community: LinkHealthInfo,
  automatic?: LinkHealthInfo
): LinkHealthInfo {
  if (!automatic) return community;
  if (automatic.status === "dead") {
    const independentlyRecovered =
      ["alive", "password"].includes(community.status) &&
      community.successCount >= 2 &&
      community.checkedAt > automatic.checkedAt;
    return independentlyRecovered ? community : automatic;
  }
  if (community.status === "dead") {
    const automaticallyRecovered =
      ["alive", "password"].includes(automatic.status) &&
      automatic.checkedAt > community.checkedAt;
    return automaticallyRecovered ? automatic : community;
  }
  if (community.status === "unknown") return automatic;
  if (
    automatic.status !== "unknown" &&
    automatic.checkedAt >= community.checkedAt
  ) {
    return automatic;
  }
  return community;
}

export function classifyLinkHealth(
  failCount: number,
  successCount: number,
  passwordCount: number
): LinkHealthStatus {
  if (failCount >= 2 && failCount > successCount) return "dead";
  if (successCount > 0) {
    return passwordCount === successCount ? "password" : "alive";
  }
  return "unknown";
}

export async function queryLinkHealth(
  database: D1DatabaseLike,
  urls: string[],
  now = Date.now()
): Promise<LinkHealthInfo[]> {
  const links = await prepareLinks(urls);
  if (links.length === 0) return [];

  const placeholders = links.map(() => "?").join(",");
  const hashes = links.map((link) => link.urlHash);
  const communityPromise = database
    .prepare(
      `SELECT url_hash, normalized_url, platform, status,
              fail_count, success_count, checked_at
       FROM link_health
       WHERE url_hash IN (${placeholders}) AND checked_at >= ?`
    )
    .bind(...hashes, now - HEALTH_TTL_MS)
    .all<HealthRow>();
  const automaticPromise = database
    .prepare(
      `SELECT url_hash, normalized_url, platform, status,
              reason, confidence, checked_at
       FROM link_health_checks
       WHERE url_hash IN (${placeholders})
         AND checked_at >= ?`
    )
    .bind(...hashes, now - AUTOMATIC_HEALTH_TTL_MS)
    .all<AutomaticHealthRow>()
    .catch((error) => {
      if (/no such table/i.test(String(error))) return { results: [] };
      throw error;
    });
  const [communityResult, automaticResult] = await Promise.all([
    communityPromise,
    automaticPromise,
  ]);
  const communityRows = new Map(
    (communityResult.results || []).map((row) => [row.url_hash, row] as const)
  );
  const automaticRows = new Map(
    (automaticResult.results || []).map((row) => [row.url_hash, row] as const)
  );
  return links.map((link) => {
    const community = toHealthInfo(link, communityRows.get(link.urlHash));
    const automaticRow = automaticRows.get(link.urlHash);
    return chooseHealthInfo(
      community,
      automaticRow ? toAutomaticHealthInfo(link, automaticRow) : undefined
    );
  });
}

export async function reportLinkHealth(
  database: D1DatabaseLike,
  reports: LinkHealthReportInput[],
  reporterHash: string,
  now = Date.now()
): Promise<LinkHealthInfo[]> {
  const validReports = reports
    .filter((report) =>
      report && ["alive", "dead", "password"].includes(report.status)
    )
    .slice(0, MAX_LINK_HEALTH_BATCH);
  const links = await prepareLinks(validReports.map((report) => report.url));
  if (links.length === 0) return [];

  const reportByUrl = new Map(
    validReports.map((report) => [normalizeLinkHealthUrl(report.url), report.status])
  );
  const preparedReports = links.map((link) => ({
    ...link,
    status: reportByUrl.get(link.normalizedUrl) as LinkHealthReportStatus,
  }));

  await database
    .prepare("DELETE FROM link_health_reports WHERE checked_at < ?")
    .bind(now - REPORT_TTL_MS)
    .run();

  await runStatements(
    database,
    preparedReports.map((report) =>
      database
        .prepare(
          `INSERT INTO link_health_reports
             (url_hash, reporter_hash, status, checked_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(url_hash, reporter_hash) DO UPDATE SET
             status = excluded.status,
             checked_at = excluded.checked_at`
        )
        .bind(report.urlHash, reporterHash, report.status, now)
    )
  );

  const placeholders = links.map(() => "?").join(",");
  const [aggregateResult, previousHealthResult] = await Promise.all([
    database
    .prepare(
      `SELECT url_hash,
              SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) AS fail_count,
              SUM(CASE WHEN status IN ('alive', 'password') THEN 1 ELSE 0 END) AS success_count,
              SUM(CASE WHEN status = 'password' THEN 1 ELSE 0 END) AS password_count,
              MAX(checked_at) AS checked_at
       FROM link_health_reports
       WHERE url_hash IN (${placeholders}) AND checked_at >= ?
       GROUP BY url_hash`
    )
    .bind(...links.map((link) => link.urlHash), now - REPORT_TTL_MS)
    .all<ReportAggregateRow>(),
    database
      .prepare(
        `SELECT url_hash, status FROM link_health
         WHERE url_hash IN (${placeholders})`
      )
      .bind(...links.map((link) => link.urlHash))
      .all<{ url_hash: string; status: LinkHealthStatus }>(),
  ]);
  const aggregates = new Map(
    (aggregateResult.results || []).map((row) => [row.url_hash, row] as const)
  );
  const previousStatuses = new Map(
    (previousHealthResult.results || []).map((row) => [row.url_hash, row.status])
  );

  const healthRows = links.map((link) => {
    const aggregate = aggregates.get(link.urlHash);
    const failCount = Number(aggregate?.fail_count || 0);
    const successCount = Number(aggregate?.success_count || 0);
    const passwordCount = Number(aggregate?.password_count || 0);
    return {
      link,
      failCount,
      successCount,
      checkedAt: Number(aggregate?.checked_at || now),
      status: classifyLinkHealth(failCount, successCount, passwordCount),
    };
  });

  await runStatements(
    database,
    healthRows.map((row) =>
      database
        .prepare(
          `INSERT INTO link_health
             (url_hash, normalized_url, platform, status, fail_count,
              success_count, checked_at, last_reported_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(url_hash) DO UPDATE SET
             normalized_url = excluded.normalized_url,
             platform = excluded.platform,
             status = excluded.status,
             fail_count = excluded.fail_count,
             success_count = excluded.success_count,
             checked_at = excluded.checked_at,
             last_reported_at = excluded.last_reported_at`
        )
        .bind(
          row.link.urlHash,
          row.link.normalizedUrl,
          row.link.platform,
          row.status,
          row.failCount,
          row.successCount,
          row.checkedAt,
          now
        )
    )
  );

  try {
    const transitionStatements = healthRows.flatMap((row) => {
      const previousStatus = previousStatuses.get(row.link.urlHash) || "unknown";
      const statements: D1StatementLike[] = [];
      if (previousStatus !== row.status) {
        statements.push(
          database
            .prepare(
              `INSERT INTO link_health_history
                 (url_hash, platform, previous_status, status, reason, checked_at)
               VALUES (?, ?, ?, ?, 'community_report', ?)`
            )
            .bind(
              row.link.urlHash,
              row.link.platform,
              previousStatus,
              row.status,
              now
            )
        );
      }
      if (["alive", "password", "dead"].includes(row.status)) {
        statements.push(
          database
            .prepare(
              "UPDATE resource_catalog SET status = ? WHERE normalized_url = ?"
            )
            .bind(row.status, row.link.normalizedUrl)
        );
      }
      return statements;
    });
    await runStatements(database, transitionStatements);
  } catch (error) {
    if (!/no such (?:table|column)/i.test(String(error))) throw error;
  }

  try {
    await runStatements(
      database,
      healthRows.map((row) =>
        database
          .prepare(
            `INSERT INTO link_health_checks
               (url_hash, normalized_url, original_url, platform, status,
                reason, confidence, http_status, failure_streak, checked_at,
                next_check_at, first_seen_at, last_seen_at, last_alive_at,
                click_count, report_count, last_clicked_at)
             VALUES (?, ?, ?, ?, 'unknown', '', 0, 0, 0, 0, ?, ?, ?, 0, 0, ?, 0)
             ON CONFLICT(url_hash) DO UPDATE SET
               report_count = excluded.report_count,
               last_seen_at = excluded.last_seen_at,
               next_check_at = MIN(link_health_checks.next_check_at, excluded.next_check_at)`
          )
          .bind(
            row.link.urlHash,
            row.link.normalizedUrl,
            row.link.originalUrl,
            row.link.platform,
            now,
            now,
            now,
            row.failCount + row.successCount
          )
      )
    );
  } catch (error) {
    if (!/no such (?:table|column)/i.test(String(error))) throw error;
  }

  return healthRows.map((row) => ({
    url: row.link.originalUrl,
    normalizedUrl: row.link.normalizedUrl,
    platform: row.link.platform,
    status: row.status,
    failCount: row.failCount,
    successCount: row.successCount,
    checkedAt: row.checkedAt,
  }));
}
