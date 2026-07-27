CREATE TABLE IF NOT EXISTS douban_hot_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_douban_hot_cache_updated
  ON douban_hot_cache (updated_at DESC);
