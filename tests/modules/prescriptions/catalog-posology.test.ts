import { describe, expect, it } from "vitest";

import { computeDose, parseCatalogPosology, parsePosology, prescriptionUnitFor } from "@/modules/prescriptions/lib/dose-calculator";
import { vetKnowledgeService } from "@/services/vetKnowledgeService";

describe("posologie du catalogue pour pré-remplir une ligne", () => {
  it("reprend la dose d'attaque du méloxicam chat et garde le schéma", () => {
    expect(parseCatalogPosology("0.1 mg/kg J1 puis 0.05 mg/kg")).toEqual({
      posology: { unit: "mg/kg", min: 0.1, max: 0.1, range: false },
      remainder: "J1 puis 0.05 mg/kg",
    });
    // Données réelles du catalogue embarqué.
    const meloxicam = vetKnowledgeService.getAllMedications().find((med) => med.nom === "Méloxicam");
    expect(parseCatalogPosology(meloxicam!.posologies!.chat!.dose)?.posology.min).toBe(0.1);
    expect(parseCatalogPosology(meloxicam!.posologies!.chien!.dose)?.posology.min).toBe(0.2);
  });

  it("garde le comportement strict pour une posologie déjà lisible", () => {
    expect(parseCatalogPosology("10-20 mg/kg")).toEqual({
      posology: parsePosology("10-20 mg/kg"),
      remainder: "",
    });
  });

  it("accepte un qualificatif sans autre valeur", () => {
    expect(parseCatalogPosology("2-3 mg/kg IV (prémédiqué)")).toMatchObject({
      posology: { unit: "mg/kg", min: 2, max: 3, range: true },
      remainder: "IV (prémédiqué)",
    });
  });

  it("ne choisit pas à la place du vétérinaire entre plusieurs doses", () => {
    expect(parseCatalogPosology("5-10 mg/kg IM ou 2-4 mg/kg IV (induction)")).toBeNull();
    expect(parseCatalogPosology("4-6 mg/kg IV (après prémédication), 6-8 mg/kg (sans)")).toBeNull();
    expect(parseCatalogPosology("1-2 mg/kg (minimum 1 mg/kg)")).toBeNull();
    expect(parseCatalogPosology("50 mg/chat ou 5-10 mg/kg")).toBeNull();
    expect(parseCatalogPosology("Selon poids (pipette adaptée)")).toBeNull();
    expect(parseCatalogPosology("2-5 µg/kg bolus IV puis 2-5 µg/kg/h CRI")).toBeNull();
    expect(parseCatalogPosology("")).toBeNull();
  });
});

describe("unités de dose", () => {
  it("lit mL/kg et UI/kg quelle que soit la casse, et garde l'écriture canonique", () => {
    expect(parsePosology("0.5 mL/kg")).toEqual({ unit: "mL/kg", min: 0.5, max: 0.5, range: false });
    expect(parsePosology("0.25-0.5 UI/kg")).toEqual({ unit: "UI/kg", min: 0.25, max: 0.5, range: true });
    expect(parsePosology("0,5 ML/KG")?.unit).toBe("mL/kg");
    expect(parsePosology("10-20 mg/kg")?.unit).toBe("mg/kg");
    expect(parsePosology("20 mg / kg")?.unit).toBe("mg/kg");
  });

  it("donne l'unité de ligne : une dose en mg est une dose totale", () => {
    expect(prescriptionUnitFor("mg")).toBe("mg/tot");
    expect(prescriptionUnitFor("mg/kg")).toBe("mg/kg");
    expect(prescriptionUnitFor("mL/kg")).toBe("mL/kg");
    expect(prescriptionUnitFor("UI/kg")).toBe("UI/kg");
    expect(prescriptionUnitFor("mL")).toBeNull();
    expect(prescriptionUnitFor("mg/mL")).toBeNull();
  });

  it("calcule le volume du lactulose à partir des mL/kg", () => {
    const parsed = parsePosology("0.5 mL/kg")!;
    expect(computeDose(parsed, 4).computedMl).toBe(2);
  });

  it("lit désormais les posologies du catalogue en mL/kg, UI/kg et mg total", () => {
    const meds = vetKnowledgeService.getAllMedications();
    const dose = (nom: string, espece: string) => meds.find((med) => med.nom === nom)!.posologies[espece].dose;
    expect(parsePosology(dose("Lactulose", "chat"))).toMatchObject({ unit: "mL/kg", min: 0.5 });
    expect(parsePosology(dose("Insuline porcine (lente)", "chat"))).toMatchObject({ unit: "UI/kg", min: 0.25, max: 0.5 });
    const methimazole = parsePosology(dose("Méthimazole", "chat"))!;
    expect(methimazole).toMatchObject({ unit: "mg", min: 2.5 });
    expect(prescriptionUnitFor(methimazole.unit)).toBe("mg/tot");
  });
});
