import type { Appointment } from "@/types/db";

const CLOSED: Appointment["status"][] = ["cancelled", "no_show"];

function startOfNextDay(date: Date): number {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

/**
 * Premier rendez-vous maintenu (ni annulé ni absent) après la journée
 * affichée, pour proposer une suite quand la journée est libre.
 */
export function findNextAppointmentAfter(
  appointments: readonly Appointment[],
  date: Date
): Appointment | null {
  const from = startOfNextDay(date);
  let best: Appointment | null = null;
  let bestTime = Number.POSITIVE_INFINITY;
  for (const appointment of appointments) {
    if (CLOSED.includes(appointment.status)) continue;
    const time = new Date(appointment.startTime).getTime();
    if (Number.isFinite(time) && time >= from && time < bestTime) {
      best = appointment;
      bestTime = time;
    }
  }
  return best;
}

export interface WeekLoadDay {
  count: number;
  date: Date;
  /** Hauteur relative de la barre, de 0 à 1. */
  ratio: number;
}

/** Nombre de rendez-vous par jour de la semaine affichée, avec une échelle commune. */
export function buildWeekLoad(
  weekDays: readonly Date[],
  countFor: (date: Date) => number
): WeekLoadDay[] {
  const counts = weekDays.map((date) => ({ date, count: countFor(date) }));
  const max = Math.max(0, ...counts.map((day) => day.count));
  return counts.map((day) => ({
    ...day,
    ratio: max === 0 ? 0 : day.count / max,
  }));
}
