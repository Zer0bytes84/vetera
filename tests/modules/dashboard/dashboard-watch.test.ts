import { describe, expect, it } from "vitest";
import {
  buildHospitalizedWatch,
  buildStockWatch,
  buildUpcomingReminders,
} from "@/modules/dashboard/model/dashboard-watch";
import type { Hospitalization, Product } from "@/types/db";

const now = new Date(2026, 9, 18, 10, 0);
const patients = [
  { id: "p1", name: "Milo", status: "sante" as const },
  { id: "p2", name: "Nala", status: "sante" as const },
  { id: "p3", name: "Rex", status: "decede" as const },
];

describe("rappels à venir", () => {
  const types = [
    { id: "vac", name: "Vaccin CHPL" },
    { id: "verm", name: "Vermifuge" },
  ];
  const reminder = (id: string, patient_id: string, echeance: string, statut = "en_cours", type = "vac") => ({
    id,
    patient_id,
    echeance,
    statut,
    type,
  });

  it("garde les rappels en cours, en retard ou dans l'horizon, en retard d'abord", () => {
    const list = buildUpcomingReminders({
      now,
      patients,
      types,
      reminders: [
        reminder("r1", "p1", "2026-10-25", "en_cours", "verm"),
        reminder("r2", "p2", "2026-10-12"),
        reminder("r3", "p1", "2026-10-18"),
        reminder("r4", "p1", "2026-12-01"), // hors horizon
        reminder("r5", "p2", "2026-10-20", "termine"), // terminé
        reminder("r6", "p3", "2026-10-19"), // patient décédé
      ],
    });
    expect(list.total).toBe(3);
    expect(list.critical).toBe(1);
    expect(list.rows.map((r) => [r.title, r.detail, r.tone])).toEqual([
      ["Nala", "Vaccin CHPL", "critical"],
      ["Milo", "Vaccin CHPL", "warning"],
      ["Milo", "Vermifuge", "neutral"],
    ]);
    expect(list.rows[0].meta).toMatch(/^En retard · 12 oct/);
    expect(list.rows[1].meta).toBe("Aujourd’hui");
    expect(list.rows[2].meta).toMatch(/^Le 25 oct/);
    expect(list.rows[0].patientId).toBe("p2");
  });

  it("limite l'affichage sans perdre le total", () => {
    const reminders = Array.from({ length: 6 }, (_, i) => reminder(`r${i}`, "p1", `2026-10-2${i}`));
    const list = buildUpcomingReminders({ now, patients, types, reminders, limit: 4 });
    expect(list.rows).toHaveLength(4);
    expect(list.total).toBe(6);
  });

  it("renvoie une liste vide sans rappel", () => {
    expect(buildUpcomingReminders({ now, patients, types, reminders: [] })).toEqual({
      rows: [],
      total: 0,
      critical: 0,
    });
  });
});

describe("stock à surveiller", () => {
  const product = (over: Partial<Product>): Product => ({
    id: "x",
    name: "Produit",
    category: "Médicaments",
    createdAt: "",
    minStock: 5,
    purchasePriceAmount: 0,
    quantity: 20,
    salePriceAmount: 0,
    unit: "boîte",
    ...over,
  });

  it("signale rupture, seuil, péremption proche et lot périmé", () => {
    const list = buildStockWatch({
      now,
      products: [
        product({ id: "ok", name: "OK", expiryDate: "2027-06-01" }),
        product({ id: "low", name: "Bas", quantity: 3, unit: "dose" }),
        product({ id: "out", name: "Rupture", quantity: 0 }),
        product({ id: "soon", name: "Bientôt", expiryDate: "2026-11-30" }),
        product({ id: "gone", name: "Périmé", expiryDate: "2026-10-01" }),
        product({ id: "arch", name: "Archivé", quantity: 0, archivedAt: "2026-01-01" }),
        product({ id: "svc", name: "Acte", quantity: 0, stockTracked: false }),
      ],
      limit: 10,
    });
    expect(list.total).toBe(4);
    expect(list.critical).toBe(2);
    expect(list.rows.map((r) => [r.title, r.tone])).toEqual([
      ["Périmé", "critical"],
      ["Rupture", "critical"],
      ["Bientôt", "warning"],
      ["Bas", "warning"],
    ]);
    expect(list.rows.find((r) => r.title === "Bas")?.detail).toBe("Sous le seuil de 5");
    expect(list.rows.find((r) => r.title === "Bas")?.meta).toBe("3 doses");
    expect(list.rows.find((r) => r.title === "Bientôt")?.detail).toMatch(/^Périme le 30 nov/);
  });

  it("préfère la quantité disponible et la péremption des lots quand elles existent", () => {
    const list = buildStockWatch({
      now,
      products: [
        product({ quantity: 20, availableQuantity: 2, nearestExpiryDate: "2026-10-30", expiryDate: "2028-01-01" }),
      ],
    });
    expect(list.rows[0].detail).toMatch(/^Sous le seuil de 5 · Périme le 30 oct/);
    expect(list.rows[0].meta).toBe("2 boîtes");
  });
});

describe("hospitalisés", () => {
  const stay = (over: Partial<Hospitalization>): Hospitalization =>
    ({
      id: "s",
      patientId: "p1",
      admissionDate: "2026-10-16T08:00:00",
      status: "admitted",
      createdAt: "",
      updatedAt: "",
      ...over,
    }) as Hospitalization;

  it("ne garde que les séjours en cours, état critique d'abord", () => {
    const list = buildHospitalizedWatch({
      now,
      patients,
      stays: [
        stay({ id: "a", patientId: "p1", cage: "3", diagnosis: "Gastro-entérite" }),
        stay({ id: "b", patientId: "p2", status: "critical", admissionDate: "2026-10-18T07:00:00" }),
        stay({ id: "c", status: "discharged" }),
      ],
    });
    expect(list.total).toBe(2);
    expect(list.rows.map((r) => [r.title, r.tone, r.meta])).toEqual([
      ["Nala", "critical", "J1"],
      ["Milo", "neutral", "Cage 3 · J3"],
    ]);
    expect(list.rows[1].detail).toBe("Admis · Gastro-entérite");
  });
});
