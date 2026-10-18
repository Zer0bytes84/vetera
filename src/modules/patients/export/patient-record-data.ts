import { isSoapReviewed } from "@/modules/consultations/local-ai/soap-review";
import { DOCUMENT_TYPES, documentLocalDay, type PatientDocument } from "@/modules/documents/document-domain";
import { assertDateOnly } from "@/modules/patient-reminders/domain";
import type { InvoiceSettings } from "@/services/invoiceSettingsService";
import type { Appointment, ConsultationDocument, ConsultationSoap, Note, Owner, Patient, Prescription, PrescriptionItem, User, WeightEntry } from "@/types/db";
import type { PatientRecordBlock, PatientRecordOptions, PatientRecordSection, PatientRecordSnapshot, PatientRecordSource } from "./patient-record-types";

/** Storage DTOs only. No React hooks, model output or derived medicine doses. */
export interface PatientRecordMedicalReminder {
  id: string; patientId: string; type: string; echeance: string;
  statut: "en_cours" | "termine" | "annule";
  createdAt: string; completedAt?: string | null; note?: string | null;
  intervalleMois?: number;
}
export interface PatientRecordRawData {
  patient: Patient;
  owner?: Owner | null;
  requestedBy: string;
  clinic: InvoiceSettings;
  users?: Pick<User, "id" | "displayName">[];
  weights?: WeightEntry[];
  appointments?: Appointment[];
  soaps?: ConsultationSoap[];
  prescriptions?: Prescription[];
  prescriptionItems?: PrescriptionItem[];
  documents?: PatientDocument[];
  notes?: Note[];
  reminders?: PatientRecordMedicalReminder[];
  reminderTypes?: { id: string; name: string }[];
  attachments?: ConsultationDocument[];
}

function validDay(value: string): boolean {
  try { assertDateOnly(value); return true; } catch { return false; }
}
function validatePeriod(period: PatientRecordOptions["period"]): void {
  if (period === null) return;
  if (!period || !validDay(period.from) || !validDay(period.to)) throw new Error("Indiquez deux dates civiles valides pour la période.");
  if (period.from > period.to) throw new Error("La date de début doit précéder ou égaler la date de fin.");
}

/** Validate before any storage reads, and detach options from the dialog state. */
export function validatePatientRecordOptions(options: PatientRecordOptions): PatientRecordOptions {
  const keys = ["identity", "consultations", "documents", "reminders", "notes"] as const;
  if (!options || !options.sections || keys.some((key) => typeof options.sections[key] !== "boolean") || typeof options.includeAttachments !== "boolean") throw new Error("Les options du dossier patient sont invalides.");
  validatePeriod(options.period);
  if (!options.includeAttachments && !keys.some((key) => options.sections[key])) throw new Error("Choisissez au moins une section ou les annexes.");
  return { period: options.period ? { ...options.period } : null, sections: { ...options.sections }, includeAttachments: options.includeAttachments };
}

export function patientRecordFilename(patientName: string, exportDay: string, period: PatientRecordOptions["period"]): string {
  if (!validDay(exportDay)) throw new Error("La date d’export est invalide.");
  validatePeriod(period);
  const name = patientName.normalize("NFC").replace(/[<>:"/\\|?*]/g, "").replace(/\p{Cc}/gu, "").trim().replace(/\s+/gu, "_").replace(/[.]+$/g, "") || "Patient";
  return `Dossier_${name}_${period ? `${period.from}_${period.to}` : exportDay}.pdf`;
}

const latinEntities = "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ");
const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", euro: "€", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", oelig: "œ", OElig: "Œ", trade: "™" };
latinEntities.forEach((name, index) => { entities[name] = String.fromCodePoint(160 + index); });

/** Inert conversion: no DOM insertion, scripts, image fetches or remote resources. */
export function patientRecordPlainText(html: string): string {
  return html
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style|template|iframe|object|svg|math)\b[^>]*>[^]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-z][a-z\d:-]*)(?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?\s*\/?>/gi, (tag, name: string) => {
      if (/^(br|hr)$/i.test(name)) return "\n";
      if (/^(p|div|li|ul|ol|h[1-6]|blockquote|pre|tr|table|section|article)$/i.test(name)) return "\n";
      if (/^(td|th)$/i.test(name) && tag.startsWith("</")) return "\t";
      return "";
    })
    .replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (entity, name: string) => {
      if (!name.startsWith("#")) return entities[name] ?? entity;
      const code = name[1].toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
    })
    .replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const present = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const numberText = (value: number | undefined) => typeof value === "number" && Number.isFinite(value) ? String(value).replace(".", ",") : "";
