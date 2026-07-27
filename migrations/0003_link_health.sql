CREATE TABLE IF NOT EXISTS link_health (
  url_hash TEXT PRIMARY KEY,
  normalized_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('unknown', 'alive', 'dead', 'password')),
  fail_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL,
  last_reported_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_link_health_status_checked
  ON link_health (status, checked_at DESC);

CREATE TABLE IF NOT EXISTS link_health_reports (
  url_hash TEXT NOT NULL,
  reporter_hash TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('alive', 'dead', 'password')),
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (url_hash, reporter_hash)
);

CREATE INDEX IF NOT EXISTS idx_link_health_reports_checked
  ON link_health_reports (checked_at);
