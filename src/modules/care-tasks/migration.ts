export const CARE_TASKS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS care_tasks (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 label TEXT NOT NULL CHECK(length(trim(label)) > 0),
 type TEXT NOT NULL CHECK(type IN ('medicament','perfusion','controle','sortie','autre')),
 heure_prevue TEXT NOT NULL,
 statut TEXT NOT NULL DEFAULT 'a_faire' CHECK(statut IN ('a_faire','en_cours','fait','annule')),
 execute_par TEXT,
 produit_id TEXT,
 note TEXT NOT NULL DEFAULT '',
 motif_annulation TEXT,
 recurrence TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 completed_at TEXT,
 CHECK(statut != 'annule' OR length(trim(coalesce(motif_annulation,''))) > 0),
 CHECK(statut != 'fait' OR (completed_at IS NOT NULL AND execute_par IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS care_tasks_schedule_idx ON care_tasks(heure_prevue, statut);
CREATE INDEX IF NOT EXISTS care_tasks_patient_idx ON care_tasks(patient_id, heure_prevue);
CREATE TABLE IF NOT EXISTS care_task_history (
 id TEXT PRIMARY KEY,
 task_id TEXT NOT NULL REFERENCES care_tasks(id) ON DELETE CASCADE,
 from_status TEXT CHECK(from_status IS NULL OR from_status IN ('a_faire','en_cours','fait','annule')),
 to_status TEXT NOT NULL CHECK(to_status IN ('a_faire','en_cours','fait','annule')),
 author_id TEXT NOT NULL CHECK(length(trim(author_id)) > 0),
 changed_at TEXT NOT NULL,
 reason TEXT
);
CREATE INDEX IF NOT EXISTS care_task_history_task_idx ON care_task_history(task_id, changed_at);
`;
