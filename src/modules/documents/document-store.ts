import type { CarePersistence } from "@/modules/care-tasks/store";
import { isSoapReviewed, soapSourceKey } from "@/modules/consultations/local-ai/soap-review";
import { DEFAULT_INVOICE_SETTINGS, normalizeInvoiceSettings, type InvoiceSettings } from "@/services/invoiceSettingsService";
import type { BrowserRow, BrowserTableName } from "@/services/browser-store";
import {
  CERTIFICATE_TYPES, DOCUMENT_TYPES,
  type DocumentAttachment, type DocumentEvent, type DocumentPreparation,
  type ManagedDocumentTemplate, type PatientDocument, type PrepareDocumentOptions,
} from "./document-domain";
import { MANAGED_DOCUMENT_DEFAULTS } from "./document-migration";
import { DOCUMENT_MISSING_VALUE, renderDocumentVariables, validateDocumentTemplate } from "./document-variables";
import { PATIENTS_WITH_REFERENCE_SQL } from "@/modules/patients/reference/reference";

export type DocumentRow = Record<string, unknown>;
const TABLES = ["users", "sessions", "patients", "owners", "appointments", "consultation_soaps", "prescriptions", "prescription_items", "notes", "app_settings", "document_templates", "documents", "document_events", "document_versions"] as const;
export type DocumentTable = (typeof TABLES)[number];
export interface DocumentDatabase {
  list(table: DocumentTable, filters?: DocumentRow): Promise<DocumentRow[]>;
  insert(table: DocumentTable, row: DocumentRow): Promise<void>;
  update(table: DocumentTable, id: string, row: DocumentRow): Promise<void>;
  remove(table: DocumentTable, id: string): Promise<void>;
}
export interface DocumentPersistence {
  read<T>(operation: (db: DocumentDatabase) => Promise<T>): Promise<T>;
  transaction<T>(operation: (db: DocumentDatabase) => Promise<T>): Promise<T>;
}

/** Only module-owned identifiers are interpolated; every data value is bound. */
export function sqliteDocumentPersistence(persistence: CarePersistence): DocumentPersistence {
  const adapt = (db: Parameters<Parameters<CarePersistence["read"]>[0]>[0]): DocumentDatabase => {
    const check = (table: string, columns: string[]) => {
      if (!(TABLES as readonly string[]).includes(table) || columns.some((column) => !/^[a-z][a-z_]*$/.test(column))) throw new Error("Requête documentaire invalide.");
    };
    return {
      async list(table, filters = {}) {
        const keys = Object.keys(filters);
        check(table, keys);
        // A patient is read with its reference, kept in its own table.
        const source = table === "patients" ? PATIENTS_WITH_REFERENCE_SQL : `SELECT * FROM ${table}`;
        return db.select<DocumentRow[]>(`${source}${keys.length ? ` WHERE ${keys.map((key) => `${table}.${key} = ?`).join(" AND ")}` : ""}`, Object.values(filters));
      },
      async insert(table, row) {
        const keys = Object.keys(row);
        check(table, keys);
        await db.execute(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`, Object.values(row));
      },
      async update(table, id, row) {
        const keys = Object.keys(row);
        check(table, keys);
        const result = await db.execute(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(",")} WHERE id = ?`, [...Object.values(row), id]);
        if (result.rowsAffected === 0) throw new Error("Cet élément n’existe plus. Actualisez la vue.");
      },
      async remove(table, id) {
        check(table, []);
        await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      },
    };
  };
  return {
    read: (operation) => persistence.read((db) => operation(adapt(db))),
    transaction: (operation) => persistence.transaction((db) => operation(adapt(db))),
  };
}

const snake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const camel = (key: string) => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
export function browserDocumentDatabase(tables: Record<BrowserTableName, BrowserRow[]>): DocumentDatabase {
  const normalize = (row: BrowserRow) => Object.fromEntries(Object.entries(row).map(([key, value]) => [snake(key), value]));
  const toBrowser = (row: DocumentRow) => Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value]));
  return {
    async list(table, filters = {}) {
      return tables[table].map(normalize).filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value));
    },
    async insert(table, row) {
      if (row.id && tables[table].some((entry) => entry.id === row.id)) throw new Error("Cet élément existe déjà.");
      tables[table].push(toBrowser(row));
    },
    async update(table, id, row) {
      const index = tables[table].findIndex((entry) => entry.id === id);
      if (index < 0) throw new Error("Cet élément n’existe plus. Actualisez la vue.");
      tables[table][index] = { ...tables[table][index], ...toBrowser(row) };
    },
    async remove(table, id) { tables[table] = tables[table].filter((row) => row.id !== id); },
  };
}

