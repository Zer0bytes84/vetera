import { describe, expect, it } from "vitest";

import {
  ageLabel,
  buildHealthCard,
  type HealthCardInput,
  splitClinicalList,
  vaccineStatus,
} from "@/modules/patients/health-card/health-card-data";
import type {
  Appointment,
  Patient,
  Prescription,
  PrescriptionItem,
  Vaccination,
  WeightEntry,
} from "@/types/db";

const NOW = new Date("2026-10-18T10:00:00");

const patient: Patient = {
  id: "p1",
  name: "Milo",
  species: "Chat",
  breed: "Européen",
  sex: "M",
  sterilized: true,
  dateOfBirth: "2022-08-09",
  ownerId: "o1",
  status: "traitement",
  createdAt: "2026-08-04",
  allergies: "Pénicillines ; poulet",
  chronicConditions: "Insuffisance rénale",
};

function input(overrides: Partial<HealthCardInput> = {}): HealthCardInput {
  return {
    appointments: [],
    hospitalizations: [],
    items: [],
    now: NOW,
    owner: { id: "o1", firstName: "Karim", lastName: "Benali", phone: "0550", createdAt: "" },
    patient,
    prescriptions: [],
    vaccinations: [],
    weights: [],
    ...overrides,
  };
}

const vaccine = (id: string, name: string, administeredAt: string, nextDueAt?: string, patientId = "p1"): Vaccination => ({
  id, patientId, vaccineName: name, administeredAt, nextDueAt, createdAt: "", updatedAt: "",
});
const weight = (id: string, measuredAt: string, weightKg: number, patientId = "p1"): WeightEntry => ({
  id, patientId, measuredAt, weightKg, createdAt: "", updatedAt: "",
});
const visit = (id: string, startTime: string, type: Appointment["type"], extra: Partial<Appointment> = {}): Appointment => ({
  id, patientId: "p1", ownerId: "o1", vetId: "v1", startTime, endTime: startTime, title: `${type} ${id}`,
  type, status: "completed", createdAt: "", ...extra,
});

