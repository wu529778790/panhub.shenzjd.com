import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import type { DoubanHotItem, DoubanHotPageResult } from "./doubanHotService";

interface D1DoubanHotCacheRow {
  payload_json: string;
  updated_at: number;
}

export interface D1DoubanHotCacheEntry extends DoubanHotPageResult {
  updatedAt: number;
}

export function createD1DoubanHotCacheKey(
  category: string,
  page: number,
  limit: number
): string {
  return `${category}:${page}:${limit}`;
}

function isDoubanHotItem(value: unknown): value is DoubanHotItem {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as DoubanHotItem).title === "string" &&
    (value as DoubanHotItem).title.trim()
  );
}

export function parseD1DoubanHotCacheEntry(
  payloadJson: string,
  updatedAt: number,
  page: number
): D1DoubanHotCacheEntry | undefined {
  try {
    const payload = JSON.parse(payloadJson) as Partial<DoubanHotPageResult>;
    const items = Array.isArray(payload.items)
      ? payload.items.filter(isDoubanHotItem)
      : [];

    if (page === 1 && items.length === 0) return undefined;

    return {
      items,
      hasMore: Boolean(payload.hasMore),
      updatedAt: Number(updatedAt) || 0,
    };
  } catch {
    return undefined;
  }
}

export async function saveD1DoubanHotCache(
  database: D1DatabaseLike,
  category: string,
  page: number,
  limit: number,
  data: DoubanHotPageResult,
  now = Date.now()
): Promise<void> {
  if (page === 1 && data.items.length === 0) return;

  await database
    .prepare(
      `INSERT INTO douban_hot_cache (cache_key, payload_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`
    )
    .bind(
      createD1DoubanHotCacheKey(category, page, limit),
      JSON.stringify({ items: data.items, hasMore: data.hasMore }),
      now
    )
    .run();
}

export async function getD1DoubanHotCache(
  database: D1DatabaseLike,
  category: string,
  page: number,
  limit: number
): Promise<D1DoubanHotCacheEntry | undefined> {
  const row = await database
    .prepare(
      `SELECT payload_json, updated_at
       FROM douban_hot_cache
       WHERE cache_key = ?`
    )
    .bind(createD1DoubanHotCacheKey(category, page, limit))
    .first<D1DoubanHotCacheRow>();

  if (!row) return undefined;
  return parseD1DoubanHotCacheEntry(row.payload_json, row.updated_at, page);
}