const text = (value: unknown) => typeof value === "string" ? value : "";
const nullableText = (value: unknown) => typeof value === "string" && value ? value : null;
const parse = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try { return JSON.parse(value) as T; } catch { throw new Error("Un document local est illisible. Restaurez sa sauvegarde."); }
};
const numberText = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? String(value).replace(".", ",") : DOCUMENT_MISSING_VALUE;
const dateText = (value: unknown) => {
  if (!text(value)) return "";
  const raw = text(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("fr-FR") : "";
};

function templateFromRow(row: DocumentRow, usageCount = 0): ManagedDocumentTemplate {
  const kind = text(row.type_document) || text(row.kind);
  if (!Object.hasOwn(DOCUMENT_TYPES, kind)) throw new Error("Le type de ce modèle est inconnu.");
  return {
    id: text(row.id), name: text(row.nom) || text(row.name),
    kind: kind as ManagedDocumentTemplate["kind"], body: text(row.corps_modele) || text(row.body),
    active: row.actif !== 0 && row.actif !== false,
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
    createdBy: nullableText(row.created_by), usageCount,
  };
}
function documentFromRow(row: DocumentRow): PatientDocument {
  return {
    id: text(row.id), patientId: text(row.patient_id), patientName: text(row.patient_name),
    consultationId: nullableText(row.consultation_id), soapId: nullableText(row.soap_source_id),
    sourceKey: nullableText(row.source_key), templateId: nullableText(row.template_id),
    templateSnapshot: parse(row.template_snapshot, null), kind: row.type_document as PatientDocument["kind"],
    title: text(row.titre), content: text(row.contenu_genere), status: row.statut as PatientDocument["status"],
    clinic: parse(row.clinic_snapshot, DEFAULT_INVOICE_SETTINGS), values: parse(row.values_snapshot, {}),
    attachment: parse(row.attachment_json, null), pdfDataUrl: nullableText(row.pdf_data_url),
    previousDocumentId: nullableText(row.previous_document_id), cancellationReason: nullableText(row.motif_annulation),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at), finalizedAt: nullableText(row.finalized_at),
    createdBy: text(row.created_by), authorName: text(row.author_name),
  };
}
function documentToRow(document: PatientDocument): DocumentRow {
  return {
    id: document.id, patient_id: document.patientId, patient_name: document.patientName,
    consultation_id: document.consultationId, soap_source_id: document.soapId, source_key: document.sourceKey,
    template_id: document.templateId, template_snapshot: document.templateSnapshot ? JSON.stringify(document.templateSnapshot) : null,
    type_document: document.kind, titre: document.title, contenu_genere: document.content, statut: document.status,
    motif_annulation: document.cancellationReason, fichier_importe_path: document.attachment?.name ?? null,
    attachment_json: document.attachment ? JSON.stringify(document.attachment) : null,
    clinic_snapshot: JSON.stringify(document.clinic), values_snapshot: JSON.stringify(document.values),
    pdf_data_url: document.pdfDataUrl, previous_document_id: document.previousDocumentId,
    created_at: document.createdAt, updated_at: document.updatedAt, finalized_at: document.finalizedAt,
    created_by: document.createdBy, author_name: document.authorName,
  };
}

