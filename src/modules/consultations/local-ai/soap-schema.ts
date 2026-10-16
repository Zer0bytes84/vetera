import { z } from "zod";

export const SOAP_SECTIONS = [
  { key: "subjective", title: "S · Motif et antécédents" },
  { key: "objective", title: "O · Examen clinique" },
  { key: "assessment", title: "A · Évaluation" },
  { key: "plan", title: "P · Plan de soins" },
] as const;

const section = z.string().trim().max(6000);
export const localSoapSchema = z
  .object({
    subjective: section,
    objective: section,
    assessment: section,
    plan: section,
  })
  .strict()
  .refine((note) => Object.values(note).some((value) => value.length > 0), {
    message: "La note proposée est vide.",
  });
export type LocalSoapNote = z.infer<typeof localSoapSchema>;
export const EMPTY_SOAP: LocalSoapNote = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

// Conservative boundary: the language model may not produce a prescription or
// dosage, including a copied dosage. Human edits are validated separately.
const QUANTITY = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*[/]\s*\d+)?|[½¼¾]|(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|cent|mille|demi)(?:[ -](?:demi|et|un|une))*)`;
const DOSE_UNIT = new RegExp(
  String.raw`(?:^|[^\p{L}\p{N}])${QUANTITY}\s*(?:mg|mcg|µg|μg|g|ml|UI|IU|unités?|milligrammes?|microgrammes?|millilitres?|comprimés?|gélules?|gouttes?|cp)(?![\p{L}\p{N}])|\b(?:mg|mcg|ml|UI|IU)\s*[/]\s*kg\b`,
  "iu"
);
const DOSE_INSTRUCTION = new RegExp(
  String.raw`\b(?:dos(?:e|es|age)|posolog\w*|administr\w*|inject\w*|prescri\w*|donner|prend\w*|prise\w*|traitement)\b[^.!?\n]{0,160}(?:\d|(?:^|[^\p{L}\p{N}])${QUANTITY}(?![\p{L}\p{N}]))`,
  "iu"
);
const DOSE_FREQUENCY = new RegExp(
  String.raw`(?:^|[^\p{L}\p{N}])${QUANTITY}\s*fois\s*(?:par|[/])\s*(?:jour|nuit|heure|semaine)(?![\p{L}\p{N}])`,
  "iu"
);
const CALCULATED_DOSE =
  /\b(?:calcul\w*|multipli\w*|divis\w*|conversion)\b[^.!?\n]{0,100}\b(?:dose|posologie|mg|ml)\b/iu;
export function containsDosage(text: string): boolean {
  return (
    DOSE_UNIT.test(text) ||
    DOSE_INSTRUCTION.test(text) ||
    DOSE_FREQUENCY.test(text) ||
    CALCULATED_DOSE.test(text)
  );
}
// Only format/fidelity errors may trigger a second generation. A dosage rejection must
// never be hidden behind a retry that could bypass the prescription boundary.
export class SoapFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SoapFormatError";
  }
}
export function parseGeneratedSoap(raw: string): LocalSoapNote {
  // A single JSON object (optionally fenced), never a best-effort coercion.
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SoapFormatError(
      "La réponse de l’assistant n’est pas un JSON SOAP valide. Votre dictée est conservée ; aucune note n’a été enregistrée."
    );
  }
  const result = localSoapSchema.safeParse(parsed);
  if (!result.success)
    throw new SoapFormatError(
      "Le format de réponse de l’assistant n’est pas conforme aux quatre sections SOAP attendues. Votre dictée est conservée ; aucune note n’a été enregistrée."
    );
  if (Object.values(result.data).some(containsDosage)) {
    throw new Error(
      "La note proposée contient une posologie. Elle a été rejetée : les doses doivent être saisies ou calculées dans le module d’ordonnance, jamais par l’IA."
    );
  }
  return result.data;
}
