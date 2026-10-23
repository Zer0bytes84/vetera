import {
  expandSearchQuery,
  normalizeLexical,
  stemFrenchWord,
} from "./veterinary-lexicon";

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

/**
 * Splits a passage into plain and highlighted segments: a word is highlighted
 * when it matches a query term, its French stem, or a lexicon equivalent
 * (synonym, DCI, acronym). Display only; ranking never depends on it.
 */
export function highlightPassage(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) return [{ text, hit: false }];
  const expansion = expandSearchQuery(query);
  // An equivalent phrase is highlighted only where it appears whole in the passage.
  const passage = ` ${normalizeLexical(text)} `;
  const words = new Set([
    ...expansion.terms,
    ...expansion.phrases.filter((phrase) => passage.includes(` ${phrase} `)).flatMap((phrase) => phrase.split(" ")),
  ].filter((word) => word.length >= 3));
  const stems = new Set(expansion.stems.filter((stem) => stem.length >= 3));
  const segments: HighlightSegment[] = [];
  // Elisions (d’, l’) are separators: « d’antibiotique » highlights « antibiotique ».
  for (const part of text.split(/([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)/u)) {
    if (!part) continue;
    const normalized = normalizeLexical(part);
    const hit =
      /[\p{L}\p{N}]/u.test(part) &&
      normalized.length >= 3 &&
      (words.has(normalized) || (normalized.length >= 4 && stems.has(stemFrenchWord(normalized))));
    const last = segments.at(-1);
    if (last && last.hit === hit) last.text += part;
    else segments.push({ text: part, hit });
  }
  return segments;
}
