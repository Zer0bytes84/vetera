import { beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({
  values: new Map<string, string>(),
}));
vi.mock("@/services/appSettingsService", () => ({
  getSetting: async (key: string) => settings.values.get(key) ?? null,
  setSetting: async (key: string, value: string) => {
    settings.values.set(key, value);
  },
}));

import { computeDose } from "@/modules/prescriptions/lib/dose-calculator";
import {
  loadPrescriptionTemplates,
  PRESCRIPTION_TEMPLATES_KEY,
  savePrescriptionTemplates,
} from "@/modules/prescriptions/lib/prescription-template-store";
import {
  checkTemplateSafety,
  findTemplateByName,
  instantiateTemplateItems,
  parseTemplates,
  type PrescriptionTemplate,
  type PrescriptionTemplateItem,
  removeTemplate,
  renameTemplate,
  sortTemplates,
  upsertTemplate,
} from "@/modules/prescriptions/lib/prescription-templates";

const metacam: PrescriptionTemplateItem = {
  medicationId: "meloxicam",
  medicationName: "Metacam",
  medicationClass: "Anti-inflammatoire non stéroïdien (AINS)",
  dosagePerKg: 0.1,
  dosageUnit: "mg/kg",
  frequency: "1x/jour",
  duration: "5 jours",
  instructions: "Pendant le repas",
};
const clamoxyl: PrescriptionTemplateItem = {
  medicationName: "Clamoxyl",
  medicationClass: "Antibiotique - Bêta-lactamine",
  dosagePerKg: 12.5,
  dosageUnit: "mg/kg",
  concentrationMgPerMl: 50,
  frequency: "2x/jour",
  duration: "7 jours",
};

let counter = 0;
const options = (now = "2026-10-18T10:00:00.000Z") => ({
  id: () => `tpl_${++counter}`,
  now,
});

function otite(): PrescriptionTemplate {
  return upsertTemplate(
    [],
    { name: "Otite standard", items: [metacam, clamoxyl], diagnosis: "Otite externe" },
    options()
  ).saved;
}

beforeEach(() => {
  counter = 0;
  settings.values.clear();
});

describe("enregistrer un modèle", () => {
  it("garde médicaments, posologies, durées et instructions, sans doses calculées", () => {
    const withComputed = {
      ...metacam,
      computedDoseMg: 0.42,
      computedVolumeMl: 0.3,
      id: "tmp_1",
      sortOrder: 0,
    };
    const { saved, templates, replaced } = upsertTemplate(
      [],
      { name: "  Otite   standard ", items: [withComputed, clamoxyl] },
      options()
    );
    expect(replaced).toBe(false);
    expect(templates).toHaveLength(1);
    expect(saved.name).toBe("Otite standard");
    expect(saved.items[0]).toMatchObject({
      medicationName: "Metacam",
      dosagePerKg: 0.1,
      dosageUnit: "mg/kg",
      frequency: "1x/jour",
      duration: "5 jours",
      instructions: "Pendant le repas",
    });
    expect(saved.items[0]).not.toHaveProperty("computedDoseMg");
    expect(saved.items[0]).not.toHaveProperty("id");
    expect(saved.items[0]).not.toHaveProperty("sortOrder");
  });

  it("refuse un nom vide ou une ordonnance sans médicament", () => {
    expect(() => upsertTemplate([], { name: "  ", items: [metacam] }, options())).toThrow(
      "nom"
    );
    expect(() => upsertTemplate([], { name: "Vide", items: [] }, options())).toThrow(
      "au moins un médicament"
    );
  });

  it("remplace le modèle du même nom (casse et accents ignorés) en gardant son identifiant", () => {
    const first = upsertTemplate([], { name: "Gastro-entérite", items: [metacam] }, options());
    const second = upsertTemplate(
      first.templates,
      { name: "GASTRO-ENTERITE", items: [clamoxyl] },
      options("2026-10-19T08:00:00.000Z")
    );
    expect(second.replaced).toBe(true);
    expect(second.templates).toHaveLength(1);
    expect(second.saved.id).toBe(first.saved.id);
    expect(second.saved.createdAt).toBe("2026-10-18T10:00:00.000Z");
    expect(second.saved.updatedAt).toBe("2026-10-19T08:00:00.000Z");
    expect(second.saved.items.map((it) => it.medicationName)).toEqual(["Clamoxyl"]);
  });
});

