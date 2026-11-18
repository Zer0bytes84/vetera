import type { AppointmentStatus } from "@/types/db";

/**
 * The appointment relaunches of the Rappels page, with « Relance WhatsApp » on them. Nothing is stored and nothing is
 * sent: they are read from the appointments, and the person sends the message from WhatsApp.
 * - Before: a visit still to come comes up one hour before its hour and stays until that hour.
 * - Missed: from its hour, a visit still marked booked or confirmed (the owner was not marked arrived), or a visit marked
 *   absent, comes up for MISSED_RELANCE_DAYS days.
 */
export const RELANCE_MINUTES_BEFORE = 60;

/** How long a missed visit stays in the Rappels, from its hour: nothing records that the message was sent. */
export const MISSED_RELANCE_DAYS = 7;

const MINUTE = 60_000;
const MISSED_SPAN = MISSED_RELANCE_DAYS * 24 * 60 * MINUTE;

// A visit still to come: booked or confirmed. Arrived, in progress, finished or cancelled visits are not relaunched.
const RELANCE_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "scheduled",
  "confirmed",
]);

interface RelanceAppointment {
  startTime: string;
  status: AppointmentStatus;
}

export type RelanceKind = "before" | "missed";

/** Whether the visit is still to come, so the owner can be reminded of it. */
export function canRelance(status: AppointmentStatus): boolean {
  return RELANCE_STATUSES.has(status);
}

/** Whether the Agenda's menu offers « Relance WhatsApp »: a visit still to come, or one marked absent. */
export function canRelanceFromAgenda(status: AppointmentStatus): boolean {
  return canRelance(status) || status === "no_show";
}

function startOf(appointment: RelanceAppointment): number | null {
  const start = new Date(appointment.startTime).getTime();
  return Number.isFinite(start) ? start : null;
}

/** When the reminder before the visit comes up and when it goes away, in milliseconds, or null for an unreadable start. */
export function relanceWindow(
  appointment: RelanceAppointment
): { closes: number; opens: number } | null {
  const start = startOf(appointment);
  return start === null
    ? null
    : { closes: start, opens: start - RELANCE_MINUTES_BEFORE * MINUTE };
}

/**
 * Which relaunch the appointment calls for now, or null.
 * - `before`: one hour before the hour (included) until the hour (excluded), for a visit still to come.
 * - `missed`: from the hour, for a visit still booked or confirmed, or for a visit marked absent (whatever its hour),
 *   until MISSED_RELANCE_DAYS days after the hour (excluded).
 */
export function relanceKind(
  appointment: RelanceAppointment,
  now: Date
): RelanceKind | null {
  const start = startOf(appointment);
  if (start === null) {
    return null;
  }
  const time = now.getTime();
  if (time >= start + MISSED_SPAN) {
    return null;
  }
  if (appointment.status === "no_show") {
    return "missed";
  }
  if (!canRelance(appointment.status)) {
    return null;
  }
  if (time >= start) {
    return "missed";
  }
  return time >= start - RELANCE_MINUTES_BEFORE * MINUTE ? "before" : null;
}

/** True from one hour before the appointment (included) until its hour (excluded), for a visit still to come. */
export function isRelanceDue(
  appointment: RelanceAppointment,
  now: Date
): boolean {
  return relanceKind(appointment, now) === "before";
}

/** True for a missed visit: past its hour and not marked arrived, or marked absent, for MISSED_RELANCE_DAYS days. */
export function isMissedRelanceDue(
  appointment: RelanceAppointment,
  now: Date
): boolean {
  return relanceKind(appointment, now) === "missed";
}

/**
 * Milliseconds until a relaunch next comes up, changes or goes away, or null when none will. The Rappels page waits
 * exactly that long before reading the clock again, so a relaunch appears at its minute without reloading the page.
 */
export function nextRelanceChange(
  appointments: readonly RelanceAppointment[],
  now: Date
): number | null {
  const time = now.getTime();
  let next: number | null = null;
  for (const appointment of appointments) {
    const start = canRelanceFromAgenda(appointment.status)
      ? startOf(appointment)
      : null;
    const boundaries =
      start === null
        ? []
        : [start - RELANCE_MINUTES_BEFORE * MINUTE, start, start + MISSED_SPAN];
    for (const boundary of boundaries) {
      if (boundary > time && (next === null || boundary < next)) {
        next = boundary;
      }
    }
  }
  return next === null ? null : next - time;
}
