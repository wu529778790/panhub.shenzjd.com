import type { D1DatabaseLike, D1StatementLike } from "../../utils/cloudflareBindings";
import type { SearchResponse } from "../types/models";
import {
  getLinkPlatform,
  normalizeLinkHealthUrl,
} from "../../../utils/linkHealth";
import { sha256Hex } from "./linkHealthService";

const MAX_REGISTERED_LINKS = 300;
const WRITE_BATCH_SIZE = 40;

export function collectSearchLinksForAutomaticCheck(
  response: SearchResponse
): string[] {
  const urls = new Set<string>();
  for (const items of Object.values(response.merged_by_type || {})) {
    for (const item of items) {
      if (item?.url) urls.add(item.url);
      if (urls.size >= MAX_REGISTERED_LINKS) return Array.from(urls);
    }
  }
  for (const result of response.results || []) {
    for (const link of result.links || []) {
      if (link?.url) urls.add(link.url);
      if (urls.size >= MAX_REGISTERED_LINKS) return Array.from(urls);
    }
  }
  return Array.from(urls);
}

async function runStatements(
  database: D1DatabaseLike,
  statements: D1StatementLike[]
): Promise<void> {
  if (!statements.length) return;
  if (database.batch) {
    await database.batch(statements);
    return;
  }
  await Promise.all(statements.map((statement) => statement.run()));
}

/** Register HTTP share links for the Cron worker without probing them inline. */
export async function registerSearchLinksForAutomaticCheck(
  database: D1DatabaseLike | undefined,
  response: SearchResponse,
  now = Date.now()
): Promise<number> {
  if (!database) return 0;
  const prepared = (
    await Promise.all(
      collectSearchLinksForAutomaticCheck(response).map(async (url) => {
        const normalizedUrl = normalizeLinkHealthUrl(url);
        const platform = normalizedUrl ? getLinkPlatform(normalizedUrl) : null;
        if (!normalizedUrl || !platform || platform === "magnet") return null;
        return {
          url,
          normalizedUrl,
          platform,
          urlHash: await sha256Hex(normalizedUrl),
        };
      })
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  try {
    for (let offset = 0; offset < prepared.length; offset += WRITE_BATCH_SIZE) {
      const statements = prepared
        .slice(offset, offset + WRITE_BATCH_SIZE)
        .map((item) =>
          database
            .prepare(
              `INSERT INTO link_health_checks
                 (url_hash, normalized_url, original_url, platform, status,
                  reason, confidence, http_status, failure_streak, checked_at,
                  next_check_at, first_seen_at, last_seen_at, last_alive_at)
               VALUES (?, ?, ?, ?, 'unknown', '', 0, 0, 0, 0, ?, ?, ?, 0)
               ON CONFLICT(url_hash) DO UPDATE SET
                 original_url = excluded.original_url,
                 platform = excluded.platform,
                 last_seen_at = excluded.last_seen_at,
                 next_check_at = CASE
                   WHEN link_health_checks.next_check_at <= 0
                   THEN excluded.next_check_at
                   ELSE link_health_checks.next_check_at
                 END`
            )
            .bind(
              item.urlHash,
              item.normalizedUrl,
              item.url,
              item.platform,
              now,
              now,
              now
            )
        );
      await runStatements(database, statements);
    }
    return prepared.length;
  } catch (error) {
    // Keep search functional during migration rollout or temporary D1 errors.
    if (/no such table/i.test(String(error))) return 0;
    throw error;
  }
}
