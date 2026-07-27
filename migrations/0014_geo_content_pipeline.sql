CREATE TABLE IF NOT EXISTS geo_keywords (
  keyword_id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  normalized_keyword TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '综合资源',
  intent TEXT NOT NULL DEFAULT 'resource_discovery',
  platform TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'search_signal',
  demand_score REAL NOT NULL DEFAULT 0,
  opportunity_score REAL NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  no_result_count INTEGER NOT NULL DEFAULT 0,
  result_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (status IN (
      'discovered', 'queued', 'generating', 'published', 'rejected', 'paused'
    )),
  discovered_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_geo_keywords_opportunity
  ON geo_keywords (status, opportunity_score DESC, demand_score DESC);

CREATE INDEX IF NOT EXISTS idx_geo_keywords_classification
  ON geo_keywords (category, intent, platform);

CREATE TABLE IF NOT EXISTS geo_content_jobs (
  job_id TEXT PRIMARY KEY,
  keyword_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'generating', 'reviewing', 'published', 'rejected', 'failed'
    )),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES geo_keywords (keyword_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_jobs_active_keyword
  ON geo_content_jobs (keyword_id)
  WHERE status IN ('queued', 'generating', 'reviewing');

CREATE INDEX IF NOT EXISTS idx_geo_jobs_queue
  ON geo_content_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS geo_pages (
  slug TEXT PRIMARY KEY,
  keyword_id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  description TEXT NOT NULL,
  summary TEXT NOT NULL,
  answer TEXT NOT NULL,
  sections_json TEXT NOT NULL DEFAULT '[]',
  faq_json TEXT NOT NULL DEFAULT '[]',
  search_examples_json TEXT NOT NULL DEFAULT '[]',
  references_json TEXT NOT NULL DEFAULT '[]',
  content_hash TEXT NOT NULL UNIQUE,
  quality_score INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  duplicate_score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'rejected', 'archived')),
  published_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (keyword_id) REFERENCES geo_keywords (keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_geo_pages_status_updated
  ON geo_pages (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS geo_content_reviews (
  review_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  quality_score INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  duplicate_score REAL NOT NULL,
  evidence_count INTEGER NOT NULL,
  keyword_ratio REAL NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('publish', 'reject')),
  issues_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES geo_content_jobs (job_id)
);

CREATE INDEX IF NOT EXISTS idx_geo_reviews_decision
  ON geo_content_reviews (decision, created_at DESC);

CREATE TABLE IF NOT EXISTS geo_knowledge_documents (
  document_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  vector_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (vector_status IN ('pending', 'indexed', 'failed')),
  indexed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_knowledge_source
  ON geo_knowledge_documents (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_geo_knowledge_vector
  ON geo_knowledge_documents (vector_status, updated_at);

CREATE VIRTUAL TABLE IF NOT EXISTS geo_knowledge_fts USING fts5(
  document_id UNINDEXED,
  title,
  body,
  tokenize = 'trigram'
);

CREATE TRIGGER IF NOT EXISTS geo_knowledge_fts_insert
AFTER INSERT ON geo_knowledge_documents BEGIN
  INSERT INTO geo_knowledge_fts(rowid, document_id, title, body)
  VALUES (new.rowid, new.document_id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS geo_knowledge_fts_delete
AFTER DELETE ON geo_knowledge_documents BEGIN
  DELETE FROM geo_knowledge_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS geo_knowledge_fts_update
AFTER UPDATE OF document_id, title, body ON geo_knowledge_documents BEGIN
  DELETE FROM geo_knowledge_fts WHERE rowid = old.rowid;
  INSERT INTO geo_knowledge_fts(rowid, document_id, title, body)
  VALUES (new.rowid, new.document_id, new.title, new.body);
END;

CREATE TABLE IF NOT EXISTS geo_metrics_daily (
  day TEXT PRIMARY KEY,
  keywords_discovered INTEGER NOT NULL DEFAULT 0,
  jobs_processed INTEGER NOT NULL DEFAULT 0,
  pages_published INTEGER NOT NULL DEFAULT 0,
  pages_rejected INTEGER NOT NULL DEFAULT 0,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  ai_failures INTEGER NOT NULL DEFAULT 0,
  vector_upserts INTEGER NOT NULL DEFAULT 0,
  vector_queries INTEGER NOT NULL DEFAULT 0,
  index_submitted INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_pipeline_runs (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  discovered_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  published_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_geo_pipeline_runs_started
  ON geo_pipeline_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS geo_pipeline_control (
  control_key TEXT PRIMARY KEY,
  control_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
