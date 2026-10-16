import { describe, expect, it, vi } from "vitest";
import {
  assertFaithfulSoap,
  buildDictationScaffold,
  mergeDosageIntoPlan,
  removeDosageSentences,
  SoapFidelityError,
} from "@/modules/consultations/local-ai/dictation-scaffold";
import { generateValidatedSoap } from "@/modules/consultations/local-ai/generate-soap";

describe("extractive dictation scaffold", () => {
  it("preserves the short unstructured dictation without inventing exam or diagnosis", () => {
    expect(
      buildDictationScaffold(
        "Le patient a des allergies nécessite un soin intensif avec des antibiotiques pendant une période de 7 jours.",
      ),
    ).toEqual({
      subjective: "Le patient a des allergies",
      objective: "",
      assessment: "",
      plan: "nécessite un soin intensif avec des antibiotiques pendant une période de 7 jours.",
    });
  });
  it("uses explicit French labels, preserves measurements and keeps care as a plan", () => {
    expect(
      buildDictationScaffold(
        "Pour @Rex, toux depuis hier. À l’examen, température 38,5 degrés et auscultation normale. Évaluation, toux à surveiller. Prévoir un contrôle dans sept jours.",
      ),
    ).toEqual({
      subjective: "toux depuis hier.",
      objective: "température 38,5 degrés et auscultation normale.",
      assessment: "toux à surveiller.",
      plan: "Prévoir un contrôle dans sept jours.",
    });
  });
  it("keeps unlabelled observations for human classification and supports quoted names", () => {
    expect(
      buildDictationScaffold(
        'Pour @"Rex Junior", il respire mal et semble fatigué.',
      ),
    ).toEqual({
      subjective: "il respire mal et semble fatigué.",
      objective: "",
      assessment: "",
      plan: "",
    });
  });
  it("removes the full resolved mention including apostrophes", () => {
    expect(
      buildDictationScaffold("Pour @D’Artagnan, vomissements depuis hier.")
        .subjective,
    ).toBe("vomissements depuis hier.");
  });
  it("preserves email addresses that are not patient mentions", () => {
    expect(
      buildDictationScaffold("Contact : sarah@exemple.fr.").subjective,
    ).toBe("Contact : sarah@exemple.fr.");
  });
  it("excludes dosage segments from the scaffold instead of throwing", () => {
    expect(
      buildDictationScaffold(
        "Examen: température 39 degrés, administrer 5 mg/kg.",
      ),
    ).toEqual({
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    });
  });
  it("classifies a treatment need as a plan and keeps the sentence whole", () => {
    expect(
      buildDictationScaffold(
        "Le patient a besoin d'un traitement antibiotique.",
      ),
    ).toEqual({
      subjective: "",
      objective: "",
      assessment: "",
      plan: "Le patient a besoin d'un traitement antibiotique.",
    });
  });
  it("removes dosage sentences for the model input and flags them", () => {
    expect(
      removeDosageSentences(
        "Toux depuis hier. Administrer 5 mg/kg deux fois par jour. À revoir dans une semaine.",
      ),
    ).toEqual({
      text: "Toux depuis hier. À revoir dans une semaine.",
      dosageDetected: true,
      dosageSentences: ["Administrer 5 mg/kg deux fois par jour."],
    });
    expect(
      removeDosageSentences("Toux depuis hier. À revoir dans une semaine."),
    ).toEqual({
      text: "Toux depuis hier. À revoir dans une semaine.",
      dosageDetected: false,
      dosageSentences: [],
    });
  });
  it("merges dictated dosage sentences verbatim into the plan", () => {
    const note = {
      subjective: "Toux depuis hier.",
      objective: "",
      assessment: "",
      plan: "",
    };
    expect(
      mergeDosageIntoPlan(note, [
        "Le patient a besoin d'un traitement antibiotique pendant 7 jours.",
      ]),
    ).toEqual({
      ...note,
      plan: "Le patient a besoin d'un traitement antibiotique pendant 7 jours.",
    });
    expect(mergeDosageIntoPlan(note, [])).toBe(note);
  });
  it("recognizes explicit plural labels and keeps ordinary exam controls in O", () => {
    expect(
      buildDictationScaffold(
        "Examen clinique : contrôle radiographique normal. Évaluations, surveillance nécessaire. Plan de soins : contrôle dans une semaine.",
      ),
    ).toEqual({
      subjective: "",
      objective: "contrôle radiographique normal.",
      assessment: "surveillance nécessaire.",
      plan: "contrôle dans une semaine.",
    });
  });
  it("preserves negated intentions and does not extract a control from a sentence", () => {
    expect(
      buildDictationScaffold("Ne pas prévoir un contrôle cette semaine.").plan,
    ).toBe("Ne pas prévoir un contrôle cette semaine.");
    expect(
      buildDictationScaffold("Le patient ne nécessite pas de soins intensifs.")
        .plan,
    ).toBe("ne nécessite pas de soins intensifs.");
    expect(
      buildDictationScaffold("La propriétaire ne veut pas prévoir un contrôle.")
        .subjective,
    ).toBe("La propriétaire ne veut pas prévoir un contrôle.");
  });
});

describe("dictation fidelity boundary", () => {
  const source = {
    subjective: "Toux depuis hier.",
    objective: "Température 38,5 degrés.",
    assessment: "",
    plan: "Prévoir un contrôle dans sept jours.",
  };
  it("allows typography changes while preserving the exact dictated facts", () => {
    expect(() =>
      assertFaithfulSoap(
        {
          ...source,
          subjective: "toux depuis hier",
          objective: "TEMPERATURE 38.5 degrés",
        },
        source,
      ),
    ).not.toThrow();
  });
  it.each([
    ["Entre 7-10 jours.", "Entre 7,10 jours."],
    ["Variation -2 degrés.", "Variation 2 degrés."],
    ["Saturation < 95 %.", "Saturation > 95 %."],
    ["Saturation 95 %.", "Saturation 95."],
  ])("keeps clinically meaningful numeric punctuation: %s", (dictated, generated) => {
    expect(() =>
      assertFaithfulSoap(
        { ...source, objective: generated },
        { ...source, objective: dictated },
      ),
    ).toThrow(SoapFidelityError);
  });
  it.each([
    { ...source, objective: "Température 39 degrés." },
    { ...source, assessment: "Troubles respiratoires." },
    { ...source, plan: "" },
    {
      ...source,
      objective: "",
      subjective: source.subjective + source.objective,
    },
  ])("rejects changed, invented, omitted or moved observations", (note) => {
    expect(() => assertFaithfulSoap(note, source)).toThrow(SoapFidelityError);
  });
  it("retries a fidelity failure once and validates the second response", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({ ...source, assessment: "Allergie" }),
      )
      .mockResolvedValueOnce(JSON.stringify(source));
    const onRetry = vi.fn();
    expect(
      await generateValidatedSoap({
        prompt: "strict",
        retryPrompt: "copy",
        signal: new AbortController().signal,
        generate,
        onRetry,
        validate: (note) => assertFaithfulSoap(note, source),
      }),
    ).toEqual(source);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(SoapFidelityError));
  });
});
