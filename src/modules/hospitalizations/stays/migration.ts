export const STAYS_MIGRATION_SQL = `
CREATE TABLE locations (
 id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
 type TEXT NOT NULL CHECK(type IN ('cage','box','chenil')), species TEXT,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE stays (
 id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 location_id TEXT REFERENCES locations(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('admis','en_cours','sortie_prevue','sorti','annule')),
 admitted_at TEXT NOT NULL, planned_discharge_at TEXT, discharged_at TEXT,
 reason TEXT NOT NULL CHECK(length(trim(reason)) > 0), discharge_summary TEXT NOT NULL DEFAULT '',
 cancellation_reason TEXT, author_id TEXT NOT NULL CHECK(length(trim(author_id)) > 0),
 legacy_hospitalization_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(status != 'annule' OR length(trim(coalesce(cancellation_reason,''))) > 0),
 CHECK(status != 'sorti' OR (discharged_at IS NOT NULL AND length(trim(discharge_summary)) > 0)),
 CHECK(discharged_at IS NULL OR discharged_at >= admitted_at),
 CHECK(planned_discharge_at IS NULL OR planned_discharge_at >= admitted_at)
);
CREATE UNIQUE INDEX stays_active_patient_idx ON stays(patient_id) WHERE status IN ('admis','en_cours','sortie_prevue');
CREATE UNIQUE INDEX stays_active_location_idx ON stays(location_id) WHERE location_id IS NOT NULL AND status IN ('admis','en_cours','sortie_prevue');
CREATE INDEX stays_patient_history_idx ON stays(patient_id,admitted_at);
CREATE TABLE care_plans (
 id TEXT PRIMARY KEY, stay_id TEXT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
 label TEXT NOT NULL CHECK(length(trim(label)) > 0), type TEXT NOT NULL CHECK(type IN ('medicament','perfusion','controle','sortie','autre')),
 product_id TEXT, note TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
 times_json TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 author_id TEXT NOT NULL CHECK(length(trim(author_id)) > 0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK(ends_at >= starts_at)
);
CREATE TABLE vital_signs (
 id TEXT PRIMARY KEY, stay_id TEXT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
 recorded_at TEXT NOT NULL, temperature_c REAL CHECK(temperature_c IS NULL OR temperature_c > 0),
 heart_rate REAL CHECK(heart_rate IS NULL OR heart_rate > 0), respiratory_rate REAL CHECK(respiratory_rate IS NULL OR respiratory_rate > 0),
 weight_kg REAL CHECK(weight_kg IS NULL OR weight_kg > 0), general_state TEXT, appetite TEXT,
 note TEXT NOT NULL DEFAULT '', author_id TEXT NOT NULL CHECK(length(trim(author_id)) > 0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX vital_signs_stay_date_idx ON vital_signs(stay_id,recorded_at);
CREATE TABLE stay_history (
 id TEXT PRIMARY KEY, stay_id TEXT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
 event TEXT NOT NULL, from_status TEXT, to_status TEXT, location_id TEXT REFERENCES locations(id),
 author_id TEXT NOT NULL CHECK(length(trim(author_id)) > 0), reason TEXT, changed_at TEXT NOT NULL
);
CREATE INDEX stay_history_stay_idx ON stay_history(stay_id,changed_at);
ALTER TABLE care_tasks ADD COLUMN stay_id TEXT REFERENCES stays(id) ON DELETE RESTRICT;
ALTER TABLE care_tasks ADD COLUMN care_plan_id TEXT REFERENCES care_plans(id) ON DELETE RESTRICT;
ALTER TABLE care_tasks ADD COLUMN occurrence_key TEXT;
CREATE UNIQUE INDEX care_tasks_occurrence_idx ON care_tasks(occurrence_key) WHERE occurrence_key IS NOT NULL;
CREATE INDEX care_tasks_stay_idx ON care_tasks(stay_id,heure_prevue);
CREATE TRIGGER locations_keep_occupied_active BEFORE UPDATE OF active ON locations
WHEN NEW.active = 0 AND EXISTS(SELECT 1 FROM stays WHERE location_id = OLD.id AND status IN ('admis','en_cours','sortie_prevue'))
BEGIN
 SELECT RAISE(ABORT, 'Emplacement occupé');
END;
CREATE TRIGGER stays_require_active_location_insert BEFORE INSERT ON stays
WHEN NEW.location_id IS NOT NULL AND NEW.status IN ('admis','en_cours','sortie_prevue') AND NOT EXISTS(SELECT 1 FROM locations WHERE id = NEW.location_id AND active = 1)
BEGIN
 SELECT RAISE(ABORT, 'Emplacement indisponible');
END;
CREATE TRIGGER stays_require_active_location_update BEFORE UPDATE OF location_id,status ON stays
WHEN NEW.location_id IS NOT NULL AND NEW.status IN ('admis','en_cours','sortie_prevue') AND NOT EXISTS(SELECT 1 FROM locations WHERE id = NEW.location_id AND active = 1)
BEGIN
 SELECT RAISE(ABORT, 'Emplacement indisponible');
END;
`;
