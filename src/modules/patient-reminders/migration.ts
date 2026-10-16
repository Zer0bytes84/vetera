/** Additive schema: appointment reminders and manual tasks are untouched. */
export const PATIENT_REMINDERS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS reminder_types (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL CHECK(length(trim(name)) > 0),
 interval_months INTEGER NOT NULL CHECK(interval_months BETWEEN 1 AND 120),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO reminder_types(id,code,name,interval_months)
 VALUES ('vaccination','vaccination','Vaccination',12),('antiparasitaire','antiparasitaire','Antiparasitaire',3);
CREATE TABLE IF NOT EXISTS patient_reminders (
 id TEXT PRIMARY KEY,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
 type_id TEXT NOT NULL REFERENCES reminder_types(id) ON DELETE RESTRICT,
 product_id TEXT,
 source_id TEXT UNIQUE,
 family_key TEXT NOT NULL,
 due_date TEXT NOT NULL CHECK(length(due_date)=10),
 origin TEXT NOT NULL CHECK(origin IN ('auto','manuel')),
 status TEXT NOT NULL DEFAULT 'en_cours' CHECK(status IN ('en_cours','traite','annule')),
 completed_at TEXT,
 cancellation_reason TEXT,
 author_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(status <> 'annule' OR COALESCE(length(trim(cancellation_reason)),0) > 0)
);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_due ON patient_reminders(status,due_date);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_patient ON patient_reminders(patient_id,type_id,family_key);
CREATE TABLE IF NOT EXISTS reminder_history (
 id TEXT PRIMARY KEY,
 reminder_id TEXT NOT NULL REFERENCES patient_reminders(id) ON DELETE CASCADE,
 action TEXT NOT NULL,
 old_status TEXT,
 new_status TEXT,
 old_due_date TEXT,
 new_due_date TEXT,
 reason TEXT,
 author_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reminder_history_source ON reminder_history(reminder_id,created_at);
INSERT OR IGNORE INTO patient_reminders(id,patient_id,type_id,source_id,family_key,due_date,origin,author_id)
 SELECT 'vaccine-reminder:' || id,patient_id,'vaccination',id,
 lower(trim(COALESCE(NULLIF(vaccine_type,''),vaccine_name))),substr(next_due_at,1,10),'manuel',vet_id
 FROM vaccinations WHERE next_due_at IS NOT NULL AND length(next_due_at)>=10;
INSERT OR IGNORE INTO reminder_history(id,reminder_id,action,new_status,new_due_date,author_id)
 SELECT 'reminder-import:' || id,id,'migration','en_cours',due_date,author_id FROM patient_reminders
 WHERE origin='manuel' AND source_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM reminder_history h WHERE h.reminder_id=patient_reminders.id);
`;
