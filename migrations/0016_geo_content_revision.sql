ALTER TABLE geo_pages
  ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_geo_pages_revision
  ON geo_pages (status, content_revision, updated_at);
