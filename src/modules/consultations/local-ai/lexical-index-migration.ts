/**
 * Word index of the search passages (FTS5 without stored content). Its tokens are lexicalWords(chunk_text) of each
 * passage, under the passage's rowid in `embeddings`; lexical-index.ts fills it. These triggers drop an entry as soon
 * as its passage is deleted or rewritten. Kept apart from lexical-index.ts so the migrations do not load the lexicon.
 */
export const SEARCH_LEXICAL_INDEX_MIGRATION_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_lexical USING fts5(words, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 0', prefix='2 3 4');
CREATE TRIGGER IF NOT EXISTS embeddings_lexical_delete AFTER DELETE ON embeddings BEGIN
  DELETE FROM embeddings_lexical WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS embeddings_lexical_rewrite AFTER UPDATE OF chunk_text ON embeddings BEGIN
  DELETE FROM embeddings_lexical WHERE rowid = old.rowid;
END;
`;
