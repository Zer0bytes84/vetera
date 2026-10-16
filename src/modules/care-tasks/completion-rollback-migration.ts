/** Keep successive validations distinct without rewriting their stock or billing history. */
export const CARE_COMPLETION_ROLLBACK_MIGRATION_SQL = `
ALTER TABLE care_tasks ADD COLUMN completion_revision INTEGER NOT NULL DEFAULT 0
 CHECK(typeof(completion_revision)='integer' AND completion_revision >= 0);
`;
