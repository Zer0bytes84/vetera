// Embedded SQL schema for initial migration
export const MIGRATION_001_SQL = `-- SuperVet+ - Schéma SQLite Complet
-- Migration 001: Structure initiale

-- ====================================================================================
-- Table des utilisateurs (Auth + Profils)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'vet_principal', 'vet_adjoint', 'assistant', 'stagiaire')),
    phone TEXT,
    specialty TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- Table des sessions (Authentification)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- Table des propriétaires (Owners)
-- ============================================
CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    city TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);

-- ============================================
-- Table des patients (Animaux)
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    sex TEXT CHECK(sex IN ('M', 'F')),
    date_of_birth TEXT,
    weight_history TEXT,
    status TEXT NOT NULL DEFAULT 'sante' CHECK(status IN ('sante', 'traitement', 'hospitalise', 'decede')),
    last_visit DATETIME,
    allergies TEXT,
    chronic_conditions TEXT,
    general_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patients_owner_id ON patients(owner_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_species ON patients(species);

-- ============================================
-- Table des rendez-vous (Appointments)
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    vet_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
    type TEXT NOT NULL CHECK(type IN ('Consultation', 'Vaccin', 'Chirurgie', 'Urgence', 'Contrôle')),
    reason TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================
-- Table des produits (Stock & Pharma)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_stock REAL NOT NULL DEFAULT 0,
    purchase_price_amount INTEGER NOT NULL,
    sale_price_amount INTEGER NOT NULL,
    expiry_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_products_expiry_date ON products(expiry_date);

-- ============================================
-- Table des transactions (Finances)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date DATETIME NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    method TEXT NOT NULL CHECK(method IN ('cash', 'card')),
    status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'pending')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- ============================================
-- Table des notes
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_favorite ON notes(is_favorite);

-- ============================================
-- Pièces jointes de consultation
-- ============================================
CREATE TABLE IF NOT EXISTS consultation_documents (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    owner_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('pdf', 'image', 'other')),
    data_url TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_documents_appointment_id ON consultation_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_patient_id ON consultation_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_created_at ON consultation_documents(created_at);

-- ============================================
-- Table des tâches
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    due_date TEXT,
    start_time TEXT,
    end_time TEXT,
    is_reminder INTEGER NOT NULL DEFAULT 0,
    assigned_to TEXT,
    patient_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ============================================
-- Triggers pour updated_at automatique
-- ============================================
CREATE TRIGGER update_users_timestamp AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_owners_timestamp AFTER UPDATE ON owners
BEGIN
    UPDATE owners SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_patients_timestamp AFTER UPDATE ON patients
BEGIN
    UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_appointments_timestamp AFTER UPDATE ON appointments
BEGIN
    UPDATE appointments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_products_timestamp AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_transactions_timestamp AFTER UPDATE ON transactions
BEGIN
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_notes_timestamp AFTER UPDATE ON notes
BEGIN
    UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_consultation_documents_timestamp AFTER UPDATE ON consultation_documents
BEGIN
    UPDATE consultation_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_tasks_timestamp AFTER UPDATE ON tasks
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Le premier administrateur est créé par l'assistant de premier lancement.
`;

