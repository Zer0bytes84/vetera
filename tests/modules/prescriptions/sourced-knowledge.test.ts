import { describe, expect, it } from "vitest";

import rcpData from "@/data/vet-knowledge/medications-rcp.json";
import { parsePosology, prescriptionUnitFor } from "@/modules/prescriptions/lib/dose-calculator";
import { checkPrescriptionSafety, type SafetyMedication } from "@/modules/prescriptions/lib/prescription-safety";
import {
  CONTRAINDICATION_RULES,
  INTERACTION_RULES,
  SAFETY_GROUPS,
} from "@/modules/prescriptions/lib/prescription-safety-rules";
import { vetKnowledgeService } from "@/services/vetKnowledgeService";

const RCP_URL = /^https:\/\/www\.ircp\.anmv\.anses\.fr\/rcp\.aspx\?NomMedicament=\S+$/;
const meds = rcpData.rcpMedications;

const med = (key: string, name: string, className = ""): SafetyMedication => ({ key, name, className });

describe("molécules sourcées sur les RCP officiels", () => {
  it("chaque fiche cite au moins un RCP de l'ANMV, avec rubriques et date", () => {
    expect(meds.length).toBe(24);
    for (const entry of meds) {
      expect(entry.sources.length, entry.id).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source.url, entry.id).toMatch(RCP_URL);
        expect(source.titre, entry.id).toMatch(/^RCP .+ \(ANMV, Index des RCP\)$/);
        expect(source.sections, entry.id).toMatch(/^3\.\d/);
        expect(source.consulteLe, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("s'ajoutent au catalogue sans écraser ni dupliquer une molécule existante", () => {
    const all = vetKnowledgeService.getAllMedications();
    const ids = all.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(all.length).toBe(78 + 24);
    expect(all.find((entry) => entry.id === "amoxicilline")?.sources).toBeUndefined();
    expect(all.find((entry) => entry.id === "telmisartan")?.sources?.[0].url).toMatch(RCP_URL);
  });

  it("toute dose lisible se traduit en une unité de ligne valide", () => {
    for (const entry of meds) {
      for (const [espece, poso] of Object.entries(entry.posologies)) {
        const parsed = parsePosology(poso.dose);
        if (parsed) {
          expect(prescriptionUnitFor(parsed.unit), `${entry.id} ${espece}`).not.toBeNull();
        }
      }
    }
    // Quelques doses reprises du RCP, telles quelles.
    const dose = (id: string, espece: string) => meds.find((entry) => entry.id === id)!.posologies[espece as "chien"].dose;
    expect(parsePosology(dose("telmisartan", "chat"))).toMatchObject({ unit: "mg/kg", min: 1 });
    expect(parsePosology(dose("carbimazole", "chat"))).toMatchObject({ unit: "mg", min: 15 });
    expect(parsePosology(dose("acide-tolfenamique", "chien"))).toMatchObject({ unit: "mg/kg", min: 4 });
    // Doses non calculables par kg : laissées au vétérinaire.
    expect(parsePosology(dose("propentofylline", "chien"))).toBeNull();
    expect(parsePosology(dose("atipamezole", "chien"))).toBeNull();
  });
});

describe("règles de sécurité sourcées", () => {
  it("chaque règle sourcée cite un RCP de l'ANMV et ne vise que des groupes connus", () => {
    const sourced = [...INTERACTION_RULES, ...CONTRAINDICATION_RULES].filter((rule) => rule.source);
    expect(sourced.length).toBe(40);
    for (const rule of sourced) {
      expect(rule.source!.url, rule.id).toMatch(RCP_URL);
      expect(rule.source!.label, rule.id).toMatch(/^RCP .+ \(ANMV\)$/);
    }
    const groups = new Set(Object.keys(SAFETY_GROUPS));
    for (const rule of INTERACTION_RULES) for (const group of rule.between) expect(groups.has(group), rule.id).toBe(true);
    for (const rule of CONTRAINDICATION_RULES) expect(groups.has(rule.group), rule.id).toBe(true);
    const ids = [...INTERACTION_RULES, ...CONTRAINDICATION_RULES].map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("signale les interactions des RCP, avec leur source", () => {
    const cases: [SafetyMedication, SafetyMedication, string][] = [
      [med("a", "Vidalta"), med("b", "Panacur"), "antithyroidien-benzimidazole"],
      [med("a", "Felimazole"), med("b", "Gardenal"), "antithyroidien-phenobarbital"],
      [med("a", "Propalin"), med("b", "Selgian"), "sympathomimetique-imao"],
      [med("a", "Zitac"), med("b", "Diazépam"), "cimetidine-marge-etroite"],
      [med("a", "Loperal"), med("b", "Amlodipine"), "loperamide-inhibiteur-calcique"],
      [med("a", "Libromide"), med("b", "Dimazon"), "bromure-diuretique-anse"],
      [med("a", "Antisedan"), med("b", "Vetergesic"), "atipamezole-opiace"],
      [med("a", "Vasotop"), med("b", "Prilactone"), "ieca-epargne-k"],
      [med("a", "Telmitraxx"), med("b", "Fortekor"), "ara2-ieca"],
      [med("a", "Calmagine"), med("b", "Dexadreson"), "metamizole-corticoide"],
      [med("a", "Vitamivet K1"), med("b", "Aspirine"), "vitamine-k-salicyle"],
      [med("a", "Torbugesic"), med("b", "Méthadone"), "butorphanol-agoniste-mu"],
    ];
    for (const [a, b, ruleId] of cases) {
      const alerts = checkPrescriptionSafety({ draft: [a, b], patient: null });
      const alert = alerts.find((entry) => entry.ruleId === ruleId);
      expect(alert, ruleId).toBeDefined();
      expect(alert!.source?.url, ruleId).toMatch(RCP_URL);
    }
  });

  it("n'invente pas d'interaction : l'atipamézole n'est pas un agoniste alpha-2", () => {
    const alerts = checkPrescriptionSafety({ draft: [med("a", "Antisedan"), med("b", "Torbugesic")], patient: null });
    expect(alerts.map((alert) => alert.ruleId)).toEqual(["atipamezole-opiace"]);
    expect(checkPrescriptionSafety({ draft: [med("a", "Capstar"), med("b", "Milteforan")], patient: null })).toEqual([]);
  });

  it("une seule alerte par couple AINS même pour les AINS ajoutés", () => {
    const alerts = checkPrescriptionSafety({ draft: [med("a", "Tolfedine"), med("b", "Metacam")], patient: null });
    expect(alerts.map((alert) => alert.ruleId)).toEqual(["ains-ains"]);
  });

  it("signale les contre-indications des RCP face au dossier", () => {
    const check = (name: string, conditions: string, allergies = "") =>
      checkPrescriptionSafety({ draft: [med("a", name)], patient: { chronicConditions: conditions, allergies } }).map((alert) => alert.ruleId);
    expect(check("Loperal", "Mutation MDR1")).toContain("loperamide-mdr1");
    expect(check("Vidalta", "Diabète sucré")).toContain("antithyroidien-terrain");
    expect(check("Vidalta", "", "Thiamazole")).toContain("antithyroidien-allergie");
    expect(check("Glucantime", "Insuffisance rénale chronique")).toContain("antimonie-organes");
    expect(check("Galastop", "Chienne gestante")).toContain("cabergoline-gestation");
    expect(check("Rompun", "Torsion gastrique opérée")).toContain("xylazine-organes");
    expect(check("Telmitraxx", "Lactation")).toContain("telmisartan-gestation");
    expect(check("Tolfedine", "Insuffisance cardiaque")).toContain("tolfenamique-coeur-foie");
    expect(check("Capstar", "Insuffisance rénale chronique")).toEqual([]);
  });
});
