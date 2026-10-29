/**
 * Read-only projections behind the dashboard's countable widgets: the day's
 * appointments as units, shares that add up to 100, and the month's receipts
 * forecast. Pure functions over the records the dashboard already reads;
 * nothing here is estimated without saying so.
 */
import type { Transaction } from "@/types/db";
import { parseDashboardDate, type ScheduleEntry } from "../v2/model";

export type DayUnitState = "done" | "underway" | "upcoming";

export interface DayUnit {
  id: string;
  state: DayUnitState;
  /** "08:00 · Rex · Consultation", read in the unit's tooltip. */
  label: string;
}

const UNDERWAY = new Set(["arrived", "waiting", "in_progress"]);
const NOT_SEEN = new Set(["cancelled", "no_show"]);

function stateOf(status: string): DayUnitState {
  if (status === "completed") return "done";
  return UNDERWAY.has(status) ? "underway" : "upcoming";
}

/** One unit per appointment of the day, in time order; cancellations and no-shows are not visits. */
export function buildDayUnits(today: ScheduleEntry[]) {
  const units: DayUnit[] = [...today]
    .filter((row) => !NOT_SEEN.has(row.appointment.status))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((row) => ({
      id: row.appointment.id,
      state: stateOf(row.appointment.status),
      label: [
        row.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        row.patientName || "Patient",
        row.appointment.type || "Consultation",
      ].join(" · "),
    }));
  const count = (state: DayUnitState) => units.filter((unit) => unit.state === state).length;
  return { units, total: units.length, done: count("done"), underway: count("underway"), upcoming: count("upcoming") };
}

/**
 * Whole percentages that add up to exactly 100 (largest remainder), so a
 * legend never reads 33 + 33 + 33. All zero when there is nothing to share.
 */
export function shares(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((count) => (count * 100) / total);
  const floors = exact.map(Math.floor);
  let missing = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, rest: value - floors[index] }))
    .sort((a, b) => b.rest - a.rest);
  for (const { index } of order) {
    if (missing <= 0) break;
    floors[index] += 1;
    missing -= 1;
  }
  return floors;
}

export type MonthForecast =
  | { kind: "empty"; monthLabel: string }
  | { kind: "early"; monthLabel: string; collected: number; daysElapsed: number; minimumDays: number }
  | {
      kind: "forecast";
      monthLabel: string;
      previousLabel: string;
      collected: number;
      /** Linear projection at the month's own pace, in centimes. */
      projected: number;
      previousTotal: number;
      daysElapsed: number;
      daysInMonth: number;
      /** Day the pace passes last month's total; null when it does not, or already did. */
      crossing: Date | null;
      /** Last month's total is already passed. */
      passed: boolean;
    };

/** Below a week, one large payment would decide the whole month. */
export const FORECAST_MINIMUM_DAYS = 7;

/**
 * Receipts of the current month and where their own pace leads by month end:
 * paid income only, as the Trésorerie card counts it.
 */
export function buildMonthForecast(transactions: Transaction[], now: Date): MonthForecast {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "long" });
  const paidBetween = (from: Date, to: Date) =>
    transactions
      .filter((t) => {
        if (t.type !== "income" || t.status !== "paid") return false;
        const date = parseDashboardDate(t.date);
        return Boolean(date && date >= from && date < to && date <= now);
      })
      .reduce((sum, t) => sum + t.amount, 0);
  const collected = paidBetween(monthStart, nextMonth);
  const previousTotal = paidBetween(previousStart, monthStart);
  const daysInMonth = Math.round((nextMonth.getTime() - monthStart.getTime()) / 86_400_000);
  const daysElapsed = now.getDate();
  if (!collected) return { kind: "empty", monthLabel };
  if (daysElapsed < FORECAST_MINIMUM_DAYS) {
    return { kind: "early", monthLabel, collected, daysElapsed, minimumDays: FORECAST_MINIMUM_DAYS };
  }
  const pace = collected / daysElapsed;
  const projected = Math.round(pace * daysInMonth);
  const passed = previousTotal > 0 && collected >= previousTotal;
  let crossing: Date | null = null;
  if (previousTotal > 0 && !passed && projected >= previousTotal) {
    crossing = new Date(now.getFullYear(), now.getMonth(), Math.min(daysInMonth, Math.ceil(previousTotal / pace)));
  }
  return {
    kind: "forecast",
    monthLabel,
    previousLabel: previousStart.toLocaleDateString("fr-FR", { month: "long" }),
    collected,
    projected,
    previousTotal,
    daysElapsed,
    daysInMonth,
    crossing,
    passed,
  };
}
