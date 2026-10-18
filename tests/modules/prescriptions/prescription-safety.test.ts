import { describe, expect, it } from "vitest";
import {
  checkPrescriptionSafety,
  collectActiveTreatments,
  durationToDays,
  isTreatmentActive,
  matchesKeyword,
  medicationGroups,
  normalizeMedicalText,
  type SafetyMedication,
} from "@/modules/prescriptions/lib/prescription-safety";
import type { Prescription, PrescriptionItem } from "@/types/db";

const metacam: SafetyMedication = {
  key: "d1",
  name: "Metacam",
  aliases: ["Méloxicam"],
  className: "Anti-inflammatoire non stéroïdien (AINS)",
};
const dermipred: SafetyMedication = {
  key: "d2",
  name: "Dermipred",
  aliases: ["Prednisolone"],
  className: "Corticostéroïde",
};
const clamoxyl: SafetyMedication = {
  key: "d3",
  name: "Clamoxyl",
  aliases: ["Amoxicilline"],
  className: "Antibiotique - Bêta-lactamine",
};

describe("normalisation des noms", () => {
  it("ignore casse, accents et ponctuation", () => {
    expect(normalizeMedicalText("  MÉLOXICAM (Metacam®) ")).toBe(
      "meloxicam metacam"
    );
    expect(matchesKeyword("Anti-inflammatoire non stéroïdien", "anti inflammatoire")).toBe(true);
    expect(matchesKeyword("PÉNICILLINES", "penicilline")).toBe(true);
  });

  it("ne reconnaît un mot-clé qu'en début de mot", () => {
    expect(matchesKeyword("Plaines", "ains")).toBe(false);
    expect(matchesKeyword("Classe AINS", "ains")).toBe(true);
  });

  it("classe un médicament par nom commercial, DCI ou classe", () => {
    expect(medicationGroups({ key: "x", name: "RIMADYL" }).has("ains")).toBe(true);
    expect(medicationGroups({ key: "x", name: "Produit X", className: "AINS" }).has("ains")).toBe(true);
    expect(medicationGroups(dermipred).has("corticoide")).toBe(true);
    expect(medicationGroups(dermipred).has("ains")).toBe(false);
  });
});

describe("interactions médicamenteuses", () => {
  it("signale AINS + corticoïde dans la même ordonnance", () => {
    const alerts = checkPrescriptionSafety({ draft: [metacam, dermipred] });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      level: "interaction",
      ruleId: "ains-corticoide",
      medicationKey: "d2",
      medicationName: "Dermipred",
      other: { key: "d1", name: "Metacam", origin: "ordonnance" },
    });
    expect(alerts[0].reason).toMatch(/ulcération/);
  });

  it("signale deux AINS différents, dont un traitement en cours", () => {
    const alerts = checkPrescriptionSafety({
      draft: [metacam],
      active: [
        { key: "a1", name: "Rimadyl", aliases: ["Carprofène"], prescribedOn: "2026-10-15" },
      ],
    });
    expect(alerts.map((a) => a.ruleId)).toEqual(["ains-ains"]);
    expect(alerts[0].other).toMatchObject({ origin: "traitement", prescribedOn: "2026-10-15" });
  });

  it("signale un doublon de molécule plutôt qu'une règle de classe", () => {
    const alerts = checkPrescriptionSafety({
      draft: [metacam],
      active: [{ key: "a1", name: "méloxicam" }],
    });
    expect(alerts.map((a) => a.ruleId)).toEqual(["doublon"]);
    expect(alerts[0].reason).toMatch(/déjà en cours/);
  });

  it("ne signale rien pour des médicaments compatibles", () => {
    expect(checkPrescriptionSafety({ draft: [metacam, clamoxyl] })).toEqual([]);
  });
});

