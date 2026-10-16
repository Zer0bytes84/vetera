import { describe, expect, it } from "vitest";
import {
  analyzeTreatmentDictation,
  prepareModelDictation,
  routeGuidedTreatments,
  mergeProtectedDictation,
} from "@/modules/consultations/local-ai/treatment-routing";
import { EMPTY_SOAP } from "@/modules/consultations/local-ai/soap-schema";

describe("formulations vétérinaires françaises", () => {
  it.each([
    "On va mettre sous Metacam pendant cinq jours.",
    "On va partir sur Synulox.",
    "Je vais lui donner Clavaseptin.",
    "Je lui donne Convenia.",
    "Je vous prescris Cerenia.",
    "Il lui faut Vetmedin.",
    "Il a besoin de Fortekor.",
    "Il a besoin d’un traitement pendant 7 jours.",
    "On va lui donner Thyronorm.",
    "Je vous donne un traitement.",
    "On va essayer ce traitement pendant une semaine.",
    "Il va falloir un traitement.",
  ])("conserve en Plan, sans passer au modèle : %s", (phrase) => {
    expect(analyzeTreatmentDictation(phrase)[0].kind).toBe("treatment");
    expect(
      routeGuidedTreatments({ ...EMPTY_SOAP, subjective: phrase }).plan
    ).toBe(phrase);
    expect(prepareModelDictation(phrase).text).toBe("");
    expect(prepareModelDictation(phrase).planSentences).toEqual([phrase]);
  });
  it.each([
    "On ne va pas mettre d'antibiotiques.",
    "Pas besoin de Metacam.",
    "Il n’a pas besoin de traitement pendant sept jours.",
    "Je ne lui donne jamais de Synulox.",
  ])("ne transforme pas une négation en traitement : %s", (phrase) => {
    expect(analyzeTreatmentDictation(phrase)[0].kind).toBe("negated");
    const input = prepareModelDictation(phrase);
    expect(input.planSentences).toEqual([]);
    expect(input.text).toBe("");
    expect(mergeProtectedDictation(EMPTY_SOAP, input)).toEqual({
      ...EMPTY_SOAP,
      subjective: phrase,
    });
  });
  it.each([
    "Il prend déjà du Metacam.",
    "Il est sous Synulox.",
    "La dernière fois on lui avait mis du Convenia.",
  ])("place l’antécédent en Anamnèse : %s", (phrase) => {
    expect(routeGuidedTreatments({ ...EMPTY_SOAP, plan: phrase })).toEqual({
      ...EMPTY_SOAP,
      subjective: phrase,
    });
    expect(prepareModelDictation(phrase).planSentences).toEqual([]);
  });
  it("place le conditionnel en Évaluation sans prescription", () => {
    const phrase = "On pourrait envisager du Cerenia.";
    expect(analyzeTreatmentDictation(phrase)[0].kind).toBe("hypothesis");
    expect(
      routeGuidedTreatments({ ...EMPTY_SOAP, subjective: phrase })
    ).toEqual({ ...EMPTY_SOAP, assessment: phrase });
    expect(
      mergeProtectedDictation(EMPTY_SOAP, prepareModelDictation(phrase))
    ).toEqual({ ...EMPTY_SOAP, assessment: phrase });
  });
  it("garde la consigne d’éviction intacte comme alerte, sans marqueur de prescription", () => {
    const phrase = "Ne lui donnez surtout pas d'ibuprofène.";
    const part = analyzeTreatmentDictation(phrase)[0];
    expect(part).toMatchObject({
      kind: "avoidance",
      setting: null,
      text: phrase,
    });
    expect(
      routeGuidedTreatments({ ...EMPTY_SOAP, subjective: phrase }).plan
    ).toBe(phrase);
    expect(prepareModelDictation(phrase).text).toBe("");
  });
  it("distingue acte clinique et ordonnance à domicile, sans réécriture", () => {
    expect(
      analyzeTreatmentDictation("Je lui fais une injection de Convenia.")[0]
    ).toMatchObject({ kind: "treatment", setting: "acte-clinique" });
    expect(
      analyzeTreatmentDictation("Vous lui donnez du Cerenia à la maison.")[0]
    ).toMatchObject({ kind: "treatment", setting: "ordonnance-maison" });
    expect(
      analyzeTreatmentDictation("Ne lui donnez pas de Cerenia.")[0].setting
    ).toBeNull();
  });
  it.each([
    ["Metacam", "méloxicam"],
    ["Synulox", "amoxicilline + acide clavulanique"],
    ["Clavaseptin", "amoxicilline + acide clavulanique"],
    ["Convenia", "céfovécine"],
    ["Cerenia", "maropitant"],
    ["Vetmedin", "pimobendane"],
    ["Fortekor", "bénazépril"],
    ["Thyronorm", "thiamazole"],
  ])("reconnaît le repère %s sans substitution", (brand, dci) => {
    const phrase = `Je vous prescris ${brand}.`;
    expect(analyzeTreatmentDictation(phrase)[0]).toMatchObject({
      text: phrase,
      medications: [{ brand, dci }],
    });
    expect(
      routeGuidedTreatments({ ...EMPTY_SOAP, subjective: phrase }).plan
    ).toBe(phrase);
  });
  it("ne confond pas les marques proches et respecte les frontières de mots", () => {
    expect(
      analyzeTreatmentDictation("Convenia et Cerenia.")[0].medications.map(
        (x) => x.dci
      )
    ).toEqual(["céfovécine", "maropitant"]);
    expect(
      analyzeTreatmentDictation("SuperMetacam et MetacamPlus.")[0].medications
    ).toEqual([]);
  });
  it("ne déplace pas une observation négative sans intention de soin", () => {
    const objective = "Pas de douleur à la palpation.";
    expect(routeGuidedTreatments({ ...EMPTY_SOAP, objective })).toEqual({
      ...EMPTY_SOAP,
      objective,
    });
  });
  it("une dose décimale dictée reste identique et ne rejoint jamais le modèle", () => {
    const phrase = "Je lui donne 2.5 mg de Metacam pendant 7 jours.";
    const input = prepareModelDictation(phrase);
    expect(input.text).toBe("");
    expect(mergeProtectedDictation(EMPTY_SOAP, input).plan).toBe(phrase);
  });
});
