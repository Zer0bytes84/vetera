import type { AppointmentStatus } from "@/types/db";

/**
 * Fixed stages of a visit, from the waiting room to the exit. They are not
 * configurable: billing, reminders and metrics must keep their meaning.
 * `status` stays the business truth; the stage is read from it.
 */
export const VISIT_FLOW_STAGES = ["waiting", "consultation", "care", "billing", "done"] as const;
export type VisitFlowStage = (typeof VISIT_FLOW_STAGES)[number];

export const VISIT_FLOW_STAGE_LABELS: Record<VisitFlowStage, string> = {
  waiting: "Attente",
  consultation: "Consultation",
  care: "Soins ou résultats",
  billing: "À facturer",
  done: "Terminé",
};

export type VisitFlowCause = "status" | "care" | "billing" | "undo";

/** Fired after a move that may not touch the appointment itself (care, undo). */
export const VISIT_FLOW_CHANGED = "baitari:visit-flow-changed";

/** How long a manual move can be taken back. */
export const VISIT_FLOW_UNDO_WINDOW_MS = 10_000;

export interface VisitFlowFacts {
  /** The visit is in care or waiting for results while still open. */
  care: boolean;
  /** At least one issued invoice, and every issued invoice is settled. */
  settled: boolean;
  /** Closed as free of charge: nothing to bill. */
  noCharge?: boolean;
  status: AppointmentStatus;
}

/**
 * Correspondence between appointment status and visit stage. Mirrors the
 * `visit_flow_stages` SQL view; a test keeps both identical.
 * Not arrived yet, cancelled or no-show: outside the flow (null).
 */
export function visitFlowStage({ care, noCharge, settled, status }: VisitFlowFacts): VisitFlowStage | null {
  switch (status) {
    case "arrived":
    case "waiting":
      return "waiting";
    case "in_progress":
      return care ? "care" : "consultation";
    case "completed":
      return settled || noCharge ? "done" : "billing";
    default:
      return null;
  }
}
