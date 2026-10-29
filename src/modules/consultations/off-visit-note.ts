/**
 * A clinical note kept in the patient's record without any visit: a call
 * from the owner, advice given by phone, a quick observation. It is a `notes`
 * row bound to the patient (never an appointment, so Flux never sees it),
 * written only once the vet has validated it. Its SOAP sections, transcript
 * and review travel in `tags.offVisitNote`; the content is the readable text
 * that search and the record export already know how to read.
 */
import {
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
} from "@/services/browser-store";
import { generateId, runDbTransaction } from "@/services/sqlite/database";
import { documentToHtml } from "@/modules/documents/lib/document-templates";
import type { Note, Patient } from "@/types/db";
import { localSoapSchema, type LocalSoapNote } from "./local-ai/soap-schema";
import { soapNoteText } from "./local-ai/soap-layout";
import type { SoapNoteOrigin } from "./components/local-consultation-assistant";

export const OFF_VISIT_KINDS = {
  call: "Appel du propriétaire",
  advice: "Conseil téléphonique",
  observation: "Observation",
} as const;
export type OffVisitKind = keyof typeof OFF_VISIT_KINDS;

export interface OffVisitNoteMeta {
  kind: OffVisitKind;
  soap: LocalSoapNote;
  transcript: string;
  /** "dictee": the vet's own dictation; "assistant": structured by the assistant; "saisie": typed. */
  origin: SoapNoteOrigin | "saisie";
  reviewedAt: string;
  reviewedBy: string;
}

export interface OffVisitNoteInput {
  patientId: string;
  userId: string;
  kind: OffVisitKind;
  note: LocalSoapNote;
  transcript?: string;
  origin: OffVisitNoteMeta["origin"];
  /** The vet's explicit validation: nothing is written without it. */
  validated: boolean;
}

/** The note's own metadata, or null for any other note of the record. */
export function readOffVisitNote(note: Pick<Note, "tags">): OffVisitNoteMeta | null {
  try {
    const meta = JSON.parse(note.tags ?? "{}")?.offVisitNote;
    return meta && typeof meta === "object" && meta.kind in OFF_VISIT_KINDS && typeof meta.reviewedAt === "string" ? meta : null;
  } catch {
    return null;
  }
}

export function offVisitTitle(kind: OffVisitKind) {
  return `Note hors visite · ${OFF_VISIT_KINDS[kind]}`;
}

/** Checks the input and builds the row; throws before anything is written. */
export function buildOffVisitNote(input: OffVisitNoteInput, now = new Date().toISOString()): Note {
  if (!input.validated) throw new Error("Relisez et validez la note avant de l’enregistrer.");
  if (!input.patientId || !input.userId) throw new Error("Le patient et le vétérinaire doivent être identifiés.");
  if (!(input.kind in OFF_VISIT_KINDS)) throw new Error("Choisissez la nature de la note.");
  const parsed = localSoapSchema.safeParse(input.note);
  if (!parsed.success) throw new Error("La note est vide : écrivez ou dictez au moins une section.");
  const meta: OffVisitNoteMeta = {
    kind: input.kind,
    soap: parsed.data,
    transcript: input.transcript?.trim() ?? "",
    origin: input.origin,
    reviewedAt: now,
    reviewedBy: input.userId,
  };
  return {
    id: generateId(),
    userId: input.userId,
    patientId: input.patientId,
    title: offVisitTitle(input.kind),
    content: documentToHtml(soapNoteText(parsed.data)),
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    tags: JSON.stringify({ offVisitNote: meta }),
  };
}

/** Writes a validated note to the patient's record, after checking the patient exists. */
export async function saveOffVisitNote(input: OffVisitNoteInput): Promise<Note> {
  const note = buildOffVisitNote(input);
  if (isTauriRuntime()) {
    await runDbTransaction(async (db) => {
      const found = await db.select<Pick<Patient, "id">[]>("SELECT id FROM patients WHERE id = ?", [note.patientId]);
      if (!found[0]) throw new Error("Ce patient n’existe plus.");
      await db.execute(
        "INSERT INTO notes (id, user_id, patient_id, title, content, is_favorite, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
        [note.id, note.userId, note.patientId, note.title, note.content, note.tags, note.createdAt, note.updatedAt],
      );
    });
  } else {
    if (!getBrowserTable<Patient>("patients").some((patient) => patient.id === note.patientId))
      throw new Error("Ce patient n’existe plus.");
    insertBrowserRow("notes", note);
  }
  window.dispatchEvent(new CustomEvent("sqlite-data-changed", { detail: { tableName: "notes" } }));
  return note;
}
