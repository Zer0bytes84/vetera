import type { InvoiceSettings } from "@/services/invoiceSettingsService";

export interface PatientRecordOptions {
  period: { from: string; to: string } | null;
  sections: {
    identity: boolean;
    consultations: boolean;
    documents: boolean;
    reminders: boolean;
    notes: boolean;
  };
  includeAttachments: boolean;
}

export const DEFAULT_PATIENT_RECORD_OPTIONS: PatientRecordOptions = {
  period: null,
  sections: { identity: true, consultations: true, documents: true, reminders: true, notes: true },
  includeAttachments: true,
};

export interface PatientRecordSource {
  id: string;
  patientId: string;
  title: string;
  fileName: string;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  dataUrl: string;
  createdAt?: string;
  origin: "generated" | "import";
}

export type PatientRecordBlock =
  | { kind: "text"; title?: string; text: string; meta?: string }
  | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[] }
  | { kind: "source"; source: PatientRecordSource };

export interface PatientRecordSection {
  id: keyof PatientRecordOptions["sections"] | "attachments";
  title: string;
  blocks: PatientRecordBlock[];
}

/** A read-only snapshot. The PDF engine never queries or mutates clinical data. */
export interface PatientRecordSnapshot {
  patientId: string;
  patientName: string;
  requestedBy: string;
  generatedAt: string;
  exportDay: string;
  filename: string;
  options: PatientRecordOptions;
  clinic: InvoiceSettings;
  cover: { species?: string; breed?: string; ownerName?: string };
  sections: PatientRecordSection[];
}

export interface PatientRecordProgress {
  stage: "preparing" | "content" | "attachments" | "finalizing";
  current: number;
  total?: number;
  pages: number;
  label: string;
}

export interface PatientRecordPdf {
  bytes: Uint8Array;
  pageCount: number;
  filename: string;
  patientId: string;
  patientName: string;
  requestedBy: string;
  generatedAt: string;
}

export interface PatientRecordGenerationOptions {
  signal?: AbortSignal;
  onProgress?: (progress: PatientRecordProgress) => void;
  yieldToMain?: () => Promise<void>;
}
