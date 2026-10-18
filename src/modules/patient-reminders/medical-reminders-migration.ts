/**
 * Rappels médicaux locaux.
 *
 * Cette migration est additive : les tâches manuelles (`tasks`) et les
 * notifications de rendez-vous (`reminders`) ne sont jamais modifiées.
 */
export const MEDICAL_REMINDERS_MIGRATION_SQL = `
ALTER TABLE reminder_types ADD COLUMN libelle TEXT;
ALTER TABLE reminder_types ADD COLUMN intervalle_defaut_mois INTEGER;
ALTER TABLE reminder_types ADD COLUMN actif INTEGER;

UPDATE reminder_types
SET libelle = COALESCE(libelle, name),
    intervalle_defaut_mois = COALESCE(intervalle_defaut_mois, interval_months),
    actif = COALESCE(actif, active);

INSERT OR IGNORE INTO reminder_types(
  id, code, name, interval_months, active, libelle, intervalle_defaut_mois, actif
) VALUES
  ('vaccin', 'vaccin', 'Vaccin', 12, 1, 'Vaccin', 12, 1),
  ('vermifuge', 'vermifuge', 'Vermifuge', 3, 1, 'Vermifuge', 3, 1),
  ('controle_annuel', 'controle_annuel', 'Contrôle annuel', 12, 1, 'Contrôle annuel', 12, 1),
  ('soin_dentaire', 'soin_dentaire', 'Soin dentaire', 12, 1, 'Soin dentaire', 12, 1),
  ('autre', 'autre', 'Autre', 12, 1, 'Autre', 12, 1);

UPDATE reminder_types
SET interval_months = (SELECT interval_months FROM reminder_types WHERE id = 'vaccination'),
    intervalle_defaut_mois = (SELECT interval_months FROM reminder_types WHERE id = 'vaccination'),
    active = (SELECT active FROM reminder_types WHERE id = 'vaccination'),
    actif = (SELECT active FROM reminder_types WHERE id = 'vaccination')
WHERE id = 'vaccin' AND EXISTS (SELECT 1 FROM reminder_types WHERE id = 'vaccination');
UPDATE reminder_types
SET interval_months = (SELECT interval_months FROM reminder_types WHERE id = 'antiparasitaire'),
    intervalle_defaut_mois = (SELECT interval_months FROM reminder_types WHERE id = 'antiparasitaire'),
    active = (SELECT active FROM reminder_types WHERE id = 'antiparasitaire'),
    actif = (SELECT active FROM reminder_types WHERE id = 'antiparasitaire')
WHERE id = 'vermifuge' AND EXISTS (SELECT 1 FROM reminder_types WHERE id = 'antiparasitaire');

CREATE TABLE IF NOT EXISTS medical_reminders (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES owners(id) ON DELETE SET NULL,
  type TEXT NOT NULL REFERENCES reminder_types(id) ON DELETE RESTRICT,
  intervalle_mois INTEGER NOT NULL CHECK(intervalle_mois BETWEEN 1 AND 120),
  echeance TEXT NOT NULL CHECK(length(echeance) = 10),
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK(statut IN ('en_cours', 'termine', 'annule')),
  acte_source_id TEXT UNIQUE,
  note TEXT,
  motif_annulation TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  CHECK(statut <> 'annule' OR COALESCE(length(trim(motif_annulation)), 0) > 0)
);

CREATE INDEX IF NOT EXISTS idx_medical_reminders_due
  ON medical_reminders(statut, echeance);
CREATE INDEX IF NOT EXISTS idx_medical_reminders_patient
  ON medical_reminders(patient_id, type);

CREATE TABLE IF NOT EXISTS medical_reminder_history (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL REFERENCES medical_reminders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_due_date TEXT,
  new_due_date TEXT,
  reason TEXT,
  author_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_reminder_history
  ON medical_reminder_history(reminder_id, created_at);

INSERT OR IGNORE INTO medical_reminders(
  id, patient_id, client_id, type, intervalle_mois, echeance, statut,
  acte_source_id, motif_annulation, created_at, updated_at, completed_at
)
SELECT
  pr.id,
  pr.patient_id,
  p.owner_id,
  CASE pr.type_id
    WHEN 'vaccination' THEN 'vaccin'
    WHEN 'antiparasitaire' THEN 'vermifuge'
    ELSE pr.type_id
  END,
  COALESCE(rt.intervalle_defaut_mois, rt.interval_months, 12),
  pr.due_date,
  CASE pr.status WHEN 'traite' THEN 'termine' ELSE pr.status END,
  pr.source_id,
  pr.cancellation_reason,
  pr.created_at,
  pr.updated_at,
  pr.completed_at
FROM patient_reminders pr
JOIN patients p ON p.id = pr.patient_id
LEFT JOIN reminder_types rt ON rt.id = pr.type_id;

INSERT OR IGNORE INTO medical_reminder_history(
  id, reminder_id, action, old_status, new_status, old_due_date,
  new_due_date, reason, author_id, created_at
)
SELECT
  'medical:' || rh.id,
  rh.reminder_id,
  rh.action,
  CASE rh.old_status WHEN 'traite' THEN 'termine' ELSE rh.old_status END,
  CASE rh.new_status WHEN 'traite' THEN 'termine' ELSE rh.new_status END,
  rh.old_due_date,
  rh.new_due_date,
  rh.reason,
  rh.author_id,
  rh.created_at
FROM reminder_history rh
WHERE EXISTS (
  SELECT 1 FROM medical_reminders mr WHERE mr.id = rh.reminder_id
);
`;
