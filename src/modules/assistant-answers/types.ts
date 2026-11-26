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
export interface ClinicData {
  appointments: Appointment[];
  invoices?: Invoice[];
  owners: Owner[];
  patients: Patient[];
  products?: Product[];
  tasks: Task[];
  transactions: Transaction[];
  /** Read only so that test records are left out exactly as the dashboard leaves them out. */
  vaccinations?: Vaccination[];
}

export interface AskContext {
  now: Date;
  /** The record open behind the panel: « ce patient » means this one. */
  patientId?: string;
}

/** A span of days, both ends included. `explicit` is false when the question named none and a default was taken. */
export interface Period {
  explicit: boolean;
  from: Date;
  label: string;
  to: Date;
}

export type CellKind = "text" | "date" | "datetime" | "money" | "number";
export type AnswerRow = { id: string } & Record<string, string | number | null>;
export interface AnswerColumn {
  key: string;
  kind: CellKind;
  label: string;
  priority?: 1 | 2 | 3;
}
export interface AnswerTable {
  columns: AnswerColumn[];
  exportName: string;
  noun: [one: string, many: string];
  rows: AnswerRow[];
  title: string;
}

/** What was read to answer, so the vet can check the answer against it. */
export interface AnswerSource {
  filter: string;
  id: string;
  kept: number;
  label: string;
  read: number;
}

/**
 * A number shown to the vet. `value` is an integer: a count, or centimes for money. `tie` says which part of the table the
 * figure must equal, so that `verifyAnswer` can recompute it from what is shown.
 */
export interface Figure {
  id: string;
  kind: "count" | "money";
  label: string;
  /** What the figure means for the practice, when its id does not say it (« rows » counting absences is bad news). */
  meaning?: "positive" | "negative";
  sourceId: string;
  tie?: "rows" | "income" | "expense" | "sum";
  value: number;
}

export interface AnswerStep {
  details: { label: string; value: string }[];
  id: string;
  name: string;
  summary?: string;
}

/**
 * A figure shown as a card (19 November 2026). A card holds no number of its own: it names a figure of the answer, so
 * what it shows is what the sentence says and the table adds up. `tone` is what the figure means for the practice
 * (takings are good news, expenses are not), never the direction of a change.
 */
export interface AnswerCard {
  figure: string;
  tone: "positive" | "negative" | "neutral";
}

export interface AnswerChartPoint {
  key: string;
  label: string;
  value: number;
}
/**
 * A series drawn from the table's own rows. `tie` names the figure its points must add up to, to the centime:
 * verifyAnswer checks it, so the chart, the card and the table cannot disagree.
 */
export interface AnswerSeries {
  id: string;
  label: string;
  points: AnswerChartPoint[];
  tie: string;
  tone: "income" | "expense" | "count";
}
export interface AnswerChart {
  /** How the points are grouped: by day up to 62 days, by week up to 26 weeks, by month beyond; by species for records. */
  bucket: "jour" | "semaine" | "mois" | "espece";
  kind: "area" | "bars";
  series: AnswerSeries[];
  title: string;
  unit: "money" | "count";
}

export interface TaskDraft {
  description: string;
  dueDate: string;
  key: string;
  patientId: string;
  title: string;
}
/** A write the assistant suggests. Nothing is saved until the vet validates the card. */
export interface Proposal {
  id: string;
  kind: "tasks";
  skipped: number;
  subtitle: string;
  tasks: TaskDraft[];
  title: string;
}

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
      cards: AnswerCard[];
      chart: AnswerChart | null;
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
