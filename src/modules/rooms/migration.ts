/**
 * Clinic rooms become data instead of a list in the code.
 * A new installation gets one room. An existing one also gets every room
 * its appointments already point to, so no appointment loses its room.
 * The ids stay those already stored in appointments.room.
 */
export const ROOMS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_active_name
  ON rooms(lower(trim(name))) WHERE archived_at IS NULL;
INSERT OR IGNORE INTO rooms(id, name, sort_order)
VALUES (
  'consult-1',
  CASE WHEN EXISTS (SELECT 1 FROM appointments WHERE room = 'consult-2')
    THEN 'Consultation 1' ELSE 'Salle de consultation' END,
  0
);
INSERT OR IGNORE INTO rooms(id, name, sort_order)
SELECT room,
  CASE room
    WHEN 'consult-2' THEN 'Consultation 2'
    WHEN 'surgery' THEN 'Chirurgie'
    WHEN 'hospitalization' THEN 'Hospitalisation'
    WHEN 'imaging' THEN 'Imagerie'
    ELSE substr(trim(room), 1, 40)
  END,
  CASE room
    WHEN 'consult-2' THEN 1
    WHEN 'surgery' THEN 2
    WHEN 'hospitalization' THEN 3
    WHEN 'imaging' THEN 4
    ELSE 10
  END
FROM (SELECT DISTINCT room FROM appointments WHERE room IS NOT NULL AND trim(room) <> '');
CREATE TRIGGER rooms_keep_used_rooms
BEFORE DELETE ON rooms
WHEN EXISTS (SELECT 1 FROM appointments WHERE room = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Cette salle a des rendez-vous : archivez-la plutôt que de la supprimer.');
END;
CREATE TRIGGER rooms_keep_one_active_on_archive
BEFORE UPDATE OF archived_at ON rooms
WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM rooms WHERE archived_at IS NULL AND id <> OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Le cabinet doit garder au moins une salle active.');
END;
CREATE TRIGGER rooms_keep_one_active_on_delete
BEFORE DELETE ON rooms
WHEN OLD.archived_at IS NULL
 AND NOT EXISTS (SELECT 1 FROM rooms WHERE archived_at IS NULL AND id <> OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Le cabinet doit garder au moins une salle active.');
END;
`;
