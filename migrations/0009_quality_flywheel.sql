ALTER TABLE search_quality_daily
  ADD COLUMN latency_le_500 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_quality_daily
  ADD COLUMN latency_le_1000 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_quality_daily
  ADD COLUMN latency_le_2000 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_quality_daily
  ADD COLUMN latency_le_5000 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_quality_daily
  ADD COLUMN latency_le_10000 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE search_quality_daily
  ADD COLUMN latency_over_10000 INTEGER NOT NULL DEFAULT 0;

UPDATE search_quality_daily
SET latency_le_500 = CASE
      WHEN search_count > 0 AND latency_ms / search_count <= 500 THEN search_count ELSE 0 END,
    latency_le_1000 = CASE
      WHEN search_count > 0 AND latency_ms / search_count <= 1000 THEN search_count ELSE 0 END,
    latency_le_2000 = CASE
      WHEN search_count > 0 AND latency_ms / search_count <= 2000 THEN search_count ELSE 0 END,
    latency_le_5000 = CASE
      WHEN search_count > 0 AND latency_ms / search_count <= 5000 THEN search_count ELSE 0 END,
    latency_le_10000 = CASE
      WHEN search_count > 0 AND latency_ms / search_count <= 10000 THEN search_count ELSE 0 END,
    latency_over_10000 = CASE
      WHEN search_count > 0 AND latency_ms / search_count > 10000 THEN search_count ELSE 0 END;

ALTER TABLE source_performance_daily
  ADD COLUMN unique_result_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_performance_daily
  ADD COLUMN duplicate_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_performance_daily
  ADD COLUMN empty_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_performance_daily
  ADD COLUMN timeout_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_performance_daily
  ADD COLUMN cached_count INTEGER NOT NULL DEFAULT 0;

UPDATE source_performance_daily
SET unique_result_count = result_count
WHERE unique_result_count = 0 AND result_count > 0;

CREATE TABLE IF NOT EXISTS link_health_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url_hash TEXT NOT NULL,
  platform TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  checked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_link_health_history_checked
  ON link_health_history (checked_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_link_health_history_url
  ON link_health_history (url_hash, checked_at DESC);

CREATE TABLE IF NOT EXISTS operations_snapshot_daily (
  day TEXT PRIMARY KEY,
  resource_count INTEGER NOT NULL DEFAULT 0,
  alive_count INTEGER NOT NULL DEFAULT 0,
  password_count INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0,
  dead_count INTEGER NOT NULL DEFAULT 0,
  due_check_count INTEGER NOT NULL DEFAULT 0,
  recorded_at INTEGER NOT NULL
);
