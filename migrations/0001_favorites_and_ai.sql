CREATE TABLE IF NOT EXISTS favorite_vaults (
  vault_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  cache_key TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires_at
  ON ai_analysis_cache (expires_at);
