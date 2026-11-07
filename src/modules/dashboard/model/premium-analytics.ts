import type { Appointment, Invoice, Owner, Patient, Product, Task, Transaction, Vaccination } from "@/types/db";
import { addDays, endOfDay, parseDashboardDate, startOfDay, type ClinicalAlert } from "../v2/model";
import { buildVisitKinds } from "./dashboard-widgets";

export const ANALYTICS_PERIODS = [
  { value: "today", label: "Aujourd’hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]["value"];
export type AnalyticsRange = { from: Date; to: Date };

/** The dashboard's own periods: the presets, or two days picked by the user. */
export type DashboardPeriod = AnalyticsPeriod | "custom";
/** Two calendar days as « AAAA-MM-JJ », as the date picker writes them. */
export type CustomRange = { from: string; to: string };
/** The longest picked span: beyond two years a point per week still draws no curve worth reading. */
export const MAX_CUSTOM_DAYS = 731;

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // 2026-02-31 rolls over into March: not a day.
  return date.getMonth() === Number(match[2]) - 1 ? date : null;
}

/**
 * The picked days as a range from the first midnight to the last 23:59:59.
 * Reversed days are put in order and a span past the limit keeps its end.
 * Anything unreadable gives null, so a half-typed date never drives the figures.
 */
export function customAnalyticsRange(custom: CustomRange | null | undefined): AnalyticsRange | null {
  if (!custom) return null;
  const a = parseDay(custom.from);
  const b = parseDay(custom.to);
  if (!a || !b) return null;
  const [first, last] = a <= b ? [a, b] : [b, a];
  const days = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
  const from = days > MAX_CUSTOM_DAYS ? addDays(last, 1 - MAX_CUSTOM_DAYS) : first;
  return { from: startOfDay(from), to: endOfDay(last) };
}

function calendarDays(range: AnalyticsRange) {
  return Math.max(1, Math.round((startOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / 86_400_000) + 1);
}

export function analyticsRanges(period: DashboardPeriod, now: Date, custom?: CustomRange | null) {
  if (period === "custom") {
    const range = customAnalyticsRange(custom);
    // Nothing valid picked yet: the thirty days the page opens on.
    if (!range) return analyticsRanges("30d", now);
    const days = calendarDays(range);
    return {
      current: range,
      previous: { from: startOfDay(addDays(range.from, -days)), to: new Date(range.from.getTime() - 1) },
    };
  }
  const to = endOfDay(now);
  const days = period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const from = period === "12m"
    ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1)
    : startOfDay(addDays(now, 1 - days));
  const previousTo = new Date(from.getTime() - 1);
  // Calendar arithmetic preserves local day boundaries across daylight saving.
  const previousFrom = period === "12m"
    ? new Date(from.getFullYear() - 1, from.getMonth(), from.getDate())
    : startOfDay(addDays(from, -days));
  return { current: { from, to }, previous: { from: previousFrom, to: previousTo } };
}

function within(value: string | undefined, range: AnalyticsRange) {
  const date = parseDashboardDate(value);
  return Boolean(date && date >= range.from && date <= range.to);
}

/**
 * Buckets for the KPI micro-histograms: one bar per day up to 30 days, per
 * week over 90 days, per month over 12 months; none for a single day.
 */
export function trendBuckets(period: DashboardPeriod, range: AnalyticsRange): AnalyticsRange[] {
  if (period === "today") return [];
  if (period === "custom") {
    const days = calendarDays(range);
    if (days <= 1) return [];
    // A bar a day up to a month, a week beyond.
    const step = days <= 31 ? 1 : 7;
    const buckets: AnalyticsRange[] = [];
    for (let from = range.from; from <= range.to; from = startOfDay(addDays(from, step))) {
      buckets.push({ from, to: new Date(Math.min(startOfDay(addDays(from, step)).getTime() - 1, range.to.getTime())) });
    }
    return buckets;
  }
  if (period === "12m") {
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(range.from.getFullYear(), range.from.getMonth() + i, i === 0 ? range.from.getDate() : 1);
      const next = new Date(range.from.getFullYear(), range.from.getMonth() + i + 1, 1);
      return { from, to: new Date(Math.min(next.getTime() - 1, range.to.getTime())) };
    });
  }
  const step = period === "90d" ? 7 : 1;
  const buckets: AnalyticsRange[] = [];
  for (let from = range.from; from <= range.to; from = startOfDay(addDays(from, step))) {
    const to = new Date(Math.min(startOfDay(addDays(from, step)).getTime() - 1, range.to.getTime()));
    buckets.push({ from, to });
  }
  return buckets;
}

export function metricChange(value: number, previous: number) {
  if (previous === 0) return value === 0 ? 0 : null;
  return ((value - previous) / Math.abs(previous)) * 100;
}

const isTestObject = (value?: string) => /\bTEST[\s_-]+ZO\b/i.test(value ?? "");

