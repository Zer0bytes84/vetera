import type { Appointment } from "@/types/db";

/** A booking that still holds its slot: cancelled and missed visits free it. */
export function isActiveBooking(appointment: Pick<Appointment, "status">) {
  return appointment.status !== "cancelled" && appointment.status !== "no_show";
}

const TITLES = /^(dr|pr|mme|mlle|m)\.?$/i;

/** "Dr Lina Ait Salem" gives "LA": the title is not a name. */
export function personInitials(name?: string | null) {
  const words = (name ?? "")
    .split(/\s+/)
    .filter((word) => word && !TITLES.test(word));
  const initials = words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials || "?";
}

const SLOT_MINUTES = 30;

/**
 * Half-hour cells of one column that can take a new booking: no active
 * booking overlaps them and they have not ended yet. Returned as minutes
 * from midnight.
 */
export function freeSlotStarts({
  appointments,
  day,
  startHour,
  endHour,
  now,
}: {
  appointments: Pick<Appointment, "startTime" | "endTime" | "status">[];
  day: Date;
  startHour: number;
  endHour: number;
  now: Date;
}) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const busy = appointments
    .filter(isActiveBooking)
    .map((appointment) => [
      new Date(appointment.startTime).getTime(),
      new Date(appointment.endTime).getTime(),
    ])
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end));
  const free: number[] = [];
  for (let minutes = startHour * 60; minutes < (endHour + 1) * 60; minutes += SLOT_MINUTES) {
    const start = dayStart.getTime() + minutes * 60_000;
    const end = start + SLOT_MINUTES * 60_000;
    if (end <= now.getTime()) continue;
    if (busy.some(([from, to]) => from < end && to > start)) continue;
    free.push(minutes);
  }
  return free;
}

const UNDERWAY = new Set(["arrived", "waiting", "in_progress"]);

/**
 * What one agenda day holds. Cancelled and missed visits are counted apart
 * and never as booked time; urgent visits stay open until they are finished.
 */
export function agendaDayStats<
  T extends Pick<Appointment, "startTime" | "endTime" | "status" | "type" | "vetId">,
>(day: T[]) {
  const booked = day.filter(isActiveBooking);
  const minutes = booked.reduce((sum, appointment) => {
    const span =
      (new Date(appointment.endTime).getTime() -
        new Date(appointment.startTime).getTime()) /
      60_000;
    return sum + (Number.isFinite(span) ? Math.max(0, Math.round(span)) : 0);
  }, 0);
  return {
    booked: booked.length,
    completed: booked.filter((a) => a.status === "completed").length,
    underway: booked.filter((a) => UNDERWAY.has(a.status)).length,
    planned: booked.filter((a) => a.status === "scheduled" || a.status === "confirmed").length,
    cancelled: day.length - booked.length,
    minutes,
    vets: new Set(booked.map((a) => a.vetId)).size,
    openUrgent: booked.filter((a) => a.type === "Urgence" && a.status !== "completed"),
  };
}
