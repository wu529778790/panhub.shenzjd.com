CREATE TABLE IF NOT EXISTS traffic_event_receipts (
  event_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traffic_event_receipts_created
  ON traffic_event_receipts (created_at);

CREATE TABLE IF NOT EXISTS traffic_sessions (
  session_hash TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  entry_path TEXT NOT NULL,
  exit_path TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 1,
  engagement_ms INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'direct',
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT NOT NULL DEFAULT 'none',
  campaign TEXT NOT NULL DEFAULT 'none',
  country TEXT NOT NULL DEFAULT 'unknown',
  browser TEXT NOT NULL DEFAULT 'other',
  os TEXT NOT NULL DEFAULT 'other',
  device TEXT NOT NULL DEFAULT 'desktop',
  language TEXT NOT NULL DEFAULT 'unknown',
  screen TEXT NOT NULL DEFAULT 'unknown',
  error_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  result_click_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_traffic_sessions_day
  ON traffic_sessions (day, started_at);

CREATE INDEX IF NOT EXISTS idx_traffic_sessions_last_seen
  ON traffic_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_traffic_sessions_visitor
  ON traffic_sessions (day, visitor_hash);

CREATE TABLE IF NOT EXISTS traffic_page_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  entrance_count INTEGER NOT NULL DEFAULT 0,
  leave_count INTEGER NOT NULL DEFAULT 0,
  engagement_ms INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  result_click_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (day, path)
);

CREATE INDEX IF NOT EXISTS idx_traffic_page_daily_views
  ON traffic_page_daily (day, page_views DESC);

CREATE TABLE IF NOT EXISTS traffic_vitals_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  metric TEXT NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  value_sum REAL NOT NULL DEFAULT 0,
  good_count INTEGER NOT NULL DEFAULT 0,
  needs_improvement_count INTEGER NOT NULL DEFAULT 0,
  poor_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (day, path, metric)
);

CREATE INDEX IF NOT EXISTS idx_traffic_vitals_daily_metric
  ON traffic_vitals_daily (day, metric);

CREATE TABLE IF NOT EXISTS traffic_errors_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  message TEXT NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (day, path, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_traffic_errors_daily_count
  ON traffic_errors_daily (day, error_count DESC);
