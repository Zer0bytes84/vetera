import { vaccinationBannerEntries } from "@/modules/patients/lib/vaccination-banner";
import { VISIT_FLOW_STAGES, type VisitFlowStage } from "@/modules/visit-flow/domain";
import type { VisitFlowBoardState } from "@/modules/visit-flow/store";
import type { Appointment, Owner, Patient, User, Vaccination } from "@/types/db";

/** Booked today but not arrived yet: shown above the board, not a stage. */
export const PLANNED = "planned" as const;
export type BoardLane = typeof PLANNED | VisitFlowStage;
export const BOARD_LANES: readonly BoardLane[] = [PLANNED, ...VISIT_FLOW_STAGES];

/** Waiting longer than this turns the timer amber. */
export const WAIT_WARNING_MINUTES = 15;

export type FlowAlertKind = "allergy" | "bite" | "vaccine";
export interface FlowAlert {
  /** Where the alert comes from, quoted from the record. */
  detail: string;
  kind: FlowAlertKind;
  label: string;
}

export interface FlowCard {
  alerts: FlowAlert[];
  appointmentId: string;
  /** First entry in the waiting room, from the journal. */
  arrivedAt: string | null;
  lane: BoardLane;
  ownerName: string;
  patientId: string;
  patientName: string;
  reason: string;
  species: string;
  /** When the visit entered its lane; null when the journal has no trace. */
  since: string | null;
  startTime: string;
  status: Appointment["status"];
  urgent: boolean;
  version: number;
  vetId: string;
  vetName: string;
}

export interface FlowBoard {
  lanes: Record<BoardLane, FlowCard[]>;
  /** Open visits booked on other days, left out of today's board. */
  openElsewhere: number;
}

const NO_ALLERGY = /^(aucun(?:e)?(?:\s+connue)?|néant|neant|non|ras|r\.a\.s\.?|-)$/i;
const BITE = /\b(mord\w*|morsure\w*|agressi\w*|museli[eè]re\w*|dangereu\w*)\b/i;
const ALERT_ORDER: FlowAlertKind[] = ["allergy", "bite", "vaccine"];

function firstSentence(text: string, match: RegExpExecArray) {
  const start = Math.max(0, text.lastIndexOf(".", match.index) + 1);
  const endDot = text.indexOf(".", match.index);
  const end = endDot === -1 ? text.length : endDot + 1;
  return text.slice(start, end).trim().slice(0, 140);
}

/**
 * Alerts read from the record itself, most serious first: allergy, an
 * animal noted as biting, then an overdue vaccine. Nothing is guessed: a
 * bite alert quotes the note it comes from.
 */
export function patientAlerts(
  patient: Patient | undefined,
  vaccinations: readonly Vaccination[],
  now: Date
): FlowAlert[] {
  if (!patient) return [];
  const alerts: FlowAlert[] = [];
  const allergies = patient.allergies?.trim();
  if (allergies && !NO_ALLERGY.test(allergies)) {
    alerts.push({ kind: "allergy", label: "Allergie", detail: allergies });
  }
  for (const note of [patient.generalNotes, patient.chronicConditions]) {
    const text = note?.trim();
    const match = text ? BITE.exec(text) : null;
    if (text && match) {
      alerts.push({ kind: "bite", label: "Mord", detail: `D'après le dossier : « ${firstSentence(text, match)} »` });
      break;
    }
  }
  const late = vaccinationBannerEntries(patient.id, vaccinations, now).filter((entry) => entry.status === "overdue");
  if (late.length > 0) {
    alerts.push({
      kind: "vaccine",
      label: late.length > 1 ? `${late.length} vaccins en retard` : "Vaccin en retard",
      detail: late.map((entry) => entry.name).join(", "),
    });
  }
  return alerts.sort((a, b) => ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind));
}

export function isSameLocalDay(iso: string, day: Date) {
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate()
  );
}

export interface BoardInput {
  appointments: readonly Appointment[];
  now: Date;
  owners: readonly Owner[];
  patients: readonly Patient[];
  states: readonly VisitFlowBoardState[];
  users: readonly User[];
  vaccinations: readonly Vaccination[];
  /** Only this veterinarian's visits; empty for everyone. */
  vetId?: string;
}