function day(value: string): string {
  const result = documentLocalDay(value);
  if (!validDay(result)) throw new Error("Une date enregistrée dans le dossier est invalide.");
  return result;
}
function dateText(value: string, civilPrefix = false): string {
  const date = civilPrefix ? value.slice(0, 10) : day(value);
  if (!validDay(date)) throw new Error("Une date enregistrée dans le dossier est invalide.");
  const [year, month, dateOfMonth] = date.split("-");
  return `${dateOfMonth}/${month}/${year}`;
}
function inPeriod(value: string, period: PatientRecordOptions["period"]): boolean {
  const localDay = day(value);
  return !period || (localDay >= period.from && localDay <= period.to);
}
function newest<T extends { id: string }>(values: T[], at: (value: T) => string): T[] {
  return [...values].sort((a, b) => {
    const aTime = new Date(at(a)).getTime();
    const bTime = new Date(at(b)).getTime();
    return (Number.isFinite(aTime) && Number.isFinite(bTime) ? bTime - aTime : at(b).localeCompare(at(a))) || a.id.localeCompare(b.id);
  });
}
function clinicalDocument(note: Note): Record<string, unknown> | null {
  try {
    const tags = typeof note.tags === "string" ? JSON.parse(note.tags) : note.tags;
    const metadata: unknown = tags?.clinicalDocument;
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata as Record<string, unknown> : null;
  } catch { return null; }
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function sourceBlock(source: PatientRecordSource): PatientRecordBlock {
  const prefix = `data:${source.mimeType}`;
  const comma = typeof source.dataUrl === "string" ? source.dataUrl.indexOf(",") : -1;
  if (comma < 0 || !source.dataUrl.startsWith(`${prefix};`) || !/;base64$/i.test(source.dataUrl.slice(prefix.length, comma)) || !/^[a-z\d+/=\r\n]+$/i.test(source.dataUrl.slice(comma + 1))) throw new Error(`L’original de la pièce « ${source.fileName || source.title} » est absent ou illisible.`);
  return { kind: "source", source };
}

const appointmentStatuses: Record<string, string> = { scheduled: "Planifié", confirmed: "Confirmé", arrived: "Arrivé", waiting: "En attente", in_progress: "En cours", completed: "Terminé", cancelled: "Annulé", no_show: "Absent" };
const patientStatuses: Record<string, string> = { sante: "En bonne santé", traitement: "En traitement", hospitalise: "Hospitalisé", decede: "Décédé" };

export function assemblePatientRecordSnapshot(raw: PatientRecordRawData, input: PatientRecordOptions, generatedAt: string | Date): PatientRecordSnapshot {
  const options = validatePatientRecordOptions(input);
  if (!raw.patient?.id || !present(raw.patient.name)) throw new Error("Ce patient n’existe plus ou son identité est incomplète.");
  if (!present(raw.requestedBy)) throw new Error("Connectez-vous pour exporter le dossier patient.");
  const timestamp = generatedAt instanceof Date ? generatedAt.toISOString() : generatedAt;
  const exportDay = day(timestamp);
  const patient = raw.patient;
  const owner = raw.owner?.id === patient.ownerId ? raw.owner : null;
  const ownerName = owner ? [owner.firstName, owner.lastName].filter(present).join(" ") : "";
  const author = (id?: string) => raw.users?.find((user) => user.id === id)?.displayName || "";
  const appointments = (raw.appointments ?? []).filter((visit) => visit.patientId === patient.id);
  const appointmentMap = new Map(appointments.map((visit) => [visit.id, visit]));
  const sameConsultation = (id: string | null | undefined) => !!id && appointmentMap.has(id);
  const soaps = (raw.soaps ?? []).filter((soap) => soap.patientId === patient.id && sameConsultation(soap.appointmentId));
  const notes = (raw.notes ?? []).filter((note) => note.patientId === patient.id);
  const documents = (raw.documents ?? []).filter((document) => document.patientId === patient.id);
  const sections: PatientRecordSection[] = [];
  const append = (id: PatientRecordSection["id"], title: string, blocks: PatientRecordBlock[]) => { if (blocks.length) sections.push({ id, title, blocks }); };
  const textBlock = (title: string, text: string, meta?: string): PatientRecordBlock => ({ kind: "text", title, text, ...(meta ? { meta } : {}) });

  if (options.sections.identity) {
    const rows: string[][] = [];
    const field = (label: string, value: unknown) => { if (present(value)) rows.push([label, value]); };
    field("Nom", patient.name); field("Espèce", patient.species); field("Race", patient.breed);
    field("Sexe", patient.sex === "F" ? "Femelle" : patient.sex === "M" ? "Mâle" : "");
    if (typeof patient.sterilized === "boolean") field("Stérilisation", patient.sterilized ? "Oui" : "Non");
    if (patient.dateOfBirth) {
      const born = patient.dateOfBirth.slice(0, 10);
      if (!validDay(born)) throw new Error("La date de naissance enregistrée est invalide.");
      field("Naissance", dateText(born));
      if (born <= exportDay) {
        const [year, month, date] = born.split("-").map(Number);
        const [currentYear, currentMonth, currentDate] = exportDay.split("-").map(Number);
        const months = (currentYear - year) * 12 + currentMonth - month - (currentDate < date ? 1 : 0);
        field("Âge au jour de l’export", months >= 12 ? `${Math.floor(months / 12)} an${months >= 24 ? "s" : ""}${months % 12 ? ` et ${months % 12} mois` : ""}` : `${Math.max(0, months)} mois`);
      }
    }
    const weight = newest((raw.weights ?? []).filter((entry) => entry.patientId === patient.id && Number.isFinite(entry.weightKg)), (entry) => entry.measuredAt)[0];
    if (weight) field("Dernier poids enregistré", `${numberText(weight.weightKg)} kg (${dateText(weight.measuredAt, true)})`);
    field("Identification électronique", patient.chipNumber); field("Tatouage", patient.tattooNumber);
    field("Statut", patientStatuses[patient.status]); field("Allergies", patient.allergies); field("Affections chroniques", patient.chronicConditions);
    field("Propriétaire", ownerName); field("Téléphone", owner?.phone); field("Courriel", owner?.email);
    field("Adresse", [owner?.address, owner?.city].filter(present).join(", "));
    field("Contact secondaire", [owner?.secondaryContactName, owner?.secondaryContactPhone].filter(present).join(" · "));
    append("identity", "Identité du patient", rows.length ? [{ kind: "table", columns: ["Profil actuel", "Donnée enregistrée"], rows, widths: [0.32, 0.68] }] : []);
  }

  if (options.sections.consultations) {
    const blocks: PatientRecordBlock[] = [];
    for (const visit of newest(appointments.filter((entry) => inPeriod(entry.startTime, options.period)), (entry) => entry.startTime)) {
      const recorded = [["Motif", visit.reason], ["Diagnostic", visit.diagnosis], ["Traitement", visit.treatment], ["Notes de consultation", visit.notes]].filter(([, value]) => present(value)).map(([label, value]) => `${label} : ${value}`).join("\n\n");
      blocks.push(textBlock(visit.title || "Consultation", recorded, [dateText(visit.startTime), visit.type, appointmentStatuses[visit.status] || visit.status, author(visit.vetId)].filter(present).join(" · ")));
      for (const soap of soaps.filter((entry) => entry.appointmentId === visit.id)) {
        const fields = [["S · Subjectif", soap.subjective], ["O · Objectif", soap.objective], ["A · Évaluation", soap.assessment], ["P · Plan", soap.plan]].filter(([, value]) => present(value));
        if (fields.length) blocks.push(textBlock(isSoapReviewed(soap) ? "Note clinique validée" : "Note clinique non validée", fields.map(([label, value]) => `${label}\n${value}`).join("\n\n"), [author(soap.vetId), soap.createdAt ? `Consignée le ${dateText(soap.createdAt)}` : ""].filter(present).join(" · ")));
      }
      const prescriptions = (raw.prescriptions ?? []).filter((prescription) => prescription.patientId === patient.id && prescription.appointmentId === visit.id && ["signed", "dispensed"].includes(prescription.status));
      for (const prescription of newest(prescriptions, (entry) => entry.prescriptionDate)) {
        blocks.push(textBlock("Prescription", [prescription.diagnosis && `Diagnostic : ${prescription.diagnosis}`, prescription.generalInstructions].filter(present).join("\n"), [dateText(prescription.prescriptionDate), prescription.status === "dispensed" ? "Délivrée" : "Signée", author(prescription.vetId)].filter(present).join(" · ")));
        const items = (raw.prescriptionItems ?? []).filter((item) => item.prescriptionId === prescription.id).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        if (items.length) blocks.push({ kind: "table", columns: ["Médicament", "Dose enregistrée", "Modalités enregistrées"], widths: [0.26, 0.28, 0.46], rows: items.map((item) => [
          [item.medicationName, item.form].filter(present).join("\n"),
          [numberText(item.dosagePerKg) && `${numberText(item.dosagePerKg)} ${item.dosageUnit || ""}`.trim(), numberText(item.computedDoseMg) && `${numberText(item.computedDoseMg)} mg`, numberText(item.computedVolumeMl) && `${numberText(item.computedVolumeMl)} mL`].filter(present).join("\n"),
          [item.route, item.frequency, item.duration, item.quantity, item.instructions, item.warnings].filter(present).join("\n"),
        ]) });
      }
    }
    append("consultations", "Consultations", blocks);
  }

  if (options.sections.documents) {
    const blocks: PatientRecordBlock[] = [];
    const finalDocuments = documents.filter((document) => document.kind !== "import" && document.status === "finalise" && sameConsultation(document.consultationId) && soaps.some((soap) => soap.id === document.soapId && soap.appointmentId === document.consultationId) && inPeriod(document.createdAt, options.period));
    const version = (document: PatientDocument) => {
      let current = document; let result = 1;
      const visited = new Set([document.id]);
      while (current.previousDocumentId) {
        const previous = documents.find((entry) => entry.id === current.previousDocumentId && entry.kind !== "import" && entry.status === "finalise");
        if (!previous || visited.has(previous.id)) break;
        visited.add(previous.id); result += 1; current = previous;
      }
      return result;
    };
    for (const document of newest(finalDocuments, (entry) => entry.createdAt)) {
      const meta = [dateText(document.createdAt), DOCUMENT_TYPES[document.kind as keyof typeof DOCUMENT_TYPES], `Version ${version(document)}`, document.authorName, document.finalizedAt ? `Finalisé le ${dateText(document.finalizedAt)}` : ""].filter(present).join(" · ");
      blocks.push(textBlock(document.title, "", meta));
      if (document.pdfDataUrl) blocks.push(sourceBlock({ id: `document:${document.id}`, patientId: patient.id, title: document.title, fileName: `${document.title || "Document"}.pdf`, mimeType: "application/pdf", dataUrl: document.pdfDataUrl, createdAt: document.createdAt, origin: "generated" }));
      else if (present(document.content)) blocks.push(textBlock("Texte finalisé conservé", document.content));
      else throw new Error(`Le document « ${document.title || document.id} » ne contient aucun PDF ni texte finalisé exportable.`);
    }
    for (const note of newest(notes.filter((note) => !!clinicalDocument(note) && inPeriod(note.createdAt, options.period)), (entry) => entry.createdAt)) {
      const metadata = clinicalDocument(note)!;
      if (!present(metadata.reviewedAt) || !present(metadata.reviewedBy) || !sameConsultation(typeof metadata.appointmentId === "string" ? metadata.appointmentId : null)) continue;
      // The reviewed text is its own historical source. Its patient and visit
      // remain checked, without requiring today's SOAP or imported file to
      // still exist or be selected in the export options.
      day(metadata.reviewedAt);
      const content = patientRecordPlainText(note.content);
      const reviewer = author(metadata.reviewedBy);
      if (content) blocks.push(textBlock(note.title || "Document clinique historique", content, [dateText(note.createdAt), "Document historique relu", author(note.userId), `Relu le ${dateText(metadata.reviewedAt)}${reviewer ? ` par ${reviewer}` : ""}`].filter(present).join(" · ")));
    }
    append("documents", "Documents générés", blocks);
  }

  if (options.sections.reminders) {
    const reminders = (raw.reminders ?? []).filter((reminder) => reminder.patientId === patient.id && ["en_cours", "termine"].includes(reminder.statut) && inPeriod(reminder.echeance, options.period));
    append("reminders", "Rappels médicaux", reminders.length ? [{
      kind: "table", columns: ["Type", "Échéance", "Statut", "Suivi / note"], widths: [0.24, 0.16, 0.16, 0.44],
      rows: newest(reminders, (entry) => entry.echeance).map((reminder) => [
        raw.reminderTypes?.find((type) => type.id === reminder.type)?.name || "Rappel médical",
        dateText(reminder.echeance),
        reminder.statut === "termine" ? "Terminé" : "En cours",
        [reminder.note, reminder.intervalleMois ? `Intervalle enregistré : ${reminder.intervalleMois} mois` : "", reminder.createdAt ? `Créé le ${dateText(reminder.createdAt)}` : "", reminder.statut === "termine" && reminder.completedAt ? `Terminé le ${dateText(reminder.completedAt)}` : ""].filter(present).join("\n"),
      ]),
    }] : []);
  }

  if (options.sections.notes) {
    const blocks: PatientRecordBlock[] = [];
    if (present(patient.generalNotes)) {
      const content = patientRecordPlainText(patient.generalNotes);
      if (content) blocks.push(textBlock("Notes générales", content, "Profil actuel, sans date enregistrée"));
    }
    for (const note of newest(notes.filter((note) => !clinicalDocument(note) && inPeriod(note.createdAt, options.period)), (entry) => entry.createdAt)) {
      const content = patientRecordPlainText(note.content);
      if (content) blocks.push(textBlock(note.title || "Note libre", content, [dateText(note.createdAt), author(note.userId)].filter(present).join(" · ")));
    }
    append("notes", "Notes libres", blocks);
  }

  if (options.includeAttachments) {
    const sources: PatientRecordSource[] = [];
    const supported = (mime: string): mime is PatientRecordSource["mimeType"] => ["application/pdf", "image/jpeg", "image/png"].includes(mime);
    for (const attachment of raw.attachments ?? []) {
      if (attachment.patientId !== patient.id || !sameConsultation(attachment.appointmentId) || !inPeriod(attachment.createdAt, options.period)) continue;
      if (!supported(attachment.mimeType)) throw new Error(`Le format de la pièce « ${attachment.fileName || attachment.id} » n’est pas pris en charge. Les annexes doivent être des PDF, JPG ou PNG.`);
      sources.push({ id: `attachment:${attachment.id}`, patientId: patient.id, title: attachment.description || attachment.fileName, fileName: attachment.fileName, mimeType: attachment.mimeType, dataUrl: attachment.dataUrl, createdAt: attachment.createdAt, origin: "import" });
    }
    for (const document of documents) {
      if (document.kind !== "import" || document.status !== "finalise" || (document.consultationId && !sameConsultation(document.consultationId)) || !inPeriod(document.createdAt, options.period)) continue;
      const attachment = document.attachment;
      if (!attachment || !supported(attachment.mimeType)) throw new Error(`La pièce « ${document.title || document.id} » ne contient aucun original PDF, JPG ou PNG lisible.`);
      sources.push({ id: `document:${document.id}`, patientId: patient.id, title: document.title, fileName: attachment.name, mimeType: attachment.mimeType, dataUrl: attachment.dataUrl, createdAt: document.createdAt, origin: "import" });
    }
    const blocks: PatientRecordBlock[] = [];
    for (const source of newest(sources, (entry) => entry.createdAt || "")) blocks.push(sourceBlock(source));
    append("attachments", "Annexes", blocks);
  }
  if (!sections.length) throw new Error("Aucune donnée exportable ne correspond au périmètre choisi.");
  return freeze({ patientId: patient.id, patientName: patient.name, requestedBy: raw.requestedBy, generatedAt: timestamp, exportDay, filename: patientRecordFilename(patient.name, exportDay, options.period), options, clinic: { ...raw.clinic }, cover: { ...(patient.species ? { species: patient.species } : {}), ...(patient.breed ? { breed: patient.breed } : {}), ...(ownerName ? { ownerName } : {}) }, sections });
}
