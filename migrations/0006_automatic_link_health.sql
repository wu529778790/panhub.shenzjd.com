CREATE TABLE IF NOT EXISTS link_health_checks (
  url_hash TEXT PRIMARY KEY,
  normalized_url TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('unknown', 'alive', 'dead', 'password', 'suspect')),
  reason TEXT NOT NULL DEFAULT '',
  confidence INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER NOT NULL DEFAULT 0,
  failure_streak INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL DEFAULT 0,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  last_alive_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_link_health_checks_due
  ON link_health_checks (next_check_at, status);

CREATE INDEX IF NOT EXISTS idx_link_health_checks_status
  ON link_health_checks (status, checked_at DESC);
