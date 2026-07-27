import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import type {
  EntertainmentCollection,
  EntertainmentItem,
  EntertainmentLatestData,
} from "./entertainmentLatestService";

const CACHE_KEY = "homepage";

interface EntertainmentCacheRow {
  payload_json: string;
  updated_at: number;
}

function isEntertainmentItem(value: unknown): value is EntertainmentItem {
  const item = value as EntertainmentItem | undefined;
  return Boolean(
    item &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.cover === "string" &&
    (item.kind === "movie" || item.kind === "tv")
  );
}

function isEntertainmentCollection(
  value: unknown
): value is EntertainmentCollection {
  const collection = value as EntertainmentCollection | undefined;
  return Boolean(
    collection &&
      typeof collection.id === "string" &&
      typeof collection.title === "string" &&
      typeof collection.description === "string" &&
      (collection.kind === "movie" || collection.kind === "tv") &&
      Array.isArray(collection.items) &&
      collection.items.length > 0 &&
      collection.items.every(isEntertainmentItem)
  );
}

export function parseEntertainmentLatestCache(
  payloadJson: string,
  updatedAt: number
): EntertainmentLatestData | undefined {
  try {
    const payload = JSON.parse(payloadJson) as Partial<EntertainmentLatestData>;
    const movies = Array.isArray(payload.movies)
      ? payload.movies.filter(isEntertainmentItem)
      : [];
    const tv = Array.isArray(payload.tv)
      ? payload.tv.filter(isEntertainmentItem)
      : [];
    if (!movies.length || !tv.length) return undefined;
    const parsedCollections = Array.isArray(payload.collections)
      ? payload.collections.filter(isEntertainmentCollection)
      : [];
    const collections = parsedCollections.length
      ? parsedCollections
      : [
          {
            id: "movie-library",
            kind: "movie" as const,
            title: "高分电影",
            description: "豆瓣高分电影片单",
            items: movies,
          },
          {
            id: "tv-hot",
            kind: "tv" as const,
            title: "近期热播电视剧",
            description: "豆瓣近期热播片单",
            items: tv,
          },
        ];

    return {
      movies,
      tv,
      collections,
      updatedAt: Number(updatedAt) || Number(payload.updatedAt) || 0,
    };
  } catch {
    return undefined;
  }
}

export async function getEntertainmentLatestCache(
  database: D1DatabaseLike
): Promise<EntertainmentLatestData | undefined> {
  const row = await database
    .prepare(
      `SELECT payload_json, updated_at
       FROM entertainment_latest_cache
       WHERE cache_key = ?`
    )
    .bind(CACHE_KEY)
    .first<EntertainmentCacheRow>();

  return row
    ? parseEntertainmentLatestCache(row.payload_json, row.updated_at)
    : undefined;
}

export async function saveEntertainmentLatestCache(
  database: D1DatabaseLike,
  data: EntertainmentLatestData
): Promise<void> {
  if (!data.movies.length || !data.tv.length) return;

  await database
    .prepare(
      `INSERT INTO entertainment_latest_cache (cache_key, payload_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`
    )
    .bind(
      CACHE_KEY,
      JSON.stringify({
        movies: data.movies,
        tv: data.tv,
        collections: data.collections,
      }),
      data.updatedAt
    )
    .run();
}
