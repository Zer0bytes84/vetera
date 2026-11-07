import { freeSlotStarts } from "@/modules/agenda/components/agenda-slots";
import type { Appointment } from "@/types/db";
import { parseDashboardDate } from "../v2/model";

/**
 * « Agenda rapide »: the half hours that are really free in the agenda, day by day. A half hour is free when at least one
 * veterinarian has no active booking over it and it has not ended; it is the agenda's own rule (`freeSlotStarts`), applied to
 * each veterinarian. Nothing is suggested or estimated.
 */

export interface FreeSlot {
  id: string;
  /** Local day, "2026-11-10". */
  day: string;
  /** "HH:MM", local. */
  start: string;
  end: string;
  startsAt: Date;
  /** The first veterinarian free on it, when the clinic has veterinarians. */
  vetId?: string;
}

export interface SlotWindow {
  from: number;
  to: number;
  /** Where the hours come from: the clinic's own bookings, or the default when there are too few. */
  basis: "bookings" | "default";
}

const SLOT_MINUTES = 30;
const DEFAULT_WINDOW = { from: 8, to: 18 };
const MIN_BOOKINGS = 10;
const HISTORY_DAYS = 90;
/** The agenda's own grid: no hour outside it can be booked from the calendar. */
const GRID = { from: 7, to: 23 };

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const isActive = (a: Pick<Appointment, "status">) => a.status !== "cancelled" && a.status !== "no_show";

/**
 * The hours the clinic books: from the hour 95 % of its last 90 days' bookings start at or after, to the hour 95 % end by,
 * clamped to the agenda's grid. With fewer than ten bookings there is nothing to learn from, so the default 8 h to 18 h applies.
 */
export function bookingHours(appointments: Pick<Appointment, "startTime" | "endTime" | "status">[], now: Date): SlotWindow {
  const since = now.getTime() - HISTORY_DAYS * 86_400_000;
  const spans = appointments
    .filter(isActive)
    .flatMap((a) => {
      const start = parseDashboardDate(a.startTime);
      const end = parseDashboardDate(a.endTime);
      if (!start || !end || start.getTime() < since || start > now) return [];
      return [{ start: start.getHours() + start.getMinutes() / 60, end: end.getHours() + end.getMinutes() / 60 + (end.getDate() !== start.getDate() ? 24 : 0) }];
    });
  if (spans.length < MIN_BOOKINGS) return { ...DEFAULT_WINDOW, basis: "default" };
  const starts = spans.map((s) => s.start).sort((a, b) => a - b);
  const ends = spans.map((s) => s.end).sort((a, b) => a - b);
  const low = starts[Math.floor((starts.length - 1) * 0.05)];
  const high = ends[Math.ceil((ends.length - 1) * 0.95)];
  const from = Math.min(Math.max(Math.floor(low), GRID.from), GRID.to);
  const to = Math.min(Math.max(Math.ceil(high), from + 1), GRID.to + 1);
  return { from, to, basis: "bookings" };
}

export function buildFreeSlots({
  appointments,
  vets,
  now,
  days = 5,
  perDay = 6,
  window,
}: {
  appointments: Pick<Appointment, "startTime" | "endTime" | "status" | "vetId">[];
  vets: { id: string }[];
  now: Date;
  days?: number;
  perDay?: number;
  window?: SlotWindow;
}) {
  const hours = window ?? bookingHours(appointments, now);
  const columns = Array.from({ length: days }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
  const pools = vets.length ? vets.map((vet) => ({ id: vet.id as string | undefined, list: appointments.filter((a) => a.vetId === vet.id) })) : [{ id: undefined, list: appointments }];
  const slots: FreeSlot[] = [];
  const free: Record<string, number> = {};
  for (const day of columns) {
    const byStart = new Map<number, string | undefined>();
    for (const pool of pools) {
      for (const minutes of freeSlotStarts({ appointments: pool.list, day, startHour: hours.from, endHour: hours.to - 1, now })) {
        if (!byStart.has(minutes)) byStart.set(minutes, pool.id);
      }
    }
    const starts = [...byStart.keys()].sort((a, b) => a - b);
    free[dayKey(day)] = starts.length;
    for (const minutes of starts.slice(0, perDay)) {
      slots.push({
        id: `${dayKey(day)}T${hhmm(minutes)}`,
        day: dayKey(day),
        start: hhmm(minutes),
        end: hhmm(minutes + SLOT_MINUTES),
        startsAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes),
        vetId: byStart.get(minutes),
      });
    }
  }
  return { days: columns.map(dayKey), slots, free, window: hours };
}
