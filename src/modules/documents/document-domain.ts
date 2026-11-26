import { ISO_DATE } from "@/lib/patterns";
import type { InvoiceSettings } from "@/services/invoiceSettingsService";

export const DOCUMENT_TYPES = {
  prescription: "Ordonnance",
  certificate: "Certificat",
  report: "Compte-rendu",
  referral: "Lettre de référence",
} as const;
export type DocumentKind = keyof typeof DOCUMENT_TYPES;
export type DocumentStatus = "brouillon" | "finalise" | "annule";
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: "Brouillon",
  finalise: "Finalisé",
  annule: "Annulé",
};
export const CERTIFICATE_TYPES = [
  "Vaccination",
  "Stérilisation",
  "Bonne santé",
  "Vermifugation",
] as const;
export interface ManagedDocumentTemplate {
  active: boolean;
  body: string;
  createdAt: string;
  createdBy: string | null;
  id: string;
  kind: DocumentKind;
  name: string;
  updatedAt: string;
  usageCount: number;
}
export interface DocumentPreparation {
  clinic: InvoiceSettings;
  consultationId: string;
  content: string;
  patientId: string;
  patientName: string;
  soapId: string;
  sourceKey: string;
  template: ManagedDocumentTemplate;
  title: string;
  values: Record<string, string>;
}
export interface DocumentAttachment {
  dataUrl: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  name: string;
  pages: { page: number; text: string }[];
  size: number;
  textState: "extractible" | "scan" | "image";
}
export interface PatientDocument {
  attachment: DocumentAttachment | null;
  authorName: string;
  cancellationReason: string | null;
  clinic: InvoiceSettings;
  consultationId: string | null;
  content: string;
  createdAt: string;
  createdBy: string;
  finalizedAt: string | null;
  id: string;
  kind: DocumentKind | "import";
  patientId: string;
  patientName: string;
  pdfDataUrl: string | null;
  previousDocumentId: string | null;
  soapId: string | null;
  sourceKey: string | null;
  status: DocumentStatus;
  templateId: string | null;
  templateSnapshot: ManagedDocumentTemplate | null;
  title: string;
  updatedAt: string;
  values: Record<string, string>;
}
export interface DocumentEvent {
  action: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  documentId: string;
  id: string;
  reason: string | null;
}
export interface PrepareDocumentOptions {
  certificateType?: string;
  recipient?: string;
  referralReason?: string;
}

/** Date displayed by the clinic, including documents recorded around midnight. */
export function documentLocalDay(value: string): string {
  if (ISO_DATE.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
