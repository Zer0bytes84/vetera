import type { ConsultationDocument, Invoice, Prescription } from "@/types/db";
import { DOCUMENT_TYPES, type PatientDocument } from "@/modules/documents/document-domain";

export type TimelinePieceKind = "prescription" | "invoice" | "result" | "document";

/** A paper the visit produced: prescription, invoice, analysis result, document. */
export interface TimelinePiece {
  at: string;
  id: string;
  kind: TimelinePieceKind;
  label: string;
  /** Number or file name, shown next to the label. */
  detail?: string;
  /** The visit that produced it, when known. */
  appointmentId: string | null;
  /** Target to open: the record object behind the piece. */
  sourceId: string;
}

const PRESCRIPTION_STATUS: Record<Prescription["status"], string> = {
  draft: "brouillon",
  signed: "signée",
  dispensed: "délivrée",
  cancelled: "annulée",
};

const INVOICE_STATUS: Record<Invoice["documentStatus"], string> = {
  draft: "brouillon",
  issued: "émise",
  void: "annulée",
};

/**
 * Every piece of a patient's record, each tied to the visit it came from.
 * A prescription written in the Documents module and the same prescription
 * in the prescriptions table are two distinct records, both kept.
 */
export function collectTimelinePieces({
  attachments,
  documents,
  invoices,
  prescriptions,
}: {
  attachments: readonly ConsultationDocument[];
  documents: readonly PatientDocument[];
  invoices: readonly Invoice[];
  prescriptions: readonly Prescription[];
}): TimelinePiece[] {
  const pieces: TimelinePiece[] = [];
  for (const prescription of prescriptions) {
    pieces.push({
      at: prescription.prescriptionDate || prescription.createdAt,
      id: `prescription-${prescription.id}`,
      kind: "prescription",
      label: "Ordonnance",
      detail: PRESCRIPTION_STATUS[prescription.status] ?? undefined,
      appointmentId: prescription.appointmentId || null,
      sourceId: prescription.id,
    });
  }
  for (const invoice of invoices) {
    if (invoice.documentStatus === "draft") continue;
    pieces.push({
      at: invoice.issuedAt || invoice.createdAt,
      id: `invoice-${invoice.id}`,
      kind: "invoice",
      label: "Facture",
      detail: [invoice.number, invoice.documentStatus === "void" ? INVOICE_STATUS.void : ""].filter(Boolean).join(" · ") || undefined,
      appointmentId: invoice.appointmentId || null,
      sourceId: invoice.id,
    });
  }
  for (const attachment of attachments) {
    pieces.push({
      at: attachment.createdAt,
      id: `attachment-${attachment.id}`,
      kind: "result",
      label: attachment.description?.trim() || "Résultat ou pièce jointe",
      detail: attachment.fileName,
      appointmentId: attachment.appointmentId || null,
      sourceId: attachment.id,
    });
  }
  for (const document of documents) {
    if (document.status === "annule") continue;
    pieces.push({
      at: document.finalizedAt || document.createdAt,
      id: `document-${document.id}`,
      kind: document.kind === "prescription" ? "prescription" : document.kind === "import" ? "result" : "document",
      label: document.kind === "import" ? "Document importé" : DOCUMENT_TYPES[document.kind],
      detail: document.title || undefined,
      appointmentId: document.consultationId,
      sourceId: document.id,
    });
  }
  return pieces;
}

/** Pieces of each visit, and the pieces no visit produced. */
export function piecesByVisit(pieces: readonly TimelinePiece[], visitIds: ReadonlySet<string>) {
  const attached = new Map<string, TimelinePiece[]>();
  const loose: TimelinePiece[] = [];
  for (const piece of pieces) {
    if (piece.appointmentId && visitIds.has(piece.appointmentId)) {
      const list = attached.get(piece.appointmentId) ?? [];
      list.push(piece);
      attached.set(piece.appointmentId, list);
    } else {
      loose.push(piece);
    }
  }
  return { attached, loose };
}
