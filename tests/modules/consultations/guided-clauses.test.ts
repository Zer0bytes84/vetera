import { describe, expect, it } from "vitest";
import { modelScaffold } from "@/modules/consultations/local-ai/soap-pipeline";
import {
  mergeGuidedProtected,
  prepareGuidedSections,
  routeGuidedTreatments,
} from "@/modules/consultations/local-ai/treatment-routing";
import { guidedDictationTranscript } from "@/modules/consultations/local-ai/guided-soap";
import { assertFaithfulSoap, evidenceTokens, SoapFidelityError } from "@/modules/consultations/local-ai/dictation-scaffold";
import { createSoapPrompt } from "@/modules/consultations/local-ai/patient-context";
import {
  containsDosage,
  EMPTY_SOAP,
  parseGeneratedSoap,
  SOAP_SECTIONS,
  SoapFormatError,
  type LocalSoapNote,
} from "@/modules/consultations/local-ai/soap-schema";
import typed from "../../../scripts/eval-local-ai/cas-reference/otite-max.json";
import micro2 from "../../../scripts/eval-local-ai/cas-reference/otite-max-dicte-micro2.json";
import rejeu1 from "../../../scripts/eval-local-ai/cas-reference/otite-max-dicte-rejeu1.json";
import rejeu2 from "../../../scripts/eval-local-ai/cas-reference/otite-max-dicte-rejeu2.json";

const KEYS = SOAP_SECTIONS.map(({ key }) => key);

/**
 * The guided path without the engine: the model is replaced by a faithful copy
 * of the frame it receives, then parsed, checked and restored like a real reply.
 */
function draftWithFaithfulModel(answers: LocalSoapNote) {
  const sections = prepareGuidedSections(routeGuidedTreatments(answers), answers);
  const scaffold = modelScaffold(guidedDictationTranscript(answers), answers);
  const omitted = KEYS.filter((key) => sections[key].mode === "exclue");
  const template = Object.fromEntries(KEYS.filter((key) => !omitted.includes(key)).map((key) => [key, scaffold[key]]));
  const note = parseGeneratedSoap("```json\n" + JSON.stringify(template) + "\n```", omitted);
  assertFaithfulSoap(note, scaffold);
  const restored = Object.fromEntries(KEYS.map((key) => [key, sections[key].restore(note[key])])) as LocalSoapNote;
  return { sections, scaffold, omitted, template, restored };
}

