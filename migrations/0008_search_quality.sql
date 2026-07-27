CREATE TABLE IF NOT EXISTS search_quality_events (
  event_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_quality_events_created
  ON search_quality_events (created_at);

CREATE TABLE IF NOT EXISTS search_quality_daily (
  day TEXT PRIMARY KEY,
  search_count INTEGER NOT NULL DEFAULT 0,
  no_result_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  exact_search_count INTEGER NOT NULL DEFAULT 0,
  fuzzy_search_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_query_daily (
  day TEXT NOT NULL,
  query TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 0,
  no_result_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_searched_at INTEGER NOT NULL,
  PRIMARY KEY (day, query)
);

CREATE INDEX IF NOT EXISTS idx_search_query_daily_searches
  ON search_query_daily (day, search_count DESC);

CREATE TABLE IF NOT EXISTS source_performance_daily (
  day TEXT NOT NULL,
  source_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  last_requested_at INTEGER NOT NULL,
  PRIMARY KEY (day, source_key)
);

CREATE INDEX IF NOT EXISTS idx_source_performance_daily_requests
  ON source_performance_daily (day, request_count DESC);

CREATE TABLE IF NOT EXISTS result_click_daily (
  day TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at INTEGER NOT NULL,
  PRIMARY KEY (day, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_result_click_daily_clicks
  ON result_click_daily (day, click_count DESC);

ALTER TABLE link_health_checks ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE link_health_checks ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE link_health_checks ADD COLUMN last_clicked_at INTEGER NOT NULL DEFAULT 0;