export const MIGRATION_002_SQL = `-- Migration 002: Documents de consultation
CREATE TABLE IF NOT EXISTS consultation_documents (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    owner_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('pdf', 'image', 'other')),
    data_url TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_documents_appointment_id ON consultation_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_patient_id ON consultation_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_documents_created_at ON consultation_documents(created_at);

CREATE TRIGGER IF NOT EXISTS update_consultation_documents_timestamp AFTER UPDATE ON consultation_documents
BEGIN
    UPDATE consultation_documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;

export const MIGRATION_003_SQL = `-- Migration 003: Automations and Patient Linking
CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon_name TEXT NOT NULL,
    icon_color TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    schedule TEXT NOT NULL,
    time TEXT NOT NULL,
    last_run_date TEXT,
    last_run_status TEXT NOT NULL DEFAULT 'Stopped',
    next_run_date TEXT,
    next_run_iso TEXT,
    next_run_relative TEXT,
    metric_label TEXT NOT NULL,
    metric_icon_name TEXT NOT NULL,
    metric_value TEXT NOT NULL,
    metric_trend TEXT NOT NULL,
    metric_trend_up INTEGER NOT NULL DEFAULT 1,
    chart_type TEXT NOT NULL,
    chart_color TEXT NOT NULL,
    chart_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_automations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    automation_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_run_date TEXT,
    next_run_iso TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patient_automations_patient_id ON patient_automations(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_automations_automation_id ON patient_automations(automation_id);

CREATE TRIGGER IF NOT EXISTS update_automations_timestamp AFTER UPDATE ON automations
BEGIN
    UPDATE automations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_patient_automations_timestamp AFTER UPDATE ON patient_automations
BEGIN
    UPDATE patient_automations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Default automations seeding
INSERT OR IGNORE INTO automations (id, title, description, icon_name, icon_color, is_active, schedule, time, last_run_status, metric_label, metric_icon_name, metric_value, metric_trend, metric_trend_up, chart_type, chart_color, chart_data)
VALUES
('auto-001', 'Rappels de Vaccination', 'Analyse les dossiers patients, identifie les rappels de vaccins imminents, et prépare les campagnes de SMS/Emails automatiques.', 'Mail', 'bg-blue-500', 1, 'Chaque Lundi', 'à 09:00', 'Scheduled', 'Taux de conversion', 'MailCheck', '78%', '+8%', 1, 'discrete', 'bg-emerald-500', '[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]'),
('auto-002', 'Résumé des Consultations', 'Automatise l''analyse des rapports quotidiens, extrait les insights clés et les anomalies, et livre des résumés concis.', 'Sparkles', 'bg-purple-500', 1, 'Chaque Mardi', 'à 10:00', 'Scheduled', 'Insights extraits', 'Lightbulb', '15', '+25%', 1, 'area', '#3b82f6', '[{"value":10},{"value":11},{"value":9},{"value":13},{"value":15},{"value":20},{"value":25}]'),
('auto-003', 'Suivi Post-Opératoire', 'Surveille l''état des patients récemment opérés, identifie les risques potentiels et génère des alertes de suivi prioritaires.', 'Activity', 'bg-emerald-500', 0, 'Chaque Vendredi', 'à 10:00', 'Stopped', 'Taux de ponctualité', 'Timer', '39%', '-5%', 0, 'discrete', 'bg-amber-500', '[1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]');

-- Seed initial patient_automations for existing patients (active by default)
INSERT OR IGNORE INTO patient_automations (id, patient_id, automation_id, is_active)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  p.id,
  a.id,
  1
FROM patients p
CROSS JOIN automations a;`;

export const MIGRATION_004_SQL = `-- Migration 004: Clinical tracking (weight + vaccinations)
-- Suivi du poids structuré (remplace progressivement patients.weight_history JSON)
CREATE TABLE IF NOT EXISTS weight_entries (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    measured_at TEXT NOT NULL,
    bcs INTEGER,
    notes TEXT,
    vet_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_weight_entries_patient_id ON weight_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_weight_entries_measured_at ON weight_entries(measured_at);

CREATE TRIGGER IF NOT EXISTS update_weight_entries_timestamp AFTER UPDATE ON weight_entries
BEGIN
    UPDATE weight_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Carnet de vaccination structuré
CREATE TABLE IF NOT EXISTS vaccinations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    vaccine_name TEXT NOT NULL,
    vaccine_type TEXT,
    administered_at TEXT NOT NULL,
    next_due_at TEXT,
    batch_number TEXT,
    manufacturer TEXT,
    vet_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_patient_id ON vaccinations(patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_administered_at ON vaccinations(administered_at);
CREATE INDEX IF NOT EXISTS idx_vaccinations_next_due_at ON vaccinations(next_due_at);

CREATE TRIGGER IF NOT EXISTS update_vaccinations_timestamp AFTER UPDATE ON vaccinations
BEGIN
    UPDATE vaccinations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;

export const MIGRATION_005_SQL = `-- Migration 005: Structured SOAP for consultations
-- SOAP = Subjective / Objective / Assessment / Plan, structurés en JSON
-- Lié 1-1 à un appointment, content = JSON libre,
-- ai_draft = brouillon structuré, ai_confidence = score 0-1.
CREATE TABLE IF NOT EXISTS consultation_soaps (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL UNIQUE,
    patient_id TEXT NOT NULL,
    subjective TEXT NOT NULL DEFAULT '',
    objective TEXT NOT NULL DEFAULT '',
    assessment TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '{}',
    ai_draft TEXT,
    ai_confidence REAL,
    transcript TEXT,
    template_version TEXT NOT NULL DEFAULT '1.0',
    vet_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_soaps_patient_id ON consultation_soaps(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_soaps_appointment_id ON consultation_soaps(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultation_soaps_updated_at ON consultation_soaps(updated_at);

CREATE TRIGGER IF NOT EXISTS update_consultation_soaps_timestamp AFTER UPDATE ON consultation_soaps
BEGIN
    UPDATE consultation_soaps SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;

export const MIGRATION_006_SQL = `-- Migration 006: Prescriptions & ordonnances
-- Une prescription = 1 document signé par 1 véto pour 1 consultation
-- Elle contient N lignes (médicaments, posologie, durée, instructions).
-- Les valeurs calculées (mg total, volume mL) sont stockées pour la
-- relecture / l'impression, même si elles peuvent être recalculées à la volée.

CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    vet_id TEXT,
    prescription_date TEXT NOT NULL,
    weight_kg REAL,
    diagnosis TEXT,
    general_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'signed' | 'dispensed' | 'cancelled'
    signed_at DATETIME,
    template_version TEXT NOT NULL DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_date ON prescriptions(prescription_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

CREATE TRIGGER IF NOT EXISTS update_prescriptions_timestamp AFTER UPDATE ON prescriptions
BEGIN
    UPDATE prescriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS prescription_items (
    id TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    medication_id TEXT,             -- nullable: médicament hors catalogue
    medication_name TEXT NOT NULL,  -- snapshot du nom (commercial ou DCI)
    medication_class TEXT,
    form TEXT,                      -- comprimé, solution buvable, injectable…
    dosage_per_kg REAL,             -- ex 20 (mg/kg)
    dosage_unit TEXT NOT NULL DEFAULT 'mg/kg', -- mg/kg | mg/tot | mL/kg | UI/kg
    dosage_min REAL,                -- borne basse (ex 10)
    dosage_max REAL,                -- borne haute (ex 20)
    concentration_mg_per_ml REAL,   -- pour calcul mL
    computed_dose_mg REAL,          -- dose totale calculée (mg)
    computed_volume_ml REAL,        -- volume total calculé (mL)
    frequency TEXT NOT NULL,        -- 2x/jour, toutes les 8h…
    duration TEXT NOT NULL,         -- 5-7 jours, 14 jours…
    route TEXT,                     -- PO, IM, SC, IV…
    quantity TEXT,                  -- ex "1 boîte de 30 cp"
    instructions TEXT,              -- texte libre pour le propriétaire
    warnings TEXT,                  -- effets secondaires / précautions
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_sort_order ON prescription_items(prescription_id, sort_order);

CREATE TRIGGER IF NOT EXISTS update_prescription_items_timestamp AFTER UPDATE ON prescription_items
BEGIN
    UPDATE prescription_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;`;

export const MIGRATION_007_SQL = `-- Migration 007: Hospitalisation 24h & feuille d'anesthésie
-- Une hospitalisation = 1 séjour (admission → sortie) lié à 1 patient,
-- avec constantes horodatées (T°, FC, FR, SpO2, poids, glycémie, etc.)
-- et un log d'événements (repas, médicaments, examen, note).
-- Une feuille d'anesthésie = 1 procédure (induction → maintenance → réveil)
-- liée à 1 hospitalisation (optionnelle) ou à 1 appointment, avec :
--   - premed, induction, maintenance (gaz +IV), réveil
--   - drug log (horodatage + molécule + dose + voie)
--   - monitoring perop (T°, FC, FR, SpO2, ETCO2, PAM)
--   - complications + score de réveil

CREATE TABLE IF NOT EXISTS hospitalizations (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    reason TEXT NOT NULL,                  -- motif d'hospitalisation
    diagnosis TEXT,                        -- diagnostic principal
    status TEXT NOT NULL DEFAULT 'admitted', -- admitted | monitoring | critical | discharged | transferred | deceased
    admission_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharge_date DATETIME,
    cage TEXT,                             -- box / chenil
    weight_kg REAL,                        -- poids à l'admission
    temperature_c REAL,                    -- T° initiale
    iv_fluids TEXT,                        -- ex "NaCl 0.9% - 50 mL/h"
    feeding_plan TEXT,                     -- ex "RC 3x/j + eau ad lib"
    special_care TEXT,                     -- soins particuliers (cage, isolement, monitoring continu)
    discharge_summary TEXT,                -- résumé de sortie
    vet_id TEXT,                           -- véto référent
    template_version TEXT NOT NULL DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hospitalizations_patient_id ON hospitalizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_status ON hospitalizations(status);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_admission_date ON hospitalizations(admission_date);

CREATE TRIGGER IF NOT EXISTS update_hospitalizations_timestamp AFTER UPDATE ON hospitalizations
BEGIN
    UPDATE hospitalizations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Constantes / événements horodatés pendant l'hospitalisation
CREATE TABLE IF NOT EXISTS hospitalization_vitals (
    id TEXT PRIMARY KEY,
    hospitalization_id TEXT NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature_c REAL,                    -- °C
    heart_rate_bpm INTEGER,                -- battements/min
    respiratory_rate_bpm INTEGER,           -- respirations/min
    spo2_percent REAL,                     -- % saturation
    weight_kg REAL,                        -- pesée (kg)
    blood_glucose_mmol_l REAL,             -- glycémie (mmol/L)
    blood_pressure_sys INTEGER,            -- PAS (mmHg)
    blood_pressure_dia INTEGER,            -- PAD (mmHg)
    capillary_refill_time_s REAL,          -- TRC (s)
    mucous_membranes TEXT,                 -- rose | pâle | cyanosé | ictérique
    mental_state TEXT,                     -- alerte | abattu | comateux | agité
    pain_score INTEGER,                    -- 0-10
    notes TEXT,
    recorded_by TEXT,                      -- user id (ASV / véto)
    FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_hospitalization_id ON hospitalization_vitals(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_recorded_at ON hospitalization_vitals(recorded_at);

CREATE TRIGGER IF NOT EXISTS update_hospitalization_vitals_timestamp AFTER UPDATE ON hospitalization_vitals
BEGIN
    UPDATE hospitalization_vitals SET id = id WHERE id = NEW.id;
END;

-- Feuille d'anesthésie (1 procédure complète)
CREATE TABLE IF NOT EXISTS anesthesia_sheets (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    hospitalization_id TEXT,
    appointment_id TEXT,
    procedure_name TEXT NOT NULL,           -- ex "Ovariohystérectomie"
    asa_status INTEGER,                    -- 1-5 (ASA physical status)
    emergency INTEGER NOT NULL DEFAULT 0,  -- 0|1
    status TEXT NOT NULL DEFAULT 'planned', -- planned | in_progress | completed | cancelled
    scheduled_at DATETIME,
    started_at DATETIME,
    ended_at DATETIME,
    weight_kg REAL,                        -- poids le jour J
    fasting_since DATETIME,                -- dernière prise alimentaire
    premedication TEXT,                    -- ex "ACP 0.01 mg/kg IM + morphine 0.1 mg/kg IM"
    induction TEXT,                        -- ex "propofol 4 mg/kg IV à effet"
    induction_agent TEXT,                  -- molécule principale induction
    maintenance TEXT,                      -- ex "isoflurane 1.5% + O2 1 L/min"
    monitoring_plan TEXT,                  -- ex "ETCO2, SpO2, FC, PNI q5min"
    recovery_notes TEXT,                   -- notes réveil
    recovery_score INTEGER,                -- score de réveil (0-10)
    complications TEXT,                    -- complications éventuelles
    vet_id TEXT,                           -- véto anesthésiste
    template_version TEXT NOT NULL DEFAULT '1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (hospitalization_id) REFERENCES hospitalizations(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_anesthesia_sheets_patient_id ON anesthesia_sheets(patient_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_sheets_hospitalization_id ON anesthesia_sheets(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_sheets_status ON anesthesia_sheets(status);
CREATE INDEX IF NOT EXISTS idx_anesthesia_sheets_started_at ON anesthesia_sheets(started_at);

CREATE TRIGGER IF NOT EXISTS update_anesthesia_sheets_timestamp AFTER UPDATE ON anesthesia_sheets
BEGIN
    UPDATE anesthesia_sheets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Médicaments administrés pendant l'anesthésie (drug log)
CREATE TABLE IF NOT EXISTS anesthesia_drug_log (
    id TEXT PRIMARY KEY,
    anesthesia_sheet_id TEXT NOT NULL,
    administered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    phase TEXT NOT NULL,                   -- premed | induction | maintenance | recovery
    drug_name TEXT NOT NULL,               -- ex "morphine", "propofol"
    dose TEXT,                             -- ex "0.1 mg/kg"
    route TEXT,                            -- IM, SC, IV, IO, IR, PO, IN
    administered_by TEXT,                  -- user id
    notes TEXT,
    FOREIGN KEY (anesthesia_sheet_id) REFERENCES anesthesia_sheets(id) ON DELETE CASCADE,
    FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_anesthesia_drug_log_sheet_id ON anesthesia_drug_log(anesthesia_sheet_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_drug_log_administered_at ON anesthesia_drug_log(administered_at);

CREATE TRIGGER IF NOT EXISTS update_anesthesia_drug_log_timestamp AFTER UPDATE ON anesthesia_drug_log
BEGIN
    UPDATE anesthesia_drug_log SET id = id WHERE id = NEW.id;
END;

-- Monitoring perop (T°, FC, FR, SpO2, ETCO2, PNI)
CREATE TABLE IF NOT EXISTS anesthesia_monitoring (
    id TEXT PRIMARY KEY,
    anesthesia_sheet_id TEXT NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    phase TEXT NOT NULL,                   -- induction | maintenance | recovery
    heart_rate_bpm INTEGER,
    respiratory_rate_bpm INTEGER,
    spo2_percent REAL,
    etco2_mmhg REAL,                       -- CO2 télé-expiratoire
    map_mmhg INTEGER,                      -- pression artérielle moyenne
    temperature_c REAL,
    isoflurane_pct REAL,                   -- % isoflurane / sévoflurane
    oxygen_flow_l_min REAL,
    notes TEXT,
    FOREIGN KEY (anesthesia_sheet_id) REFERENCES anesthesia_sheets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anesthesia_monitoring_sheet_id ON anesthesia_monitoring(anesthesia_sheet_id);
CREATE INDEX IF NOT EXISTS idx_anesthesia_monitoring_recorded_at ON anesthesia_monitoring(recorded_at);

CREATE TRIGGER IF NOT EXISTS update_anesthesia_monitoring_timestamp AFTER UPDATE ON anesthesia_monitoring
BEGIN
    UPDATE anesthesia_monitoring SET id = id WHERE id = NEW.id;
END;`;

export const MIGRATION_008_SQL = `
-- 1) Colonne 'room' sur 'appointments' pour détecter les conflits de salle
--    (consult-1, consult-2, chirurgie, hospitalisation, etc.).
-- 2) Table 'appointment_recurrences' pour générer une série de RDV
--    (hebdomadaire / bimensuel / mensuel / annuel) à partir d'un parent.
-- 3) Table 'reminders' pour notifier le vétérinaire avant un RDV
--    (15/30/60/1440 minutes avant, par toast + badge tâches).

-- 1) Ajout de la colonne room
ALTER TABLE appointments ADD COLUMN room TEXT DEFAULT 'consult-1';

CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room);
CREATE INDEX IF NOT EXISTS idx_appointments_room_time ON appointments(room, start_time, end_time);

-- 2) Récurrences
CREATE TABLE IF NOT EXISTS appointment_recurrences (
    id TEXT PRIMARY KEY,
    parent_appointment_id TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
    interval_count INTEGER NOT NULL DEFAULT 1,
    days_of_week TEXT,                       -- JSON array [0,3] (0=dim .. 6=sam)
    end_date DATE,                           -- NULL = indéfini
    max_occurrences INTEGER,                 -- NULL = pas de limite
    generated_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointment_recurrences_parent ON appointment_recurrences(parent_appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_recurrences_end_date ON appointment_recurrences(end_date);

CREATE TRIGGER IF NOT EXISTS update_appointment_recurrences_timestamp AFTER UPDATE ON appointment_recurrences
BEGIN
    UPDATE appointment_recurrences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 3) Rappels
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    minutes_before INTEGER NOT NULL,         -- 15 / 30 / 60 / 1440
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app', 'email', 'sms')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'snoozed', 'dismissed')),
    scheduled_for DATETIME NOT NULL,         -- computed = appointment.start - minutes_before
    sent_at DATETIME,
    snoozed_until DATETIME,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_appointment_id ON reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON reminders(scheduled_for);

CREATE TRIGGER IF NOT EXISTS update_reminders_timestamp AFTER UPDATE ON reminders
BEGIN
    UPDATE reminders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 4) Backfill : créer automatiquement un rappel 30min avant pour tous les
--    RDV futurs qui n'ont pas encore eu lieu.
INSERT INTO reminders (id, appointment_id, minutes_before, channel, status, scheduled_for, message)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-a' || substr(lower(hex(randomblob(2))), 2) ||
    '-' || lower(hex(randomblob(6))),
    a.id,
    30,
    'in_app',
    'pending',
    datetime(a.start_time, '-30 minutes'),
    'Rappel de rendez-vous dans 30 minutes'
FROM appointments a
WHERE a.start_time > datetime('now')
  AND a.status NOT IN ('completed', 'cancelled', 'no_show')
  AND NOT EXISTS (
    SELECT 1 FROM reminders r WHERE r.appointment_id = a.id
  );`;

export const MIGRATION_009_SQL = `
-- Migration 009: Audit log
-- Trace toutes les actions sensibles (create / update / delete) sur les
-- entités métier (patient / appointment / consultation / prescription /
-- billing / user / backup) pour répondre aux exigences de traçabilité
-- vétérinaire et offrir une piste d'audit côté UI (widget dashboard).

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,        -- 'create' | 'update' | 'delete' | 'restore' | 'login' | 'export'
  entity TEXT NOT NULL,        -- 'patient' | 'appointment' | 'consultation' | ...
  entity_id TEXT,              -- foreign id (nullable pour les actions globales)
  user_id TEXT,                -- id de l'utilisateur courant (nullable si déconnecté)
  user_display_name TEXT,      -- snapshot du nom affiché (pour affichage sans join)
  payload TEXT,                -- JSON sérialisé (champs modifiés, ancienne valeur, etc.)
  metadata TEXT,               -- JSON libre (reason, ip, userAgent, etc.)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);`;

export const MIGRATION_010_SQL = `
-- Migration 010: Index ended_at on anesthesia_sheets
-- Le widget dashboard "Suivi Post-Opératoire" (W9.3) filtre
-- anesthesia_sheets WHERE status='completed' AND ended_at >= now-30d
-- ORDER BY ended_at DESC. Sans index, full table scan à chaque refresh (60s).
-- Le bottleneck est sur ended_at (non sur started_at, déjà indexé en 007).

CREATE INDEX IF NOT EXISTS idx_anesthesia_sheets_ended_at
  ON anesthesia_sheets(ended_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospitalization_vitals_patient_recorded
  ON hospitalization_vitals(hospitalization_id, recorded_at DESC);`;

export const MIGRATION_011_SQL = `
-- Migration 011: Notification state (centre de notifications unifié)
-- Couche de persistance légère du read/dismiss pour les notifications
-- agrégées depuis les sources existantes (reminders, postop, tasks, stock,
-- soap, automations, audit). Pas de duplication des données métier :
-- l'entité source reste la source de vérité, on stocke uniquement
-- l'état UX (lu / dismissed) lié à un id dérivé (ex: "reminder:abc123").

CREATE TABLE IF NOT EXISTS notification_state (
  notification_id TEXT PRIMARY KEY,   -- ex: "reminder:abc123", "task:xyz", "stock:foo"
  read_at DATETIME,
  dismissed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_state_dismissed
  ON notification_state(dismissed_at);
`;

export const MIGRATION_012_SQL = `
-- Migration 012: Correct notification_state primary key without losing UX state
CREATE TABLE IF NOT EXISTS notification_state_v2 (
  id TEXT PRIMARY KEY,
  notification_id TEXT UNIQUE NOT NULL,
  read_at DATETIME,
  dismissed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO notification_state_v2 (
  id,
  notification_id,
  read_at,
  dismissed_at,
  created_at
)
SELECT
  notification_id,
  notification_id,
  read_at,
  dismissed_at,
  created_at
FROM notification_state;

DROP TABLE notification_state;

ALTER TABLE notification_state_v2 RENAME TO notification_state;

CREATE INDEX IF NOT EXISTS idx_notification_state_dismissed
  ON notification_state(dismissed_at);
`;

export const MIGRATION_013_SQL = `
-- Migration 013: cycle clinique complet des rendez-vous.
-- La reconstruction est nécessaire pour étendre le CHECK SQLite. Le runner
-- suspend temporairement les FK et exécute foreign_key_check avant le commit.

DROP TRIGGER IF EXISTS update_appointments_timestamp;

CREATE TABLE appointments_v2 (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    vet_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN (
      'scheduled', 'confirmed', 'arrived', 'waiting',
      'in_progress', 'completed', 'cancelled', 'no_show'
    )),
    type TEXT NOT NULL CHECK(type IN ('Consultation', 'Vaccin', 'Chirurgie', 'Urgence', 'Contrôle')),
    reason TEXT,
    diagnosis TEXT,
    treatment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    room TEXT DEFAULT 'consult-1',
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO appointments_v2 (
  id, patient_id, owner_id, vet_id, title, start_time, end_time, status,
  type, reason, diagnosis, treatment, notes, created_at, updated_at, room
)
SELECT
  id, patient_id, owner_id, vet_id, title, start_time, end_time, status,
  type, reason, diagnosis, treatment, notes, created_at, updated_at, room
FROM appointments;

DROP TABLE appointments;
ALTER TABLE appointments_v2 RENAME TO appointments;

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_vet_id ON appointments(vet_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_room ON appointments(room);
CREATE INDEX idx_appointments_room_time ON appointments(room, start_time, end_time);

CREATE TRIGGER update_appointments_timestamp AFTER UPDATE ON appointments
BEGIN
    UPDATE appointments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`;

export const MIGRATION_014_SQL = `
-- Migration 014: préférences de contact et personne secondaire du propriétaire.
ALTER TABLE owners ADD COLUMN preferred_contact TEXT
  CHECK(preferred_contact IN ('phone', 'sms', 'email'));
ALTER TABLE owners ADD COLUMN secondary_contact_name TEXT;
ALTER TABLE owners ADD COLUMN secondary_contact_phone TEXT;
ALTER TABLE owners ADD COLUMN communication_notes TEXT;
`;

export const MIGRATION_015_SQL = `
-- Migration 015: fondation de facturation locale et journal de trésorerie.
-- Les montants sont toujours en centimes entiers et les quantités en millièmes.
-- Les tables de facturation ne suppriment jamais l'historique comptable.

-- La table transactions doit être reconstruite pour étendre le CHECK de moyen
-- de paiement tout en conservant les écritures historiques et leurs index.
DROP TRIGGER IF EXISTS update_transactions_timestamp;

CREATE TABLE transactions_v2 (
    id TEXT PRIMARY KEY,
    date DATETIME NOT NULL,
    amount INTEGER NOT NULL CHECK(typeof(amount) = 'integer' AND amount >= 0),
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'bank_transfer', 'check', 'other')),
    status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'pending')),
    source_type TEXT,
    source_id TEXT,
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK(typeof(is_locked) = 'integer' AND is_locked IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK(
      (source_type IS NULL AND source_id IS NULL)
      OR (source_type IS NOT NULL AND source_id IS NOT NULL)
    ),
    CHECK(is_locked = 0 OR (source_type IS NOT NULL AND source_id IS NOT NULL))
);

INSERT INTO transactions_v2 (
  id, date, amount, type, category, description, reference_id, method, status,
  created_at, updated_at
)
SELECT
  id, date, amount, type, category, description, reference_id, method, status,
  created_at, updated_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_v2 RENAME TO transactions;

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_source ON transactions(source_type, source_id);
CREATE UNIQUE INDEX idx_transactions_source_identity
  ON transactions(source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE TRIGGER update_transactions_timestamp AFTER UPDATE ON transactions
BEGIN
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TABLE billing_sequences (
  kind TEXT NOT NULL CHECK(kind IN ('invoice', 'credit_note')),
  sequence_year INTEGER NOT NULL CHECK(typeof(sequence_year) = 'integer' AND sequence_year BETWEEN 2000 AND 9999),
  next_value INTEGER NOT NULL CHECK(typeof(next_value) = 'integer' AND next_value > 0),
  PRIMARY KEY (kind, sequence_year)
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  patient_id TEXT,
  appointment_id TEXT,
  document_status TEXT NOT NULL DEFAULT 'draft' CHECK(document_status IN ('draft', 'issued', 'void')),
  number TEXT UNIQUE,
  currency TEXT NOT NULL DEFAULT 'DZD' CHECK(length(trim(currency)) > 0),
  due_at DATETIME,
  issued_at DATETIME,
  voided_at DATETIME,
  void_reason TEXT,
  owner_snapshot TEXT,
  clinic_snapshot TEXT,
  notes TEXT,
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(subtotal_amount) = 'integer' AND subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_amount) = 'integer' AND discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_amount) = 'integer' AND tax_amount >= 0),
  gross_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(gross_amount) = 'integer' AND gross_amount >= 0),
  issue_idempotency_key TEXT UNIQUE,
  legacy_source_transaction_id TEXT UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(
    document_status != 'issued'
    OR (
      number IS NOT NULL
      AND issued_at IS NOT NULL
      AND owner_snapshot IS NOT NULL
      AND clinic_snapshot IS NOT NULL
      AND gross_amount > 0
      AND issue_idempotency_key IS NOT NULL
    )
  ),
  CHECK(document_status != 'void' OR voided_at IS NOT NULL),
  CHECK(document_status != 'draft' OR number IS NULL),
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE RESTRICT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (legacy_source_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
);

CREATE TABLE invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL CHECK(length(trim(description)) > 0),
  quantity_milli INTEGER NOT NULL CHECK(typeof(quantity_milli) = 'integer' AND quantity_milli > 0),
  unit_amount INTEGER NOT NULL CHECK(typeof(unit_amount) = 'integer' AND unit_amount >= 0),
  discount_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_bps) = 'integer' AND discount_bps BETWEEN 0 AND 10000),
  tax_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_bps) = 'integer' AND tax_bps >= 0),
  base_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(base_amount) = 'integer' AND base_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_amount) = 'integer' AND discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_amount) = 'integer' AND tax_amount >= 0),
  gross_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(gross_amount) = 'integer' AND gross_amount >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(typeof(sort_order) = 'integer' AND sort_order >= 0),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE credit_notes (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  document_status TEXT NOT NULL DEFAULT 'draft' CHECK(document_status IN ('draft', 'issued', 'void')),
  number TEXT UNIQUE,
  issued_at DATETIME,
  voided_at DATETIME,
  void_reason TEXT,
  owner_snapshot TEXT,
  clinic_snapshot TEXT,
  reason TEXT,
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(subtotal_amount) = 'integer' AND subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_amount) = 'integer' AND discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_amount) = 'integer' AND tax_amount >= 0),
  gross_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(gross_amount) = 'integer' AND gross_amount >= 0),
  idempotency_key TEXT UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(
    document_status != 'issued'
    OR (
      number IS NOT NULL
      AND issued_at IS NOT NULL
      AND owner_snapshot IS NOT NULL
      AND clinic_snapshot IS NOT NULL
      AND gross_amount > 0
      AND idempotency_key IS NOT NULL
    )
  ),
  CHECK(document_status != 'void' OR voided_at IS NOT NULL),
  CHECK(document_status != 'draft' OR number IS NULL),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT
);

