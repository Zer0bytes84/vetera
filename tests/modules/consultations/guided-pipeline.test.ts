import { describe, expect, it } from "vitest";
import { modelScaffold } from "@/modules/consultations/local-ai/soap-pipeline";
import { mergeGuidedProtected, prepareModelDictation, routeGuidedTreatments } from "@/modules/consultations/local-ai/treatment-routing";
import { guidedDictationTranscript } from "@/modules/consultations/local-ai/guided-soap";
import { containsDosage, EMPTY_SOAP } from "@/modules/consultations/local-ai/soap-schema";
import cas from "../../../scripts/eval-local-ai/cas-reference/otite-max.json";

// Rubric answers of the field test's reference case (fictional patient "Max").
const answers = cas.rubriques;

describe("note du cas de référence dictée par rubriques", () => {
  it("le texte unique envoyé le jour du test perdait les rubriques : « Motif et » restait en S et un antécédent partait au Plan", () => {
    const scaffold = modelScaffold(guidedDictationTranscript(answers));
    expect(scaffold.subjective.startsWith("Motif et ")).toBe(true);
    // Ancien chemin : cette phrase d'antécédent était replacée dans le Plan.
    expect(prepareModelDictation(guidedDictationTranscript(answers)).planSentences).toContain(
      "Traitement antiparasitaire à jour, administré il y a 2 semaines."
    );
  });

  it("la trame guidée garde chaque rubrique telle que dictée, sans intitulé recopié", () => {
    const scaffold = modelScaffold(guidedDictationTranscript(answers), answers);
    expect(scaffold.subjective.startsWith("Le propriétaire remarque")).toBe(true);
    expect(scaffold.objective.startsWith("Température 38.5 °C")).toBe(true);
    expect(scaffold.assessment).toBe(answers.assessment);
    // Les phrases de posologie ne sont jamais montrées au modèle.
    for (const value of Object.values(scaffold)) expect(containsDosage(value)).toBe(false);
  });

  it("les phrases écartées du modèle reviennent mot pour mot dans la rubrique où elles ont été dictées", () => {
    const routed = routeGuidedTreatments(answers);
    const scaffold = modelScaffold(guidedDictationTranscript(answers), answers);
    const note = mergeGuidedProtected(scaffold, routed);
    expect(note.subjective).toContain("Traitement antiparasitaire à jour, administré il y a 2 semaines.");
    expect(note.plan).not.toContain("antiparasitaire");
    expect(note.plan).toContain("5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours.");
    expect(note.plan).toContain("10 à 14 jours");
  });

  it("ne change rien quand aucune phrase n'est protégée", () => {
    const simple = { ...EMPTY_SOAP, objective: "Auscultation normale." };
    expect(mergeGuidedProtected(simple, routeGuidedTreatments(simple))).toEqual(simple);
  });
});
