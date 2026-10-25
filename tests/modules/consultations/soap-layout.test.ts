import { describe, expect, it } from "vitest";
import {
  SOAP_FULL_HEADINGS,
  layoutSection,
  layoutSoapNote,
  soapNoteText,
  stripSoapLayout,
} from "@/modules/consultations/local-ai/soap-layout";
import { assertFaithfulSoap } from "@/modules/consultations/local-ai/dictation-scaffold";
import { guidedDictationTranscript } from "@/modules/consultations/local-ai/guided-soap";
import { EMPTY_SOAP } from "@/modules/consultations/local-ai/soap-schema";

const plan =
  "Nettoyage du canal auriculaire droit. Gouttes, 5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours. Contrôle dans 10 à 14 jours.";

describe("mise en forme de la note SOAP", () => {
  it("numérote le plan, une action par ligne, sans toucher aux mots ni aux chiffres", () => {
    expect(layoutSection("plan", plan)).toBe(
      "1. Nettoyage du canal auriculaire droit.\n2. Gouttes, 5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours.\n3. Contrôle dans 10 à 14 jours."
    );
  });
  it("met une puce par observation et garde les décimales entières", () => {
    expect(layoutSection("objective", "Température 38.5 °C. TRC < 2 secondes.")).toBe(
      "- Température 38.5 °C.\n- TRC < 2 secondes."
    );
  });
  it("est stable : remettre en forme une note déjà en forme ne change rien", () => {
    const once = layoutSoapNote({ ...EMPTY_SOAP, plan });
    expect(layoutSoapNote(once)).toEqual(once);
  });
  it("écrit les intitulés complets dans le texte de la note", () => {
    const text = soapNoteText(layoutSoapNote({ ...EMPTY_SOAP, subjective: "Gémit.", plan }));
    expect(text.startsWith(`${SOAP_FULL_HEADINGS.subjective}\n- Gémit.`)).toBe(true);
    expect(text).toContain(`${SOAP_FULL_HEADINGS.plan}\n1. Nettoyage`);
    expect(text).not.toContain(SOAP_FULL_HEADINGS.objective);
  });
});

describe("canevas et contrôle de fidélité", () => {
  const source = { ...EMPTY_SOAP, plan };
  const laidOut = (body: string) => ({ ...EMPTY_SOAP, plan: `${SOAP_FULL_HEADINGS.plan}\n${body}` });

  it("accepte l'intitulé complet et la numérotation comme canevas", () => {
    expect(() => assertFaithfulSoap(laidOut(layoutSection("plan", plan)), source)).not.toThrow();
  });
  it("refuse toujours un chiffre dicté modifié sous la mise en forme", () => {
    const altered = layoutSection("plan", plan.replace("5 gouttes", "6 gouttes"));
    expect(() => assertFaithfulSoap(laidOut(altered), source)).toThrow();
  });
  it("refuse un chiffre dicté avalé par un numéro de liste", () => {
    // « 5 gouttes » devenu une puce « 5. gouttes » : le 5 n'est plus comparé, donc manque.
    const swallowed = laidOut("1. Nettoyage du canal auriculaire droit.\n5. gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours.\n3. Contrôle dans 10 à 14 jours.");
    expect(() => assertFaithfulSoap(swallowed, source)).toThrow();
  });
  it("refuse un intitulé d'une autre rubrique ou un mot ajouté", () => {
    expect(() => assertFaithfulSoap({ ...EMPTY_SOAP, plan: `${SOAP_FULL_HEADINGS.objective}\n${plan}` }, source)).toThrow();
    expect(() => assertFaithfulSoap(laidOut(`${plan} Réalisé.`), source)).toThrow();
  });
  it("ne retire l'intitulé que s'il occupe la première ligne", () => {
    expect(stripSoapLayout("plan", `Contrôle.\n${SOAP_FULL_HEADINGS.plan}`)).toContain("Plan");
  });
});

describe("dictée guidée transmise par rubriques", () => {
  it("garde le texte envoyé le jour du test : une ligne « Rubrique : réponse » par rubrique remplie", () => {
    expect(
      guidedDictationTranscript({ ...EMPTY_SOAP, subjective: " Gémit. ", plan: "Contrôle." })
    ).toBe("Motif et antécédents : Gémit.\nPlan de soins : Contrôle.");
  });
});
