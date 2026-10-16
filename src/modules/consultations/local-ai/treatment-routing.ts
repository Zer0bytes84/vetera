import { containsDosage, type LocalSoapNote } from "./soap-schema";

// Decimal doses (2.5 mg) are not sentence boundaries.
const sentences = (text: string) =>
  text
    .match(/[^\n]*?(?:[.!?](?=\s|$)|\n|$)/gu)
    ?.filter((part) => part.trim()) ?? [];
const avoidance =
  /\b(?:ne\s+(?:lui\s+)?donnez\s+(?:surtout\s+)?pas|(?:surtout\s+)?ne\s+pas\s+(?:donner|administrer)|éviter\s+de\s+(?:donner|administrer))/iu;
const negation =
  /\b(?:pas\s+besoin|ne\s+(?:va|vais|faut|lui|vous|doit)|n[’'](?:a|ont|est|envisage)|sans\s+(?:traitement|antibiotique))|\b(?:pas|jamais|aucun)\b/iu;
const history =
  /\b(?:prend\s+déjà\s+(?:du|de|des)|est\s+sous|(?:la\s+dernière\s+fois\s+)?on\s+lui\s+avait\s+mis|avait\s+besoin|était\s+sous)/iu;
const hypothesis =
  /\b(?:pourrait|pourrais|pourrions|devrait|faudrait|envisagerait|envisagerais)\b/iu;
const treatment =
  /\b(?:on\s+va\s+(?:mettre\s+sous|partir\s+sur|lui\s+donner|essayer)|je\s+(?:vais\s+lui\s+donner|lui\s+donne|vous\s+(?:prescris|donne))|il\s+(?:lui\s+faut|va\s+falloir)|a\s+besoin\s+(?:de\s+|d[’'])|je\s+lui\s+fais|vous\s+lui\s+donnez)\b/iu;

// User-specified brand references only. These never replace the dictated text.
const BRAND_DCI: Record<string, string> = {
  metacam: "méloxicam",
  synulox: "amoxicilline + acide clavulanique",
  clavaseptin: "amoxicilline + acide clavulanique",
  convenia: "céfovécine",
  cerenia: "maropitant",
  vetmedin: "pimobendane",
  fortekor: "bénazépril",
  thyronorm: "thiamazole",
};
export type TreatmentKind =
  | "treatment"
  | "history"
  | "hypothesis"
  | "avoidance"
  | "negated"
  | "observation";
export interface DictatedStatement {
  text: string;
  kind: TreatmentKind;
  setting: "acte-clinique" | "ordonnance-maison" | null;
  medications: { brand: string; dci: string }[];
}
export function analyzeTreatmentDictation(
  transcript: string
): DictatedStatement[] {
  return sentences(transcript).map((sentence) => {
    const text = sentence.trim();
    // Safety exclusions precede every positive trigger. Ambiguous mixed clauses
    // stay intact for human review rather than being turned into a prescription.
    const kind: TreatmentKind = avoidance.test(text)
      ? "avoidance"
      : negation.test(text) &&
          (treatment.test(text) ||
            /\b(?:besoin|antibiotiques?|mettre|donn\p{L}*|administr\p{L}*|traitement|prescri)/iu.test(
              text
            ))
        ? "negated"
        : history.test(text)
          ? "history"
          : hypothesis.test(text)
            ? "hypothesis"
            : treatment.test(text)
              ? "treatment"
              : "observation";
    return {
      text,
      kind,
      setting:
        kind !== "treatment"
          ? null
          : /\bje\s+lui\s+fais\b/iu.test(text)
            ? "acte-clinique"
            : /\bvous\s+lui\s+donnez\b/iu.test(text)
              ? "ordonnance-maison"
              : null,
      medications: [
        ...text.matchAll(
          /(?<![\p{L}\p{N}])(Metacam|Synulox|Clavaseptin|Convenia|Cerenia|Vetmedin|Fortekor|Thyronorm)(?![\p{L}\p{N}])/giu
        ),
      ].map(([brand]) => ({
        brand,
        dci: BRAND_DCI[brand.toLocaleLowerCase("fr-FR")],
      })),
    };
  });
}
export function extractTreatmentSentences(transcript: string) {
  const statements = analyzeTreatmentDictation(transcript);
  return {
    text: statements
      .filter((part) => part.kind !== "treatment")
      .map((part) => part.text)
      .join(" "),
    treatmentSentences: statements
      .filter((part) => part.kind === "treatment")
      .map((part) => part.text),
  };
}
export function appendVerbatimPlan(
  note: LocalSoapNote,
  phrases: string[]
): LocalSoapNote {
  return {
    ...note,
    plan: [note.plan, ...phrases].filter(Boolean).join("\n\n"),
  };
}
const destination = (kind: TreatmentKind): keyof LocalSoapNote | null =>
  kind === "history" || kind === "negated"
    ? "subjective"
    : kind === "hypothesis"
      ? "assessment"
      : kind === "treatment" || kind === "avoidance"
        ? "plan"
        : null;

export function routeGuidedTreatments(answers: LocalSoapNote): LocalSoapNote {
  const result: LocalSoapNote = {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };
  const moved: LocalSoapNote = { ...result };
  for (const key of [
    "subjective",
    "objective",
    "assessment",
    "plan",
  ] as const) {
    const kept: string[] = [];
    const statements = analyzeTreatmentDictation(answers[key]);
    for (const part of statements) {
      const target = destination(part.kind);
      if (target && target !== key)
        moved[target] = [moved[target], part.text].filter(Boolean).join("\n\n");
      else kept.push(part.text);
    }
    // Preserve whitespace in sections that have no routing change.
    result[key] =
      kept.length === statements.length ? answers[key] : kept.join(" ");
  }
  for (const key of ["subjective", "objective", "assessment", "plan"] as const)
    result[key] = [result[key], moved[key]].filter(Boolean).join("\n\n");
  return result;
}
export function prepareModelDictation(transcript: string) {
  const kept: string[] = [];
  const planSentences: string[] = [];
  const protectedSections: Partial<LocalSoapNote> = {};
  for (const part of analyzeTreatmentDictation(transcript)) {
    const target = destination(part.kind);
    // Negated dose instructions must not be converted into positive treatment.
    if (
      target === "plan" ||
      (!target && part.kind === "observation" && containsDosage(part.text))
    )
      planSentences.push(part.text);
    else if (target || (part.kind === "negated" && containsDosage(part.text))) {
      const key = target ?? "subjective";
      protectedSections[key] = [protectedSections[key], part.text]
        .filter(Boolean)
        .join("\n\n");
    } else kept.push(part.text);
  }
  return {
    text: kept.join(" "),
    planSentences,
    ...(Object.keys(protectedSections).length ? { protectedSections } : {}),
  };
}
export function mergeProtectedDictation(
  note: LocalSoapNote,
  input: ReturnType<typeof prepareModelDictation>
): LocalSoapNote {
  const result = appendVerbatimPlan(note, input.planSentences);
  for (const key of ["subjective", "objective", "assessment", "plan"] as const)
    result[key] = [result[key], input.protectedSections?.[key]]
      .filter(Boolean)
      .join("\n\n");
  return result;
}
