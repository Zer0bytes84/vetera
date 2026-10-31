import { PATIENTS_WITH_REFERENCE_SQL } from "@/modules/patients/reference/reference";
import { authRepository } from "@/data/repositories";
import type { PatientDocument } from "@/modules/documents/document-domain";
import { getBrowserTable, isTauriRuntime, type BrowserTableName } from "@/services/browser-store";
import { normalizeInvoiceSettings, type InvoiceSettings } from "@/services/invoiceSettingsService";
import { runDbRead } from "@/services/sqlite/database";
import type { Appointment, ConsultationDocument, ConsultationSoap, Note, Owner, Patient, Prescription, PrescriptionItem, WeightEntry } from "@/types/db";
import { assemblePatientRecordSnapshot, validatePatientRecordOptions, type PatientRecordMedicalReminder, type PatientRecordRawData } from "./patient-record-data";
import type { PatientRecordOptions, PatientRecordSnapshot } from "./patient-record-types";

type Row = Record<string, unknown>;
export interface PatientRecordReadDatabase {
  select<T>(query: string, values?: unknown[]): Promise<T>;
  execute(query: string, values?: unknown[]): Promise<unknown>;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("L’export du dossier patient a été annulé.", "AbortError");
}
const text = (value: unknown): string => typeof value === "string" ? value : "";
const nullableText = (value: unknown): string | null => text(value) || null;
function parse<T>(value: unknown, fallback: T, label: string): T {
  if (value === null || value === undefined || value === "") return fallback;
  try { return typeof value === "string" ? JSON.parse(value) as T : value as T; }
  catch { throw new Error(`Les données locales de ${label} sont illisibles.`); }
}

// useSQLite closes its equivalent normalization over React/cache state. Keep
// this read adapter local rather than load that hook or its optimistic cache.
function camelRow(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase()), value]));
}
function dto<T>(row: Row, booleanFields: string[] = []): T {
  const result = camelRow(row);
  for (const field of booleanFields) if (result[field] === 0 || result[field] === 1) result[field] = result[field] === 1;
  return result as T;
}
function documentDto(input: Row): PatientDocument {
  const row = camelRow(input);
  // Native and browser document storage share these French column names.
  return {
    id: text(row.id), patientId: text(row.patientId), patientName: text(row.patientName),
    consultationId: nullableText(row.consultationId), soapId: nullableText(row.soapSourceId ?? row.soapId),
    sourceKey: nullableText(row.sourceKey), templateId: nullableText(row.templateId),
    templateSnapshot: parse(row.templateSnapshot, null, "ce modèle documentaire"),
    kind: (row.typeDocument ?? row.kind) as PatientDocument["kind"],
    title: text(row.titre ?? row.title), content: text(row.contenuGenere ?? row.content),
    status: (row.statut ?? row.status) as PatientDocument["status"],
    clinic: parse(row.clinicSnapshot ?? row.clinic, normalizeInvoiceSettings({}), "ce document"),
    values: parse(row.valuesSnapshot ?? row.values, {}, "ce document"),
    attachment: parse(row.attachmentJson ?? row.attachment, null, "cette pièce jointe"),
    pdfDataUrl: nullableText(row.pdfDataUrl), previousDocumentId: nullableText(row.previousDocumentId),
    cancellationReason: nullableText(row.motifAnnulation ?? row.cancellationReason),
    createdAt: text(row.createdAt), updatedAt: text(row.updatedAt), finalizedAt: nullableText(row.finalizedAt),
    createdBy: text(row.createdBy), authorName: text(row.authorName),
  };
}
function clinicDto(settings: Row[]): InvoiceSettings {
  const setting = (key: string) => text(settings.find((entry) => entry.key === key)?.value);
  const saved = parse<Partial<InvoiceSettings>>(setting("invoice_settings_v1"), {}, "la clinique");
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Les réglages de la clinique sont illisibles.");
  const normalized = normalizeInvoiceSettings(saved);
  return { ...normalized, name: normalized.name || setting("clinic_name") || setting("cabinet_name") || setting("practice_name") };
}