CREATE TABLE credit_note_lines (
  id TEXT PRIMARY KEY,
  credit_note_id TEXT NOT NULL,
  invoice_line_id TEXT,
  description TEXT NOT NULL CHECK(length(trim(description)) > 0),
  quantity_milli INTEGER NOT NULL CHECK(typeof(quantity_milli) = 'integer' AND quantity_milli > 0),
  unit_amount INTEGER NOT NULL CHECK(typeof(unit_amount) = 'integer' AND unit_amount >= 0),
  discount_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_bps) = 'integer' AND discount_bps BETWEEN 0 AND 10000),
  tax_bps INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_bps) = 'integer' AND tax_bps >= 0),
  base_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(base_amount) = 'integer' AND base_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(discount_amount) = 'integer' AND discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tax_amount) = 'integer' AND tax_amount >= 0),
  gross_amount INTEGER NOT NULL DEFAULT 0 CHECK(typeof(gross_amount) = 'integer' AND gross_amount >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK(typeof(sort_order) = 'integer' AND sort_order >= 0),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE SET NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(typeof(amount) = 'integer' AND amount > 0),
  method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'bank_transfer', 'check', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'void')),
  paid_at DATETIME NOT NULL,
  voided_at DATETIME,
  void_reason TEXT,
  reference TEXT,
  journal_transaction_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(status != 'void' OR voided_at IS NOT NULL),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(typeof(amount) = 'integer' AND amount > 0),
  method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'bank_transfer', 'check', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'void')),
  refunded_at DATETIME NOT NULL,
  voided_at DATETIME,
  void_reason TEXT,
  reason TEXT,
  journal_transaction_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(status != 'void' OR voided_at IS NOT NULL),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  FOREIGN KEY (journal_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT
);

