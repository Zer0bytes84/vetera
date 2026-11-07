import type { Invoice, Transaction } from "@/types/db";
import { settlementRate } from "../v2/financial-model";
import { stateOf, type DayUnitState } from "./dashboard-widgets";

/**
 * « Cette semaine »: the week's figures, and its appointments as the cycle a ring of dots draws, by hour of
 * the day or by day of the week, stacked by what became of them. The window is the one the card has always
 * had: from Monday to the end of today.
 */

export type RadialView = "hour" | "weekday";

export const RADIAL_VIEWS: { value: RadialView; label: string }[] = [
  { value: "weekday", label: "Par jour" },
  { value: "hour", label: "Par heure" },
];

/** The three states of an appointment, in the order they stack outward: done, under way, still to come. */
export const WEEK_STATES: { id: DayUnitState; label: string }[] = [
  { id: "done", label: "Terminés" },
  { id: "underway", label: "En cours" },
  { id: "upcoming", label: "À venir" },
];

const NOT_VISITS = ["cancelled", "no_show"];
const hh = (hour: number) => `${String(hour).padStart(2, "0")}h`;

function weekWindow(now: Date) {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfToday };
}

/** The week's figures, each with last week's: receipts, visits, and the share of invoices settled. */
export function buildWeekFacts(data: {
  transactions: Pick<Transaction, "type" | "status" | "date" | "amount">[];
  appointments: { startTime?: string | null; status: string }[];
  invoices: Invoice[];
  now: Date;
}) {
  const { transactions, appointments, invoices, now } = data;
  const { startOfWeek, endOfToday } = weekWindow(now);
  const income = (from: Date, to: Date) =>
    transactions
      .filter((t) => {
        if (t.type !== "income" || t.status !== "paid" || !t.date) return false;
        const d = new Date(t.date);
        return d >= from && d <= to;
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  const visitsBetween = (from: Date, to: Date) =>
    appointments.filter((a) => {
      if (!a.startTime || NOT_VISITS.includes(a.status)) return false;
      const d = new Date(a.startTime);
      return d >= from && d <= to;
    }).length;
  // Last week up to the same day and hour, so the two figures cover the same span.
  const weekAgo = (d: Date) => new Date(d.getTime() - 7 * 86_400_000);
  return {
    since: startOfWeek,
    income: income(startOfWeek, now),
    previousIncome: income(weekAgo(startOfWeek), weekAgo(now)),
    visits: visitsBetween(startOfWeek, endOfToday),
    previousVisits: visitsBetween(weekAgo(startOfWeek), weekAgo(endOfToday)),
    // Settled share of the invoiced amount, on every issued invoice.
    rate: settlementRate(invoices),
  };
}

export interface WeekRadial {
  total: number;
  hour: { labels: string[]; values: Record<DayUnitState, number[]> };
  weekday: { labels: string[]; values: Record<DayUnitState, number[]> };
  byState: Record<DayUnitState, number>;
}

/** The week's visits, per hour and per weekday (Monday first), by state; their sum is the week's figure. */
export function buildWeekRadial(appointments: { startTime?: string | null; status: string }[], now: Date): WeekRadial {
  const { startOfWeek, endOfToday } = weekWindow(now);
  const empty = (n: number) => ({ done: Array<number>(n).fill(0), underway: Array<number>(n).fill(0), upcoming: Array<number>(n).fill(0) });
  const hour = empty(24);
  const weekday = empty(7);
  let total = 0;
  for (const a of appointments) {
    if (!a.startTime || NOT_VISITS.includes(a.status)) continue;
    const d = new Date(a.startTime);
    if (d < startOfWeek || d > endOfToday) continue;
    const state = stateOf(a.status);
    hour[state][d.getHours()] += 1;
    weekday[state][(d.getDay() + 6) % 7] += 1;
    total += 1;
  }
  const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);
  return {
    total,
    hour: { labels: Array.from({ length: 24 }, (_, h) => hh(h)), values: hour },
    weekday: { labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], values: weekday },
    byState: { done: sum(hour.done), underway: sum(hour.underway), upcoming: sum(hour.upcoming) },
  };
}
