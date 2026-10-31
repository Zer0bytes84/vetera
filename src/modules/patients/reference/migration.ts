/**
 * Each patient gets a readable reference such as « ID-0011 ».
 * The patients table is left as it is: a dedicated table holds the
 * reference of each patient, and a one-row table holds the counter.
 *
 * - The reference is assigned by a trigger inside the INSERT on patients,
 *   so every path that creates a patient gets one, and SQLite's single
 *   writer serialises simultaneous creations.
 * - A reference is never modified and never deleted. When a patient is
 *   deleted its reference row stays, so its number is never given again.
 * - The number comes from the counter, never from a count of rows.
 * - UNIQUE constraints on the number and on the text guarantee uniqueness.
 *
 * Existing patients receive their reference once, in creation order.
 */
export const PATIENT_REFERENCES_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS patient_reference_counter (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  last_number INTEGER NOT NULL CHECK(last_number >= 0)
);
INSERT OR IGNORE INTO patient_reference_counter(id, last_number) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS patient_references (
  patient_id TEXT PRIMARY KEY,
  sequence_number INTEGER NOT NULL UNIQUE CHECK(sequence_number > 0),
  reference TEXT NOT NULL UNIQUE CHECK(reference = 'ID-' || printf('%04d', sequence_number)),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO patient_references(patient_id, sequence_number, reference)
SELECT id, n, 'ID-' || printf('%04d', n)
FROM (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY datetime(created_at) IS NULL, datetime(created_at), created_at, rowid
  ) AS n
  FROM patients
);
UPDATE patient_reference_counter
SET last_number = (SELECT COALESCE(MAX(sequence_number), 0) FROM patient_references)
WHERE id = 1;
CREATE TRIGGER IF NOT EXISTS patient_reference_counter_forward
BEFORE UPDATE ON patient_reference_counter
WHEN NEW.id <> OLD.id OR NEW.last_number <> OLD.last_number + 1
BEGIN
  SELECT RAISE(ABORT, 'Le compteur des références patient avance d''un pas à la fois');
END;
CREATE TRIGGER IF NOT EXISTS patient_reference_counter_kept
BEFORE DELETE ON patient_reference_counter
BEGIN
  SELECT RAISE(ABORT, 'Le compteur des références patient ne se supprime pas');
END;
CREATE TRIGGER IF NOT EXISTS patient_reference_from_counter
BEFORE INSERT ON patient_references
WHEN NEW.sequence_number <> (SELECT last_number FROM patient_reference_counter WHERE id = 1)
BEGIN
  SELECT RAISE(ABORT, 'Une référence patient vient toujours du compteur');
END;
CREATE TRIGGER IF NOT EXISTS patient_reference_immutable
BEFORE UPDATE ON patient_references
BEGIN
  SELECT RAISE(ABORT, 'Une référence patient ne se modifie pas');
END;
CREATE TRIGGER IF NOT EXISTS patient_reference_kept
BEFORE DELETE ON patient_references
BEGIN
  SELECT RAISE(ABORT, 'Une référence patient ne se supprime pas');
END;
CREATE TRIGGER IF NOT EXISTS patient_reference_assign
AFTER INSERT ON patients
WHEN NOT EXISTS (SELECT 1 FROM patient_references WHERE patient_id = NEW.id)
BEGIN
  UPDATE patient_reference_counter SET last_number = last_number + 1 WHERE id = 1;
  INSERT INTO patient_references(patient_id, sequence_number, reference)
  SELECT NEW.id, last_number, 'ID-' || printf('%04d', last_number)
  FROM patient_reference_counter WHERE id = 1;
END;
`;