/** A dashboard read projection only. Records and financial audit trails remain intact. */
export function dashboardPresentationData(data: {
  patients: Patient[]; owners: Owner[]; appointments: Appointment[];
  tasks: Task[]; products: Product[]; transactions: Transaction[];
  vaccinations: Vaccination[]; invoices: Invoice[];
}) {
  const excludedOwners = new Set(data.owners.filter(o => isTestObject(`${o.firstName} ${o.lastName}`)).map(o => o.id));
  const excludedPatients = new Set(data.patients.filter(p => isTestObject(p.name) || excludedOwners.has(p.ownerId)).map(p => p.id));
  const excludedAppointments = new Set(data.appointments.filter(a => excludedPatients.has(a.patientId) || excludedOwners.has(a.ownerId) || isTestObject(a.title)).map(a => a.id));
  const excludedInvoices = new Set(data.invoices.filter(i => excludedPatients.has(i.patientId ?? "") || excludedOwners.has(i.ownerId) || excludedAppointments.has(i.appointmentId ?? "")).map(i => i.id));
  return {
    patients: data.patients.filter(p => !excludedPatients.has(p.id)),
    owners: data.owners.filter(o => !excludedOwners.has(o.id)),
    appointments: data.appointments.filter(a => !excludedAppointments.has(a.id)),
    tasks: data.tasks.filter(t => !excludedPatients.has(t.patientId ?? "") && !isTestObject(t.title)),
    products: data.products.filter(p => !isTestObject(p.name)),
    vaccinations: data.vaccinations.filter(v => !excludedPatients.has(v.patientId)),
    invoices: data.invoices.filter(i => !excludedInvoices.has(i.id)),
    transactions: data.transactions.filter(t =>
      !isTestObject(t.description) && !isTestObject(t.category) &&
      !excludedInvoices.has(t.referenceId ?? "") && !excludedInvoices.has(t.sourceId ?? "") &&
      !excludedAppointments.has(t.referenceId ?? "") && !excludedAppointments.has(t.sourceId ?? "")
    ),
  };
}

export function buildPremiumAnalytics(data: {
  appointments: Appointment[]; patients: Patient[]; transactions: Transaction[];
  tasks: Task[]; vaccinations: Vaccination[]; alerts: ClinicalAlert[];
}, period: DashboardPeriod, now: Date, custom?: CustomRange | null) {
  const ranges = analyticsRanges(period, now, custom);
  const knownPatients = new Set(data.patients.map(p => p.id));
  const visitsIn = (range: AnalyticsRange) => data.appointments.filter(a =>
    knownPatients.has(a.patientId) && !["cancelled", "no_show"].includes(a.status) && within(a.startTime, range)
  );
  const currentVisits = visitsIn(ranges.current);
  const previousVisits = visitsIn(ranges.previous);
  const followed = new Set(currentVisits.map(a => a.patientId)).size;
  const previousFollowed = new Set(previousVisits.map(a => a.patientId)).size;
  const cashIn = (range: AnalyticsRange, type: Transaction["type"]) => data.transactions
    .filter(t => t.status === "paid" && t.type === type && within(t.date, range))
    .reduce((sum, t) => sum + t.amount, 0);
  const income = cashIn(ranges.current, "income");
  const expense = cashIn(ranges.current, "expense");
  const previousIncome = cashIn(ranges.previous, "income");
  const dates = new Map<string, string | undefined>([
    ...data.tasks.map(t => [`task:${t.id}`, t.dueDate] as const),
    ...data.vaccinations.map(v => [`vaccine:${v.id}`, v.nextDueAt] as const),
    ...data.appointments.map(a => [`appointment:${a.id}`, a.startTime] as const),
  ]);
  // Current open actions grouped by their actual due date, never invented past status snapshots.
  const actionsIn = (range: AnalyticsRange) => data.alerts.filter(a => within(dates.get(a.id), range));
  const actions = actionsIn(ranges.current);
  const previousActions = actionsIn(ranges.previous);
  const buckets = trendBuckets(period, ranges.current);
  const trend = {
    income: buckets.map(range => cashIn(range, "income")),
    visits: buckets.map(range => currentVisits.filter(a => within(a.startTime, range)).length),
    patients: buckets.map(range => new Set(currentVisits.filter(a => within(a.startTime, range)).map(a => a.patientId)).size),
  };
  return {
    ranges,
    trend,
    cash: { income, expense, net: income - expense, previous: previousIncome, change: metricChange(income, previousIncome) },
    patients: { count: followed, previous: previousFollowed, change: metricChange(followed, previousFollowed), visits: currentVisits.length,
      previousVisits: previousVisits.length, visitsChange: metricChange(currentVisits.length, previousVisits.length),
      completed: currentVisits.filter(a => a.status === "completed").length,
      underway: currentVisits.filter(a => ["arrived", "waiting", "in_progress"].includes(a.status)).length,
      planned: currentVisits.filter(a => ["scheduled", "confirmed"].includes(a.status)).length,
      kinds: buildVisitKinds(currentVisits),
      newRecords: data.patients.filter(p => within(p.createdAt, ranges.current)).length },
    actions: { count: actions.length, previous: previousActions.length, change: metricChange(actions.length, previousActions.length),
      urgent: actions.filter(a => a.tone === "critical").length,
      reminders: actions.filter(a => a.source === "vaccine").length,
      tasks: actions.filter(a => a.source === "task").length },
  };
}