type Table = BrowserTableName | "medical_reminders" | "reminder_types";
const sourceLabels: Partial<Record<Table, string>> = { patients: "l’identité du patient", owners: "le propriétaire", appointments: "les consultations", users: "les auteurs", app_settings: "les réglages de la clinique", weight_entries: "les pesées", consultation_soaps: "les notes cliniques", prescriptions: "les prescriptions", prescription_items: "les médicaments prescrits", notes: "les notes du patient", documents: "les documents", medical_reminders: "les rappels médicaux", reminder_types: "les types de rappels", consultation_documents: "les pièces jointes" };
interface Reader {
  list(table: Table, filters?: Row): Promise<Row[]>;
}
async function readRecord(reader: Reader, patientId: string, options: PatientRecordOptions, requestedBy: string, signal?: AbortSignal): Promise<PatientRecordRawData> {
  const list = async (table: Table, filters: Row = {}): Promise<Row[]> => {
    checkAbort(signal);
    try {
      const rows = await reader.list(table, filters);
      if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("Format local invalide.");
      checkAbort(signal);
      return rows;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      if (table === "medical_reminders" || table === "reminder_types") throw new Error("Les rappels médicaux ne sont pas disponibles dans cet environnement. Leur lecture locale a échoué.");
      throw new Error(`Impossible de lire ${sourceLabels[table] || "une source sélectionnée du dossier patient"}. Réessayez après avoir actualisé le dossier.`);
    }
  };
  const patientRow = (await list("patients", { id: patientId }))[0];
  if (!patientRow) throw new Error("Ce patient n’existe plus. Actualisez le dossier.");
  const patient = dto<Patient>(patientRow, ["sterilized"]);
  // Relations are read by patient first, then checked again by the pure assembler.
  const ownerRows = patient.ownerId ? await list("owners", { id: patient.ownerId }) : [];
  const appointments = (await list("appointments", { patient_id: patientId })).map((row) => dto<Appointment>(row));
  const users = (await list("users")).map((row) => dto<{ id: string; displayName: string }>(row));
  const raw: PatientRecordRawData = { patient, owner: ownerRows[0] ? dto<Owner>(ownerRows[0]) : null, appointments, requestedBy, users, clinic: clinicDto(await list("app_settings")) };
  if (options.sections.identity) raw.weights = (await list("weight_entries", { patient_id: patientId })).map((row) => dto<WeightEntry>(row));
  if (options.sections.consultations || options.sections.documents) raw.soaps = (await list("consultation_soaps", { patient_id: patientId })).map((row) => dto<ConsultationSoap>(row));
  if (options.sections.consultations) {
    raw.prescriptions = (await list("prescriptions", { patient_id: patientId })).map((row) => dto<Prescription>(row));
    raw.prescriptionItems = [];
    for (const prescription of raw.prescriptions) {
      if (!appointments.some((visit) => visit.id === prescription.appointmentId && visit.patientId === patientId) || !["signed", "dispensed"].includes(prescription.status)) continue;
      raw.prescriptionItems.push(...(await list("prescription_items", { prescription_id: prescription.id })).map((row) => dto<PrescriptionItem>(row)));
    }
  }
  if (options.sections.documents || options.sections.notes) raw.notes = (await list("notes", { patient_id: patientId })).map((row) => dto<Note>(row, ["isFavorite"]));
  if (options.sections.documents || options.includeAttachments) raw.documents = (await list("documents", { patient_id: patientId })).filter((row) => {
    const normalized = camelRow(row);
    return (normalized.statut ?? normalized.status) === "finalise" && ((normalized.typeDocument ?? normalized.kind) === "import" ? options.includeAttachments : options.sections.documents);
  }).map(documentDto);
  if (options.sections.reminders) {
    raw.reminders = (await list("medical_reminders", { patient_id: patientId })).map((row) => dto<PatientRecordMedicalReminder>(row));
    raw.reminderTypes = (await list("reminder_types")).map((row) => ({ id: text(row.id), name: text(row.libelle) || text(row.name) }));
  }
  if (options.includeAttachments) raw.attachments = (await list("consultation_documents", { patient_id: patientId })).map((row) => dto<ConsultationDocument>(row));
  return raw;
}

const TABLES = new Set<Table>(["patients", "owners", "appointments", "users", "app_settings", "weight_entries", "consultation_soaps", "prescriptions", "prescription_items", "notes", "documents", "medical_reminders", "reminder_types", "consultation_documents"]);

