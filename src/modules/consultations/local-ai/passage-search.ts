// Passage index (phase A1): sources are split into short passages, ranked by
// vector score, with the veterinary lexicon as a score bonus instead of an
// absolute priority. The section index (v2) stays available for rollback.
import {
  EMBEDDING_MODEL_KEY,
  MIN_LEXICAL_FLOOR_SCORE,
  MIN_SEARCH_SCORE,
  assertSearchScope,
  type SearchChunk,
  type SearchScope,
} from "./embedding-index";
import type { SearchModel } from "./worker-protocol";
import {
  matchesExactSearchTerms,
  matchesNumericConstraints,
  matchesSearchTerms,
} from "./veterinary-lexicon";

export type SearchGeneration = "sections" | "passages" | "passages2" | "passages3";
/** Chosen on the phase A1 bench: 800 characters ≈ 200 tokens in French. */
export const PASSAGE_CHARACTERS = 800;
export const PASSAGE_MODEL_KEY =
  "embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3";
/** Phase A2: same passages, EmbeddingGemma 2 text component (q8, WebGPU). */
export const PASSAGE_V2_MODEL_KEY =
  "embeddinggemma2-text-q8-webgpu-768-passages800-v4";
/** Candidate measured for A2: arctic-embed-l-v2 (q8, WASM), truncated to 768 dimensions. */
export const PASSAGE_ARCTIC_MODEL_KEY = "arctic-embed-l-v2-q8-wasm-768-passages800-v5";
export const SEARCH_INDEX_KEYS: Record<SearchGeneration, string> = {
  sections: EMBEDDING_MODEL_KEY,
  passages: PASSAGE_MODEL_KEY,
  passages2: PASSAGE_V2_MODEL_KEY,
  passages3: PASSAGE_ARCTIC_MODEL_KEY,
};
export const GENERATION_MODEL: Record<SearchGeneration, SearchModel> = {
  sections: "embeddinggemma",
  passages: "embeddinggemma",
  passages2: "embeddinggemma2",
  passages3: "arctic",
};
/** Indexes kept current: v1 ones always (rollback), each A2 candidate only once its model is installed. */
export const INDEXED_GENERATIONS: SearchGeneration[] = ["sections", "passages"];
export const indexedGenerations = (models: { embedding2Ready?: boolean; arcticReady?: boolean }): SearchGeneration[] => [
  ...INDEXED_GENERATIONS,
  ...(models.embedding2Ready ? (["passages2"] as const) : []),
  ...(models.arcticReady ? (["passages3"] as const) : []),
];
export const LEXICAL_BONUS = 0.05;
/** Lexical-only sources (no vector) rank like a borderline semantic hit confirmed by the lexicon. */
export const LEXICAL_ONLY_SCORE = MIN_SEARCH_SCORE + LEXICAL_BONUS;

/**
 * Splits text into passages of about `size` characters, cut at sentence ends,
 * each passage repeating the previous one's last sentence. A sentence longer
 * than `size` is cut at word boundaries so no passage can exceed the model limit.
 */
