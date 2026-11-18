import type { AppointmentStatus } from "@/types/db";

/**
 * The appointment reminder of the Rappels page: it comes up one hour before the appointment and stays until the
 * appointment's hour, with « Relance WhatsApp » on it. Nothing is stored and nothing is sent: it is read from the
 * appointments, and the person sends the message from WhatsApp.
 */
export const RELANCE_MINUTES_BEFORE = 60;

// A visit still to come: booked or confirmed. Arrived, in progress, finished, cancelled or missed visits are not relaunched.
const RELANCE_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "scheduled",
  "confirmed",
]);

interface RelanceAppointment {
  startTime: string;
  status: AppointmentStatus;
}

/** Whether the owner can be relaunched for this appointment (Agenda menu and Rappels). */
export function canRelance(status: AppointmentStatus): boolean {
  return RELANCE_STATUSES.has(status);
}

/** When the reminder comes up and when it goes away, in milliseconds, or null for an unreadable start. */
export function relanceWindow(
  appointment: RelanceAppointment
): { closes: number; opens: number } | null {
  const start = new Date(appointment.startTime).getTime();
  if (!Number.isFinite(start)) {
    return null;
  }
  return { closes: start, opens: start - RELANCE_MINUTES_BEFORE * 60_000 };
}

/** True from one hour before the appointment (included) until its hour (excluded), for a visit still to come. */
export function isRelanceDue(
  appointment: RelanceAppointment,
  now: Date
): boolean {
  const span = relanceWindow(appointment);
  const time = now.getTime();
  return (
    canRelance(appointment.status) &&
    span !== null &&
    time >= span.opens &&
    time < span.closes
  );
}

/**
 * Milliseconds until a reminder next comes up or goes away, or null when none will. The Rappels page waits exactly that
 * long before reading the clock again, so a reminder appears at its minute without reloading the page.
 */
export function nextRelanceChange(
  appointments: readonly RelanceAppointment[],
  now: Date
): number | null {
  const time = now.getTime();
  let next: number | null = null;
  for (const appointment of appointments) {
    const span = canRelance(appointment.status)
      ? relanceWindow(appointment)
      : null;
    for (const boundary of span ? [span.opens, span.closes] : []) {
      if (boundary > time && (next === null || boundary < next)) {
        next = boundary;
      }
    }
  }
  return next === null ? null : next - time;
}