describe("dictée transcrite sans points : filtre des posologies par proposition", () => {
  it("le cas tapé au clavier reste filtré phrase par phrase, trame et note inchangées", () => {
    const routed = routeGuidedTreatments(typed.rubriques);
    const sections = prepareGuidedSections(routed, typed.rubriques);
    expect(KEYS.map((key) => sections[key].mode)).toEqual(["phrase", "phrase", "phrase", "phrase"]);
    const scaffold = modelScaffold(guidedDictationTranscript(typed.rubriques), typed.rubriques);
    const restored = Object.fromEntries(KEYS.map((key) => [key, sections[key].restore(scaffold[key])]));
    expect(restored).toEqual(mergeGuidedProtected(scaffold, routed));
  });

  it.each([
    ["micro2", micro2.rubriques],
    ["rejeu 1", rejeu1.rubriques],
    ["rejeu 2", rejeu2.rubriques],
  ])("%s : aucune rubrique dictée n'arrive vide au modèle, aucune posologie ne lui est montrée", (_, answers) => {
    const routed = routeGuidedTreatments(answers);
    const { sections, scaffold, omitted, restored } = draftWithFaithfulModel(answers);
    // Seule une rubrique que le code a vidée en entier n'est pas envoyée.
    expect(omitted).toEqual(KEYS.filter((key) => !routed[key].trim() && answers[key as keyof typeof answers].trim()));
    const unchanged = mergeGuidedProtected(scaffold, routed);
    for (const key of KEYS) {
      if (routed[key].trim()) expect(scaffold[key].trim()).not.toBe("");
      if (!routed[key].trim()) expect(sections[key].mode === "exclue").toBe(Boolean(answers[key as keyof typeof answers].trim()));
      expect(containsDosage(scaffold[key])).toBe(false);
      // Filtrée par proposition : la rubrique revient telle que dictée, mot pour
      // mot et dans l'ordre. Filtrée par phrase : comme avant ce correctif.
      expect(restored[key]).toBe(sections[key].mode === "phrase" ? unchanged[key] : routed[key]);
    }
    // Aucun mot dicté n'est perdu ni ajouté.
    const words = (note: LocalSoapNote) => evidenceTokens(KEYS.map((key) => note[key]).join(" ")).sort().join(" ");
    expect(words(restored)).toBe(words(routed));
  });

  it("micro2 : la posologie reste exacte et à sa place, après le produit", () => {
    const { scaffold, restored } = draftWithFaithfulModel(micro2.rubriques);
    expect(scaffold.subjective).toContain("traitement antiparasitaire à jour");
    expect(scaffold.subjective).not.toContain("administré");
    expect(scaffold.plan).not.toContain("5 gouttes");
    expect(restored.plan).toContain(
      "gouttes auriculaires antibiotiques, antifongiques et anti-inflammatoires, 5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours."
    );
  });

  it("garde-fou : posologie complète dictée sans aucune ponctuation, la rubrique est gardée et la posologie exacte", () => {
    const plan =
      "nettoyage du conduit au cabinet prescription de Surolan 5 gouttes dans l'oreille droite 2 fois par jour pendant 10 jours contrôle dans 10 jours";
    const answers = { ...EMPTY_SOAP, objective: "Otite externe droite.", plan };
    const { sections, omitted, template, restored } = draftWithFaithfulModel(answers);
    // Rien ne reste pour le modèle : la rubrique ne lui est pas envoyée du tout.
    expect(sections.plan.mode).toBe("exclue");
    expect(omitted).toEqual(["plan"]);
    expect(template).not.toHaveProperty("plan");
    expect(restored.plan).toBe(plan);
    expect(restored.plan).toContain("Surolan 5 gouttes dans l'oreille droite 2 fois par jour pendant 10 jours");
  });

  it("garde-fou : posologie dictée avec des virgules, seules les propositions sans dose vont au modèle", () => {
    const plan =
      "Nettoyage du conduit au cabinet, prescription de Surolan, 5 gouttes dans l'oreille droite, 2 fois par jour, pendant 10 jours, contrôle dans 10 jours.";
    const answers = { ...EMPTY_SOAP, plan };
    const { sections, scaffold, restored } = draftWithFaithfulModel(answers);
    expect(sections.plan.mode).toBe("proposition");
    expect(scaffold.plan).toContain("Nettoyage du conduit au cabinet");
    for (const dose of ["5 gouttes", "2 fois", "10 jours"]) expect(scaffold.plan).not.toContain(dose);
    expect(containsDosage(scaffold.plan)).toBe(false);
    expect(restored.plan).toBe(plan);
  });

  it("une rubrique non envoyée ne peut pas être remplie par le modèle", () => {
    const answers = { ...EMPTY_SOAP, objective: "Otite externe droite.", plan: "Surolan 5 gouttes 2 fois par jour pendant 10 jours" };
    const { scaffold, omitted, template } = draftWithFaithfulModel(answers);
    const invented = parseGeneratedSoap(JSON.stringify({ ...template, plan: "Contrôle." }), omitted);
    expect(() => assertFaithfulSoap(invented, scaffold)).toThrow(SoapFidelityError);
    expect(() => parseGeneratedSoap(JSON.stringify({ ...template, notes: "" }), omitted)).toThrow(
      SoapFormatError
    );
  });

  it("la consigne ne demande que les rubriques envoyées ; sans rubrique exclue, elle ne change pas", () => {
    const four = createSoapPrompt("x", micro2.contexte as never, false, EMPTY_SOAP);
    expect(four).toContain('les QUATRE clés "subjective", "objective", "assessment", "plan"');
    const three = createSoapPrompt("x", micro2.contexte as never, true, EMPTY_SOAP, { omitted: ["plan"], dictation: "y" });
    expect(three).toContain('les TROIS clés "subjective", "objective", "assessment".');
    expect(three).toContain("toutes ses clés");
    expect(three).not.toContain('"plan"');
  });
});