export interface SaveDocumentTemplateInput {
  id?: string; name: string; kind: ManagedDocumentTemplate["kind"]; body: string;
  active: boolean; expectedUpdatedAt?: string;
}
export function createDocumentStore(
  persistence: DocumentPersistence,
  id: () => string,
  clock: () => Date = () => new Date(),
  options: { sessionToken?: () => string | null } = {},
) {
  const now = (previous?: string) => new Date(Math.max(clock().getTime(), previous ? new Date(previous).getTime() + 1 : 0)).toISOString();
  async function actor(db: DocumentDatabase, authorId?: string): Promise<DocumentRow | null> {
    let currentId = authorId;
    if (options.sessionToken) {
      const token = options.sessionToken();
      const session = token ? (await db.list("sessions", { token }))[0] : undefined;
      const expiry = new Date(text(session?.expires_at)).getTime();
      if (!session || !Number.isFinite(expiry) || expiry <= clock().getTime()) throw new Error("Connectez-vous pour accéder aux documents.");
      currentId = text(session.user_id);
      if (authorId && authorId !== currentId) throw new Error("L’auteur doit être l’utilisateur connecté.");
    }
    if (!currentId) {
      if (authorId !== undefined) throw new Error("Un utilisateur connecté est requis.");
      return null;
    }
    const user = (await db.list("users", { id: currentId }))[0];
    if (!user || user.status === "inactive") throw new Error("Un utilisateur actif est requis.");
    return user;
  }
  async function administrator(db: DocumentDatabase, authorId: string) {
    const user = await actor(db, authorId);
    if (user?.role !== "admin") throw new Error("Seul un administrateur peut gérer les modèles.");
    return user;
  }
  async function ensureTemplates(db: DocumentDatabase) {
    if ((await db.list("app_settings", { key: "managed_document_templates_seeded" })).length) return;
    const existing = new Set((await db.list("document_templates")).map((row) => row.id));
    for (const template of MANAGED_DOCUMENT_DEFAULTS) {
      if (existing.has(template.id)) continue;
      await db.insert("document_templates", {
        id: template.id, kind: template.kind === "referral" ? "report" : template.kind,
        name: template.name, body: template.body, nom: template.name, type_document: template.kind,
        corps_modele: template.body, actif: 1, created_by: null,
        created_at: template.createdAt, updated_at: template.updatedAt,
      });
    }
    await db.insert("app_settings", { key: "managed_document_templates_seeded", value: "1" });
  }
  async function templates(db: DocumentDatabase) {
    const documents = await db.list("documents");
    const historical = await legacyTemplateUsage(db);
    return (await db.list("document_templates")).map((row) => templateFromRow(row, documents.filter((document) => document.template_id === row.id).length + (historical.get(text(row.id)) ?? 0)));
  }
  async function legacyTemplateUsage(db: DocumentDatabase) {
    const counts = new Map<string, number>();
    for (const note of await db.list("notes")) {
      try {
        const tags = typeof note.tags === "string" ? JSON.parse(note.tags) : note.tags;
        const templateId = tags?.clinicalDocument?.source?.template?.id;
        if (typeof templateId === "string") counts.set(templateId, (counts.get(templateId) ?? 0) + 1);
      } catch { /* Ordinary note tags need not be documentary metadata. */ }
    }
    return counts;
  }
  async function get(db: DocumentDatabase, documentId: string) {
    const row = (await db.list("documents", { id: documentId }))[0];
    if (!row) throw new Error("Ce document n’existe plus.");
    return documentFromRow(row);
  }
  async function clinic(db: DocumentDatabase): Promise<InvoiceSettings> {
    const settings = await db.list("app_settings");
    const value = (key: string) => text(settings.find((row) => row.key === key)?.value);
    const saved = parse<Partial<InvoiceSettings>>(value("invoice_settings_v1"), {});
    const normalized = normalizeInvoiceSettings(saved);
    return { ...normalized, name: normalized.name || value("clinic_name") || value("cabinet_name") || value("practice_name") || "" };
  }
  async function clinicalSource(db: DocumentDatabase, consultationId: string, patientId: string) {
    const patient = (await db.list("patients", { id: patientId }))[0];
    const consultation = (await db.list("appointments", { id: consultationId }))[0];
    const soap = (await db.list("consultation_soaps", { appointment_id: consultationId }))[0];
    if (!patient || !consultation || consultation.patient_id !== patientId || !soap || soap.patient_id !== patientId) throw new Error("Choisissez une consultation et une note de ce patient.");
    if (["cancelled", "no_show"].includes(text(consultation.status))) throw new Error("Cette consultation ne peut pas produire un document.");
    const note = {
      subjective: text(soap.subjective), objective: text(soap.objective), assessment: text(soap.assessment),
      plan: text(soap.plan), content: text(soap.content), aiDraft: nullableText(soap.ai_draft),
    };
    if (!isSoapReviewed(note)) throw new Error("Validez la note clinique avant de générer un document.");
    return { patient, consultation, soap, note, sourceKey: soapSourceKey(note) };
  }
  async function medicines(db: DocumentDatabase, consultationId: string, patientId: string): Promise<string> {
    const prescriptions = (await db.list("prescriptions", { appointment_id: consultationId, patient_id: patientId }))
      .filter((row) => row.status === "signed" || row.status === "dispensed")
      .sort((a, b) => text(a.prescription_date).localeCompare(text(b.prescription_date)) || text(a.id).localeCompare(text(b.id)));
    const result: string[] = [];
    for (const prescription of prescriptions) {
      const items = (await db.list("prescription_items", { prescription_id: prescription.id })).sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || text(a.id).localeCompare(text(b.id)));
      if (!items.length) continue;
      result.push(`Prescription du ${dateText(prescription.prescription_date) || DOCUMENT_MISSING_VALUE}${prescription.weight_kg != null ? ` · Poids de référence : ${numberText(prescription.weight_kg)} kg` : ""}`);
      for (const item of items) {
        const present = (value: unknown) => text(value).trim() || DOCUMENT_MISSING_VALUE;
        const lines = [present(item.medication_name)];
        if (item.dosage_per_kg != null) lines.push(`Posologie consignée : ${numberText(item.dosage_per_kg)} ${present(item.dosage_unit)}`);
        if (item.computed_dose_mg != null) lines.push(`Dose calculée enregistrée : ${numberText(item.computed_dose_mg)} mg`);
        if (item.computed_volume_ml != null) lines.push(`Volume calculé enregistré : ${numberText(item.computed_volume_ml)} mL`);
        lines.push(`Fréquence : ${present(item.frequency)}`, `Durée : ${present(item.duration)}`, `Voie : ${present(item.route)}`);
        if (text(item.quantity)) lines.push(`Quantité : ${text(item.quantity)}`);
        if (text(item.instructions)) lines.push(`Instructions : ${text(item.instructions)}`);
        if (text(item.warnings)) lines.push(`Précautions : ${text(item.warnings)}`);
        result.push(lines.join("\n"));
      }
      if (text(prescription.general_instructions)) result.push(text(prescription.general_instructions));
    }
    return result.join("\n\n");
  }
  async function record(db: DocumentDatabase, document: PatientDocument, action: string, user: DocumentRow, reason: string | null = null) {
    await db.insert("document_events", { id: id(), document_id: document.id, action, author_id: user.id, author_name: text(user.display_name), created_at: document.updatedAt, reason });
  }
  const assertText = (title: string, content: string) => {
    if (!title.trim() || title.trim().length > 160 || !content.trim() || content.length > 60000) throw new Error("Indiquez un titre et un contenu de moins de 60 000 caractères.");
  };
  const assertCurrent = (document: PatientDocument, expected: string) => {
    if (!expected || expected !== document.updatedAt) throw new Error("Ce document vient d’être modifié. Actualisez l’aperçu.");
  };
  async function assertSource(db: DocumentDatabase, document: PatientDocument) {
    if (document.previousDocumentId) {
      const previous = await get(db, document.previousDocumentId);
      if (!previous.finalizedAt || previous.patientId !== document.patientId || previous.consultationId !== document.consultationId || previous.soapId !== document.soapId || previous.sourceKey !== document.sourceKey) throw new Error("La source de cette nouvelle version est incohérente.");
      return;
    }
    const source = await clinicalSource(db, document.consultationId!, document.patientId);
    if (source.soap.id !== document.soapId || source.sourceKey !== document.sourceKey) throw new Error("La note a changé. Préparez un nouveau document depuis sa version validée.");
  }

  return {
    async listTemplates(): Promise<ManagedDocumentTemplate[]> {
      return persistence.transaction(async (db) => {
        await actor(db);
        await ensureTemplates(db);
        return (await templates(db)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
      });
    },
    async saveTemplate(input: SaveDocumentTemplateInput, authorId: string): Promise<string> {
      if (!input.name.trim() || input.name.trim().length > 100 || !Object.hasOwn(DOCUMENT_TYPES, input.kind)) throw new Error("Nommez le modèle et choisissez son type.");
      validateDocumentTemplate(input.body);
      return persistence.transaction(async (db) => {
        await administrator(db, authorId);
        await ensureTemplates(db);
        const existing = input.id ? (await db.list("document_templates", { id: input.id }))[0] : null;
        if (input.id && !existing) throw new Error("Ce modèle n’existe plus.");
        if (existing && input.expectedUpdatedAt && existing.updated_at !== input.expectedUpdatedAt) throw new Error("Ce modèle vient d’être modifié. Actualisez la liste.");
        const templateId = input.id || id();
        const updatedAt = now(text(existing?.updated_at));
        const row = {
          kind: input.kind === "referral" ? "report" : input.kind, type_document: input.kind,
          name: input.name.trim(), nom: input.name.trim(), body: input.body, corps_modele: input.body,
          actif: input.active ? 1 : 0, updated_at: updatedAt,
        };
        if (existing) await db.update("document_templates", templateId, row);
        else await db.insert("document_templates", { id: templateId, ...row, created_at: updatedAt, created_by: authorId });
        return templateId;
      });
    },
    async deleteTemplate(templateId: string, authorId: string): Promise<void> {
      await persistence.transaction(async (db) => {
        await administrator(db, authorId);
        if ((await db.list("documents", { template_id: templateId })).length || (await legacyTemplateUsage(db)).has(templateId)) throw new Error("Ce modèle a déjà été utilisé. Désactivez-le pour conserver la traçabilité.");
        if (!(await db.list("document_templates", { id: templateId })).length) throw new Error("Ce modèle n’existe plus.");
        await db.remove("document_templates", templateId);
      });
    },
    async prepare(consultationId: string, patientId: string, templateId: string, authorId: string, prepareOptions: PrepareDocumentOptions = {}): Promise<DocumentPreparation> {
      if ((prepareOptions.recipient?.length ?? 0) > 1500 || (prepareOptions.referralReason?.length ?? 0) > 3000) throw new Error("Limitez le destinataire à 1 500 caractères et le motif à 3 000 caractères.");
      return persistence.transaction(async (db) => {
        await actor(db, authorId);
        await ensureTemplates(db);
        const template = (await templates(db)).find((entry) => entry.id === templateId && entry.active);
        if (!template) throw new Error("Choisissez un modèle actif.");
        if (prepareOptions.certificateType && !(CERTIFICATE_TYPES as readonly string[]).includes(prepareOptions.certificateType)) throw new Error("Choisissez un objet de certificat proposé.");
        const { patient, consultation, soap, note, sourceKey } = await clinicalSource(db, consultationId, patientId);
        const owner = (await db.list("owners", { id: patient.owner_id }))[0];
        const vet = (await db.list("users", { id: consultation.vet_id }))[0];
        const settings = await clinic(db);
        const ownerName = owner ? `${text(owner.first_name)} ${text(owner.last_name)}`.trim() : "";
        const vetName = text(vet?.display_name);
        const values: Record<string, string> = {
          "patient.nom": text(patient.name), "patient.reference": text(patient.reference), "patient.espece": text(patient.species), "patient.race": text(patient.breed),
          "patient.sexe": patient.sex === "M" ? "Mâle" : patient.sex === "F" ? "Femelle" : "",
          "patient.naissance": dateText(patient.date_of_birth), "patient.identification": text(patient.chip_number) || text(patient.tattoo_number),
          "client.nom": ownerName, "proprietaire.nom": ownerName, "client.telephone": text(owner?.phone), "client.email": text(owner?.email),
          "client.adresse": [text(owner?.address), text(owner?.city)].filter(Boolean).join(", "),
          "consultation.date": dateText(consultation.start_time), "clinicien.nom": vetName, "veterinaire.nom": vetName,
          "clinique.nom": settings.name, "clinique.adresse": settings.address, "clinique.telephone": settings.phone,
          "clinique.email": settings.email, "clinique.mentions_legales": settings.footer,
          "soap.s": note.subjective, "soap.motif": note.subjective, "soap.o": note.objective, "soap.examen": note.objective,
          "soap.a": note.assessment, "soap.diagnostic": note.assessment, "soap.p": note.plan, "soap.plan": note.plan,
          "prescription.medicaments": await medicines(db, consultationId, patientId),
          "certificat.type": prepareOptions.certificateType?.trim() ?? "",
          "reference.destinataire": prepareOptions.recipient?.trim() ?? "",
          "reference.motif": prepareOptions.referralReason?.trim() ?? "",
        };
        let content = renderDocumentVariables(template.body, values);
        if (template.kind === "certificate" && !template.body.includes("{{certificat.type}}")) content += `\n\nObjet du certificat : ${values["certificat.type"] || DOCUMENT_MISSING_VALUE}`;
        if (template.kind === "prescription" && values["prescription.medicaments"] && !template.body.includes("{{prescription.medicaments}}")) content += `\n\nMédicaments validés\n${values["prescription.medicaments"]}`;
        return {
          patientId, patientName: text(patient.name), consultationId, soapId: text(soap.id), sourceKey,
          template, clinic: settings, values,
          title: `${DOCUMENT_TYPES[template.kind]} · ${text(patient.name)} · ${dateText(consultation.start_time)}`,
          content,
        };
      });
    },
    async createDraft(preparation: DocumentPreparation, draft: { title: string; content: string }, authorId: string, reviewed: boolean): Promise<PatientDocument> {
      if (!reviewed) throw new Error("Relisez le document et confirmez sa création.");
      assertText(draft.title, draft.content);
      return persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        const source = await clinicalSource(db, preparation.consultationId, preparation.patientId);
        const currentTemplate = (await templates(db)).find((entry) => entry.id === preparation.template.id && entry.active);
        if (!currentTemplate || currentTemplate.updatedAt !== preparation.template.updatedAt || currentTemplate.body !== preparation.template.body || currentTemplate.kind !== preparation.template.kind) throw new Error("Le modèle a changé. Préparez à nouveau le document.");
        if (source.soap.id !== preparation.soapId || source.sourceKey !== preparation.sourceKey) throw new Error("La note a changé. Préparez à nouveau le document.");
        if (preparation.values["prescription.medicaments"] !== await medicines(db, preparation.consultationId, preparation.patientId)) throw new Error("Une prescription a changé. Préparez à nouveau le document.");
        const timestamp = now();
        const document: PatientDocument = {
          id: id(), patientId: preparation.patientId, patientName: text(source.patient.name),
          consultationId: preparation.consultationId, soapId: preparation.soapId, sourceKey: preparation.sourceKey,
          templateId: currentTemplate.id, templateSnapshot: { ...currentTemplate }, kind: currentTemplate.kind,
          title: draft.title.trim(), content: draft.content, status: "brouillon", clinic: normalizeInvoiceSettings(preparation.clinic),
          values: { ...preparation.values }, attachment: null, pdfDataUrl: null, previousDocumentId: null, cancellationReason: null,
          createdAt: timestamp, updatedAt: timestamp, finalizedAt: null, createdBy: authorId, authorName: text(user.display_name),
        };
        await db.insert("documents", documentToRow(document));
        await record(db, document, "creation", user);
        return document;
      });
    },
    async list(patientId?: string): Promise<PatientDocument[]> {
      return persistence.read(async (db) => {
        await actor(db);
        return (await db.list("documents", patientId ? { patient_id: patientId } : {})).map(documentFromRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
      });
    },
    async get(documentId: string): Promise<PatientDocument> {
      return persistence.read(async (db) => { await actor(db); return get(db, documentId); });
    },
    async updateDraft(documentId: string, draft: { title: string; content: string }, authorId: string, expectedUpdatedAt: string): Promise<PatientDocument> {
      assertText(draft.title, draft.content);
      return persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        const document = await get(db, documentId);
        if (document.status !== "brouillon") throw new Error("Ce document est verrouillé. Créez une nouvelle version.");
        assertCurrent(document, expectedUpdatedAt);
        const next = { ...document, title: draft.title.trim(), content: draft.content, updatedAt: now(document.updatedAt) };
        await db.update("documents", documentId, { titre: next.title, contenu_genere: next.content, updated_at: next.updatedAt });
        await record(db, next, "modification", user);
        return next;
      });
    },
    async finalize(documentId: string, authorId: string, pdfDataUrl: string, reviewed: boolean, expectedUpdatedAt: string): Promise<PatientDocument> {
      if (!reviewed) throw new Error("Relisez l’aperçu avant de finaliser le document.");
      if (!/^data:application\/pdf(?:;filename=[^;,]+)?;base64,JVBERi0[a-zA-Z0-9+/=\r\n]*$/.test(pdfDataUrl) || pdfDataUrl.length > 32_000_000) throw new Error("L’aperçu PDF est invalide. Générez-le à nouveau.");
      return persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        if (!["admin", "vet_principal", "vet_adjoint"].includes(text(user.role))) throw new Error("La finalisation doit être validée par un vétérinaire.");
        const document = await get(db, documentId);
        if (document.status !== "brouillon" || document.kind === "import") throw new Error("Seul un document en brouillon peut être finalisé.");
        assertCurrent(document, expectedUpdatedAt);
        await assertSource(db, document);
        const timestamp = now(document.updatedAt);
        const next: PatientDocument = { ...document, status: "finalise", pdfDataUrl, updatedAt: timestamp, finalizedAt: timestamp };
        await db.update("documents", documentId, { statut: "finalise", pdf_data_url: pdfDataUrl, updated_at: timestamp, finalized_at: timestamp });
        await db.insert("document_versions", { id: id(), document_id: documentId, contenu: document.content, version_numero: 1, created_at: timestamp, created_by: authorId });
        await record(db, next, "finalisation", user);
        return next;
      });
    },
    async cancel(documentId: string, reason: string, authorId: string): Promise<void> {
      if (!reason.trim() || reason.trim().length > 2000) throw new Error("Indiquez le motif de l’annulation (2 000 caractères maximum).");
      await persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        const document = await get(db, documentId);
        if (document.status === "annule") throw new Error("Ce document est déjà annulé.");
        const timestamp = now(document.updatedAt);
        await db.update("documents", documentId, { statut: "annule", motif_annulation: reason.trim(), updated_at: timestamp });
        await record(db, { ...document, updatedAt: timestamp }, "annulation", user, reason.trim());
      });
    },
    async newVersion(documentId: string, authorId: string): Promise<PatientDocument> {
      return persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        const previous = await get(db, documentId);
        if (previous.status !== "finalise" || previous.kind === "import") throw new Error("Créez une nouvelle version depuis un document finalisé.");
        const timestamp = now();
        const next: PatientDocument = { ...previous, id: id(), status: "brouillon", previousDocumentId: previous.id, pdfDataUrl: null, cancellationReason: null, createdAt: timestamp, updatedAt: timestamp, finalizedAt: null, createdBy: authorId, authorName: text(user.display_name) };
        await db.insert("documents", documentToRow(next));
        await record(db, next, "nouvelle_version", user, `Correction du document ${previous.title}`);
        return next;
      });
    },
    async importAttachment(patientId: string, attachment: DocumentAttachment, authorId: string): Promise<PatientDocument> {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(attachment.mimeType) || !attachment.name.trim() || attachment.name.length > 200 || attachment.size <= 0 || attachment.size > 12 * 1024 * 1024) throw new Error("Choisissez un PDF, JPG ou PNG de moins de 12 Mo.");
      if (!attachment.dataUrl.startsWith(`data:${attachment.mimeType};base64,`) || attachment.dataUrl.length > 17_000_000 || !["extractible", "scan", "image"].includes(attachment.textState) || attachment.pages.length > 20 || attachment.pages.some((page) => !Number.isInteger(page.page) || page.page < 1 || typeof page.text !== "string") || attachment.pages.reduce((length, page) => length + page.text.length, 0) > 60000) throw new Error("Cette pièce ne peut pas être importée. Vérifiez son format et sa taille.");
      return persistence.transaction(async (db) => {
        const user = (await actor(db, authorId))!;
        const patient = (await db.list("patients", { id: patientId }))[0];
        if (!patient) throw new Error("Ce patient n’existe plus.");
        const timestamp = now();
        const document: PatientDocument = {
          id: id(), patientId, patientName: text(patient.name), consultationId: null, soapId: null, sourceKey: null,
          templateId: null, templateSnapshot: null, kind: "import", title: attachment.name,
          content: attachment.textState === "extractible" ? attachment.pages.map((page) => page.text).join("\n\n") : "",
          status: "finalise", clinic: await clinic(db), values: {}, attachment: { ...attachment },
          pdfDataUrl: attachment.mimeType === "application/pdf" ? attachment.dataUrl : null,
          previousDocumentId: null, cancellationReason: null, createdAt: timestamp, updatedAt: timestamp, finalizedAt: timestamp,
          createdBy: authorId, authorName: text(user.display_name),
        };
        await db.insert("documents", documentToRow(document));
        await record(db, document, "import", user);
        return document;
      });
    },
    async history(documentId: string): Promise<DocumentEvent[]> {
      return persistence.read(async (db) => {
        await actor(db);
        await get(db, documentId);
        return (await db.list("document_events", { document_id: documentId })).map((row) => ({
          id: text(row.id), documentId: text(row.document_id), action: text(row.action), authorId: text(row.author_id), authorName: text(row.author_name), createdAt: text(row.created_at), reason: nullableText(row.reason),
        })).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      });
    },
  };
}