describe("gérer les modèles", () => {
  it("renomme, refuse un doublon de nom, supprime", () => {
    const a = upsertTemplate([], { name: "Otite standard", items: [metacam] }, options());
    const b = upsertTemplate(a.templates, { name: "Post-chirurgie", items: [metacam] }, options());
    const renamed = renameTemplate(b.templates, a.saved.id, "Otite externe", "2026-10-20T00:00:00.000Z");
    expect(findTemplateByName(renamed, "otite externe")?.id).toBe(a.saved.id);
    expect(() => renameTemplate(renamed, a.saved.id, "post-chirurgie", "x")).toThrow("déjà ce nom");
    expect(() => renameTemplate(renamed, "inconnu", "Autre", "x")).toThrow("n'existe plus");
    expect(removeTemplate(renamed, a.saved.id).map((tpl) => tpl.name)).toEqual(["Post-chirurgie"]);
  });

  it("trie par ordre alphabétique français", () => {
    const names = ["Post-chirurgie", "Écorchure", "abcès", "Gastro-entérite"];
    let templates: PrescriptionTemplate[] = [];
    for (const name of names) {
      templates = upsertTemplate(templates, { name, items: [metacam] }, options()).templates;
    }
    expect(sortTemplates(templates).map((tpl) => tpl.name)).toEqual([
      "abcès",
      "Écorchure",
      "Gastro-entérite",
      "Post-chirurgie",
    ]);
  });
});

describe("appliquer un modèle", () => {
  it("numérote à la suite et laisse le calcul des doses au poids du patient courant", () => {
    const template = otite();
    const lines = instantiateTemplateItems(template, 2, (item, sortOrder) => {
      const computation = computeDose(
        { unit: item.dosageUnit, min: item.dosagePerKg, max: item.dosagePerKg, range: false },
        4.2,
        item.concentrationMgPerMl
      );
      return { ...item, id: `line_${sortOrder}`, sortOrder, mg: computation.computedMg, ml: computation.computedMl };
    });
    expect(lines.map((line) => line.sortOrder)).toEqual([2, 3]);
    expect(lines[0].mg).toBeCloseTo(0.42);
    expect(lines[1].mg).toBeCloseTo(52.5);
    expect(lines[1].ml).toBeCloseTo(1.05);
  });

  it("applique le contrôle de sécurité au patient courant", () => {
    const template = otite();
    const alerts = checkTemplateSafety({
      draft: [],
      patient: { allergies: "Pénicillines", chronicConditions: "Insuffisance renale debutante" },
      template,
    });
    expect(alerts.map((alert) => [alert.medicationName, alert.level])).toEqual([
      ["Metacam", "contraindication"],
      ["Clamoxyl", "contraindication"],
    ]);
    expect(checkTemplateSafety({ draft: [], patient: {}, template })).toEqual([]);
  });

  it("signale les interactions avec l'ordonnance en cours et les traitements actifs", () => {
    const template = otite();
    const withDraft = checkTemplateSafety({
      draft: [{ key: "d1", name: "Dermipred", className: "Corticostéroïde" }],
      patient: null,
      template,
    });
    expect(withDraft).toHaveLength(1);
    expect(withDraft[0]).toMatchObject({ level: "interaction", medicationName: "Metacam" });

    const withActive = checkTemplateSafety({
      active: [{ key: "a1", name: "Rimadyl", aliases: ["Carprofène"], className: "AINS", prescribedOn: "2026-10-15" }],
      draft: [],
      patient: null,
      template,
    });
    expect(withActive.some((alert) => alert.other?.origin === "traitement")).toBe(true);
  });
});

describe("stockage local", () => {
  it("relit ce qui a été enregistré", async () => {
    const template = otite();
    await savePrescriptionTemplates([template]);
    expect(settings.values.has(PRESCRIPTION_TEMPLATES_KEY)).toBe(true);
    expect(await loadPrescriptionTemplates()).toEqual([template]);
  });

  it("renvoie une liste vide sans modèle enregistré", async () => {
    expect(await loadPrescriptionTemplates()).toEqual([]);
  });

  it("signale un stockage illisible au lieu de le remplacer silencieusement", async () => {
    settings.values.set(PRESCRIPTION_TEMPLATES_KEY, "pas du json");
    await expect(loadPrescriptionTemplates()).rejects.toThrow();
    settings.values.set(PRESCRIPTION_TEMPLATES_KEY, "{}");
    await expect(loadPrescriptionTemplates()).rejects.toThrow("illisibles");
  });

  it("écarte les entrées incomplètes et corrige les unités inconnues", () => {
    const raw = JSON.stringify([
      { id: "x", name: "", items: [metacam] },
      { id: "y", name: "Sans ligne", items: [] },
      { id: "z", name: "Valide", items: [{ ...metacam, dosageUnit: "g/kg" }, { medicationName: "" }] },
      null,
    ]);
    const parsed = parseTemplates(raw);
    expect(parsed.map((tpl) => tpl.name)).toEqual(["Valide"]);
    expect(parsed[0].items).toHaveLength(1);
    expect(parsed[0].items[0].dosageUnit).toBe("mg/kg");
  });
});