CREATE INDEX idx_invoices_owner ON invoices(owner_id);
CREATE INDEX idx_invoices_appointment ON invoices(appointment_id);
CREATE INDEX idx_invoices_status ON invoices(document_status, issued_at);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id, sort_order);
CREATE INDEX idx_credit_notes_invoice ON credit_notes(invoice_id, document_status);
CREATE INDEX idx_credit_note_lines_credit ON credit_note_lines(credit_note_id, sort_order);
CREATE INDEX idx_payments_invoice ON payments(invoice_id, status, paid_at);
CREATE INDEX idx_refunds_payment ON refunds(payment_id, status, refunded_at);

-- Backfill des transactions historiques. Une transaction positive de revenu
-- payée n'est importée que si sa reference_id pointe exactement sur un RDV.
-- Les identifiants et numéros LEGACY-* sont déterministes afin de rendre une
-- éventuelle réexécution sans effet et sans consommer les séquences officielles.
INSERT OR IGNORE INTO invoices (
  id, owner_id, patient_id, appointment_id, document_status, number, currency,
  due_at, issued_at, owner_snapshot, clinic_snapshot, notes,
  subtotal_amount, discount_amount, tax_amount, gross_amount,
  issue_idempotency_key, legacy_source_transaction_id, created_at, updated_at
)
SELECT
  'legacy-invoice-' || t.id,
  a.owner_id,
  a.patient_id,
  a.id,
  'issued',
  'LEGACY-' || t.id,
  'DZD',
  t.date,
  t.date,
  json_object(
    'id', o.id,
    'firstName', o.first_name,
    'lastName', o.last_name,
    'phone', o.phone,
    'email', o.email,
    'address', o.address,
    'city', o.city
  ),
  json_object('name', 'Baitari', 'source', 'legacy-backfill'),
  'Imported legacy paid income transaction',
  t.amount,
  0,
  0,
  t.amount,
  'legacy-issue-' || t.id,
  t.id,
  t.created_at,
  t.updated_at
