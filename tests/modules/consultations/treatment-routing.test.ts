import { describe, expect, it } from "vitest";
import {
  extractTreatmentSentences,
  prepareModelDictation,
  routeGuidedTreatments,
} from "@/modules/consultations/local-ai/treatment-routing";
import {
  assembleGuidedNote,
  guidedTranscript,
} from "@/modules/consultations/local-ai/guided-soap";
import {
  EMPTY_SOAP,
  parseGeneratedSoap,
} from "@/modules/consultations/local-ai/soap-schema";
import { createSoapPrompt } from "@/modules/consultations/local-ai/patient-context";

describe("routage déterministe du traitement", () => {
  const phrase = "Mocha a besoin d’un traitement antibiotique pendant 7 jours.";
  it("extrait la phrase entière mot pour mot sans perdre les observations", () => {
    expect(
      extractTreatmentSentences(`Toux depuis hier. ${phrase} Examen normal.`)
    ).toEqual({
      text: "Toux depuis hier. Examen normal.",
      treatmentSentences: [phrase],
    });
  });
  it("route depuis chaque rubrique sans modifier les saisies ni la trace", () => {
    for (const key of [
      "subjective",
      "objective",
      "assessment",
      "plan",
    ] as const) {
      const answers = { ...EMPTY_SOAP, [key]: phrase };
      expect(assembleGuidedNote(EMPTY_SOAP, answers)).toEqual({
        ...EMPTY_SOAP,
        plan: phrase,
      });
      expect(answers[key]).toBe(phrase);
      expect(guidedTranscript(answers)).toContain(phrase);
    }
  });
  it("préserve durée, ponctuation, accents et dose décimale sans calcul", () => {
    const dictated =
      "Rex a besoin de 2.5 mg de médicament pendant sept jours !";
    expect(prepareModelDictation(dictated)).toEqual({
      text: "",
      planSentences: [dictated],
    });
    expect(
      routeGuidedTreatments({ ...EMPTY_SOAP, subjective: dictated }).plan
    ).toBe(dictated);
  });
  it("reconnaît désormais le besoin explicite sans durée, sans déplacer une simple mention", () => {
    const subjective =
      "Le propriétaire évoque un vaccin. Le patient a besoin de repos.";
    expect(routeGuidedTreatments({ ...EMPTY_SOAP, subjective })).toEqual({
      ...EMPTY_SOAP,
      subjective: "Le propriétaire évoque un vaccin.",
      plan: "Le patient a besoin de repos.",
    });
  });
  it("ne double pas une phrase qui contient traitement et posologie", () => {
    const dictated = "Le patient a besoin de 5 mg/kg pendant 3 jours.";
    expect(prepareModelDictation(dictated).planSentences).toEqual([dictated]);
  });
  it("garde l’ordre des traitements en remplacement du plan existant", () => {
    const second = "Il a besoin de repos pendant une semaine.";
    expect(
      assembleGuidedNote(
        { ...EMPTY_SOAP, plan: "Contrôle prévu." },
        { ...EMPTY_SOAP, subjective: `${phrase} ${second}` }
      ).plan
    ).toBe(`${phrase}\n\n${second}`);
  });
  it("exclut traitement et posologie du prompt, y compris au second essai", () => {
    const context = {
      patient: {},
      consultation: {},
      dernieresConsultations: [],
    } as unknown as Parameters<typeof createSoapPrompt>[1];
    for (const simplified of [false, true]) {
      const prompt = createSoapPrompt(
        `Toux depuis hier. ${phrase} Donner 5 mg/kg.`,
        context,
        simplified
      );
      expect(prompt).toContain("Toux depuis hier.");
      expect(prompt).not.toContain(phrase);
      expect(prompt).not.toContain("5 mg/kg");
    }
  });
  it("garde le rejet strict de toute posologie provenant du modèle", () => {
    expect(() =>
      parseGeneratedSoap(
        JSON.stringify({ ...EMPTY_SOAP, plan: "Donner 5 mg/kg." })
      )
    ).toThrow("posologie");
  });
  it("refuse le dépassement plutôt que tronquer les phrases conservées", () => {
    expect(() =>
      assembleGuidedNote(
        { ...EMPTY_SOAP, plan: "x".repeat(5990) },
        { ...EMPTY_SOAP, subjective: phrase.repeat(200) }
      )
    ).toThrow();
  });
});
