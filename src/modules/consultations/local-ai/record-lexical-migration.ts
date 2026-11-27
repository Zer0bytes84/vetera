/**
 * Word indexes of the consultation records (appointments) and of the patient profiles (FTS5 without stored content),
 * for the bar's all-patients word search. One entry per row, under the row's rowid; its tokens are lexicalWords of the
 * text the bar matches (consultationSearchChunks, patientSearchChunks). lexical-index.ts fills them. These triggers
 * drop a row's entry as soon as it is deleted, its searchable fields change, or a row is inserted (an insert can
 * reuse the rowid of a deleted row). The appointment text does not hold the patient's name, so renaming a patient
 * leaves the appointments' entries right. Same method as the SOAP index (migration 048).
 * record_index_state counts every write to the appointments, the patients and the SOAP notes: while it does not move,
 * the three word indexes are known complete and the bar skips checking them (a NOT EXISTS over every row). Its random
 * token tells one database from another, so a remembered counter never applies to a different file.
 */
export const RECORD_LEXICAL_INDEX_MIGRATION_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS appointment_lexical USING fts5(words, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 0', prefix='2 3 4');
CREATE TRIGGER IF NOT EXISTS appointment_lexical_delete AFTER DELETE ON appointments BEGIN
  DELETE FROM appointment_lexical WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS appointment_lexical_rewrite AFTER UPDATE OF title, type, reason, diagnosis, treatment, notes ON appointments BEGIN
  DELETE FROM appointment_lexical WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS appointment_lexical_insert AFTER INSERT ON appointments BEGIN
  DELETE FROM appointment_lexical WHERE rowid = new.rowid;
END;
CREATE VIRTUAL TABLE IF NOT EXISTS patient_lexical USING fts5(words, content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 0', prefix='2 3 4');
CREATE TRIGGER IF NOT EXISTS patient_lexical_delete AFTER DELETE ON patients BEGIN
  DELETE FROM patient_lexical WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS patient_lexical_rewrite AFTER UPDATE OF name, species, breed, chip_number, allergies, chronic_conditions, general_notes ON patients BEGIN
  DELETE FROM patient_lexical WHERE rowid = old.rowid;
END;
CREATE TRIGGER IF NOT EXISTS patient_lexical_insert AFTER INSERT ON patients BEGIN
  DELETE FROM patient_lexical WHERE rowid = new.rowid;
END;
CREATE TABLE IF NOT EXISTS record_index_state (id INTEGER PRIMARY KEY CHECK (id = 1), generation INTEGER NOT NULL DEFAULT 0, token TEXT NOT NULL DEFAULT '');
INSERT OR IGNORE INTO record_index_state (id, generation, token) VALUES (1, 0, lower(hex(randomblob(8))));
CREATE TRIGGER IF NOT EXISTS record_index_state_appointments_insert AFTER INSERT ON appointments BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_appointments_update AFTER UPDATE ON appointments BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_appointments_delete AFTER DELETE ON appointments BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_patients_insert AFTER INSERT ON patients BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_patients_update AFTER UPDATE ON patients BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_patients_delete AFTER DELETE ON patients BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_consultation_soaps_insert AFTER INSERT ON consultation_soaps BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_consultation_soaps_update AFTER UPDATE ON consultation_soaps BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS record_index_state_consultation_soaps_delete AFTER DELETE ON consultation_soaps BEGIN
  UPDATE record_index_state SET generation = generation + 1 WHERE id = 1;
END;
`;
