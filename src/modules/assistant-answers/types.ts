/*
 * What the « Données » tab of the assistant says, as plain values.
 *
 * An answer is built from figures that code computed on the practice's own rows. Each figure names the source it comes
 * from; the sentence is written from the figures and nothing else. `verifyAnswer` (answer.ts) rejects any answer in which
 * a number has no figure behind it or a figure has no source: such a number does not exist in this tab.
 */

import type {
  Appointment,
  Invoice,
  Owner,
  Patient,
  Product,
  Task,
  Transaction,
  Vaccination,
} from "@/types/db";

/** The rows the engine reads. It never reads anything else: no store, no network, no model. */
export type ClinicData = {
  patients: Patient[];
  owners: Owner[];
  appointments: Appointment[];
  tasks: Task[];
  transactions: Transaction[];
  /** Read only so that test records are left out exactly as the dashboard leaves them out. */
  vaccinations?: Vaccination[];
  products?: Product[];
  invoices?: Invoice[];
};

export type AskContext = {
  now: Date;
  /** The record open behind the panel: « ce patient » means this one. */
  patientId?: string;
};

/** A span of days, both ends included. `explicit` is false when the question named none and a default was taken. */
export type Period = { from: Date; to: Date; label: string; explicit: boolean };

export type CellKind = "text" | "date" | "datetime" | "money" | "number";
export type AnswerRow = { id: string } & Record<string, string | number | null>;
export type AnswerColumn = {
  key: string;
  label: string;
  kind: CellKind;
  priority?: 1 | 2 | 3;
};
export type AnswerTable = {
  title: string;
  noun: [one: string, many: string];
  columns: AnswerColumn[];
  rows: AnswerRow[];
  exportName: string;
};

/** What was read to answer, so the vet can check the answer against it. */
export type AnswerSource = {
  id: string;
  label: string;
  read: number;
  kept: number;
  filter: string;
};

/**
 * A number shown to the vet. `value` is an integer: a count, or centimes for money. `tie` says which part of the table the
 * figure must equal, so that `verifyAnswer` can recompute it from what is shown.
 */
export type Figure = {
  id: string;
  label: string;
  value: number;
  kind: "count" | "money";
  sourceId: string;
  tie?: "rows" | "income" | "expense" | "sum";
};

export type AnswerStep = {
  id: string;
  name: string;
  summary?: string;
  details: { label: string; value: string }[];
};

export type TaskDraft = {
  key: string;
  title: string;
  description: string;
  patientId: string;
  dueDate: string;
};
/** A write the assistant suggests. Nothing is saved until the vet validates the card. */
export type Proposal = {
  id: string;
  kind: "tasks";
  title: string;
  subtitle: string;
  tasks: TaskDraft[];
  skipped: number;
};

export type Topic = "cash" | "appointments" | "tasks" | "patients";
export type RefusalReason =
  | "empty"
  | "dose"
  | "write"
  | "reminders"
  | "ambiguous"
  | "unknown"
  | "unverifiable";

export type Answer =
  | {
      kind: "answer";
      topic: Topic;
      period: Period | null;
      text: string;
      /** Limits the vet must know to read the answer correctly. */
      notes: string[];
      /** Every number of `text` and `notes` comes from one of these. */
      figures: Figure[];
      /** The templates `text` and `notes` were written from (« {income} » stands for the figure of that name), in that order. */
      templates: string[];
      /** The wording that fills the non-figure tokens: « period », « scope ». */
      slots: Record<string, string>;
      steps: AnswerStep[];
      table: AnswerTable | null;
      sources: AnswerSource[];
      proposal: Proposal | null;
      followUps: string[];
    }
  | {
      kind: "refusal";
      reason: RefusalReason;
      text: string;
      followUps: string[];
    };
