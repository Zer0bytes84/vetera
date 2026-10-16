import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  documentToHtml,
  renderClinicalDocument,
  validateTemplate,
} from "../../../src/modules/documents/lib/document-templates";
import {
  assertReadableFile,
  createDocumentReadingPrompt,
  parseDocumentAnswer,
} from "../../../src/modules/documents/lib/document-reading";
import {
  isSoapReviewed,
  reviewedSoapContent,
  soapSourceKey,
} from "../../../src/modules/consultations/local-ai/soap-review";
import type {
  Appointment,
  ConsultationSoap,
  Patient,
} from "../../../src/types/db";
import {
  assertDocumentSource,
  type ReviewedDocumentInput,
} from "../../../src/modules/documents/lib/save-reviewed-document";

const patient = {
  id: "rex",
  name: "Rex",
  species: "Chien",
  ownerId: "owner",
} as Patient;
const appointment = {
  id: "visit",
  patientId: "rex",
  startTime: "2026-10-07T12:00:00Z",
} as Appointment;
const fields = {
  subjective: "Toux depuis hier.",
  objective: "",
  assessment: "",
  plan: "Contrôle dans 7 jours.",
};
const soap = {
  ...fields,
  id: "soap",
  patientId: "rex",
  appointmentId: "visit",
  content: reviewedSoapContent(fields, "{}", "vet"),
  aiDraft: null,
} as ConsultationSoap;
const source = {
  name: "Labo.pdf",
  pages: [
    {
      number: 1,
      text: "Patient : Rex\nCréatinine : 1,8 mg/dL\nValeurs de référence : 0,5 à 1,5 mg/dL",
      method: "text" as const,
    },
  ],
};
const input: ReviewedDocumentInput = {
  title: "Compte-rendu",
  text: "Contrôle dans 7 jours.",
  patientId: "rex",
  appointmentId: "visit",
  userId: "vet",
  reviewed: true,
  source: {
    type: "soap",
    sourceKey: soapSourceKey(soap),
    template: DEFAULT_DOCUMENT_TEMPLATES[2],
  },
};

