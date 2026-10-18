import { DEFAULT_DOCUMENT_TEMPLATES } from "./lib/document-templates";

// Keep SQL statements on one line: the migration parser discards empty lines.
const literal = (value: string) => `'${value.replace(/'/g, "''").replace(/\n/g, "' || char(10) || '")}'`;
export const REFERRAL_TEMPLATE = {
  id: "document-referral", kind: "referral" as const, name: "Lettre de référence",
  body: "LETTRE DE RÉFÉRENCE\n\nÀ l’attention de {{reference.destinataire}}\n\nPatient : {{patient.nom}} · {{patient.espece}}\nPropriétaire : {{client.nom}}\nConsultation du {{consultation.date}}\nVétérinaire : {{clinicien.nom}}\n\nMotif de référence\n{{reference.motif}}\n\nMotif et contexte\n{{soap.motif}}\n\nExamen et observations\n{{soap.examen}}\n\nÉvaluation consignée\n{{soap.diagnostic}}\n\nPlan de soins\n{{soap.plan}}\n\nSignature : [à compléter].",
  createdAt: "2026-10-17T00:00:00.000Z", updatedAt: "2026-10-17T00:00:00.000Z",
};

export const MANAGED_DOCUMENT_DEFAULTS = [...DEFAULT_DOCUMENT_TEMPLATES, REFERRAL_TEMPLATE];
const seeds = MANAGED_DOCUMENT_DEFAULTS.map((template) => `
INSERT OR IGNORE INTO document_templates(id,kind,name,body,created_at,updated_at,nom,type_document,corps_modele,actif)
VALUES (${literal(template.id)},${literal(template.kind === "referral" ? "report" : template.kind)},${literal(template.name)},${literal(template.body)},${literal(template.createdAt)},${literal(template.updatedAt)},${literal(template.name)},${literal(template.kind)},${literal(template.body)},1);`).join("\n");

/** Additive: the legacy three bodies and every existing document remain untouched. */
export const DOCUMENTS_MIGRATION_SQL = `
ALTER TABLE document_templates ADD COLUMN nom TEXT;
ALTER TABLE document_templates ADD COLUMN type_document TEXT;
ALTER TABLE document_templates ADD COLUMN corps_modele TEXT;
ALTER TABLE document_templates ADD COLUMN en_tete_id TEXT;
ALTER TABLE document_templates ADD COLUMN actif INTEGER NOT NULL DEFAULT 1 CHECK(actif IN (0,1));
ALTER TABLE document_templates ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
UPDATE document_templates SET nom=name,type_document=kind,corps_modele=body;
${seeds}
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY,value TEXT,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO app_settings(key,value) VALUES ('managed_document_templates_seeded','1');

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  consultation_id TEXT REFERENCES appointments(id) ON DELETE RESTRICT,
  soap_source_id TEXT REFERENCES consultation_soaps(id) ON DELETE RESTRICT,
  source_key TEXT,
  template_id TEXT REFERENCES document_templates(id) ON DELETE RESTRICT,
  template_snapshot TEXT,
  type_document TEXT NOT NULL CHECK(type_document IN ('prescription','certificate','report','referral','import')),
  titre TEXT NOT NULL,
  contenu_genere TEXT NOT NULL,
  statut TEXT NOT NULL CHECK(statut IN ('brouillon','finalise','annule')),
  motif_annulation TEXT,
  fichier_importe_path TEXT,
  attachment_json TEXT,
  clinic_snapshot TEXT NOT NULL,
  values_snapshot TEXT NOT NULL,
  pdf_data_url TEXT,
  previous_document_id TEXT REFERENCES documents(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finalized_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_name TEXT NOT NULL,
  CHECK(statut != 'annule' OR length(trim(COALESCE(motif_annulation,''))) > 0),
  CHECK(statut != 'finalise' OR finalized_at IS NOT NULL),
  CHECK(type_document = 'import' OR (consultation_id IS NOT NULL AND soap_source_id IS NOT NULL AND source_key IS NOT NULL))
);
CREATE INDEX idx_documents_patient_date ON documents(patient_id,created_at DESC);
CREATE INDEX idx_documents_template ON documents(template_id);
CREATE INDEX idx_documents_consultation ON documents(consultation_id);

CREATE TABLE document_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  author_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reason TEXT
);
CREATE INDEX idx_document_events_document ON document_events(document_id,created_at);
CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  contenu TEXT NOT NULL,
  version_numero INTEGER NOT NULL CHECK(version_numero > 0),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE(document_id,version_numero)
);
CREATE TRIGGER document_template_used_no_delete BEFORE DELETE ON document_templates
WHEN EXISTS(SELECT 1 FROM documents WHERE template_id=OLD.id)
 OR EXISTS(SELECT 1 FROM notes WHERE CASE WHEN json_valid(tags) THEN json_extract(tags,'$.clinicalDocument.source.template.id') END=OLD.id)
BEGIN
 SELECT RAISE(ABORT,'Un modèle utilisé doit être désactivé.');
END;
CREATE TRIGGER documents_no_delete BEFORE DELETE ON documents
BEGIN
 SELECT RAISE(ABORT,'Un document doit être annulé pour préserver son historique.');
END;
CREATE TRIGGER documents_final_immutable BEFORE UPDATE ON documents
WHEN OLD.statut IN ('finalise','annule') AND (
 NEW.patient_id IS NOT OLD.patient_id OR NEW.patient_name IS NOT OLD.patient_name OR
 NEW.consultation_id IS NOT OLD.consultation_id OR NEW.soap_source_id IS NOT OLD.soap_source_id OR
 NEW.source_key IS NOT OLD.source_key OR NEW.template_id IS NOT OLD.template_id OR
 NEW.template_snapshot IS NOT OLD.template_snapshot OR NEW.type_document IS NOT OLD.type_document OR
 NEW.titre IS NOT OLD.titre OR NEW.contenu_genere IS NOT OLD.contenu_genere OR
 NEW.fichier_importe_path IS NOT OLD.fichier_importe_path OR NEW.attachment_json IS NOT OLD.attachment_json OR
 NEW.clinic_snapshot IS NOT OLD.clinic_snapshot OR NEW.values_snapshot IS NOT OLD.values_snapshot OR
 NEW.pdf_data_url IS NOT OLD.pdf_data_url OR NEW.previous_document_id IS NOT OLD.previous_document_id OR
 NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR
 NEW.author_name IS NOT OLD.author_name OR NEW.finalized_at IS NOT OLD.finalized_at OR
 (OLD.statut='finalise' AND NEW.statut NOT IN ('finalise','annule')) OR
 (OLD.statut='annule' AND (NEW.statut IS NOT OLD.statut OR NEW.motif_annulation IS NOT OLD.motif_annulation))
)
BEGIN
 SELECT RAISE(ABORT,'Ce document est verrouillé. Créez une nouvelle version.');
END;
CREATE TRIGGER document_events_no_update BEFORE UPDATE ON document_events
BEGIN
 SELECT RAISE(ABORT,'L’historique documentaire est immuable.');
END;
CREATE TRIGGER document_events_no_delete BEFORE DELETE ON document_events
BEGIN
 SELECT RAISE(ABORT,'L’historique documentaire est conservé.');
END;
`;
