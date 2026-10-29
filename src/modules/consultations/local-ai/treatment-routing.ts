import { containsDosage, type LocalSoapNote } from "./soap-schema";
import { evidenceTokens } from "./dictation-scaffold";
import { stripSoapLayout } from "./soap-layout";

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
/**
 * Guided dictation: the sentences kept away from the model (doses, treatments,
 * history) go back word for word into the rubric they were dictated in, once
 * treatments have been routed to the plan. Nothing moves to another rubric.
 */
export function mergeGuidedProtected(
  note: LocalSoapNote,
  routed: LocalSoapNote
): LocalSoapNote {
  const result = { ...note };
  for (const key of ["subjective", "objective", "assessment", "plan"] as const) {
    const input = prepareModelDictation(routed[key]);
    result[key] = [
      result[key],
      ...input.planSentences,
      ...Object.values(input.protectedSections ?? {}),
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return result;
}
// A clause ends on a comma or semicolon followed by a space (38,5 stays whole).
const clauses = (sentence: string) =>
  sentence.split(/(?<=[,;])\s+/u).filter((part) => part.trim());
// Same words, numbers and signs as the fidelity check (evidenceTokens), counted
// on the text as written so that positions can be found again in it.
const EVIDENCE = /[+\-−]?\d+(?:[.,]\d+)?|\p{L}+|[<>≤≥=%/]/gu;
const evidenceCount = (text: string) => text.match(EVIDENCE)?.length ?? 0;
const sameEvidence = (a: string, b: string) =>
  evidenceTokens(a).join(" ") === evidenceTokens(b).join(" ");

interface Piece {
  text: string;
  /** First clause of its sentence: it starts a sentence again once restored. */
  opens: boolean;
  /** Kept away from the model, restored word for word at its own place. */
  kept: boolean;
}

/** The text the model receives: the clauses it may see, sentence by sentence. */
function modelText(pieces: Piece[]) {
  const groups: string[][] = [];
  for (const piece of pieces) {
    if (piece.opens) groups.push([]);
    if (!piece.kept) groups[groups.length - 1].push(piece.text);
  }
  return groups
    .filter((parts) => parts.length)
    .map((parts) =>
      [...parts.slice(0, -1), parts[parts.length - 1].replace(/[,;]$/u, ".")].join(" ")
    )
    .join(" ");
}

// Puts each group of clauses kept from the model back after the same number of
// words as in the dictation. Punctuation follows the model where it can.
function restoreClauses(output: string, pieces: Piece[]) {
  let text = output.trim();
  let seen = 0;
  const groups: { at: number; opens: boolean; parts: string[] }[] = [];
  for (const piece of pieces) {
    if (!piece.kept) {
      seen += evidenceCount(piece.text);
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.at === seen) last.parts.push(piece.text);
    else groups.push({ at: seen, opens: piece.opens, parts: [piece.text] });
  }
  // From the end, so earlier positions stay valid.
  for (const group of groups.reverse()) {
    const ends = [...text.matchAll(EVIDENCE)].map((match) => match.index + match[0].length);
    const cut = group.at === 0 ? 0 : ends[group.at - 1];
    const head = text.slice(0, cut);
    const after = text.slice(cut);
    const insert = group.parts.join(" ");
    if (group.opens) {
      // A sentence of its own: after the model's end of the previous sentence.
      const stop = /^[.!?]*/u.exec(after)![0];
      text = [head + stop, insert, after.slice(stop.length).trim()].filter(Boolean).join(" ");
    } else if (/^\s*[.,;:!?]/u.test(after)) {
      // Inside a sentence: the model's own punctuation follows the clauses.
      text = head + (head ? ", " : "") + insert.replace(/[.,;:!?]+$/u, "") + after.trimStart();
    } else {
      const rest = after.trim();
      const tail = rest ? (/[.!?,;]$/u.test(insert) ? " " : ", ") + rest : "";
      text = head + (head ? ", " : "") + insert + tail;
    }
  }
  return text;
}

export interface GuidedSection {
  /** Text of this rubric sent to the model; empty when the model gets none of it. */
  model: string;
  /** "phrase": whole sentences kept away (punctuated dictation, unchanged);
   * "proposition": clauses kept away, because whole sentences emptied the rubric;
   * "exclue": nothing left for the model, the rubric is not sent to it at all. */
  mode: "phrase" | "proposition" | "exclue";
  /** Final rubric from the model's validated text. */
  restore: (output: string) => string;
}

/**
 * Guided dictation, rubric by rubric. A punctuated rubric keeps the sentence
 * filter. A rubric that this filter would empty (a transcription that links
 * sentences with commas) is filtered clause by clause instead; doses, routed
 * statements, and any clause that would let a dose pattern span the text the
 * model sees stay away from it and return word for word at their own place.
 * A rubric with nothing left is never sent to the model.
 */
export function prepareGuidedSections(
  routed: LocalSoapNote,
  /** The rubrics as dictated, before routing: a rubric routing emptied is not sent either. */
  dictated: LocalSoapNote = routed
): Record<keyof LocalSoapNote, GuidedSection> {
  const sections = {} as Record<keyof LocalSoapNote, GuidedSection>;
  for (const key of ["subjective", "objective", "assessment", "plan"] as const) {
    const source = routed[key];
    const input = prepareModelDictation(source);
    if (!source.trim() && dictated[key].trim()) {
      sections[key] = { model: "", mode: "exclue", restore: () => source };
      continue;
    }
    if (input.text.trim() || !source.trim()) {
      sections[key] = {
        model: input.text,
        mode: "phrase",
        restore: (output) =>
          [output, ...input.planSentences, ...Object.values(input.protectedSections ?? {})]
            .filter(Boolean)
            .join("\n\n"),
      };
      continue;
    }
    const pieces: Piece[] = sentences(source).flatMap((sentence) =>
      clauses(sentence.trim()).map((text, index) => {
        const [part] = analyzeTreatmentDictation(text);
        return {
          text,
          opens: index === 0,
          kept: !part || part.kind !== "observation" || containsDosage(text),
        };
      })
    );
    // A dose pattern may span clauses the model sees ("traitement, …, une visite
    // dans 10 jours"): the clause that completes it stays away from the model too.
    pieces.forEach((piece, index) => {
      if (!piece.kept && containsDosage(modelText(pieces.slice(0, index + 1))))
        piece.kept = true;
    });
    const model = modelText(pieces);
    sections[key] = model
      ? {
          model,
          mode: "proposition",
          restore: (output) => {
            const restored = restoreClauses(stripSoapLayout(key, output), pieces);
            // Word for word or the dictation itself: never a lost or moved word.
            return sameEvidence(restored, source) ? restored : source;
          },
        }
      : { model: "", mode: "exclue", restore: () => source };
  }
  return sections;
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