FROM transactions t
JOIN appointments a ON a.id = t.reference_id
JOIN owners o ON o.id = a.owner_id
WHERE t.type = 'income'
  AND t.status = 'paid'
  AND t.amount > 0
  AND t.reference_id IS NOT NULL;

INSERT OR IGNORE INTO invoice_lines (
  id, invoice_id, description, quantity_milli, unit_amount, discount_bps,
  tax_bps, base_amount, discount_amount, tax_amount, gross_amount, sort_order,
  created_at, updated_at
)
SELECT
  'legacy-invoice-line-' || t.id,
  i.id,
  t.description,
  1000,
  t.amount,
  0,
  0,
  t.amount,
  0,
  0,
  t.amount,
  0,
  t.created_at,
  t.updated_at
FROM transactions t
JOIN invoices i ON i.legacy_source_transaction_id = t.id
WHERE t.type = 'income'
  AND t.status = 'paid'
  AND t.amount > 0;

INSERT OR IGNORE INTO payments (
  id, invoice_id, amount, method, status, paid_at, reference,
  journal_transaction_id, idempotency_key, created_at, updated_at
)
SELECT
  'legacy-payment-' || t.id,
  i.id,
  t.amount,
  t.method,
  'completed',
  t.date,
  t.description,
  t.id,
  'legacy-payment-' || t.id,
  t.created_at,
  t.updated_at
FROM transactions t
JOIN invoices i ON i.legacy_source_transaction_id = t.id
WHERE t.type = 'income'
  AND t.status = 'paid'
  AND t.amount > 0;

UPDATE transactions
SET
  source_type = 'billing_payment',
  source_id = 'legacy-payment-' || id,
  is_locked = 1
WHERE id IN (
  SELECT t.id
  FROM transactions t
  JOIN invoices i ON i.legacy_source_transaction_id = t.id
  JOIN payments p ON p.journal_transaction_id = t.id
  WHERE t.type = 'income'
    AND t.status = 'paid'
    AND t.amount > 0
)
AND (
  source_type IS NULL
  OR (source_type = 'billing_payment' AND source_id = 'legacy-payment-' || id)
);

