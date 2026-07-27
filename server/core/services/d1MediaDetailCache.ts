import type { D1DatabaseLike } from "../../utils/cloudflareBindings";
import type { MediaDetail } from "./mediaDetailService";
import { isValidDoubanSubjectId } from "./mediaDetailService";

interface D1MediaDetailCacheRow {
  payload_json: string;
  updated_at: number;
}

function isMediaDetail(value: unknown): value is MediaDetail {
  const detail = value as MediaDetail | undefined;
  return Boolean(
    detail &&
      isValidDoubanSubjectId(detail.id) &&
      (detail.kind === "movie" || detail.kind === "tv") &&
      typeof detail.title === "string" &&
      detail.title.trim() &&
      typeof detail.cover === "string" &&
      detail.cover.startsWith("https://")
  );
}

export function parseD1MediaDetailCacheEntry(
  payloadJson: string,
  updatedAt: number
): MediaDetail | undefined {
  try {
    const payload = JSON.parse(payloadJson) as unknown;
    if (!isMediaDetail(payload)) return undefined;
    return {
      ...payload,
      updatedAt: Number(updatedAt) || payload.updatedAt || 0,
    };
  } catch {
    return undefined;
  }
}

export async function getD1MediaDetailCache(
  database: D1DatabaseLike,
  id: string
): Promise<MediaDetail | undefined> {
  if (!isValidDoubanSubjectId(id)) return undefined;
  const row = await database
    .prepare(
      `SELECT payload_json, updated_at
       FROM media_detail_cache
       WHERE subject_id = ?`
    )
    .bind(id)
    .first<D1MediaDetailCacheRow>();

  return row
    ? parseD1MediaDetailCacheEntry(row.payload_json, row.updated_at)
    : undefined;
}

export async function saveD1MediaDetailCache(
  database: D1DatabaseLike,
  detail: MediaDetail
): Promise<void> {
  if (!isMediaDetail(detail)) return;
  const updatedAt = Number(detail.updatedAt) || Date.now();
  await database
    .prepare(
      `INSERT INTO media_detail_cache
         (subject_id, kind, title, payload_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(subject_id) DO UPDATE SET
         kind = excluded.kind,
         title = excluded.title,
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`
    )
    .bind(
      detail.id,
      detail.kind,
      detail.title,
      JSON.stringify(detail),
      updatedAt
    )
    .run();
}
