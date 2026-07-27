CREATE TABLE IF NOT EXISTS seo_event_receipts (
  event_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_event_receipts_created
  ON seo_event_receipts (created_at);

CREATE TABLE IF NOT EXISTS seo_landing_daily (
  day TEXT NOT NULL,
  landing_path TEXT NOT NULL,
  channel TEXT NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL,
  landing_count INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  result_click_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (day, landing_path, channel, source, medium, campaign)
);

CREATE INDEX IF NOT EXISTS idx_seo_landing_daily_channel
  ON seo_landing_daily (day, channel, landing_count DESC);

CREATE INDEX IF NOT EXISTS idx_seo_landing_daily_path
  ON seo_landing_daily (day, landing_path, landing_count DESC);

CREATE TABLE IF NOT EXISTS seo_audit_daily (
  day TEXT PRIMARY KEY,
  sitemap_url_count INTEGER NOT NULL DEFAULT 0,
  healthy_url_count INTEGER NOT NULL DEFAULT 0,
  error_url_count INTEGER NOT NULL DEFAULT 0,
  submitted_url_count INTEGER NOT NULL DEFAULT 0,
  indexnow_status INTEGER NOT NULL DEFAULT 0,
  baidu_status INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  audited_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seo_page_audit_daily (
  day TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  lastmod TEXT NOT NULL DEFAULT '',
  http_status INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  canonical TEXT NOT NULL DEFAULT '',
  robots TEXT NOT NULL DEFAULT '',
  h1_count INTEGER NOT NULL DEFAULT 0,
  has_structured_data INTEGER NOT NULL DEFAULT 0,
  issues TEXT NOT NULL DEFAULT '',
  audited_at INTEGER NOT NULL,
  PRIMARY KEY (day, url)
);

CREATE INDEX IF NOT EXISTS idx_seo_page_audit_issues
  ON seo_page_audit_daily (day, issues);

CREATE TABLE IF NOT EXISTS seo_index_state (
  url TEXT PRIMARY KEY,
  lastmod TEXT NOT NULL DEFAULT '',
  last_audited_at INTEGER NOT NULL DEFAULT 0,
  last_submitted_at INTEGER NOT NULL DEFAULT 0,
  indexnow_status INTEGER NOT NULL DEFAULT 0,
  baidu_status INTEGER NOT NULL DEFAULT 0
);
