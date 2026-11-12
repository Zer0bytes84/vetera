import { isSoapReviewed, soapMetadata } from "@/modules/consultations/local-ai/soap-review";
import type { ConsultationSoap } from "@/types/db";
import { TOUR_STEP_IDS, type TourState, type TourStepId } from "./tour-state";

/**
 * Ce que le tour sait de l'état réel de l'application. Il lit les données, il n'écoute pas les clics : l'utilisateur peut
 * créer son patient par la barre « + », par la liste, par la palette de commandes, l'étape sera reconnue de la même façon.
 */
export interface TourSnapshot {
  patients: readonly { id: string; ownerId: string; createdAt: string; archivedAt?: string | null }[];
  appointments: readonly { id: string; patientId: string; createdAt: string; status: string }[];
  soaps: readonly Pick<ConsultationSoap, "appointmentId" | "patientId" | "content" | "aiDraft" | "subjective" | "objective" | "assessment" | "plan">[];
  /** Factures émises. Vide ET `invoicesKnown` faux hors de l'application de bureau (pas de facturation dans le navigateur). */
  invoices: readonly { id: string; patientId?: string | null; ownerId: string; createdAt: string; completedPaymentAmount: number }[];
  invoicesKnown: boolean;
}

const NAIVE_SQLITE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

/**
 * Un horodatage stocké, en millisecondes. SQLite écrit « 2026-11-12 14:03:11 » sans fuseau, en UTC : lu tel quel par
 * `Date.parse`, il serait pris pour l'heure locale et décalé d'une ou deux heures (et, à l'ouest de Greenwich, un patient
 * créé après le départ du tour paraîtrait créé avant). Les autres formes (ISO avec fuseau) passent telles quelles.
 */
export function storedInstantMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(NAIVE_SQLITE.test(value) ? `${value.replace(" ", "T")}Z` : value);
  return Number.isFinite(ms) ? ms : null;
}

export interface StepOutcome {
  done: boolean;
  /** Le geste est à moitié fait (une facture émise, pas encore payée) : la consigne le sait. */
  partial?: boolean;
  patientId?: string;
  appointmentId?: string;
}

const NOT_DONE: StepOutcome = { done: false };

function earliest<T extends { createdAt: string }>(rows: readonly T[], startMs: number): T | null {
  let best: { row: T; ms: number } | null = null;
  for (const row of rows) {
    const ms = storedInstantMs(row.createdAt);
    if (ms === null || ms < startMs) continue;
    if (!best || ms < best.ms) best = { row, ms };
  }
  return best?.row ?? null;
}

/**
 * Le patient du tour, tant qu'il existe encore et n'est pas archivé. S'il a été supprimé en route, on retombe sur
 * « n'importe quel patient » plutôt que de bloquer le tour sur un repère disparu.
 */
function tourPatient(state: TourState, snapshot: TourSnapshot) {
  return state.patientId ? snapshot.patients.find((patient) => patient.id === state.patientId && !patient.archivedAt) ?? null : null;
}

/** L'étape en cours est-elle réellement faite ? Ne regarde que cette étape. */
export function evaluateStep(state: TourState, snapshot: TourSnapshot): StepOutcome {
  if (state.status !== "running") return NOT_DONE;
  const startMs = storedInstantMs(state.startedAt);
  if (startMs === null) return NOT_DONE;
  const step: TourStepId | undefined = TOUR_STEP_IDS[state.step];
  const patient = tourPatient(state, snapshot);

  if (step === "patient") {
    const created = earliest(snapshot.patients.filter((row) => !row.archivedAt), startMs);
    return created ? { done: true, patientId: created.id } : NOT_DONE;
  }

  if (step === "appointment") {
    const created = earliest(
      snapshot.appointments.filter((row) => row.status !== "cancelled" && (!patient || row.patientId === patient.id)),
      startMs,
    );
    return created ? { done: true, appointmentId: created.id, patientId: patient ? undefined : created.patientId } : NOT_DONE;
  }

  if (step === "consultation") {
    // « Valider » est le geste qui compte : une note validée après le départ, pour le patient du tour.
    const validated = snapshot.soaps.find((soap) => {
      if (patient && soap.patientId !== patient.id) return false;
      if (!isSoapReviewed(soap)) return false;
      const review = soapMetadata(soap.content).soapReview as { reviewedAt?: unknown } | undefined;
      const reviewedMs = storedInstantMs(review?.reviewedAt);
      return reviewedMs !== null && reviewedMs >= startMs;
    });
    return validated ? { done: true, appointmentId: validated.appointmentId, patientId: patient ? undefined : validated.patientId } : NOT_DONE;
  }

  if (step === "invoice") {
    if (!snapshot.invoicesKnown) return NOT_DONE;
    // Le client du patient du tour : une facture à son nom, qu'elle nomme l'animal ou seulement le propriétaire.
    const mine = earliest(
      snapshot.invoices.filter((row) => !patient || row.patientId === patient.id || row.ownerId === patient.ownerId),
      startMs,
    );
    if (!mine) return NOT_DONE;
    const paid = snapshot.invoices.some(
      (row) =>
        row.completedPaymentAmount > 0 &&
        (!patient || row.patientId === patient.id || row.ownerId === patient.ownerId) &&
        (storedInstantMs(row.createdAt) ?? -1) >= startMs,
    );
    return paid ? { done: true } : { done: false, partial: true };
  }

  return NOT_DONE;
}
