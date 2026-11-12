// Keep SQL statements on one line: the migration parser discards empty lines.

/**
 * The library of the Documents page: files, images and links, beside the notes.
 * A file or an image keeps its bytes as a data URL, as the patients' imported documents do.
 */
export const LIBRARY_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS library_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('file','image','link')), title TEXT NOT NULL, url TEXT, mime_type TEXT, size INTEGER, data_url TEXT, patient_id TEXT, is_favorite INTEGER NOT NULL DEFAULT 0, is_pinned INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL);
CREATE INDEX IF NOT EXISTS idx_library_items_user_id ON library_items(user_id);
CREATE INDEX IF NOT EXISTS idx_library_items_patient_id ON library_items(patient_id);
CREATE TRIGGER IF NOT EXISTS update_library_items_timestamp AFTER UPDATE ON library_items
BEGIN
 UPDATE library_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`;

/** The pin notes already pretended to have: the column did not exist, so pinning a note failed in the desktop app. */
export const NOTE_PIN_MIGRATION_SQL = "ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;";
