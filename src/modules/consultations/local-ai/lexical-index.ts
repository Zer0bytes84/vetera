import { lexicalWords } from "./veterinary-lexicon";

/**
 * Word index of the search passages, for the all-patients word search. FTS5 without stored content: the index holds
 * the tokens of lexicalWords(chunk_text) under the rowid of the passage in `embeddings`. The SQLite triggers of the
 * migration drop an entry when its passage is deleted or rewritten; syncLexicalIndex adds what is missing (passages
 * written since, by this post or another one of the clinic network, or before the migration).
 * The table and its triggers come from lexical-index-migration.ts.
 */

interface LexicalIndexDatabase {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  select: <T>(sql: string, params?: unknown[]) => Promise<T>;
}

/** The SOAP sections in the order of their index entries (rowid = note rowid × 4 + position). */
export const SOAP_LEXICAL_SECTIONS = [
  "subjective",
  "objective",
  "assessment",
  "plan",
] as const;

/** Rows per INSERT: two parameters each, far below SQLite's limit on bound parameters. */
const SYNC_BATCH = 200;

/**
 * Adds to the index every passage it lacks. Returns false when the index cannot be used (database not migrated yet,
 * for instance a network host still on an older version): the caller then reads passages without it.
 */
export async function syncLexicalIndex(db: LexicalIndexDatabase) {
  let missing: Array<{ id: number; text: string | null }>;
  try {
    missing = await db.select<Array<{ id: number; text: string | null }>>(
      "SELECT e.rowid AS id, e.chunk_text AS text FROM embeddings e WHERE NOT EXISTS (SELECT 1 FROM embeddings_lexical l WHERE l.rowid = e.rowid)"
    );
  } catch {
    return false;
  }
  for (let start = 0; start < missing.length; start += SYNC_BATCH) {
    const batch = missing.slice(start, start + SYNC_BATCH);
    // NOT EXISTS keeps the insert idempotent when two posts fill the index at the same time.
    await db.execute(
      `INSERT INTO embeddings_lexical(rowid, words) SELECT column1, column2 FROM (VALUES ${batch.map(() => "(?, ?)").join(", ")}) AS v WHERE NOT EXISTS (SELECT 1 FROM embeddings_lexical l WHERE l.rowid = v.column1)`,
      batch.flatMap((row) => [row.id, lexicalWords(row.text ?? "")])
    );
  }
  return true;
}

/** Notes per pass of the SOAP index: four rows each. */
const SOAP_SYNC_BATCH = 50;

/**
 * Adds to the SOAP word index every note it lacks (written since, by this post or another one, or before the
 * migration). A note is indexed when its first entry exists: the four are always written together, empty sections
 * included, so that a note is read once. Returns false when the index cannot be used; the bar then reads every note.
 */
export async function syncSoapLexicalIndex(db: LexicalIndexDatabase) {
  let missing: Array<{
    id: number;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
  }>;
  try {
    missing = await db.select(
      "SELECT s.rowid AS id, s.subjective, s.objective, s.assessment, s.plan FROM consultation_soaps s WHERE NOT EXISTS (SELECT 1 FROM soap_lexical l WHERE l.rowid = s.rowid * 4)"
    );
  } catch {
    return false;
  }
  for (let start = 0; start < missing.length; start += SOAP_SYNC_BATCH) {
    const rows = missing
      .slice(start, start + SOAP_SYNC_BATCH)
      .flatMap((note) =>
        SOAP_LEXICAL_SECTIONS.map((section, position) => [
          note.id * 4 + position,
          lexicalWords(note[section] ?? ""),
        ])
      );
    await db.execute(
      `INSERT INTO soap_lexical(rowid, words) SELECT column1, column2 FROM (VALUES ${rows.map(() => "(?, ?)").join(", ")}) AS v WHERE NOT EXISTS (SELECT 1 FROM soap_lexical l WHERE l.rowid = v.column1)`,
      rows.flat()
    );
  }
  return true;
}
