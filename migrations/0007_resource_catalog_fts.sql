CREATE VIRTUAL TABLE IF NOT EXISTS resource_catalog_fts USING fts5(
  normalized_url UNINDEXED,
  title,
  category,
  content = 'resource_catalog',
  content_rowid = 'rowid',
  tokenize = 'trigram'
);

INSERT INTO resource_catalog_fts(rowid, normalized_url, title, category)
SELECT rowid, normalized_url, title, category
FROM resource_catalog;

CREATE TRIGGER IF NOT EXISTS resource_catalog_fts_insert
AFTER INSERT ON resource_catalog BEGIN
  INSERT INTO resource_catalog_fts(rowid, normalized_url, title, category)
  VALUES (new.rowid, new.normalized_url, new.title, new.category);
END;

CREATE TRIGGER IF NOT EXISTS resource_catalog_fts_delete
AFTER DELETE ON resource_catalog BEGIN
  INSERT INTO resource_catalog_fts(
    resource_catalog_fts, rowid, normalized_url, title, category
  ) VALUES (
    'delete', old.rowid, old.normalized_url, old.title, old.category
  );
END;

CREATE TRIGGER IF NOT EXISTS resource_catalog_fts_update
AFTER UPDATE OF normalized_url, title, category ON resource_catalog BEGIN
  INSERT INTO resource_catalog_fts(
    resource_catalog_fts, rowid, normalized_url, title, category
  ) VALUES (
    'delete', old.rowid, old.normalized_url, old.title, old.category
  );
  INSERT INTO resource_catalog_fts(rowid, normalized_url, title, category)
  VALUES (new.rowid, new.normalized_url, new.title, new.category);
END;

CREATE INDEX IF NOT EXISTS idx_resource_catalog_title
  ON resource_catalog (title);
