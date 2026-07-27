import type { SearchResult } from "../types/models";
import type { D1DatabaseLike } from "../../utils/cloudflareBindings";

export const MAGNET_CACHE_FRESH_MS = 30 * 60 * 1_000;
export const MAGNET_CACHE_STALE_MS = 24 * 60 * 60 * 1_000;

interface MagnetSearchCacheRow {
  payload_json: string;
  updated_at: number;
}

export interface MagnetSearchCacheEntry {
  results: SearchResult[];
  updatedAt: number;
  fresh: boolean;
}

function normalizeQueryKey(value: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function isSearchResult(value: unknown): value is SearchResult {
  const result = value as Partial<SearchResult> | undefined;
  return Boolean(
    result &&
      typeof result.title === "string" &&
      Array.isArray(result.links) &&
      result.links.some(
        (link) =>
          link &&
          typeof link.url === "string" &&
          /^magnet:\?xt=urn:btih:/i.test(link.url)
      )
  );
}

export function markSourceCache(
  ext: Record<string, any>,
  status: "hit" | "miss"
): void {
  ext.__source_cache_status = status;
}

export async function readMagnetSearchCache(
  database: D1DatabaseLike | undefined,
  sourceKey: string,
  query: string,
  now = Date.now()
): Promise<MagnetSearchCacheEntry | undefined> {
  if (!database) return undefined;
  const queryKey = normalizeQueryKey(query);
  if (!queryKey) return undefined;

  const row = await database
    .prepare(
      `SELECT payload_json, updated_at
       FROM magnet_search_cache
       WHERE source_key = ? AND query_key = ?`
    )
    .bind(sourceKey, queryKey)
    .first<MagnetSearchCacheRow>()
    .catch(() => null);
  if (!row) return undefined;

  const updatedAt = Number(row.updated_at || 0);
  const age = Math.max(0, now - updatedAt);
  if (!updatedAt || age > MAGNET_CACHE_STALE_MS) return undefined;

  try {
    const payload = JSON.parse(row.payload_json);
    if (!Array.isArray(payload)) return undefined;
    const results = payload.filter(isSearchResult).slice(0, 160);
    if (!results.length) return undefined;
    return {
      results,
      updatedAt,
      fresh: age <= MAGNET_CACHE_FRESH_MS,
    };
  } catch {
    return undefined;
  }
}

export async function writeMagnetSearchCache(
  database: D1DatabaseLike | undefined,
  sourceKey: string,
  query: string,
  results: SearchResult[],
  now = Date.now()
): Promise<void> {
  if (!database || !results.length) return;
  const queryKey = normalizeQueryKey(query);
  if (!queryKey) return;
  const bounded = results.filter(isSearchResult).slice(0, 160);
  if (!bounded.length) return;

  await database
    .prepare(
      `INSERT INTO magnet_search_cache
         (source_key, query_key, query, payload_json, result_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_key, query_key) DO UPDATE SET
         query = excluded.query,
         payload_json = excluded.payload_json,
         result_count = excluded.result_count,
         updated_at = excluded.updated_at`
    )
    .bind(
      sourceKey,
      queryKey,
      String(query || "").trim().slice(0, 160),
      JSON.stringify(bounded),
      bounded.length,
      now
    )
    .run()
    .catch(() => undefined);
}

export async function listRecentMagnetCacheQueries(
  database: D1DatabaseLike,
  limit = 6
): Promise<Array<{ sourceKey: string; query: string }>> {
  const response = await database
    .prepare(
      `SELECT source_key, query
       FROM magnet_search_cache
       WHERE result_count > 0
       ORDER BY updated_at DESC
       LIMIT ?`
    )
    .bind(Math.max(1, Math.min(20, Math.floor(limit))))
    .all<{ source_key: string; query: string }>()
    .catch(() => ({ results: [] }));
  return (response.results || [])
    .map((row) => ({
      sourceKey: String(row.source_key || "").trim(),
      query: String(row.query || "").trim(),
    }))
    .filter((row) => row.sourceKey && row.query);
}

export async function pruneMagnetSearchCache(
  database: D1DatabaseLike,
  now = Date.now()
): Promise<void> {
  const statements = [
    database
      .prepare("DELETE FROM magnet_search_cache WHERE updated_at < ?")
      .bind(now - 7 * 24 * 60 * 60 * 1_000),
    database
      .prepare("DELETE FROM search_alias_cache WHERE updated_at < ?")
      .bind(now - 180 * 24 * 60 * 60 * 1_000),
  ];
  if (database.batch) {
    await database.batch(statements).catch(() => undefined);
    return;
  }
  await Promise.all(
    statements.map((statement) => statement.run().catch(() => undefined))
  );
}