-- Les projections de journal sont append-only depuis les opérations billing.
-- updated_at seul reste autorisé car l'ancien trigger de compatibilité le met
-- à jour après chaque écriture métier.
CREATE TRIGGER transactions_locked_no_update BEFORE UPDATE ON transactions
WHEN OLD.is_locked = 1
  AND (
    NEW.id IS NOT OLD.id
    OR NEW.date IS NOT OLD.date
    OR NEW.amount IS NOT OLD.amount
    OR NEW.type IS NOT OLD.type
    OR NEW.category IS NOT OLD.category
    OR NEW.description IS NOT OLD.description
    OR NEW.reference_id IS NOT OLD.reference_id
    OR NEW.method IS NOT OLD.method
    OR NEW.status IS NOT OLD.status
    OR NEW.source_type IS NOT OLD.source_type
    OR NEW.source_id IS NOT OLD.source_id
    OR NEW.is_locked IS NOT OLD.is_locked
    OR NEW.created_at IS NOT OLD.created_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Locked billing journal transactions are immutable');
END;

CREATE TRIGGER transactions_locked_no_delete BEFORE DELETE ON transactions
WHEN OLD.is_locked = 1
BEGIN
  SELECT RAISE(ABORT, 'Locked billing journal transactions cannot be deleted');
END;

CREATE TRIGGER invoices_must_start_draft BEFORE INSERT ON invoices
WHEN NEW.document_status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Invoices must be issued through the billing service');
END;

CREATE TRIGGER invoices_issued_immutable BEFORE UPDATE ON invoices
WHEN (
  OLD.document_status = 'issued'
  AND NOT (
    (
      NEW.document_status = 'void'
      AND NEW.id IS OLD.id
      AND NEW.owner_id IS OLD.owner_id
      AND NEW.patient_id IS OLD.patient_id
      AND NEW.appointment_id IS OLD.appointment_id
      AND NEW.number IS OLD.number
      AND NEW.currency IS OLD.currency
      AND NEW.due_at IS OLD.due_at
      AND NEW.issued_at IS OLD.issued_at
      AND NEW.owner_snapshot IS OLD.owner_snapshot
      AND NEW.clinic_snapshot IS OLD.clinic_snapshot
      AND NEW.notes IS OLD.notes
      AND NEW.subtotal_amount IS OLD.subtotal_amount
      AND NEW.discount_amount IS OLD.discount_amount
      AND NEW.tax_amount IS OLD.tax_amount
      AND NEW.gross_amount IS OLD.gross_amount
      AND NEW.issue_idempotency_key IS OLD.issue_idempotency_key
      AND NEW.legacy_source_transaction_id IS OLD.legacy_source_transaction_id
      AND NEW.created_at IS OLD.created_at
      AND NEW.voided_at IS NOT NULL
    )
    OR (
      NEW.document_status IS OLD.document_status
      AND NEW.id IS OLD.id
      AND NEW.owner_id IS OLD.owner_id
      AND (NEW.patient_id IS OLD.patient_id OR (OLD.patient_id IS NOT NULL AND NEW.patient_id IS NULL))
      AND (NEW.appointment_id IS OLD.appointment_id OR (OLD.appointment_id IS NOT NULL AND NEW.appointment_id IS NULL))
      AND NEW.number IS OLD.number
      AND NEW.currency IS OLD.currency
      AND NEW.due_at IS OLD.due_at
      AND NEW.issued_at IS OLD.issued_at
      AND NEW.voided_at IS OLD.voided_at
      AND NEW.void_reason IS OLD.void_reason
      AND NEW.owner_snapshot IS OLD.owner_snapshot
      AND NEW.clinic_snapshot IS OLD.clinic_snapshot
      AND NEW.notes IS OLD.notes
      AND NEW.subtotal_amount IS OLD.subtotal_amount
      AND NEW.discount_amount IS OLD.discount_amount
      AND NEW.tax_amount IS OLD.tax_amount
      AND NEW.gross_amount IS OLD.gross_amount
      AND NEW.issue_idempotency_key IS OLD.issue_idempotency_key
      AND NEW.legacy_source_transaction_id IS OLD.legacy_source_transaction_id
      AND NEW.created_at IS OLD.created_at
      AND NEW.updated_at IS OLD.updated_at
    )
  )
)
OR (
  OLD.document_status = 'void'
  AND NOT (
    NEW.document_status IS OLD.document_status
    AND NEW.id IS OLD.id
    AND NEW.owner_id IS OLD.owner_id
    AND (NEW.patient_id IS OLD.patient_id OR (OLD.patient_id IS NOT NULL AND NEW.patient_id IS NULL))
    AND (NEW.appointment_id IS OLD.appointment_id OR (OLD.appointment_id IS NOT NULL AND NEW.appointment_id IS NULL))
    AND NEW.number IS OLD.number
    AND NEW.currency IS OLD.currency
    AND NEW.due_at IS OLD.due_at
    AND NEW.issued_at IS OLD.issued_at
    AND NEW.voided_at IS OLD.voided_at
    AND NEW.void_reason IS OLD.void_reason
    AND NEW.owner_snapshot IS OLD.owner_snapshot
    AND NEW.clinic_snapshot IS OLD.clinic_snapshot
    AND NEW.notes IS OLD.notes
    AND NEW.subtotal_amount IS OLD.subtotal_amount
    AND NEW.discount_amount IS OLD.discount_amount
    AND NEW.tax_amount IS OLD.tax_amount
    AND NEW.gross_amount IS OLD.gross_amount
    AND NEW.issue_idempotency_key IS OLD.issue_idempotency_key
    AND NEW.legacy_source_transaction_id IS OLD.legacy_source_transaction_id
    AND NEW.created_at IS OLD.created_at
    AND NEW.updated_at IS OLD.updated_at
  )
)
BEGIN
  SELECT RAISE(ABORT, 'Issued and void invoices are immutable');
END;

CREATE TRIGGER invoices_issued_no_delete BEFORE DELETE ON invoices
WHEN OLD.document_status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued and void invoices cannot be deleted');
END;

CREATE TRIGGER invoice_lines_draft_insert_only BEFORE INSERT ON invoice_lines
WHEN (SELECT document_status FROM invoices WHERE id = NEW.invoice_id) != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued invoice lines are immutable');
END;

CREATE TRIGGER invoice_lines_draft_update_only BEFORE UPDATE ON invoice_lines
WHEN (SELECT document_status FROM invoices WHERE id = OLD.invoice_id) != 'draft'
  AND NOT (
    NEW.id IS OLD.id
    AND NEW.invoice_id IS OLD.invoice_id
    AND OLD.product_id IS NOT NULL
    AND NEW.product_id IS NULL
    AND NEW.description IS OLD.description
    AND NEW.quantity_milli IS OLD.quantity_milli
    AND NEW.unit_amount IS OLD.unit_amount
    AND NEW.discount_bps IS OLD.discount_bps
    AND NEW.tax_bps IS OLD.tax_bps
    AND NEW.base_amount IS OLD.base_amount
    AND NEW.discount_amount IS OLD.discount_amount
    AND NEW.tax_amount IS OLD.tax_amount
    AND NEW.gross_amount IS OLD.gross_amount
    AND NEW.sort_order IS OLD.sort_order
    AND NEW.created_at IS OLD.created_at
    AND NEW.updated_at IS OLD.updated_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Issued invoice lines are immutable');
END;

CREATE TRIGGER invoice_lines_draft_delete_only BEFORE DELETE ON invoice_lines
WHEN (SELECT document_status FROM invoices WHERE id = OLD.invoice_id) != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued invoice lines cannot be deleted');
END;

CREATE TRIGGER invoice_lines_amounts_valid_insert BEFORE INSERT ON invoice_lines
BEGIN
  WITH
    base AS (
      SELECT CAST((NEW.quantity_milli * NEW.unit_amount + 500) / 1000 AS INTEGER) AS base_amount
    ),
    discounted AS (
      SELECT
        base_amount,
        CAST((base_amount * NEW.discount_bps + 5000) / 10000 AS INTEGER) AS discount_amount
      FROM base
    ),
    calculated AS (
      SELECT
        base_amount,
        discount_amount,
        CAST(((base_amount - discount_amount) * NEW.tax_bps + 5000) / 10000 AS INTEGER) AS tax_amount
      FROM discounted
    )
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM calculated
    WHERE base_amount != NEW.base_amount
      OR discount_amount != NEW.discount_amount
      OR tax_amount != NEW.tax_amount
      OR base_amount - discount_amount + tax_amount != NEW.gross_amount
  ) THEN RAISE(ABORT, 'Invoice line amounts do not match deterministic rounding') END;
END;

CREATE TRIGGER invoice_lines_amounts_valid_update BEFORE UPDATE ON invoice_lines
BEGIN
  WITH
    base AS (
      SELECT CAST((NEW.quantity_milli * NEW.unit_amount + 500) / 1000 AS INTEGER) AS base_amount
    ),
    discounted AS (
      SELECT
        base_amount,
        CAST((base_amount * NEW.discount_bps + 5000) / 10000 AS INTEGER) AS discount_amount
      FROM base
    ),
    calculated AS (
      SELECT
        base_amount,
        discount_amount,
        CAST(((base_amount - discount_amount) * NEW.tax_bps + 5000) / 10000 AS INTEGER) AS tax_amount
      FROM discounted
    )
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM calculated
    WHERE base_amount != NEW.base_amount
      OR discount_amount != NEW.discount_amount
      OR tax_amount != NEW.tax_amount
      OR base_amount - discount_amount + tax_amount != NEW.gross_amount
  ) THEN RAISE(ABORT, 'Invoice line amounts do not match deterministic rounding') END;
END;

CREATE TRIGGER invoices_issue_totals BEFORE UPDATE OF document_status ON invoices
WHEN OLD.document_status = 'draft'
  AND NEW.document_status = 'issued'
  AND (
    NEW.subtotal_amount != COALESCE((SELECT SUM(base_amount) FROM invoice_lines WHERE invoice_id = NEW.id), 0)
    OR NEW.discount_amount != COALESCE((SELECT SUM(discount_amount) FROM invoice_lines WHERE invoice_id = NEW.id), 0)
    OR NEW.tax_amount != COALESCE((SELECT SUM(tax_amount) FROM invoice_lines WHERE invoice_id = NEW.id), 0)
    OR NEW.gross_amount != COALESCE((SELECT SUM(gross_amount) FROM invoice_lines WHERE invoice_id = NEW.id), 0)
  )
BEGIN
  SELECT RAISE(ABORT, 'Invoice totals must equal immutable line totals');
END;