describe("identité", () => {
  it("calcule l'âge sans l'inventer", () => {
    expect(ageLabel("2022-08-09", NOW)).toBe("4 ans 2 mois");
    expect(ageLabel("2026-02-18", NOW)).toBe("8 mois");
    expect(ageLabel("2026-09-27", NOW)).toBe("3 semaines");
    expect(ageLabel(undefined, NOW)).toBeUndefined();
    expect(ageLabel("2027-01-01", NOW)).toBeUndefined();
  });

  it("reprend espèce, race, sexe, propriétaire, et n'embarque qu'une photo locale", () => {
    const card = buildHealthCard(input());
    expect(card.identity).toMatchObject({
      name: "Milo", species: "Chat", breed: "Européen", sexLabel: "Mâle castré",
      ageLabel: "4 ans 2 mois", ownerName: "Karim Benali", ownerPhone: "0550",
    });
    expect(card.identity.photoDataUrl).toBeUndefined();
    const withRemote = buildHealthCard(input({ patient: { ...patient, avatarUrl: "https://exemple.fr/chat.png" } }));
    expect(withRemote.identity.photoDataUrl).toBeUndefined();
    const withLocal = buildHealthCard(input({ patient: { ...patient, avatarUrl: "data:image/png;base64,iVBORw0KGgo=" } }));
    expect(withLocal.identity.photoDataUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
  });
});

describe("alertes", () => {
  it("met allergies, vaccins en retard puis affections en tête", () => {
    const card = buildHealthCard(input({
      vaccinations: [vaccine("v1", "Rage", "2025-09-01", "2026-09-01")],
    }));
    expect(card.alerts.map((alert) => [alert.kind, alert.title])).toEqual([
      ["allergy", "Pénicillines"],
      ["allergy", "poulet"],
      ["vaccine_overdue", "Rage"],
      ["condition", "Insuffisance rénale"],
    ]);
  });

  it("n'affiche aucune alerte quand le dossier n'en contient pas", () => {
    const card = buildHealthCard(input({ patient: { ...patient, allergies: undefined, chronicConditions: "  " } }));
    expect(card.alerts).toEqual([]);
    expect(splitClinicalList("A, B\nC • D")).toEqual(["A", "B", "C", "D"]);
  });
});

describe("vaccinations", () => {
  it("classe l'état des rappels", () => {
    expect(vaccineStatus("2026-10-17", NOW)).toBe("overdue");
    expect(vaccineStatus("2026-10-18", NOW)).toBe("due_soon");
    expect(vaccineStatus("2026-11-17", NOW)).toBe("due_soon");
    expect(vaccineStatus("2026-12-31", NOW)).toBe("up_to_date");
    expect(vaccineStatus(undefined, NOW)).toBe("no_reminder");
  });

  it("garde la dernière injection de chaque vaccin, les rappels urgents d'abord", () => {
    const card = buildHealthCard(input({
      vaccinations: [
        vaccine("a", "Typhus", "2024-10-01", "2025-10-01"),
        vaccine("b", "Typhus", "2025-10-10", "2026-10-25"),
        vaccine("c", "Rage", "2026-03-01", "2027-03-01"),
        vaccine("d", "Leucose", "2025-01-01"),
        vaccine("e", "Rage", "2026-06-01", "2027-06-01", "autre"),
      ],
    }));
    expect(card.vaccinations.totalInjections).toBe(4);
    expect(card.vaccinations.current.map((v) => [v.name, v.status])).toEqual([
      ["Typhus", "due_soon"],
      ["Rage", "up_to_date"],
      ["Leucose", "no_reminder"],
    ]);
    // Le rappel de 2025 a été fait : pas d'alerte de retard.
    expect(card.alerts.some((alert) => alert.kind === "vaccine_overdue")).toBe(false);
  });
});

describe("traitements en cours", () => {
  const prescription = (id: string, date: string, status: Prescription["status"] = "signed"): Prescription => ({
    id, appointmentId: `a_${id}`, patientId: "p1", prescriptionDate: date, status, templateVersion: "1",
    createdAt: date, updatedAt: date,
  });
  const item = (id: string, prescriptionId: string, name: string, duration: string, extra: Partial<PrescriptionItem> = {}): PrescriptionItem => ({
    id, prescriptionId, medicationName: name, dosagePerKg: 0.05, dosageUnit: "mg/kg",
    frequency: "1x/jour", duration, sortOrder: 0, createdAt: "", ...extra,
  } as PrescriptionItem);

  it("ne garde que les lignes signées ou délivrées encore actives, avec leur fin", () => {
    const card = buildHealthCard(input({
      prescriptions: [
        prescription("r1", "2026-10-15T10:00:00"),
        prescription("r2", "2026-09-01"),
        prescription("r3", "2026-10-16", "draft"),
        prescription("r4", "2026-01-01", "dispensed"),
      ],
      items: [
        item("i1", "r1", "Metacam", "7 jours", { computedDoseMg: 0.21 }),
        item("i2", "r2", "Clamoxyl", "7 jours"),
        item("i3", "r3", "Brouillon", "7 jours"),
        item("i4", "r4", "Fortekor", "à vie"),
      ],
    }));
    expect(card.treatments.items.map((t) => [t.name, t.dose, t.until])).toEqual([
      ["Metacam", "0,21 mg", new Date("2026-10-21T00:00:00").toISOString()],
      ["Fortekor", "0,05 mg/kg", "long_cours"],
    ]);
  });
});

describe("poids et antécédents", () => {
  it("trie les pesées et calcule l'écart avec la précédente", () => {
    const card = buildHealthCard(input({
      weights: [weight("w2", "2026-09-01", 4.6), weight("w1", "2026-03-01", 4.2), weight("w3", "2026-10-01", 4.45), weight("x", "2026-10-02", 9, "autre")],
    }));
    expect(card.weight.points.map((p) => p.kg)).toEqual([4.2, 4.6, 4.45]);
    expect(card.weight.current?.kg).toBe(4.45);
    expect(card.weight.deltaKg).toBe(-0.15);
    expect(buildHealthCard(input()).weight.current).toBeUndefined();
  });

  it("privilégie chirurgies, urgences et hospitalisations, sans annulés ni futurs", () => {
    const card = buildHealthCard(input({
      appointments: [
        visit("c1", "2026-01-10T09:00:00", "Consultation", { diagnosis: "Gingivite" }),
        visit("s1", "2025-05-02T09:00:00", "Chirurgie", { reason: "Castration" }),
        visit("x1", "2026-02-01T09:00:00", "Chirurgie", { status: "cancelled" }),
        visit("f1", "2026-12-01T09:00:00", "Urgence", { status: "scheduled" }),
        visit("v1", "2026-03-01T09:00:00", "Vaccin"),
      ],
      hospitalizations: [{
        id: "h1", patientId: "p1", admissionDate: "2026-06-01T08:00:00", reason: "Déshydratation",
        status: "discharged", templateVersion: "1", createdAt: "", updatedAt: "",
      } as never],
    }));
    expect(card.history.events.map((e) => [e.kind, e.title])).toEqual([
      ["Hospitalisation", "Déshydratation"],
      ["Consultation", "Gingivite"],
      ["Chirurgie", "Castration"],
    ]);
  });
});
