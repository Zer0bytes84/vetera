/** Preserve all existing tasks; configured reminder types are optional. */
export const TASK_REMINDER_TYPES_MIGRATION_SQL = `
ALTER TABLE tasks ADD COLUMN reminder_type_id TEXT REFERENCES reminder_types(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_reminder_type ON tasks(reminder_type_id);
CREATE TRIGGER tasks_active_reminder_type_insert
BEFORE INSERT ON tasks
WHEN NEW.reminder_type_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM reminder_types WHERE id=NEW.reminder_type_id AND active=1)
BEGIN
 SELECT RAISE(ABORT, 'Choisissez un type de rappel actif.');
END;
CREATE TRIGGER tasks_active_reminder_type_update
BEFORE UPDATE OF reminder_type_id ON tasks
WHEN NEW.reminder_type_id IS NOT NULL AND NEW.reminder_type_id IS NOT OLD.reminder_type_id
 AND NOT EXISTS (SELECT 1 FROM reminder_types WHERE id=NEW.reminder_type_id AND active=1)
BEGIN
 SELECT RAISE(ABORT, 'Choisissez un type de rappel actif.');
END;
`;