/** One serialized read job and one SQLite snapshot; no clinical writes or caches. */
export async function readPatientRecordSnapshotData(db: PatientRecordReadDatabase, patientId: string, input: PatientRecordOptions, requestedBy: string, signal?: AbortSignal): Promise<PatientRecordRawData> {
  const options = validatePatientRecordOptions(input);
  checkAbort(signal);
  await db.execute("BEGIN DEFERRED TRANSACTION");
  try {
    const raw = await readRecord({
      async list(table, filters = {}) {
        const columns = Object.keys(filters);
        if (!TABLES.has(table) || columns.some((column) => !/^[a-z][a-z_]*$/.test(column))) throw new Error("La lecture du dossier patient est invalide.");
        // A patient is read with its reference, kept in its own table.
        const source = table === "patients" ? PATIENTS_WITH_REFERENCE_SQL : `SELECT ${table === "users" ? "id, display_name" : "*"} FROM ${table}`;
        return db.select<Row[]>(`${source}${columns.length ? ` WHERE ${columns.map((column) => `${table}.${column} = ?`).join(" AND ")}` : ""}`, Object.values(filters));
      },
    }, patientId, options, requestedBy, signal);
    checkAbort(signal);
    await db.execute("COMMIT");
    return raw;
  } catch (error) {
    try { await db.execute("ROLLBACK"); } catch { /* Keep the source error. */ }
    throw error;
  }
}

async function browserSnapshotData(patientId: string, options: PatientRecordOptions, requestedBy: string, signal?: AbortSignal): Promise<PatientRecordRawData> {
  if (options.sections.reminders) throw new Error("Les rappels médicaux ne sont pas disponibles dans le navigateur. Désélectionnez cette section pour exporter les sources locales disponibles.");
  // Capture supported browser tables synchronously before the first await.
  const tables = new Map<Table, Row[]>();
  const requiredTables: BrowserTableName[] = ["patients", "owners", "appointments", "users", "app_settings"];
  if (options.sections.identity) requiredTables.push("weight_entries");
  if (options.sections.consultations || options.sections.documents) requiredTables.push("consultation_soaps");
  if (options.sections.consultations) requiredTables.push("prescriptions", "prescription_items");
  if (options.sections.documents || options.sections.notes) requiredTables.push("notes");
  if (options.sections.documents || options.includeAttachments) requiredTables.push("documents");
  if (options.includeAttachments) requiredTables.push("consultation_documents");
  for (const table of requiredTables) {
    checkAbort(signal);
    const rows = getBrowserTable(table);
    if (!Array.isArray(rows)) throw new Error(`Impossible de lire ${sourceLabels[table] || "une source locale"}.`);
    tables.set(table, rows as Row[]);
  }
  return readRecord({
    async list(table, filters = {}) {
      const rows = tables.get(table);
      if (!rows) throw new Error("Cette source locale est indisponible.");
      return rows.filter((row) => {
        const normalized = camelRow(row);
        return Object.entries(filters).every(([key, value]) => normalized[key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())] === value);
      });
    },
  }, patientId, options, requestedBy, signal);
}

export async function loadPatientRecord(patientId: string, input: PatientRecordOptions, { signal }: { signal?: AbortSignal } = {}): Promise<PatientRecordSnapshot> {
  const options = validatePatientRecordOptions(input);
  if (!patientId.trim()) throw new Error("Choisissez un patient pour exporter son dossier.");
  checkAbort(signal);
  const user = await authRepository.getCurrentUser();
  if (!user?.id) throw new Error("Connectez-vous pour exporter le dossier patient.");
  checkAbort(signal);
  const raw = isTauriRuntime()
    ? await runDbRead((db) => readPatientRecordSnapshotData(db, patientId, options, user.id, signal))
    : await browserSnapshotData(patientId, options, user.id, signal);
  checkAbort(signal);
  // Outside runDbRead: authentication uses that same serial queue itself.
  const currentUser = await authRepository.getCurrentUser();
  if (!currentUser?.id || currentUser.id !== user.id) throw new Error("La session a changé ou expiré. Reconnectez-vous pour exporter le dossier.");
  checkAbort(signal);
  return assemblePatientRecordSnapshot(raw, options, new Date());
}
