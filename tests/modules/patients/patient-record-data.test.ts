import { describe, expect, it } from "vitest";
import { reviewedSoapContent } from "@/modules/consultations/local-ai/soap-review";
import type { PatientDocument } from "@/modules/documents/document-domain";
import { assemblePatientRecordSnapshot, patientRecordFilename, patientRecordPlainText, validatePatientRecordOptions, type PatientRecordRawData } from "@/modules/patients/export/patient-record-data";
import { DEFAULT_PATIENT_RECORD_OPTIONS, type PatientRecordOptions } from "@/modules/patients/export/patient-record-types";
import { normalizeInvoiceSettings } from "@/services/invoiceSettingsService";
import type { Appointment, ConsultationDocument, ConsultationSoap, Note, Owner, Patient, Prescription, PrescriptionItem, WeightEntry } from "@/types/db";

const at = "2026-10-17T12:00:00";
const fields = { subjective: "Boiterie depuis hier.", objective: "Poids 8 kg.", assessment: "Douleur consignée.", plan: "Repos pendant 3 jours." };
const only = (section: keyof PatientRecordOptions["sections"] | "attachments"): PatientRecordOptions => ({ period: null, sections: { identity: false, consultations: false, documents: false, reminders: false, notes: false, ...(section !== "attachments" ? { [section]: true } : {}) }, includeAttachments: section === "attachments" });
function fixture(): PatientRecordRawData {
  return {
    patient: { id: "p1", ownerId: "o1", name: "Éloïse du Pré", species: "Chien", breed: "Beagle", sex: "F", dateOfBirth: "2024-10-17", generalNotes: "<p>Allergie &amp; suivi.</p>" } as Patient,
    owner: { id: "o1", firstName: "Lina", lastName: "Martin", phone: "0102030405", email: "lina@example.invalid" } as Owner,
    users: [{ id: "vet", displayName: "Dr Lina" }, { id: "team", displayName: "Autre vétérinaire" }],
    requestedBy: "vet", clinic: normalizeInvoiceSettings({ name: "Clinique locale", footer: "Mention enregistrée." }),
    appointments: [
      { id: "a1", patientId: "p1", title: "Ancienne visite", startTime: "2026-10-01T12:00:00", status: "completed", type: "Consultation", reason: "Contrôle", vetId: "vet" },
      { id: "a2", patientId: "p1", title: "Visite récente", startTime: "2026-10-17T16:00:00", status: "completed", type: "Consultation", vetId: "team" },
      { id: "foreign", patientId: "p2", title: "NE PAS EXPORTER", startTime: at },
    ] as Appointment[],
    soaps: [
      { id: "s1", patientId: "p1", appointmentId: "a1", ...fields, content: reviewedSoapContent(fields, "{}", "vet"), aiDraft: null, transcript: "DICTÉE SECRÈTE" },
      { id: "s2", patientId: "p1", appointmentId: "a2", ...fields, content: "{}", aiDraft: "BROUILLON IA SECRET", transcript: "DICTÉE SECRÈTE" },
      { id: "s-cross", patientId: "p2", appointmentId: "a1", ...fields, subjective: "DONNÉE AUTRE PATIENT" },
    ] as ConsultationSoap[],
    prescriptions: [
      { id: "rx", patientId: "p1", appointmentId: "a2", status: "signed", prescriptionDate: "2026-10-17" },
      { id: "rx-draft", patientId: "p1", appointmentId: "a2", status: "draft", prescriptionDate: "2026-10-17" },
      { id: "rx-cross", patientId: "p2", appointmentId: "a2", status: "signed", prescriptionDate: "2026-10-17" },
      { id: "rx-foreign-visit", patientId: "p1", appointmentId: "foreign", status: "signed", prescriptionDate: "2026-10-17" },
    ] as Prescription[],
    prescriptionItems: [
      { id: "item", prescriptionId: "rx", medicationName: "Médicament consigné", dosagePerKg: 2, dosageUnit: "mg/kg", computedDoseMg: 13.7, computedVolumeMl: 0.42, frequency: "2x/jour", duration: "3 jours", sortOrder: 0 },
      { id: "item-draft", prescriptionId: "rx-draft", medicationName: "MÉDICAMENT BROUILLON", sortOrder: 0 },
      { id: "item-cross", prescriptionId: "rx-cross", medicationName: "MÉDICAMENT AUTRE PATIENT", sortOrder: 0 },
      { id: "item-orphan", prescriptionId: "rx-foreign-visit", medicationName: "MÉDICAMENT CONSULTATION ÉTRANGÈRE", sortOrder: 0 },
    ] as PrescriptionItem[],
    notes: [
      { id: "free", patientId: "p1", userId: "team", title: "Note de l’équipe", content: "<p>Résultat &eacute;levé.</p><p>À revoir.</p>", createdAt: "2026-10-17", tags: "{}" },
      { id: "historic", patientId: "p1", userId: "vet", title: "Écrit historique", content: "<p>Texte relu.</p>", createdAt: "2026-10-17", tags: JSON.stringify({ clinicalDocument: { appointmentId: "a1", reviewedAt: at, reviewedBy: "vet", source: { type: "soap" } } }) },
      { id: "unreviewed", patientId: "p1", title: "DOCUMENT NON RELU", content: "NE PAS EXPORTER", createdAt: at, tags: JSON.stringify({ clinicalDocument: { appointmentId: "a1" } }) },
      { id: "cross-note", patientId: "p2", title: "NOTE AUTRE PATIENT", content: "NE PAS EXPORTER", createdAt: at },
    ] as Note[],
    documents: [
      { id: "d1", patientId: "p1", consultationId: "a1", soapId: "s1", title: "Compte-rendu initial", content: "TEXTE NON SUBSTITUÉ AU PDF", kind: "report", status: "finalise", pdfDataUrl: "data:application/pdf;base64,JVBERi0xLjQK", createdAt: "2026-10-10", finalizedAt: "2026-10-10", previousDocumentId: null },
      { id: "d2", patientId: "p1", consultationId: "a1", soapId: "s1", title: "Version corrigée", content: "Texte finalisé réel sans PDF.", kind: "report", status: "finalise", pdfDataUrl: null, createdAt: at, previousDocumentId: "d1" },
      { id: "draft", patientId: "p1", consultationId: "a1", soapId: "s1", title: "DOCUMENT BROUILLON", kind: "report", status: "brouillon", createdAt: at },
      { id: "cancelled", patientId: "p1", consultationId: "a1", soapId: "s1", title: "DOCUMENT ANNULÉ", kind: "report", status: "annule", createdAt: at },
      { id: "cross-document", patientId: "p2", consultationId: "a1", soapId: "s1", title: "DOCUMENT AUTRE PATIENT", kind: "report", status: "finalise", createdAt: at },
      { id: "cross-link", patientId: "p1", consultationId: "foreign", soapId: "s1", title: "DOCUMENT AUTRE CONSULTATION", kind: "report", status: "finalise", createdAt: at },
      { id: "import", patientId: "p1", title: "Radiographie", kind: "import", status: "finalise", createdAt: "2026-10-17", attachment: { name: "Radio.png", mimeType: "image/png", dataUrl: "data:image/png;base64,cG5n" } },
    ] as PatientDocument[],
    reminders: [
      { id: "r1", patientId: "p1", type: "vaccin", echeance: "2026-10-17", statut: "en_cours", createdAt: "2026-09-01" },
      { id: "r2", patientId: "p1", type: "vaccin", echeance: "2026-10-01", statut: "termine", createdAt: "2026-01-01", completedAt: "2026-10-02" },
      { id: "r3", patientId: "p1", type: "vaccin", echeance: "2026-10-17", statut: "annule", createdAt: at, note: "RAPPEL ANNULÉ" },
      { id: "r4", patientId: "p2", type: "vaccin", echeance: "2026-10-17", statut: "en_cours", createdAt: at, note: "RAPPEL AUTRE PATIENT" },
    ],
    reminderTypes: [{ id: "vaccin", name: "Vaccin configuré" }],
    attachments: [
      { id: "file", patientId: "p1", appointmentId: "a1", fileName: "Analyse.pdf", mimeType: "application/pdf", dataUrl: "data:application/pdf;base64,b2xk", createdAt: "2026-10-17" },
      { id: "cross-file", patientId: "p2", appointmentId: "a1", fileName: "AUTRE PATIENT.pdf", mimeType: "application/pdf", createdAt: "2026-10-17" },
      { id: "cross-visit-file", patientId: "p1", appointmentId: "foreign", fileName: "AUTRE CONSULTATION.pdf", mimeType: "application/pdf", createdAt: "2026-10-17" },
    ] as ConsultationDocument[],
    weights: [{ id: "w", patientId: "p1", measuredAt: "2026-10-17T00:00:00.000Z", weightKg: 8.3 }, { id: "cross-weight", patientId: "p2", measuredAt: "2026-10-18", weightKg: 999 }] as WeightEntry[],
  };
}