describe("contre-indications", () => {
  it("signale l'amoxicilline face à une allergie aux pénicillines", () => {
    const alerts = checkPrescriptionSafety({
      draft: [clamoxyl],
      patient: { allergies: "Allergie aux PENICILLINES ; poussière" },
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      level: "contraindication",
      ruleId: "allergie-penicilline",
      patientFinding: { field: "allergies", text: "Allergie aux PENICILLINES" },
    });
  });

  it("signale un AINS face à une insuffisance rénale (sans accents)", () => {
    const alerts = checkPrescriptionSafety({
      draft: [metacam],
      patient: { chronicConditions: "Insuffisance renale debutante" },
    });
    expect(alerts.map((a) => [a.level, a.ruleId])).toEqual([
      ["contraindication", "ains-rein-foie"],
    ]);
  });

  it("signale une allergie qui nomme directement le médicament", () => {
    const alerts = checkPrescriptionSafety({
      draft: [{ key: "d9", name: "Convenia", aliases: ["Céfovécine"] }],
      patient: { allergies: "Réaction à la céfovécine" },
    });
    expect(alerts.map((a) => a.ruleId)).toEqual(["allergie-directe"]);
  });

  it("ignore une sensibilité sans rapport", () => {
    expect(
      checkPrescriptionSafety({
        draft: [metacam, clamoxyl],
        patient: { allergies: "Sensibilite digestive", chronicConditions: "" },
      })
    ).toEqual([]);
  });
});

describe("traitements en cours", () => {
  it("lit les durées libres", () => {
    expect(durationToDays("5-7 jours")).toBe(7);
    expect(durationToDays("14 j")).toBe(14);
    expect(durationToDays("2 semaines")).toBe(14);
    expect(durationToDays("1,5 mois")).toBe(45);
    expect(durationToDays("À vie")).toBe(Number.POSITIVE_INFINITY);
    expect(durationToDays("Dose unique")).toBe(1);
    expect(durationToDays("Court terme")).toBeNull();
    expect(durationToDays("")).toBeNull();
  });

  it("décide si une ligne est encore active", () => {
    const now = new Date("2026-10-18T10:00:00");
    expect(isTreatmentActive("2026-10-15T09:00:00", "7 jours", now)).toBe(true);
    expect(isTreatmentActive("2026-10-01T09:00:00", "7 jours", now)).toBe(false);
    expect(isTreatmentActive("2025-01-01T09:00:00", "à vie", now)).toBe(true);
    // Durée illisible : 14 jours par défaut.
    expect(isTreatmentActive("2026-10-10T09:00:00", "Court terme", now)).toBe(true);
    expect(isTreatmentActive("2026-09-01T09:00:00", "", now)).toBe(false);
  });

  it("ne garde que les lignes actives des ordonnances signées du patient", () => {
    const now = new Date("2026-10-18T10:00:00");
    const base = { createdAt: "", updatedAt: "", templateVersion: "1.0" };
    const prescriptions: Prescription[] = [
      { ...base, id: "p1", patientId: "pat", appointmentId: "apt1", prescriptionDate: "2026-10-15", status: "signed" },
      { ...base, id: "p2", patientId: "pat", appointmentId: "apt2", prescriptionDate: "2026-10-15", status: "cancelled" },
      { ...base, id: "p3", patientId: "pat", appointmentId: "apt3", prescriptionDate: "2026-10-15", status: "draft" },
      { ...base, id: "p4", patientId: "autre", appointmentId: "apt4", prescriptionDate: "2026-10-15", status: "signed" },
      { ...base, id: "p5", patientId: "pat", appointmentId: "current", prescriptionDate: "2026-10-18", status: "signed" },
    ];
    const item = (id: string, prescriptionId: string, duration: string): PrescriptionItem => ({
      id,
      prescriptionId,
      duration,
      medicationName: `Med ${id}`,
      medicationId: "meloxicam",
      dosagePerKg: 0.1,
      dosageUnit: "mg/kg",
      frequency: "1x/jour",
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    });
    const active = collectActiveTreatments({
      patientId: "pat",
      excludeAppointmentId: "current",
      now,
      prescriptions,
      items: [
        item("i1", "p1", "10 jours"),
        item("i2", "p1", "1 jour"),
        item("i3", "p2", "10 jours"),
        item("i4", "p3", "10 jours"),
        item("i5", "p4", "10 jours"),
        item("i6", "p5", "10 jours"),
      ],
      resolveAliases: () => ["Méloxicam"],
    });
    expect(active).toEqual([
      {
        key: "i1",
        name: "Med i1",
        className: undefined,
        aliases: ["Méloxicam"],
        prescribedOn: "2026-10-15",
      },
    ]);
  });
});