CREATE TRIGGER invoices_void_only_when_unsettled BEFORE UPDATE OF document_status ON invoices
WHEN NEW.document_status = 'void'
  AND (
    EXISTS (SELECT 1 FROM payments WHERE invoice_id = NEW.id AND status = 'completed')
    OR EXISTS (
      SELECT 1
      FROM refunds r
      JOIN payments p ON p.id = r.payment_id
      WHERE p.invoice_id = NEW.id AND r.status = 'completed'
    )
    OR EXISTS (SELECT 1 FROM credit_notes WHERE invoice_id = NEW.id AND document_status = 'issued')
  )
BEGIN
  SELECT RAISE(ABORT, 'Invoice must have no completed payments, refunds, or issued credits before voiding');
END;

CREATE TRIGGER credit_notes_must_start_draft BEFORE INSERT ON credit_notes
WHEN NEW.document_status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Credit notes must be issued through the billing service');
END;

CREATE TRIGGER credit_notes_issued_immutable BEFORE UPDATE ON credit_notes
WHEN OLD.document_status IN ('issued', 'void')
BEGIN
  SELECT RAISE(ABORT, 'Issued and void credit notes are immutable');
END;

CREATE TRIGGER credit_notes_issued_no_delete BEFORE DELETE ON credit_notes
WHEN OLD.document_status != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued and void credit notes cannot be deleted');
END;

CREATE TRIGGER credit_note_lines_draft_insert_only BEFORE INSERT ON credit_note_lines
WHEN (SELECT document_status FROM credit_notes WHERE id = NEW.credit_note_id) != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued credit note lines are immutable');
END;

CREATE TRIGGER credit_note_lines_draft_update_only BEFORE UPDATE ON credit_note_lines
WHEN (SELECT document_status FROM credit_notes WHERE id = OLD.credit_note_id) != 'draft'
  AND NOT (
    NEW.id IS OLD.id
    AND NEW.credit_note_id IS OLD.credit_note_id
    AND OLD.invoice_line_id IS NOT NULL
    AND NEW.invoice_line_id IS NULL
    AND NEW.description IS OLD.description
    AND NEW.quantity_milli IS OLD.quantity_milli
    AND NEW.unit_amount IS OLD.unit_amount
    AND NEW.discount_bps IS OLD.discount_bps
    AND NEW.tax_bps IS OLD.tax_bps
    AND NEW.base_amount IS OLD.base_amount
    AND NEW.discount_amount IS OLD.discount_amount
    AND NEW.tax_amount IS OLD.tax_amount
    AND NEW.gross_amount IS OLD.gross_amount
    AND NEW.sort_order IS OLD.sort_order
    AND NEW.created_at IS OLD.created_at
    AND NEW.updated_at IS OLD.updated_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Issued credit note lines are immutable');
END;

CREATE TRIGGER credit_note_lines_draft_delete_only BEFORE DELETE ON credit_note_lines
WHEN (SELECT document_status FROM credit_notes WHERE id = OLD.credit_note_id) != 'draft'
BEGIN
  SELECT RAISE(ABORT, 'Issued credit note lines cannot be deleted');
END;

CREATE TRIGGER credit_note_lines_amounts_valid_insert BEFORE INSERT ON credit_note_lines
BEGIN
  WITH
    base AS (
      SELECT CAST((NEW.quantity_milli * NEW.unit_amount + 500) / 1000 AS INTEGER) AS base_amount
    ),
    discounted AS (
      SELECT
        base_amount,
        CAST((base_amount * NEW.discount_bps + 5000) / 10000 AS INTEGER) AS discount_amount
      FROM base
    ),
    calculated AS (
      SELECT
        base_amount,
        discount_amount,
        CAST(((base_amount - discount_amount) * NEW.tax_bps + 5000) / 10000 AS INTEGER) AS tax_amount
      FROM discounted
    )
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM calculated
    WHERE base_amount != NEW.base_amount
      OR discount_amount != NEW.discount_amount
      OR tax_amount != NEW.tax_amount
      OR base_amount - discount_amount + tax_amount != NEW.gross_amount
  ) THEN RAISE(ABORT, 'Credit note line amounts do not match deterministic rounding') END;
END;

CREATE TRIGGER credit_note_lines_amounts_valid_update BEFORE UPDATE ON credit_note_lines
BEGIN
  WITH
    base AS (
      SELECT CAST((NEW.quantity_milli * NEW.unit_amount + 500) / 1000 AS INTEGER) AS base_amount
    ),
    discounted AS (
      SELECT
        base_amount,
        CAST((base_amount * NEW.discount_bps + 5000) / 10000 AS INTEGER) AS discount_amount
      FROM base
    ),
    calculated AS (
      SELECT
        base_amount,
        discount_amount,
        CAST(((base_amount - discount_amount) * NEW.tax_bps + 5000) / 10000 AS INTEGER) AS tax_amount
      FROM discounted
    )
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM calculated
    WHERE base_amount != NEW.base_amount
      OR discount_amount != NEW.discount_amount
      OR tax_amount != NEW.tax_amount
      OR base_amount - discount_amount + tax_amount != NEW.gross_amount
  ) THEN RAISE(ABORT, 'Credit note line amounts do not match deterministic rounding') END;
END;

CREATE TRIGGER credit_notes_issue_requires_invoice BEFORE UPDATE OF document_status ON credit_notes
WHEN OLD.document_status = 'draft'
  AND NEW.document_status = 'issued'
  AND (SELECT document_status FROM invoices WHERE id = NEW.invoice_id) != 'issued'
BEGIN
  SELECT RAISE(ABORT, 'Credits require an issued invoice');
END;

CREATE TRIGGER credit_notes_issue_totals BEFORE UPDATE OF document_status ON credit_notes
WHEN OLD.document_status = 'draft'
  AND NEW.document_status = 'issued'
  AND (
    NEW.subtotal_amount != COALESCE((SELECT SUM(base_amount) FROM credit_note_lines WHERE credit_note_id = NEW.id), 0)
    OR NEW.discount_amount != COALESCE((SELECT SUM(discount_amount) FROM credit_note_lines WHERE credit_note_id = NEW.id), 0)
    OR NEW.tax_amount != COALESCE((SELECT SUM(tax_amount) FROM credit_note_lines WHERE credit_note_id = NEW.id), 0)
    OR NEW.gross_amount != COALESCE((SELECT SUM(gross_amount) FROM credit_note_lines WHERE credit_note_id = NEW.id), 0)
  )
BEGIN
  SELECT RAISE(ABORT, 'Credit note totals must equal immutable line totals');
END;

CREATE TRIGGER credit_notes_issue_within_invoice BEFORE UPDATE OF document_status ON credit_notes
WHEN OLD.document_status = 'draft'
  AND NEW.document_status = 'issued'
  AND NEW.gross_amount > (
    (SELECT gross_amount FROM invoices WHERE id = NEW.invoice_id)
    - COALESCE((
      SELECT SUM(gross_amount)
      FROM credit_notes
      WHERE invoice_id = NEW.invoice_id
        AND document_status = 'issued'
        AND id != NEW.id
    ), 0)
  )
BEGIN
  SELECT RAISE(ABORT, 'Credit amount exceeds remaining creditable invoice total');
END;

CREATE TRIGGER payments_require_issued_invoice BEFORE INSERT ON payments
WHEN (SELECT document_status FROM invoices WHERE id = NEW.invoice_id) != 'issued'
BEGIN
  SELECT RAISE(ABORT, 'Payments require an issued invoice');
END;

