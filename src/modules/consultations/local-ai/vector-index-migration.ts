/**
 * Generation counter of the search passages. The native vector index (Rust, recherche_vecteurs) keeps the vectors in
 * memory and reloads them when the number of passages or this counter changes. The counter is needed: re-indexing the
 * latest passage deletes it and inserts it again under the same rowid, so neither the count nor the rowids move.
 * Reading max(updated_at) instead would read every passage past its 3 KB vector (53 ms at 1 000 patients).
 */
export const VECTOR_INDEX_STATE_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS search_index_state (id INTEGER PRIMARY KEY CHECK (id = 1), generation INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO search_index_state (id, generation) VALUES (1, 0);
CREATE TRIGGER IF NOT EXISTS search_index_state_insert AFTER INSERT ON embeddings BEGIN
  UPDATE search_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS search_index_state_delete AFTER DELETE ON embeddings BEGIN
  UPDATE search_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS search_index_state_update AFTER UPDATE ON embeddings BEGIN
  UPDATE search_index_state SET generation = generation + 1 WHERE id = 1;
END;
`;
