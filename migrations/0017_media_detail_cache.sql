CREATE TABLE IF NOT EXISTS media_detail_cache (
  subject_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'tv')),
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_detail_cache_kind_updated
  ON media_detail_cache (kind, updated_at DESC);