CREATE TRIGGER payments_require_locked_journal_projection BEFORE INSERT ON payments
WHEN NOT EXISTS (
  SELECT 1
  FROM transactions t
  WHERE t.id = NEW.journal_transaction_id
    AND t.source_type = 'billing_payment'
    AND t.source_id = NEW.id
    AND t.is_locked = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Payments require a locked matching billing journal projection');
END;

CREATE TRIGGER payments_amount_within_balance BEFORE INSERT ON payments
WHEN NEW.amount > (
  (SELECT gross_amount FROM invoices WHERE id = NEW.invoice_id)
  - COALESCE((
    SELECT SUM(gross_amount)
    FROM credit_notes
    WHERE invoice_id = NEW.invoice_id AND document_status = 'issued'
  ), 0)
  - COALESCE((
    SELECT SUM(amount)
    FROM payments
    WHERE invoice_id = NEW.invoice_id AND status = 'completed'
  ), 0)
  + COALESCE((
    SELECT SUM(r.amount)
    FROM refunds r
    JOIN payments p ON p.id = r.payment_id
    WHERE p.invoice_id = NEW.invoice_id AND r.status = 'completed'
  ), 0)
)
BEGIN
  SELECT RAISE(ABORT, 'Payment amount exceeds current invoice balance');
END;

CREATE TRIGGER payments_completed_immutable BEFORE UPDATE ON payments
WHEN OLD.status = 'void'
  OR (
    OLD.status = 'completed'
    AND NOT (
      NEW.status = 'void'
      AND NEW.id IS OLD.id
      AND NEW.invoice_id IS OLD.invoice_id
      AND NEW.amount IS OLD.amount
      AND NEW.method IS OLD.method
      AND NEW.paid_at IS OLD.paid_at
      AND NEW.reference IS OLD.reference
      AND NEW.journal_transaction_id IS OLD.journal_transaction_id
      AND NEW.idempotency_key IS OLD.idempotency_key
      AND NEW.created_at IS OLD.created_at
      AND NEW.voided_at IS NOT NULL
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Completed and void payments are immutable');
END;

CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments
BEGIN
  SELECT RAISE(ABORT, 'Payments cannot be deleted');
END;

CREATE TRIGGER payments_no_void_with_completed_refunds BEFORE UPDATE OF status ON payments
WHEN OLD.status = 'completed'
  AND NEW.status = 'void'
  AND EXISTS (SELECT 1 FROM refunds WHERE payment_id = OLD.id AND status = 'completed')
BEGIN
  SELECT RAISE(ABORT, 'Completed refunds must be voided before their payment');
END;

CREATE TRIGGER refunds_require_completed_payment BEFORE INSERT ON refunds
WHEN (SELECT status FROM payments WHERE id = NEW.payment_id) != 'completed'
BEGIN
  SELECT RAISE(ABORT, 'Refunds require a completed payment');
END;

CREATE TRIGGER refunds_require_locked_journal_projection BEFORE INSERT ON refunds
WHEN NOT EXISTS (
  SELECT 1
  FROM transactions t
  WHERE t.id = NEW.journal_transaction_id
    AND t.source_type = 'billing_refund'
    AND t.source_id = NEW.id
    AND t.is_locked = 1
)
BEGIN
  SELECT RAISE(ABORT, 'Refunds require a locked matching billing journal projection');
END;

CREATE TRIGGER refunds_amount_within_payment BEFORE INSERT ON refunds
WHEN NEW.amount > (
  (SELECT amount FROM payments WHERE id = NEW.payment_id)
  - COALESCE((
    SELECT SUM(amount)
    FROM refunds
    WHERE payment_id = NEW.payment_id AND status = 'completed'
  ), 0)
)
BEGIN
  SELECT RAISE(ABORT, 'Refund amount exceeds refundable payment amount');
END;

CREATE TRIGGER refunds_completed_immutable BEFORE UPDATE ON refunds
WHEN OLD.status = 'void'
  OR (
    OLD.status = 'completed'
    AND NOT (
      NEW.status = 'void'
      AND NEW.id IS OLD.id
      AND NEW.payment_id IS OLD.payment_id
      AND NEW.amount IS OLD.amount
      AND NEW.method IS OLD.method
      AND NEW.refunded_at IS OLD.refunded_at
      AND NEW.reason IS OLD.reason
      AND NEW.journal_transaction_id IS OLD.journal_transaction_id
      AND NEW.idempotency_key IS OLD.idempotency_key
      AND NEW.created_at IS OLD.created_at
      AND NEW.voided_at IS NOT NULL
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Completed and void refunds are immutable');
END;

CREATE TRIGGER refunds_no_delete BEFORE DELETE ON refunds
BEGIN
  SELECT RAISE(ABORT, 'Refunds cannot be deleted');
END;
`;

export const MIGRATION_016_SQL = `
-- Migration 016: durcissement des commandes idempotentes et des avoirs.
-- Les documents émis restent immuables, à l'exception de la transition
-- explicitement auditée issued -> void d'un avoir, avec motif obligatoire.

-- Les avoirs v15 ne conservaient pas le produit demandé, ce qui empêchait de
-- distinguer une répétition exacte d'une commande différente.
ALTER TABLE credit_note_lines ADD COLUMN product_id TEXT;

-- v15 ne vérifiait pas que la ligne de facture liée appartenait à la facture
-- de l'avoir. Supprimer seulement la provenance invalide conserve les montants
-- et les autres instantanés financiers immuables avant l'installation des
-- déclencheurs de contrôle ci-dessous.
UPDATE credit_note_lines
SET invoice_line_id = NULL
WHERE invoice_line_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM credit_notes c
    JOIN invoice_lines i ON i.id = credit_note_lines.invoice_line_id
    WHERE c.id = credit_note_lines.credit_note_id
      AND i.invoice_id = c.invoice_id
  );

DROP TRIGGER IF EXISTS credit_notes_issued_immutable;
DROP TRIGGER IF EXISTS credit_note_lines_draft_update_only;

CREATE TRIGGER credit_note_lines_draft_update_only BEFORE UPDATE ON credit_note_lines
WHEN (SELECT document_status FROM credit_notes WHERE id = OLD.credit_note_id) != 'draft'
  AND NOT (
    NEW.id IS OLD.id
    AND NEW.credit_note_id IS OLD.credit_note_id
    AND OLD.invoice_line_id IS NOT NULL
    AND NEW.invoice_line_id IS NULL
    AND NEW.product_id IS OLD.product_id
    AND NEW.description IS OLD.description
    AND NEW.quantity_milli IS OLD.quantity_milli
    AND NEW.unit_amount IS OLD.unit_amount
    AND NEW.discount_bps IS OLD.discount_bps
    AND NEW.tax_bps IS OLD.tax_bps
    AND NEW.base_amount IS OLD.base_amount
    AND NEW.discount_amount IS OLD.discount_amount
    AND NEW.tax_amount IS OLD.tax_amount
    AND NEW.gross_amount IS OLD.gross_amount
    AND NEW.sort_order IS OLD.sort_order
    AND NEW.created_at IS OLD.created_at
    AND NEW.updated_at IS OLD.updated_at
  )
BEGIN
  SELECT RAISE(ABORT, 'Issued credit note lines are immutable');
END;

CREATE TRIGGER credit_notes_issued_immutable BEFORE UPDATE ON credit_notes
WHEN OLD.document_status = 'void'
  OR (
    OLD.document_status = 'issued'
    AND NOT (
      NEW.document_status = 'void'
      AND NEW.id IS OLD.id
      AND NEW.invoice_id IS OLD.invoice_id
      AND NEW.number IS OLD.number
      AND NEW.issued_at IS OLD.issued_at
      AND NEW.owner_snapshot IS OLD.owner_snapshot
      AND NEW.clinic_snapshot IS OLD.clinic_snapshot
      AND NEW.reason IS OLD.reason
      AND NEW.subtotal_amount IS OLD.subtotal_amount
      AND NEW.discount_amount IS OLD.discount_amount
      AND NEW.tax_amount IS OLD.tax_amount
      AND NEW.gross_amount IS OLD.gross_amount
      AND NEW.idempotency_key IS OLD.idempotency_key
      AND NEW.created_at IS OLD.created_at
      AND NEW.voided_at IS NOT NULL
      AND NEW.void_reason IS NOT NULL
      AND length(trim(NEW.void_reason)) > 0
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'Issued and void credit notes are immutable');
END;

CREATE TRIGGER credit_note_lines_invoice_line_matches_credit_invoice_insert
BEFORE INSERT ON credit_note_lines
WHEN NEW.invoice_line_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM credit_notes c
    JOIN invoice_lines i ON i.id = NEW.invoice_line_id
    WHERE c.id = NEW.credit_note_id
      AND i.invoice_id = c.invoice_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Credit note invoice lines must belong to the credited invoice');
END;

CREATE TRIGGER credit_note_lines_invoice_line_matches_credit_invoice_update
BEFORE UPDATE ON credit_note_lines
WHEN NEW.invoice_line_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM credit_notes c
    JOIN invoice_lines i ON i.id = NEW.invoice_line_id
    WHERE c.id = NEW.credit_note_id
      AND i.invoice_id = c.invoice_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Credit note invoice lines must belong to the credited invoice');
END;
`;