describe("Patient record options and civil filenames", () => {
  it("preserves accents, normalizes spaces and removes path/control characters", () => {
    expect(patientRecordFilename("  Éloïse   du / Pré:*?  ", "2026-10-17", null)).toBe("Dossier_Éloïse_du_Pré_2026-10-17.pdf");
    expect(patientRecordFilename(" /:*? ", "2026-10-17", null)).toBe("Dossier_Patient_2026-10-17.pdf");
    expect(patientRecordFilename("Mocha", "2026-10-17", { from: "2026-01-01", to: "2026-10-17" })).toBe("Dossier_Mocha_2026-01-01_2026-10-17.pdf");
  });
  it("rejects incomplete, normalized-invalid and reverse periods and empty selections", () => {
    for (const period of [{ from: "2026-02-29", to: "2026-10-17" }, { from: "", to: "2026-10-17" }, { from: "2026-10-18", to: "2026-10-17" }]) expect(() => validatePatientRecordOptions({ ...DEFAULT_PATIENT_RECORD_OPTIONS, period })).toThrow();
    expect(() => validatePatientRecordOptions({ ...only("identity"), sections: { identity: false, consultations: false, documents: false, reminders: false, notes: false } })).toThrow("Choisissez");
  });
});

describe("Patient record assembly", () => {
  it("isolates all sources, preserves original PDFs and both imported registries, omits drafts and cancelled data", () => {
    const snapshot = assemblePatientRecordSnapshot(fixture(), DEFAULT_PATIENT_RECORD_OPTIONS, at);
    expect(snapshot.sections.map((section) => section.id)).toEqual(["identity", "consultations", "documents", "reminders", "notes", "attachments"]);
    const output = JSON.stringify(snapshot);
    for (const forbidden of ["AUTRE PATIENT", "AUTRE CONSULTATION", "NE PAS EXPORTER", "BROUILLON", "DICTÉE SECRÈTE", "RAPPEL ANNULÉ", "DOCUMENT ANNULÉ"]) expect(output).not.toContain(forbidden);
    expect(output).toContain("13,7 mg"); expect(output).toContain("0,42 mL"); expect(output).toContain("Note clinique non validée");
    expect(output).not.toContain("TEXTE NON SUBSTITUÉ AU PDF");
    const documents = snapshot.sections.find((section) => section.id === "documents")!;
    expect(documents.blocks.some((block) => block.kind === "source" && block.source.dataUrl === fixture().documents![0].pdfDataUrl)).toBe(true);
    expect(JSON.stringify(documents)).toContain("Version 2"); expect(JSON.stringify(documents)).toContain("Texte finalisé réel sans PDF.");
    const annexes = snapshot.sections.find((section) => section.id === "attachments")!;
    expect(annexes.blocks.filter((block) => block.kind === "source")).toHaveLength(2);
  });
  it("sorts consultations newest first, includes only the four recorded SOAP fields and does not recalculate doses", () => {
    const snapshot = assemblePatientRecordSnapshot(fixture(), only("consultations"), at);
    const output = JSON.stringify(snapshot.sections);
    expect(output.indexOf("Visite récente")).toBeLessThan(output.indexOf("Ancienne visite"));
    expect(output).toContain("Note clinique validée"); expect(output).toContain(fields.subjective);
    expect(output).toContain("13,7 mg"); expect(output).not.toContain("16 mg"); expect(output).not.toContain("transcript"); expect(output).not.toContain("aiDraft");
  });
  it("renders reminders as a readable table with recorded follow-up dates and no internal identifiers as clinical labels", () => {
    const raw = fixture();
    raw.reminders![0] = { ...raw.reminders![0], id: "77996d79-9adb-4cce-8d64-e22377e58939", intervalleMois: 12, note: "Prévoir le contrôle vaccinal." };
    const unknownType = "e2f9e32d-f9c9-4f24-bd21-69ea20501aad";
    raw.reminders!.push({ id: "r-unknown", patientId: "p1", type: unknownType, echeance: "2026-10-05", statut: "en_cours", createdAt: "2026-10-03" });
    const snapshot = assemblePatientRecordSnapshot(raw, only("reminders"), at);
    const table = snapshot.sections[0].blocks[0];
    expect(table.kind).toBe("table");
    if (table.kind !== "table") throw new Error("Le tableau des rappels est absent.");
    expect(table.columns).toEqual(["Type", "Échéance", "Statut", "Suivi / note"]);
    expect(table.rows).toEqual([
      ["Vaccin configuré", "17/10/2026", "En cours", "Prévoir le contrôle vaccinal.\nIntervalle enregistré : 12 mois\nCréé le 01/09/2026"],
      ["Rappel médical", "05/10/2026", "En cours", "Créé le 03/10/2026"],
      ["Vaccin configuré", "01/10/2026", "Terminé", "Créé le 01/01/2026\nTerminé le 02/10/2026"],
    ]);
    const printed = table.rows.flat().join(" ");
    expect(printed).not.toContain(unknownType); expect(printed).not.toContain(raw.reminders![0].id);
    expect(printed).not.toContain("RAPPEL ANNULÉ"); expect(printed).not.toContain("AUTRE PATIENT");
  });
  it("preserves clinical authors and dates in printed metadata while keeping internal identifiers out of it", () => {
    const raw = fixture(); raw.soaps![0].vetId = "vet"; raw.soaps![0].createdAt = "2026-10-01"; raw.prescriptions![0].vetId = "vet"; raw.documents![0].authorName = "Dr Lina";
    const snapshot = assemblePatientRecordSnapshot(raw, DEFAULT_PATIENT_RECORD_OPTIONS, at);
    const metadata = snapshot.sections.flatMap((section) => section.blocks).flatMap((block) => block.kind === "text" && block.meta ? [block.meta] : []).join("\n");
    for (const id of ["a1", "a2", "s1", "s2", "rx", "d1", "d2", "historic", "free"]) expect(metadata).not.toContain(id);
    expect(metadata).toContain("Dr Lina"); expect(metadata).toContain("Autre vétérinaire");
    expect(metadata).toContain("Consignée le 01/10/2026"); expect(metadata).toContain("Relu le 17/10/2026 par Dr Lina"); expect(metadata).toContain("Version 2");
    expect(snapshot.sections.flatMap((section) => section.blocks).some((block) => block.kind === "source" && block.source.id === "document:d1")).toBe(true);
    expect(raw.soaps![0].id).toBe("s1"); expect(raw.prescriptions![0].appointmentId).toBe("a2");
  });
  it("separates historical reviewed documents from free notes and keeps the whole team's notes", () => {
    const snapshot = assemblePatientRecordSnapshot(fixture(), DEFAULT_PATIENT_RECORD_OPTIONS, at);
    const docs = JSON.stringify(snapshot.sections.find((section) => section.id === "documents"));
    const notes = JSON.stringify(snapshot.sections.find((section) => section.id === "notes"));
    expect(docs).toContain("Écrit historique"); expect(notes).not.toContain("Écrit historique");
    expect(notes).toContain("Autre vétérinaire"); expect(notes).toContain("Résultat élevé."); expect(notes).toContain("sans date enregistrée");
  });
  it("keeps the actual reviewed historical text when its former source is no longer selected or present", () => {
    const raw = fixture(); raw.soaps = []; raw.documents = []; raw.attachments = [];
    const snapshot = assemblePatientRecordSnapshot(raw, only("documents"), at);
    expect(JSON.stringify(snapshot.sections)).toContain("Texte relu.");
    expect(JSON.stringify(snapshot.sections)).not.toContain("DOCUMENT NON RELU");
  });
  it("uses inclusive civil days for every dated source, reminder due dates and original weight day", () => {
    const options = { ...DEFAULT_PATIENT_RECORD_OPTIONS, period: { from: "2026-10-17", to: "2026-10-17" } };
    const snapshot = assemblePatientRecordSnapshot(fixture(), options, at);
    const output = JSON.stringify(snapshot);
    expect(output).toContain("Visite récente"); expect(output).not.toContain("Ancienne visite"); expect(output).not.toContain("Compte-rendu initial");
    expect(output).toContain("Vaccin configuré"); expect(output).toContain("17/10/2026"); expect(output).not.toContain("999");
    expect(output).toContain("8,3 kg (17/10/2026)");
  });
  it("omits empty selected sections and rejects a wholly empty perimeter", () => {
    const raw = fixture(); raw.patient.generalNotes = ""; raw.notes = []; raw.documents = []; raw.reminders = []; raw.attachments = []; raw.appointments = [];
    const snapshot = assemblePatientRecordSnapshot(raw, DEFAULT_PATIENT_RECORD_OPTIONS, at);
    expect(snapshot.sections.map((section) => section.id)).toEqual(["identity"]);
    expect(() => assemblePatientRecordSnapshot(raw, only("notes"), at)).toThrow("Aucune donnée exportable");
    expect(() => assemblePatientRecordSnapshot({ ...raw, requestedBy: "" }, only("identity"), at)).toThrow("Connectez-vous");
  });
  it("returns a detached immutable snapshot and does not mutate the source records", () => {
    const raw = fixture(); const before = JSON.stringify(raw);
    const snapshot = assemblePatientRecordSnapshot(raw, DEFAULT_PATIENT_RECORD_OPTIONS, at);
    expect(JSON.stringify(raw)).toBe(before); expect(Object.isFrozen(raw.clinic)).toBe(false);
    expect(Object.isFrozen(snapshot.sections)).toBe(true); expect(Object.isFrozen(snapshot.options.sections)).toBe(true);
    expect(snapshot.requestedBy).toBe("vet");
  });
  it("fails clearly for a finalized document or managed attachment with no original content", () => {
    const raw = fixture(); raw.documents![0].pdfDataUrl = null; raw.documents![0].content = "";
    expect(() => assemblePatientRecordSnapshot(raw, only("documents"), at)).toThrow("Compte-rendu initial");
    raw.documents = [raw.documents!.find((entry) => entry.kind === "import")!]; raw.documents[0].attachment = null;
    expect(() => assemblePatientRecordSnapshot(raw, only("attachments"), at)).toThrow("Radiographie");
  });
  it("identifies unsupported attachments and nonlocal originals instead of silently omitting them", () => {
    const raw = fixture(); raw.attachments![0].mimeType = "application/msword";
    expect(() => assemblePatientRecordSnapshot(raw, only("attachments"), at)).toThrow("Analyse.pdf");
    raw.attachments![0].mimeType = "application/pdf"; raw.attachments![0].dataUrl = "https://example.invalid/Analyse.pdf";
    expect(() => assemblePatientRecordSnapshot(raw, only("attachments"), at)).toThrow("Analyse.pdf");
    raw.documents![0].pdfDataUrl = "https://example.invalid/generated.pdf";
    expect(() => assemblePatientRecordSnapshot(raw, only("documents"), at)).toThrow("Compte-rendu initial");
  });
});

it("turns stored HTML into inert faithful readable text without active markup", () => {
  expect(patientRecordPlainText('<p title="x > y">Élevé &amp; stable&nbsp;: &#233; &#x1F43E;</p><ul><li>Premier</li><li>Second</li></ul><script>secret()</script><img src="https://example.invalid/pixel"><p>Fin<br>Suite</p>')).toBe("Élevé & stable : é 🐾\n\nPremier\n\nSecond\n\nFin\nSuite");
});
