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

-- ============================================
-- Données initiales: Admin par défaut
-- ============================================
INSERT OR IGNORE INTO users (id, email, password_hash, display_name, role, status)
VALUES (
    'admin-default-001',
    'zohir.kh@gmail.com',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Zouhir Kherroubi',
    'admin',
    'active'
)`;

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
