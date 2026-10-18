import type { InvoiceSettings } from "@/services/invoiceSettingsService";

export const DOCUMENT_TYPES = {
  prescription: "Ordonnance", certificate: "Certificat",
  report: "Compte-rendu", referral: "Lettre de référence",
} as const;
export type DocumentKind = keyof typeof DOCUMENT_TYPES;
export type DocumentStatus = "brouillon" | "finalise" | "annule";
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: "Brouillon", finalise: "Finalisé", annule: "Annulé",
};
export const CERTIFICATE_TYPES = ["Vaccination", "Stérilisation", "Bonne santé", "Vermifugation"] as const;
export interface ManagedDocumentTemplate {
  id: string; name: string; kind: DocumentKind; body: string; active: boolean;
  createdAt: string; updatedAt: string; createdBy: string | null; usageCount: number;
}
export interface DocumentPreparation {
  patientId: string; patientName: string; consultationId: string; soapId: string;
  sourceKey: string; template: ManagedDocumentTemplate; clinic: InvoiceSettings;
  values: Record<string, string>; title: string; content: string;
}
export interface DocumentAttachment {
  name: string; mimeType: "application/pdf" | "image/jpeg" | "image/png";
  dataUrl: string; size: number;
  textState: "extractible" | "scan" | "image";
  pages: { page: number; text: string }[];
}
export interface PatientDocument {
  id: string; patientId: string; patientName: string;
  consultationId: string | null; soapId: string | null; sourceKey: string | null;
  templateId: string | null; templateSnapshot: ManagedDocumentTemplate | null;
  kind: DocumentKind | "import"; title: string; content: string; status: DocumentStatus;
  clinic: InvoiceSettings; values: Record<string, string>;
  attachment: DocumentAttachment | null; pdfDataUrl: string | null;
  previousDocumentId: string | null; cancellationReason: string | null;
  createdAt: string; updatedAt: string; finalizedAt: string | null;
  createdBy: string; authorName: string;
}
export interface DocumentEvent {
  id: string; documentId: string; action: string; authorId: string;
  authorName: string; createdAt: string; reason: string | null;
}
export interface PrepareDocumentOptions {
  certificateType?: string; recipient?: string; referralReason?: string;
}

/** Date displayed by the clinic, including documents recorded around midnight. */
export function documentLocalDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