/** Today's visits by lane, urgent ones first, then longest waiting first. */
export function buildFlowBoard(input: BoardInput): FlowBoard {
  const patients = new Map(input.patients.map((patient) => [patient.id, patient]));
  const owners = new Map(input.owners.map((owner) => [owner.id, owner]));
  const users = new Map(input.users.map((user) => [user.id, user]));
  const states = new Map(input.states.map((state) => [state.appointmentId, state]));
  const lanes = Object.fromEntries(BOARD_LANES.map((lane) => [lane, [] as FlowCard[]])) as Record<BoardLane, FlowCard[]>;
  let openElsewhere = 0;

  for (const appointment of input.appointments) {
    if (input.vetId && appointment.vetId !== input.vetId) continue;
    const state = states.get(appointment.id);
    const stage = state?.stage ?? null;
    const today = isSameLocalDay(appointment.startTime, input.now);
    if (!today) {
      if (stage === "waiting" || stage === "consultation" || stage === "care") openElsewhere += 1;
      continue;
    }
    const planned = appointment.status === "scheduled" || appointment.status === "confirmed";
    const lane: BoardLane | null = planned ? PLANNED : stage;
    if (!lane) continue;
    const patient = patients.get(appointment.patientId);
    const owner = owners.get(appointment.ownerId);
    lanes[lane].push({
      alerts: patientAlerts(patient, input.vaccinations, input.now),
      appointmentId: appointment.id,
      arrivedAt: state?.arrivedAt ?? null,
      lane,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "",
      patientId: appointment.patientId,
      patientName: patient?.name ?? "Patient",
      reason: appointment.reason?.trim() || appointment.type,
      species: patient?.species ?? "",
      since: planned ? null : (state?.stageSince ?? null),
      startTime: appointment.startTime,
      status: appointment.status,
      urgent: appointment.type === "Urgence",
      version: state?.version ?? 0,
      vetId: appointment.vetId,
      vetName: users.get(appointment.vetId)?.displayName ?? "",
    });
  }

  const time = (value: string | null, fallback: string) => new Date(value ?? fallback).getTime();
  for (const lane of BOARD_LANES) {
    lanes[lane].sort((a, b) => {
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      if (lane === PLANNED || lane === "done") return time(null, a.startTime) - time(null, b.startTime);
      return time(a.since, a.startTime) - time(b.since, b.startTime);
    });
  }
  return { lanes, openElsewhere };
}

export function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}

export function durationLabel(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

export type BoardMove =
  | { kind: "status"; status: "arrived" | "in_progress" }
  | { kind: "care"; care: boolean };

/**
 * What moving a card from one lane to another does. Only forward steps a
 * click can safely make; the rest is done where it belongs, with a reason.
 */
export function boardMove(from: BoardLane, to: BoardLane): BoardMove | { refused: string } | null {
  if (from === to) return null;
  if (from === PLANNED && to === "waiting") return { kind: "status", status: "arrived" };
  if (from === PLANNED && to === "consultation") return { kind: "status", status: "in_progress" };
  if (from === "waiting" && to === "consultation") return { kind: "status", status: "in_progress" };
  if (from === "consultation" && to === "care") return { kind: "care", care: true };
  if (from === "care" && to === "consultation") return { kind: "care", care: false };
  if ((from === "consultation" || from === "care") && to === "billing") {
    return { refused: "Clôturez la consultation dans Clinique : le compte rendu et la facture s'y préparent." };
  }
  if (to === "done") return { refused: "Terminé arrive seul, dès que la facture est entièrement réglée." };
  return { refused: "Pour revenir en arrière, utilisez « Annuler » juste après le déplacement." };
}

/** The one-click action of each lane, and the lane it leads to. */
export const PRIMARY_ACTION: Partial<Record<BoardLane, { label: string; title: string; to: BoardLane }>> = {
  [PLANNED]: { label: "Arrivé", title: "Le patient est arrivé : il passe en Attente", to: "waiting" },
  waiting: { label: "Faire entrer", title: "Faire entrer en consultation", to: "consultation" },
  consultation: { label: "En soins", title: "Passer en Soins ou résultats", to: "care" },
  care: { label: "Reprendre", title: "Reprendre la consultation", to: "consultation" },
};
