import type { Appointment, AppointmentStatus } from "@/types/db";

export type AppointmentConflictKind = "veterinarian" | "room";

export interface AppointmentConflict {
  appointment: Appointment;
  kind: AppointmentConflictKind;
}

export type SchedulingErrorCode =
  | "APPOINTMENT_TITLE_REQUIRED"
  | "APPOINTMENT_DATE_INVALID"
  | "APPOINTMENT_DURATION_INVALID"
  | "APPOINTMENT_STATUS_TRANSITION_INVALID"
  | "APPOINTMENT_VET_CONFLICT"
  | "APPOINTMENT_ROOM_CONFLICT";

export class SchedulingError extends Error {
  readonly code: SchedulingErrorCode;
  readonly conflict?: AppointmentConflict;

  constructor(
    code: SchedulingErrorCode,
    message: string,
    conflict?: AppointmentConflict
  ) {
    super(message);
    this.name = "SchedulingError";
    this.code = code;
    this.conflict = conflict;
  }
}

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const PRE_CONSULTATION_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "waiting",
] as const;

export const TERMINAL_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "completed",
  "cancelled",
  "no_show",
] as const;

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  scheduled: [
    "confirmed",
    "arrived",
    "waiting",
    "in_progress",
    "cancelled",
    "no_show",
  ],
  confirmed: ["arrived", "waiting", "in_progress", "cancelled", "no_show"],
  arrived: ["waiting", "in_progress", "cancelled", "no_show"],
  waiting: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionAppointmentStatus(
  current: AppointmentStatus,
  next: AppointmentStatus
): boolean {
  return current === next || TRANSITIONS[current].includes(next);
}

export function assertAppointmentStatusTransition(
  current: AppointmentStatus,
  next: AppointmentStatus
): void {
  if (!canTransitionAppointmentStatus(current, next)) {
    throw new SchedulingError(
      "APPOINTMENT_STATUS_TRANSITION_INVALID",
      `Le rendez-vous ne peut pas passer de « ${current} » à « ${next} ».`
    );
  }
}

export function normalizeAppointmentInterval(
  startTime: string | Date,
  endTime: string | Date
): { startTime: string; endTime: string } {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new SchedulingError(
      "APPOINTMENT_DATE_INVALID",
      "La date ou l'heure du rendez-vous n'est pas valide."
    );
  }
  if (end <= start) {
    throw new SchedulingError(
      "APPOINTMENT_DURATION_INVALID",
      "L'heure de fin doit être postérieure à l'heure de début."
    );
  }

  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export function findAppointmentConflicts(
  candidate: Pick<Appointment, "id" | "vetId" | "room" | "startTime" | "endTime">,
  appointments: readonly Appointment[]
): AppointmentConflict[] {
  const candidateStart = new Date(candidate.startTime).getTime();
  const candidateEnd = new Date(candidate.endTime).getTime();

  return appointments.flatMap<AppointmentConflict>((appointment) => {
    if (
      appointment.id === candidate.id ||
      TERMINAL_APPOINTMENT_STATUSES.includes(appointment.status)
    ) {
      return [];
    }

    const start = new Date(appointment.startTime).getTime();
    const end = new Date(appointment.endTime).getTime();
    if (candidateStart >= end || candidateEnd <= start) {
      return [];
    }

    const conflicts: AppointmentConflict[] = [];
    if (appointment.vetId === candidate.vetId) {
      conflicts.push({ appointment, kind: "veterinarian" });
    }
    if (
      candidate.room &&
      appointment.room &&
      candidate.room === appointment.room
    ) {
      conflicts.push({ appointment, kind: "room" });
    }
    return conflicts;
  });
}

export function assertNoAppointmentConflict(
  candidate: Pick<Appointment, "id" | "vetId" | "room" | "startTime" | "endTime">,
  appointments: readonly Appointment[]
): void {
  const conflict = findAppointmentConflicts(candidate, appointments)[0];
  if (!conflict) {
    return;
  }

  if (conflict.kind === "room") {
    throw new SchedulingError(
      "APPOINTMENT_ROOM_CONFLICT",
      "Cette salle est déjà occupée sur ce créneau.",
      conflict
    );
  }
  throw new SchedulingError(
    "APPOINTMENT_VET_CONFLICT",
    "Ce vétérinaire a déjà un rendez-vous sur ce créneau.",
    conflict
  );
}
