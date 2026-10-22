// Pure scoring functions of the evaluation bench (no model, no database).
export type SoapSections = Record<
  "subjective" | "objective" | "assessment" | "plan",
  string
>;
const KEYS = ["subjective", "objective", "assessment", "plan"] as const;

export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => normalize(sentence).length > 0);
const words = (text: string) =>
  normalize(text)
    .split(" ")
    .filter((word) => word.length >= 4);

export interface SoapCaseScore {
  /** Scaffold sentences found word for word (normalized) in the same section. */
  fidelity: number;
  /** Words of the draft found neither in the dictation nor in the scaffold. */
  alteredWords: string[];
  /** Reference sentences that the draft files in the same section; null without reference. */
  sectionAgreement: number | null;
  /** Draft sentences carrying a dosage absent from the dictation. */
  inventedDosages: string[];
}

export function scoreSoapDraft(
  transcript: string,
  scaffold: SoapSections,
  draft: SoapSections,
  reference: SoapSections | null,
  containsDosage: (text: string) => boolean
): SoapCaseScore {
  let found = 0,
    total = 0;
  for (const key of KEYS)
    for (const sentence of sentences(scaffold[key])) {
      total++;
      if (normalize(draft[key]).includes(normalize(sentence))) found++;
    }
  const known = new Set([
    ...words(transcript),
    ...KEYS.flatMap((key) => words(scaffold[key])),
  ]);
  const alteredWords = [
    ...new Set(KEYS.flatMap((key) => words(draft[key]))),
  ].filter((word) => !known.has(word));
  let sectionAgreement: number | null = null;
  if (reference) {
    let placed = 0,
      agreed = 0;
    for (const key of KEYS)
      for (const sentence of sentences(reference[key])) {
        const target = normalize(sentence);
        const home = KEYS.find((candidate) =>
          normalize(draft[candidate]).includes(target)
        );
        if (!home) continue;
        placed++;
        if (home === key) agreed++;
      }
    sectionAgreement = placed ? agreed / placed : null;
  }
  const dictated = normalize(transcript);
  const inventedDosages = KEYS.flatMap((key) => sentences(draft[key])).filter(
    (sentence) =>
      containsDosage(sentence) && !dictated.includes(normalize(sentence))
  );
  return {
    fidelity: total ? found / total : 1,
    alteredWords,
    sectionAgreement,
    inventedDosages,
  };
}

/** Relevance key of a search result or annotation. */
export const resultKey = (item: {
  sourceType: string;
  sourceId: string;
  section: string;
}) => `${item.sourceType}:${item.sourceId}:${item.section}`;

export function retrievalScores(ranked: string[], relevant: string[]) {
  const wanted = new Set(relevant);
  if (!wanted.size)
    // "Nothing in the record" is right only when nothing is returned.
    return { recallAt5: ranked.length ? 0 : 1, mrrAt10: null, ndcgAt10: null };
  const top = ranked.slice(0, 10);
  const first = top.findIndex((key) => wanted.has(key));
  const dcg = top.reduce(
    (sum, key, index) => sum + (wanted.has(key) ? 1 / Math.log2(index + 2) : 0),
    0
  );
  const ideal = [...Array(Math.min(wanted.size, 10)).keys()].reduce(
    (sum, index) => sum + 1 / Math.log2(index + 2),
    0
  );
  return {
    recallAt5: ranked.slice(0, 5).some((key) => wanted.has(key)) ? 1 : 0,
    mrrAt10: first < 0 ? 0 : 1 / (first + 1),
    ndcgAt10: dcg / ideal,
  };
}

export function citationScores(
  citedPages: number[],
  expectedPages: number[],
  noAnswer: boolean
) {
  if (noAnswer) return { relevant: citedPages.length ? 0 : 1 };
  const expected = new Set(expectedPages);
  return {
    relevant: citedPages.some((page) => expected.has(page)) ? 1 : 0,
  };
}