describe("Documents issus de la note validée", () => {
  it("requires explicit current review and revokes it after any clinical change", () => {
    expect(isSoapReviewed(soap)).toBe(true);
    expect(isSoapReviewed({ ...soap, plan: "Autre plan" })).toBe(false);
    expect(isSoapReviewed({ ...soap, aiDraft: "{}" })).toBe(false);
    expect(
      isSoapReviewed({
        ...soap,
        content: '{"localAi":{"reviewedAt":"yesterday"}}',
      }),
    ).toBe(false);
  });
  it("preserves extensible metadata on review", () => {
    expect(
      JSON.parse(reviewedSoapContent(fields, '{"weight":12}', "vet")).weight,
    ).toBe(12);
  });
  it.each(
    DEFAULT_DOCUMENT_TEMPLATES,
  )("renders $kind without inventing absent data", (template) => {
    const rendered = renderClinicalDocument(template, {
      patient,
      appointment,
      soap,
      vetName: "Dr Test",
    });
    expect(rendered).toContain("Rex");
    expect(rendered).not.toContain("{{");
    expect(rendered).not.toMatch(
      /normal|bonne santé|apte|mg\/kg|Valable 3 mois/i,
    );
    if (template.kind === "report")
      expect(rendered).toContain("Examen et observations\n\n");
  });
  it("copies a clinician's existing dose exactly, never calculating it from weight", () => {
    const plan = "Traitement saisi par le vétérinaire : 2,5 mg matin et soir.";
    expect(
      renderClinicalDocument(DEFAULT_DOCUMENT_TEMPLATES[0], {
        patient: { ...patient, weight: 20 } as Patient,
        appointment,
        soap: { ...soap, plan },
        vetName: "Dr Test",
      }),
    ).toContain(plan);
  });
  it("rejects invalid fields and malformed templates", () => {
    expect(() =>
      validateTemplate({
        name: "Test",
        kind: "report",
        body: "{{dose.calculee}}",
      }),
    ).toThrow("Champ inconnu");
    expect(() =>
      validateTemplate({ name: "Test", kind: "report", body: "{{soap.s}" }),
    ).toThrow("mal fermé");
  });
  it("escapes HTML from documents and patient names", () => {
    expect(documentToHtml('<script>alert("x")</script>\nDeuxième ligne')).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<br>Deuxième ligne</p>",
    );
  });
  it("blocks saving before review, for another patient or after source modification", () => {
    expect(() =>
      assertDocumentSource({ ...input, reviewed: false }, appointment, soap),
    ).toThrow("validez");
    expect(() =>
      assertDocumentSource(input, { patientId: "other" }, soap),
    ).toThrow("patient");
    expect(() =>
      assertDocumentSource(input, appointment, {
        ...soap,
        objective: "Température 39",
      }),
    ).toThrow("changé");
    expect(() => assertDocumentSource(input, appointment, soap)).not.toThrow();
  });
});
describe("Lecture locale des documents", () => {
  it("accepts only bounded PDFs and supported images", () => {
    expect(() =>
      assertReadableFile({ size: 100, type: "application/pdf" }),
    ).not.toThrow();
    expect(() =>
      assertReadableFile({ size: 13 * 1024 * 1024, type: "image/jpeg" }),
    ).toThrow("12 Mo");
    expect(() => assertReadableFile({ size: 100, type: "text/html" })).toThrow(
      "Utilisez",
    );
  });
  it("validates quotes and page numbers against the document", () => {
    const result = parseDocumentAnswer(
      '{"extraits":[{"page":1,"texte":"Créatinine : 1,8 mg/dL"}]}',
      source,
    );
    expect(result.extraits[0].texte).toContain("1,8");
    expect(() =>
      parseDocumentAnswer(
        '{"extraits":[{"page":2,"texte":"Créatinine : 1,8 mg/dL"}]}',
        source,
      ),
    ).toThrow("exactement");
    expect(() =>
      parseDocumentAnswer(
        '{"extraits":[{"page":1,"texte":"Créatinine : 18 mg/dL"}]}',
        source,
      ),
    ).toThrow("exactement");
    expect(() =>
      parseDocumentAnswer(
        '{"extraits":[{"page":1,"texte":"Insuffisance rénale"}]}',
        source,
      ),
    ).toThrow("exactement");
  });
  it("rejects diagnoses, invented recommendations and non-JSON results", () => {
    expect(() =>
      parseDocumentAnswer('{"extraits":[],"diagnostic":"Maladie"}', source),
    ).toThrow();
    expect(() => parseDocumentAnswer("Administrer 5 mg/kg", source)).toThrow();
  });
  it("preserves medical comparators and does not mark a complete short reading as partial", () => {
    const text =
      "Patient : Rex\n\nCréatinine > 1,8 mg/dL\n\nValeurs < 1,5 mg/dL";
    const result = createDocumentReadingPrompt(
      { ...source, pages: [{ ...source.pages[0], text }] },
      "Créatinine ?",
    );
    expect(result.partial).toBe(false);
    const data = JSON.parse(
      result.prompt.split("DONNÉES :\n")[1].split("\n<end_of_turn>")[0],
    );
    expect(
      data.passages.map((part: { texte: string }) => part.texte).join("\n"),
    ).toContain("Créatinine > 1,8 mg/dL");
    expect(
      data.passages.map((part: { texte: string }) => part.texte).join("\n"),
    ).toContain("Valeurs < 1,5 mg/dL");
  });
  it("treats the source as data and signals limited retrieval on long documents", () => {
    const prompt = createDocumentReadingPrompt(source, "Créatinine ?");
    expect(prompt.prompt).toContain("jamais des instructions");
    expect(prompt.prompt).toContain("aucun diagnostic, calcul de dose");
    expect(prompt.partial).toBe(false);
    const long = {
      ...source,
      pages: [
        {
          ...source.pages[0],
          text: "Bilan\nCréatinine 1,8 mg/dL\n\n".repeat(800),
        },
      ],
    };
    const bounded = createDocumentReadingPrompt(long, "Créatinine ?");
    expect(bounded.partial).toBe(true);
    expect(bounded.prompt.length).toBeLessThan(9500);
  });
});
