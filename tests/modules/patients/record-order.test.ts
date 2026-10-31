import { describe, expect, it } from "vitest";
import type { ConsultationDocument, Invoice, Prescription, Vaccination } from "@/types/db";
import type { PatientDocument } from "@/modules/documents/document-domain";
import type { MedicalReminder } from "@/modules/patient-reminders/store";
import { collectTimelinePieces, piecesByVisit } from "@/modules/patients/lib/timeline-pieces";
import { countdownLabel, preventionCountdowns } from "@/modules/patients/lib/prevention";
import { patientDocumentName } from "@/modules/patients/reference/reference";

const prescription = (id: string, appointmentId: string) =>
  ({ id, appointmentId, patientId: "rex", prescriptionDate: "2026-10-20", status: "signed", createdAt: "2026-10-20" }) as Prescription;
const invoice = (id: string, appointmentId: string | null, documentStatus: Invoice["documentStatus"]) =>
  ({ id, appointmentId, patientId: "rex", documentStatus, number: `F-${id}`, issuedAt: "2026-10-20T10:00:00Z", createdAt: "2026-10-20T10:00:00Z" }) as Invoice;

describe("pièces de la chronologie", () => {
  it("rattache chaque pièce à la visite qui l'a produite, une seule fois", () => {
    const pieces = collectTimelinePieces({
      prescriptions: [prescription("rx1", "visit-1")],
      invoices: [invoice("f1", "visit-1", "issued"), invoice("f2", null, "issued"), invoice("f3", "visit-1", "draft")],
      attachments: [{ id: "lab", appointmentId: "visit-2", patientId: "rex", fileName: "nfs.pdf", description: "Numération", createdAt: "2026-10-21" } as ConsultationDocument],
      documents: [
        { id: "cert", consultationId: "visit-2", kind: "certificate", title: "Certificat", status: "finalise", createdAt: "2026-10-21", finalizedAt: null } as unknown as PatientDocument,
        { id: "old", consultationId: "visit-2", kind: "report", title: "Annulé", status: "annule", createdAt: "2026-10-21", finalizedAt: null } as unknown as PatientDocument,
      ],
    });
    const { attached, loose } = piecesByVisit(pieces, new Set(["visit-1", "visit-2"]));

    expect(attached.get("visit-1")?.map((piece) => `${piece.kind}:${piece.label}:${piece.detail}`)).toEqual([
      "prescription:Ordonnance:signée",
      "invoice:Facture:F-f1",
    ]);
    expect(attached.get("visit-2")?.map((piece) => `${piece.kind}:${piece.label}`)).toEqual([
      "result:Numération",
      "document:Certificat",
    ]);
    // An invoice billed without a visit stands alone; drafts and cancelled documents never show.
    expect(loose.map((piece) => piece.sourceId)).toEqual(["f2"]);
  });
});

describe("prévention", () => {
  const now = new Date(2026, 9, 31, 9, 0);
  const vaccinations = [
    { id: "v-rage", patientId: "rex", vaccineName: "Rage", administeredAt: "2025-11-10T12:00:00Z", nextDueAt: "2026-11-10T12:00:00Z" },
    { id: "v-chppi", patientId: "rex", vaccineName: "CHPPi", administeredAt: "2025-10-20T12:00:00Z", nextDueAt: "2026-10-20T12:00:00Z" },
  ] as Vaccination[];
  const reminder = (id: string, type: string, echeance: string, acte?: string) =>
    ({ id, patient_id: "rex", type, statut: "en_cours", echeance, acte_source_id: acte ?? null }) as MedicalReminder;

  it("compte à rebours, le plus proche d'abord, sans doublon vaccin et rappel", () => {
    const items = preventionCountdowns({
      now,
      patientId: "rex",
      vaccinations,
      reminders: [reminder("r1", "vaccin", "2026-11-10", "v-rage"), reminder("r2", "vermifuge", "2026-11-02"), { ...reminder("r3", "vermifuge", "2026-01-01"), statut: "termine" }],
      types: [{ id: "vermifuge", name: "Vermifuge" } as never],
    });
    expect(items.map((item) => [item.label, item.days])).toEqual([
      ["CHPPi", -11],
      ["Vermifuge", 2],
      ["Rage", 10],
    ]);
    expect(items.find((item) => item.label === "Rage")?.source).toBe("reminder");
  });

  it("dit le délai en clair", () => {
    expect(countdownLabel(0)).toBe("aujourd’hui");
    expect(countdownLabel(1)).toBe("demain");
    expect(countdownLabel(12)).toBe("dans 12 jours");
    expect(countdownLabel(-1)).toBe("en retard d’1 jour");
    expect(countdownLabel(-11)).toBe("en retard de 11 jours");
  });
});

describe("référence sur les documents", () => {
  it("accole la référence au nom imprimé", () => {
    expect(patientDocumentName({ name: "Rex", reference: "ID-0011" })).toBe("Rex · ID-0011");
    expect(patientDocumentName({ name: "Rex" })).toBe("Rex");
  });
});
