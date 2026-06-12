import type { AnesthesiaPhase, AnesthesiaStatus } from "@/types/db";

export const ANESTHESIA_STATUS_LABELS: Record<AnesthesiaStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const ANESTHESIA_STATUS_TONE: Record<
  AnesthesiaStatus,
  "info" | "warning" | "success" | "neutral" | "destructive"
> = {
  planned: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "neutral",
};

export const ANESTHESIA_PHASE_LABELS: Record<AnesthesiaPhase, string> = {
  premed: "Prémédication",
  induction: "Induction",
  maintenance: "Maintenance",
  recovery: "Réveil",
};

export const ANESTHESIA_ROUTE_LABELS: Record<
  "IM" | "SC" | "IV" | "IO" | "IR" | "PO" | "IN",
  string
> = {
  IM: "IM (intramusculaire)",
  SC: "SC (sous-cutané)",
  IV: "IV (intraveineux)",
  IO: "IO (intra-osseux)",
  IR: "IR (intra-rectal)",
  PO: "PO (per os)",
  IN: "IN (intranasal)",
};

/**
 * Calcule la durée d'une procédure d'anesthésie en minutes.
 */
export function computeAnesthesiaDurationMinutes(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
  now: Date = new Date()
): number {
  if (!startedAt) {
    return 0;
  }
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) {
    return 0;
  }
  const end = endedAt ? new Date(endedAt).getTime() : now.getTime();
  if (Number.isNaN(end) || end < start) {
    return 0;
  }
  return Math.floor((end - start) / 60_000);
}