export function splitPassages(text: string, size = PASSAGE_CHARACTERS): string[] {
  const sentences = text
    .split(/(?<=[.!?;:])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .flatMap((sentence) => {
      if (sentence.length <= size) return [sentence];
      const pieces: string[] = [];
      let current = "";
      for (const word of sentence.split(/\s+/)) {
        if (current && current.length + word.length + 1 > size) {
          pieces.push(current);
          current = "";
        }
        current = current ? `${current} ${word}` : word.slice(0, size);
      }
      if (current) pieces.push(current);
      return pieces;
    });
  const passages: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (current.length && length + sentence.length > size) {
      passages.push(current.join(" "));
      const overlap = current.at(-1)!;
      // The overlap is dropped when it would push the passage past the limit.
      current = overlap.length + sentence.length < size ? [overlap] : [];
      length = current.length ? overlap.length + 1 : 0;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }
  if (current.length) passages.push(current.join(" "));
  return passages;
}

/** One search row per passage, numbered per source section. */
export function passageChunks(chunks: SearchChunk[], size = PASSAGE_CHARACTERS): SearchChunk[] {
  return chunks.flatMap((chunk) =>
    splitPassages(chunk.text, size).map((text, chunkIndex) => ({ ...chunk, text, chunkIndex })),
  );
}

/** The passage of `text` that best matches `query` lexically, for display. */
export function bestPassage(text: string, query: string, size = PASSAGE_CHARACTERS) {
  const passages = splitPassages(text, size);
  return passages.find((passage) => matchesSearchTerms(query, passage)) ?? passages[0] ?? text;
}

/**
 * Starts a short preview near the first matched term when the term sits far
 * into the passage, so a two-line preview still shows why it was found.
 */
export function focusExcerpt(text: string, query: string, lead = 90) {
  let offset = 0;
  for (const sentence of text.split(/(?<=[.!?;:])\s+/u)) {
    const start = text.indexOf(sentence, offset);
    if (matchesSearchTerms(query, sentence)) return start > lead ? `… ${text.slice(start)}` : text;
    offset = start + sentence.length;
  }
  return text;
}

/**
 * Score calibration of one embedding model: cosine distributions differ from
 * one model to another, so the semantic threshold and the lexical scores do too.
 */
export interface SearchCalibration {
  minimum: number;
  lexicalFloor: number;
  bonus: number;
  lexicalOnly: number;
}
/** v1 values (EmbeddingGemma 300M), calibrated on whole sections then kept for passages. */
export const V1_CALIBRATION: SearchCalibration = {
  minimum: MIN_SEARCH_SCORE,
  lexicalFloor: MIN_LEXICAL_FLOOR_SCORE,
  bonus: LEXICAL_BONUS,
  lexicalOnly: LEXICAL_ONLY_SCORE,
};
export const MODEL_CALIBRATION: Record<SearchModel, SearchCalibration> = {
  embeddinggemma: V1_CALIBRATION,
  embeddinggemma2: V1_CALIBRATION,
  arctic: V1_CALIBRATION,
};
/** Unit vector of any dimension (rankPassages compares query and passages of the same model). */
const unitVector = (vector: number[]) => {
  if (!vector.length || vector.some((value) => !Number.isFinite(value)))
    throw new Error("L’extrait n’a pas pu être préparé pour la recherche.");
  const norm = Math.hypot(...vector);
  if (!norm) throw new Error("L’extrait de recherche est vide.");
  return vector.map((value) => value / norm);
};

export type RankedPassage<T extends SearchChunk> = T & {
  score: number;
  match: "text" | "semantic";
};

/**
 * Ranks passages by cosine score plus the lexical bonus and keeps the best
 * passage per source: a document scores as its best passage. Numeric
 * constraints stay exact. An exact clinical term is never dropped for a low
 * cosine, and lexical-only sources (no vector) are merged at LEXICAL_ONLY_SCORE.
 */
export function rankPassages<T extends SearchChunk & { vector: number[] }>(
  rows: T[],
  query: number[] | null,
  scope: SearchScope,
  queryText: string,
  limit = 5,
  lexicalOnly: SearchChunk[] = [],
  calibration: SearchCalibration = V1_CALIBRATION,
): RankedPassage<SearchChunk>[] {
  assertSearchScope(scope);
  const unit = query ? unitVector(query) : null;
  const inScope = (row: SearchChunk) =>
    row.patientId === scope.patientId &&
    scope.sourceTypes.includes(row.sourceType) &&
    scope.sections.includes(row.section) &&
    matchesNumericConstraints(queryText, row.text);
  const scored: RankedPassage<SearchChunk>[] = [];
  for (const row of rows) {
    if (!inScope(row)) continue;
    const lexical = matchesSearchTerms(queryText, row.text);
    const cosine = unit
      ? unitVector(row.vector).reduce((sum, value, i) => sum + value * unit[i], 0)
      : lexical ? calibration.minimum : 0;
    const eligible =
      cosine >= calibration.minimum ||
      (lexical && (cosine >= calibration.lexicalFloor || matchesExactSearchTerms(queryText, row.text)));
    if (!eligible) continue;
    const { vector: _vector, ...chunk } = row;
    void _vector;
    scored.push({ ...chunk, score: cosine + (lexical ? calibration.bonus : 0), match: lexical ? "text" : "semantic" });
  }
  for (const chunk of lexicalOnly) {
    if (!inScope(chunk) || !matchesSearchTerms(queryText, chunk.text)) continue;
    scored.push({ ...chunk, text: bestPassage(chunk.text, queryText), score: calibration.lexicalOnly, match: "text" });
  }
  const best = new Map<string, RankedPassage<SearchChunk>>();
  for (const row of scored) {
    const key = `${row.sourceType}:${row.sourceId}`;
    const current = best.get(key);
    if (!current || row.score > current.score) best.set(key, row);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId) || a.chunkIndex - b.chunkIndex)
    .slice(0, Math.max(1, Math.min(20, limit)));
}

/** Section index (v2) merge, unchanged: lexical matches first, then semantic rows. */
export function mergeLexicalFirst<T extends SearchChunk>(lexical: T[], semantic: T[], limit = 5) {
  const found = new Map<string, T>();
  for (const row of [...lexical, ...semantic]) {
    const key = `${row.sourceType}:${row.sourceId}:${row.section}:${row.chunkIndex}`;
    if (!found.has(key)) found.set(key, row);
  }
  return [...found.values()].slice(0, limit);
}
