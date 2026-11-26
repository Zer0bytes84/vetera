import type { InvoiceSettings } from "@/services/invoiceSettingsService";

export interface PatientRecordOptions {
  includeAttachments: boolean;
  period: { from: string; to: string } | null;
  sections: {
    identity: boolean;
    consultations: boolean;
    documents: boolean;
    reminders: boolean;
    notes: boolean;
  };
}

export const DEFAULT_PATIENT_RECORD_OPTIONS: PatientRecordOptions = {
  period: null,
  sections: {
    identity: true,
    consultations: true,
    documents: true,
    reminders: true,
    notes: true,
  },
  includeAttachments: true,
};

export interface PatientRecordSource {
  createdAt?: string;
  dataUrl: string;
  fileName: string;
  id: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  origin: "generated" | "import";
  patientId: string;
  title: string;
}

export type PatientRecordBlock =
  | { kind: "text"; title?: string; text: string; meta?: string }
  | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[] }
  | { kind: "source"; source: PatientRecordSource };

export interface PatientRecordSection {
  blocks: PatientRecordBlock[];
  id: keyof PatientRecordOptions["sections"] | "attachments";
  title: string;
}

/** A read-only snapshot. The PDF engine never queries or mutates clinical data. */
export interface PatientRecordSnapshot {
  clinic: InvoiceSettings;
  cover: { species?: string; breed?: string; ownerName?: string };
  exportDay: string;
  filename: string;
  generatedAt: string;
  options: PatientRecordOptions;
  patientId: string;
  patientName: string;
  requestedBy: string;
  sections: PatientRecordSection[];
}

export interface PatientRecordProgress {
  current: number;
  label: string;
  pages: number;
  stage: "preparing" | "content" | "attachments" | "finalizing";
  total?: number;
}

export interface PatientRecordPdf {
  bytes: Uint8Array;
  filename: string;
  generatedAt: string;
  pageCount: number;
  patientId: string;
  patientName: string;
  requestedBy: string;
}

export interface PatientRecordGenerationOptions {
  onProgress?: (progress: PatientRecordProgress) => void;
  signal?: AbortSignal;
  yieldToMain?: () => Promise<void>;
}
