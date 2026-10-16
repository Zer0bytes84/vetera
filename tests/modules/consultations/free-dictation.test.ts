import { describe, expect, it } from "vitest";
import { buildFreeDictationDraft } from "../../../src/modules/consultations/local-ai/free-dictation";

describe("brouillon de dictée libre sans modèle", () => {
  it("conserve le traitement dicté avec sa durée mot pour mot en Plan", () => {
    const treatment = "Nala a besoin d’un traitement antibiotique pendant 7 jours.";
    const note = buildFreeDictationDraft(`Nala tousse depuis hier. Examen : température 38,5 °C. Évaluation : cause bactérienne. ${treatment}`);
    expect(note.plan).toBe(treatment);
    expect(note.assessment).toContain("cause bactérienne");
    expect(note.objective).toContain("38,5 °C");
    expect(note.subjective).not.toContain("traitement");
  });
  it("préserve une consigne humaine sans calculer de dose ni changer sa négation", () => {
    const sentence = "Ne lui donnez surtout pas d’ibuprofène.";
    expect(buildFreeDictationDraft(sentence).plan).toBe(sentence);
    const input = "Je lui donne Synulox 5 mg pendant 7 jours.";
    expect(buildFreeDictationDraft(input).plan).toBe(input);
  });
});
