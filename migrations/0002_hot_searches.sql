CREATE TABLE IF NOT EXISTS hot_searches (
  term TEXT PRIMARY KEY,
  score INTEGER NOT NULL DEFAULT 1,
  last_searched_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hot_search_score
  ON hot_searches (score DESC, last_searched_at DESC);

CREATE INDEX IF NOT EXISTS idx_hot_search_recent
  ON hot_searches (last_searched_at DESC);
