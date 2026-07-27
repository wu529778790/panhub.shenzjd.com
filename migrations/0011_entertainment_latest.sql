CREATE TABLE IF NOT EXISTS entertainment_latest_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entertainment_latest_updated
  ON entertainment_latest_cache(updated_at DESC);
