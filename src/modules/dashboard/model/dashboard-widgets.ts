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

export function stateOf(status: string): DayUnitState {
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

export interface SpeciesRow {
  key: string;
  name: string;
  count: number;
  share: number;
}

/** Above this many species, the smallest ones share one "Autres" line. */
export const SPECIES_SHOWN = 4;

/**
 * Active patients (deceased excluded) by species, largest first. Names are
 * grouped regardless of case or spaces; patients without a species count as
 * "Non renseignée" rather than disappearing.
 */
export function buildSpeciesSplit(patients: { species?: string; status?: string; createdAt?: string }[], now: Date) {
  const active = patients.filter((patient) => patient.status !== "decede");
  const groups = new Map<string, { name: string; count: number }>();
  for (const patient of active) {
    const raw = (patient.species ?? "").trim();
    const key = raw.toLocaleLowerCase("fr-FR") || "non-renseignee";
    const name = raw ? raw[0].toLocaleUpperCase("fr-FR") + raw.slice(1) : "Non renseignée";
    const group = groups.get(key) ?? { name, count: 0 };
    group.count += 1;
    groups.set(key, group);
  }
  const sorted = [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  const kept = sorted.length > SPECIES_SHOWN + 1 ? sorted.slice(0, SPECIES_SHOWN) : sorted;
  const rest = sorted.slice(kept.length);
  const lines = rest.length
    ? [...kept, { key: "autres", name: `Autres (${rest.length})`, count: rest.reduce((sum, row) => sum + row.count, 0) }]
    : kept;
  const parts = shares(lines.map((row) => row.count));
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const recent = active.filter((patient) => {
    const created = parseDashboardDate(patient.createdAt);
    return Boolean(created && created >= since && created <= now);
  }).length;
  return {
    total: active.length,
    deceased: patients.length - active.length,
    recent,
    rows: lines.map((row, index): SpeciesRow => ({ key: row.key, name: row.name, count: row.count, share: parts[index] })),
  };
}

export interface VisitKindRow {
  key: string;
  name: string;
  count: number;
  share: number;
}

/**
 * The period's visits by kind (Consultation, Vaccin, Chirurgie…), largest
 * first: what the Consultations card shows that no other card does. A visit
 * without a kind is a consultation, as everywhere else in the dashboard.
 */
export function buildVisitKinds(visits: { type?: string | null }[]): VisitKindRow[] {
  const counts = new Map<string, number>();
  for (const visit of visits) {
    const name = visit.type?.trim() || "Consultation";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const parts = shares(sorted.map(([, count]) => count));
  return sorted.map(([name, count], index) => ({ key: name.toLocaleLowerCase("fr-FR"), name, count, share: parts[index] }));
}

export type HeatmapPeriod = "week" | "month" | "quarter" | "year";

export const HEATMAP_PERIODS: { value: HeatmapPeriod; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

/** Steps of intensity above an empty day. */
export const HEAT_STEPS = 4;

export interface HeatDay {
  key: string;
  date: Date;
  count: number;
  /** 0 for an empty day, then 1 to HEAT_STEPS. */
  level: number;
  /** After today: what is already booked, not what happened. */
  future: boolean;
  today: boolean;
}

/** A calendar month, Monday first; null pads the days of the neighbouring months. */
export interface HeatMonth {
  key: string;
  label: string;
  weeks: (HeatDay | null)[][];
}

/** One week of the year view, Monday to Sunday, named when a month starts in it. */
export interface HeatColumn {
  key: string;
  days: (HeatDay | null)[];
  month?: string;
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const plusDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** Monday on or before the date. */
const mondayOf = (date: Date) => plusDays(dayOnly(date), -((date.getDay() + 6) % 7));

/**
 * Level of a day's count. Up to HEAT_STEPS appointments on the busiest day,
 * one step per appointment, so 1 never looks like 3; above, equal slices of
 * the busiest day.
 */
export function heatLevel(count: number, max: number) {
  if (count <= 0) return 0;
  if (max <= HEAT_STEPS) return Math.min(count, HEAT_STEPS);
  return Math.min(HEAT_STEPS, Math.ceil((count * HEAT_STEPS) / max));
}

/** What each step covers, in appointments, for the legend's tooltips. */
export function heatLegend(max: number) {
  return Array.from({ length: HEAT_STEPS + 1 }, (_, level) => {
    if (!level) return { level, min: 0, max: 0 };
    if (max <= HEAT_STEPS) return { level, min: level, max: level };
    return { level, min: Math.floor(((level - 1) * max) / HEAT_STEPS) + 1, max: Math.floor((level * max) / HEAT_STEPS) };
  });
}

function heatRange(period: HeatmapPeriod, now: Date) {
  if (period === "week") {
    const from = mondayOf(now);
    return { from, to: plusDays(from, 6) };
  }
  if (period === "year") {
    // Twelve months up to the end of this week, whole weeks for the columns.
    return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: plusDays(mondayOf(now), 6) };
  }
  const months = period === "quarter" ? 3 : 1;
  return {
    from: new Date(now.getFullYear(), now.getMonth() - months + 1, 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
}

/**
 * Appointments per day for the clinic's activity heatmap: cancellations and
 * no-shows excluded, as in the day's units. Days are the clinic's local days.
 * Booked days after today are counted and flagged, never invented.
 */
export function buildActivityHeatmap(
  appointments: { startTime?: string | null; status: string }[],
  period: HeatmapPeriod,
  now: Date,
) {
  const { from, to } = heatRange(period, now);
  const end = plusDays(to, 1);
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    if (NOT_SEEN.has(appointment.status)) continue;
    const start = parseDashboardDate(appointment.startTime ?? undefined);
    if (!start || start < from || start >= end) continue;
    const key = dayKey(start);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(0, ...counts.values());
  const todayKey = dayKey(now);
  const today = dayOnly(now);
  const days: HeatDay[] = [];
  for (let date = from; date <= to; date = plusDays(date, 1)) {
    const key = dayKey(date);
    const count = counts.get(key) ?? 0;
    days.push({ key, date, count, level: heatLevel(count, max), future: date > today, today: key === todayKey });
  }
  const byKey = new Map(days.map((day) => [day.key, day]));
  const weekOf = (monday: Date, inside: (date: Date) => boolean) =>
    Array.from({ length: 7 }, (_, index) => {
      const date = plusDays(monday, index);
      return inside(date) ? (byKey.get(dayKey(date)) ?? null) : null;
    });

  const months: HeatMonth[] = [];
  const columns: HeatColumn[] = [];
  if (period === "year") {
    for (let monday = mondayOf(from); monday <= to; monday = plusDays(monday, 7)) {
      const week = weekOf(monday, (date) => date >= from && date <= to);
      const first = week.find((day) => day?.date.getDate() === 1) ?? (columns.length ? undefined : week.find(Boolean));
      columns.push({
        key: dayKey(monday),
        days: week,
        month: first ? first.date.toLocaleDateString("fr-FR", { month: "short" }) : undefined,
      });
    }
  } else if (period === "week") {
    months.push({
      key: dayKey(from),
      label: `Semaine du ${from.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
      weeks: [weekOf(from, () => true)],
    });
  } else {
    for (let first = from; first <= to; first = new Date(first.getFullYear(), first.getMonth() + 1, 1)) {
      const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
      const weeks: (HeatDay | null)[][] = [];
      for (let monday = mondayOf(first); monday <= last; monday = plusDays(monday, 7)) {
        weeks.push(weekOf(monday, (date) => date >= first && date <= last));
      }
      const label = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      months.push({ key: dayKey(first), label: label[0].toLocaleUpperCase("fr-FR") + label.slice(1), weeks });
    }
  }

  const active = days.filter((day) => day.count > 0);
  // Monday first, as the grid reads.
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  for (const day of active) weekdays[(day.date.getDay() + 6) % 7] += day.count;
  const busiest = active.reduce<HeatDay | null>((best, day) => (!best || day.count > best.count ? day : best), null);
  return {
    period,
    from,
    to,
    days,
    months,
    columns,
    max,
    total: active.reduce((sum, day) => sum + day.count, 0),
    activeDays: active.length,
    /** Days of the range up to today: the ones that could have had a visit. */
    elapsedDays: days.filter((day) => !day.future).length,
    busiest,
    /** Appointments per weekday over the range, Monday first. */
    weekdays,
    legend: heatLegend(max),
  };
}

/**
 * Appointments per hour, with the same rules as the heatmap: cancellations and no-shows are not
 * visits, hours are the clinic's local hours. The week is Monday to Sunday, `week[0]` being Monday;
 * `today` is the current day's 24 hours. Booked hours later on are counted, never invented.
 */
export function buildHourlyActivity(appointments: { startTime?: string | null; status: string }[], now: Date) {
  const weekFrom = mondayOf(now);
  const weekEnd = plusDays(weekFrom, 7);
  const dayStart = dayOnly(now);
  const dayEnd = plusDays(dayStart, 1);
  const week = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const today = Array<number>(24).fill(0);
  for (const appointment of appointments) {
    if (NOT_SEEN.has(appointment.status)) continue;
    const start = parseDashboardDate(appointment.startTime ?? undefined);
    if (!start) continue;
    if (start >= weekFrom && start < weekEnd) week[(start.getDay() + 6) % 7][start.getHours()] += 1;
    if (start >= dayStart && start < dayEnd) today[start.getHours()] += 1;
  }
  return { weekFrom, week, today };
}
