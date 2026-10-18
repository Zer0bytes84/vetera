import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildHealthCard, type HealthCardInput } from "@/modules/patients/health-card/health-card-data";
import {
  buildHealthCardPdf,
  civilDate,
  HEALTH_CARD_FOOTER_TOP,
  healthCardFilename,
  kgText,
} from "@/modules/patients/health-card/health-card-pdf";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";

// Les polices locales sont lues sur le disque, comme l'application les sert.
beforeAll(() => {
  vi.stubGlobal("window", { location: { href: "http://localhost/", origin: "http://localhost" } });
  vi.stubGlobal("fetch", async (url: string) => {
    const clean = decodeURIComponent(url.replace(/\?.*$/, ""));
    const file = clean.startsWith("/@fs") ? clean.slice(4) : join(process.cwd(), clean.replace(/^\//, ""));
    const bytes = readFileSync(file);
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  });
});

const now = new Date("2026-10-18T10:00:00");
const iso = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
const long = "Spécialité au nom particulièrement long pour vérifier la troncature";
const base: HealthCardInput = {
  now,
  owner: { id: "o", firstName: "Nadia", lastName: "Benali", phone: "+213 550 10 01 01", createdAt: "" },
  patient: {
    id: "p", name: "Princesse Cléopâtre de la Vallée des Rois", species: "Chat", breed: "Sacré de Birmanie",
    sex: "F", sterilized: true, dateOfBirth: "2022-08-09", ownerId: "o", status: "traitement", createdAt: "",
    allergies: "Pénicillines, Céphalosporines, Sulfamides, AINS", chronicConditions: "Insuffisance rénale chronique, Hyperthyroïdie",
    chipNumber: "250269811234567",
  },
  weights: [], vaccinations: [], prescriptions: [], items: [], appointments: [], hospitalizations: [],
};
const context = { clinic: { ...DEFAULT_INVOICE_SETTINGS, name: "Cabinet du Jardin" }, patientId: "p", requestedBy: "u" };

describe("carnet de santé PDF", () => {
  it("tient sur une seule page A4 même avec un dossier très chargé", async () => {
    const card = buildHealthCard({
      ...base,
      weights: Array.from({ length: 30 }, (_, i) => ({ id: `w${i}`, patientId: "p", measuredAt: iso(-600 + i * 20), weightKg: 4 + Math.sin(i / 3) * 0.6, createdAt: "", updatedAt: "" })),
      vaccinations: Array.from({ length: 8 }, (_, i) => ({ id: `v${i}`, patientId: "p", vaccineName: i ? `Vaccin ${i}` : long, administeredAt: iso(-400 + i), nextDueAt: iso(-40 + i * 15).slice(0, 10), createdAt: "", updatedAt: "" })),
      prescriptions: [{ id: "r", appointmentId: "a", patientId: "p", prescriptionDate: iso(-1), status: "signed", templateVersion: "1", createdAt: "", updatedAt: "" }],
      items: Array.from({ length: 6 }, (_, i) => ({ id: `i${i}`, prescriptionId: "r", medicationName: i ? `Médicament ${i}` : long, dosagePerKg: 1, dosageUnit: "mg/kg", frequency: "2x/jour pendant les repas", duration: "14 jours", sortOrder: i, createdAt: "" })) as never,
      appointments: Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, patientId: "p", ownerId: "o", vetId: "v", startTime: iso(-30 * (i + 1)), endTime: iso(-30 * (i + 1)), title: "Visite", reason: long, diagnosis: i % 2 ? long : undefined, type: i % 3 ? "Consultation" : "Chirurgie", status: "completed", createdAt: "" })),
    });
    let bottom = Number.POSITIVE_INFINITY;
    const pdf = await buildHealthCardPdf(card, { ...context, onLayout: (value) => { bottom = value; } });
    expect(pdf.pageCount).toBe(1);
    expect(bottom).toBeLessThan(HEALTH_CARD_FOOTER_TOP);
    expect(new TextDecoder("latin1").decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf).toMatchObject({ patientId: "p", requestedBy: "u", patientName: base.patient.name });
  });

  it("produit aussi une page sobre pour un dossier vide", async () => {
    let bottom = 0;
    const pdf = await buildHealthCardPdf(buildHealthCard({ ...base, patient: { ...base.patient, allergies: "", chronicConditions: "" } }), { ...context, onLayout: (value) => { bottom = value; } });
    expect(pdf.pageCount).toBe(1);
    expect(bottom).toBeLessThan(HEALTH_CARD_FOOTER_TOP);
  });

  it("formate dates, poids et nom de fichier", () => {
    expect(civilDate("2026-10-03")).toBe("03/10/2026");
    expect(civilDate(undefined)).toBe("");
    expect(kgText(4.45)).toBe("4,45");
    expect(kgText(4)).toBe("4");
    expect(healthCardFilename("Cléo d'Été", "2026-10-18T10:00:00.000Z")).toBe("Carnet_de_sante_Cleo_d_Ete_2026-10-18.pdf");
  });
});
