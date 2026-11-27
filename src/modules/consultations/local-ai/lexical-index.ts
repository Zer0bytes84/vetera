import {
  consultationSearchChunks,
  patientSearchChunks,
} from "./embedding-index";
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

/** Rows per INSERT of the record indexes: two parameters each. */
const RECORD_SYNC_BATCH = 200;

async function fillIndex(
  db: LexicalIndexDatabase,
  table: "appointment_lexical" | "patient_lexical",
  rows: Array<{ id: number; words: string }>
) {
  for (let start = 0; start < rows.length; start += RECORD_SYNC_BATCH) {
    const batch = rows.slice(start, start + RECORD_SYNC_BATCH);
    // NOT EXISTS keeps the insert idempotent when two posts fill the index at the same time.
    await db.execute(
      `INSERT INTO ${table}(rowid, words) SELECT column1, column2 FROM (VALUES ${batch.map(() => "(?, ?)").join(", ")}) AS v WHERE NOT EXISTS (SELECT 1 FROM ${table} l WHERE l.rowid = v.column1)`,
      batch.flatMap((row) => [row.id, row.words])
    );
  }
}

/**
 * Adds to the consultation-record index every appointment it lacks. An appointment with no searchable text gets an
 * empty entry, so that it is read once. False when the index cannot be used; the bar then reads every appointment.
 */
export async function syncAppointmentLexicalIndex(db: LexicalIndexDatabase) {
  let missing: Array<{
    id: number;
    appointmentId: string;
    patientId: string;
    title: string | null;
    type: string | null;
    reason: string | null;
    diagnosis: string | null;
    treatment: string | null;
    notes: string | null;
  }>;
  try {
    missing = await db.select(
      "SELECT a.rowid AS id, a.id AS appointmentId, a.patient_id AS patientId, a.title, a.type, a.reason, a.diagnosis, a.treatment, a.notes FROM appointments a WHERE NOT EXISTS (SELECT 1 FROM appointment_lexical l WHERE l.rowid = a.rowid)"
    );
  } catch {
    return false;
  }
  await fillIndex(
    db,
    "appointment_lexical",
    missing.map((row) => ({
      id: row.id,
      words: lexicalWords(
        consultationSearchChunks({
          id: row.appointmentId,
          patientId: row.patientId,
          title: row.title ?? undefined,
          type: row.type ?? undefined,
          reason: row.reason,
          diagnosis: row.diagnosis,
          treatment: row.treatment,
          notes: row.notes,
        })[0]?.text ?? ""
      ),
    }))
  );
  return true;
}

/** Same for the patient profiles. */
export async function syncPatientLexicalIndex(db: LexicalIndexDatabase) {
  let missing: Array<{
    id: number;
    patientId: string;
    name: string;
    species: string;
    breed: string | null;
    chip_number: string | null;
    allergies: string | null;
    chronic_conditions: string | null;
    general_notes: string | null;
  }>;
  try {
    missing = await db.select(
      "SELECT p.rowid AS id, p.id AS patientId, p.name, p.species, p.breed, p.chip_number, p.allergies, p.chronic_conditions, p.general_notes FROM patients p WHERE NOT EXISTS (SELECT 1 FROM patient_lexical l WHERE l.rowid = p.rowid)"
    );
  } catch {
    return false;
  }
  await fillIndex(
    db,
    "patient_lexical",
    missing.map((row) => ({
      id: row.id,
      words: lexicalWords(
        patientSearchChunks({ ...row, id: row.patientId })[0]?.text ?? ""
      ),
    }))
  );
  return true;
}
