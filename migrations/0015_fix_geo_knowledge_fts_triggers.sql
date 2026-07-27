DROP TRIGGER IF EXISTS geo_knowledge_fts_delete;
DROP TRIGGER IF EXISTS geo_knowledge_fts_update;

CREATE TRIGGER geo_knowledge_fts_delete
AFTER DELETE ON geo_knowledge_documents BEGIN
  DELETE FROM geo_knowledge_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER geo_knowledge_fts_update
AFTER UPDATE OF document_id, title, body ON geo_knowledge_documents BEGIN
  DELETE FROM geo_knowledge_fts WHERE rowid = old.rowid;
  INSERT INTO geo_knowledge_fts(rowid, document_id, title, body)
  VALUES (new.rowid, new.document_id, new.title, new.body);
END;
