CREATE TABLE IF NOT EXISTS magnet_search_cache (
  source_key TEXT NOT NULL,
  query_key TEXT NOT NULL,
  query TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (source_key, query_key)
);

CREATE INDEX IF NOT EXISTS idx_magnet_search_cache_updated
  ON magnet_search_cache(updated_at DESC);

CREATE TABLE IF NOT EXISTS search_alias_cache (
  query_key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  aliases_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_alias_cache_updated
  ON search_alias_cache(updated_at DESC);
