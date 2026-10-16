import { describe, expect, it } from "vitest";
import {
  assembleGuidedNote,
  guidedTranscript,
} from "@/modules/consultations/local-ai/guided-soap";
import { EMPTY_SOAP } from "@/modules/consultations/local-ai/soap-schema";

describe("dictée guidée SOAP", () => {
  it("conserve les antibiotiques et le vaccin exclusivement dans le plan choisi", () => {
    const answers = {
      ...EMPTY_SOAP,
      plan: "Antibiotiques et vaccin à prévoir.",
    };
    expect(assembleGuidedNote(EMPTY_SOAP, answers)).toEqual(answers);
  });
  it("n'interprète jamais les mots-clés d'une rubrique dictée", () => {
    const answers = {
      subjective: "Le propriétaire parle d'un vaccin.",
      objective: "Évaluation : température 39 °C.",
      assessment: "Examen évoquant une infection.",
      plan: "Traitement et contrôle.",
    };
    expect(assembleGuidedNote(EMPTY_SOAP, answers)).toEqual(answers);
  });
  it("laisse les rubriques passées vides sans ajouter de faits", () => {
    expect(
      assembleGuidedNote(EMPTY_SOAP, {
        ...EMPTY_SOAP,
        objective: "Auscultation normale.",
      }),
    ).toEqual({ ...EMPTY_SOAP, objective: "Auscultation normale." });
  });
  it("remplace la rubrique renseignée et préserve les autres", () => {
    const existing = {
      ...EMPTY_SOAP,
      subjective: "Antécédent connu.",
      plan: "Suivi existant.",
    };
    expect(
      assembleGuidedNote(existing, {
        ...EMPTY_SOAP,
        plan: "Vaccin à prévoir.",
      }),
    ).toEqual({ ...existing, plan: "Vaccin à prévoir." });
    expect(existing.plan).toBe("Suivi existant.");
  });
  it("conserve une posologie humaine à l'identique sans calcul ni déplacement", () => {
    const answers = {
      ...EMPTY_SOAP,
      plan: "Le vétérinaire a dicté : 5 mg, une fois par jour.",
    };
    expect(assembleGuidedNote(EMPTY_SOAP, answers)).toEqual(answers);
  });
  it("refuse un brouillon entièrement vide", () => {
    expect(() => assembleGuidedNote(EMPTY_SOAP, EMPTY_SOAP)).toThrow();
  });
  it("refuse une nouvelle rubrique trop longue au lieu de tronquer", () => {
    expect(() =>
      assembleGuidedNote(
        { ...EMPTY_SOAP, plan: "x".repeat(5990) },
        { ...EMPTY_SOAP, plan: "y".repeat(6001) },
      ),
    ).toThrow();
  });
  it("ne duplique jamais une rubrique après deux validations identiques", () => {
    const answers = { ...EMPTY_SOAP, assessment: "Cause bactérienne" };
    const first = assembleGuidedNote(
      { ...EMPTY_SOAP, assessment: "Perte de poids" },
      answers,
    );
    expect(assembleGuidedNote(first, answers)).toEqual(first);
    expect(first.assessment).toBe("Cause bactérienne");
  });
  it("ne réintroduit pas une ancienne rubrique après extraction de traitement puis génération", () => {
    const existing = { ...EMPTY_SOAP, subjective: "Ancien motif", objective: "Examen existant" };
    const answers = { ...EMPTY_SOAP, subjective: "Il a besoin de Synulox pendant 5 jours." };
    const source = assembleGuidedNote(EMPTY_SOAP, answers);
    const note = assembleGuidedNote(existing, source, answers);
    expect(note.subjective).toBe("");
    expect(note.plan).toContain("Il a besoin de Synulox pendant 5 jours.");
    expect(note.objective).toBe(existing.objective);
  });
  it("conserve une trace ordonnée des seules réponses humaines", () => {
    expect(
      guidedTranscript({
        ...EMPTY_SOAP,
        subjective: " Toux. ",
        plan: "Vaccin.",
      }),
    ).toBe("S · Motif et antécédents\nToux.\n\nP · Plan de soins\nVaccin.");
  });
});
