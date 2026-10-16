import {
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
} from "@/services/browser-store";
import { generateId, runDbTransaction } from "@/services/sqlite/database";
import {
  isSoapReviewed,
  soapSourceKey,
} from "@/modules/consultations/local-ai/soap-review";
import type { Appointment, ConsultationSoap, Note } from "@/types/db";
import { documentToHtml } from "./document-templates";

export interface ReviewedDocumentInput {
  title: string;
  text: string;
  patientId: string;
  appointmentId: string;
  userId: string;
  reviewed: boolean;
  source:
    | {
        type: "soap";
        sourceKey: string;
        template: { id: string; name: string; body: string; updatedAt: string };
      }
    | {
        type: "document";
        name: string;
        sourceId?: string;
        pages: { number: number; text: string; method: string }[];
        question?: string;
      };
}
export function assertDocumentSource(
  input: ReviewedDocumentInput,
  appointment: Pick<Appointment, "patientId"> | undefined,
  soap?: ConsultationSoap
) {
  if (!input.reviewed)
    throw new Error(
      "Relisez et validez le document avant tout enregistrement."
    );
  if (!input.userId || !input.patientId || !input.appointmentId)
    throw new Error(
      "Le patient, la consultation et le vétérinaire doivent être identifiés."
    );
  if (!input.title.trim() || !input.text.trim() || input.text.length > 60000)
    throw new Error(
      "Le document doit contenir un titre et un texte de 60 000 caractères maximum."
    );
  if (appointment?.patientId !== input.patientId)
    throw new Error("La consultation n’appartient pas à ce patient.");
  if (
    input.source.type === "soap" &&
    (!soap ||
      soap.patientId !== input.patientId ||
      !isSoapReviewed(soap) ||
      soapSourceKey(soap) !== input.source.sourceKey)
  )
    throw new Error(
      "La note a changé ou n’est pas validée. Validez-la puis préparez à nouveau le document."
    );
}
export async function saveReviewedDocument(
  input: ReviewedDocumentInput
): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = {
    id: generateId(),
    userId: input.userId,
    patientId: input.patientId,
    title: input.title.trim(),
    content: documentToHtml(input.text),
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    tags: JSON.stringify({
      clinicalDocument: {
        appointmentId: input.appointmentId,
        reviewedAt: now,
        reviewedBy: input.userId,
        source: input.source,
      },
    }),
  };
  if (isTauriRuntime()) {
    await runDbTransaction(async (db) => {
      const appointments = await db.select<Pick<Appointment, "patientId">[]>(
        "SELECT patient_id AS patientId FROM appointments WHERE id = ?",
        [input.appointmentId]
      );
      const soaps =
        input.source.type === "soap"
          ? await db.select<ConsultationSoap[]>(
              "SELECT patient_id AS patientId, subjective, objective, assessment, plan, content, ai_draft AS aiDraft FROM consultation_soaps WHERE appointment_id = ?",
              [input.appointmentId]
            )
          : [];
      assertDocumentSource(input, appointments[0], soaps[0]);
      await db.execute(
        "INSERT INTO notes (id, user_id, patient_id, title, content, is_favorite, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
        [
          note.id,
          note.userId,
          note.patientId,
          note.title,
          note.content,
          note.tags,
          now,
          now,
        ]
      );
    });
  } else {
    const appointment = getBrowserTable<Appointment>("appointments").find(
      (entry) => entry.id === input.appointmentId
    );
    const soap = getBrowserTable<ConsultationSoap>("consultation_soaps").find(
      (entry) => entry.appointmentId === input.appointmentId
    );
    assertDocumentSource(input, appointment, soap);
    insertBrowserRow("notes", note);
  }
  window.dispatchEvent(
    new CustomEvent("sqlite-data-changed", { detail: { tableName: "notes" } })
  );
  return note;
}
