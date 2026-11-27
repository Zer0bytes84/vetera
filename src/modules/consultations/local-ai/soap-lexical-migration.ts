/**
 * Word index of the SOAP sections (FTS5 without stored content), for the all-patients word search of the bar. Each
 * note has four entries, one per section, under rowid = note rowid × 4 + section index (subjective, objective,
 * assessment, plan); their tokens are lexicalWords(section). lexical-index.ts fills it. These triggers drop the four
 * entries of a note as soon as it is deleted, rewritten or inserted (an insert can reuse the rowid of a deleted
 * note, whose entries must not stay). Same method as the passage index (migration 046).
 */
export const SOAP_LEXICAL_INDEX_MIGRATION_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS soap_lexical USING fts5(words, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 0', prefix='2 3 4');
CREATE TRIGGER IF NOT EXISTS soap_lexical_delete AFTER DELETE ON consultation_soaps BEGIN
  DELETE FROM soap_lexical WHERE rowid IN (old.rowid * 4, old.rowid * 4 + 1, old.rowid * 4 + 2, old.rowid * 4 + 3);
END;
CREATE TRIGGER IF NOT EXISTS soap_lexical_rewrite AFTER UPDATE OF subjective, objective, assessment, plan ON consultation_soaps BEGIN
  DELETE FROM soap_lexical WHERE rowid IN (old.rowid * 4, old.rowid * 4 + 1, old.rowid * 4 + 2, old.rowid * 4 + 3);
END;
CREATE TRIGGER IF NOT EXISTS soap_lexical_insert AFTER INSERT ON consultation_soaps BEGIN
  DELETE FROM soap_lexical WHERE rowid IN (new.rowid * 4, new.rowid * 4 + 1, new.rowid * 4 + 2, new.rowid * 4 + 3);
END;
`;
