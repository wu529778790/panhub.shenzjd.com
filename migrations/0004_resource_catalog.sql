CREATE TABLE IF NOT EXISTS resource_catalog (
  normalized_url TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('unknown', 'alive', 'dead', 'password')),
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resource_catalog_type_status
  ON resource_catalog (type, status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS resource_catalog_sources (
  normalized_url TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_label TEXT NOT NULL,
  sync_revision TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (normalized_url, source_key),
  FOREIGN KEY (normalized_url)
    REFERENCES resource_catalog (normalized_url)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_catalog_sources_source
  ON resource_catalog_sources (source_key, sync_revision);

CREATE TABLE IF NOT EXISTS resource_sync_state (
  source_key TEXT PRIMARY KEY,
  revision TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'success', 'error')),
  item_count INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL DEFAULT 0,
  finished_at INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT ''
);
