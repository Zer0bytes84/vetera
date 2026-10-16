import type { Appointment, Invoice, Owner, Patient, Product, Task, Transaction, Vaccination } from "@/types/db";
import { addDays, endOfDay, parseDashboardDate, startOfDay, type ClinicalAlert } from "../v2/model";

export const ANALYTICS_PERIODS = [
  { value: "today", label: "Aujourd’hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number]["value"];
export type AnalyticsRange = { from: Date; to: Date };

export function analyticsRanges(period: AnalyticsPeriod, now: Date) {
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
}, period: AnalyticsPeriod, now: Date) {
  const ranges = analyticsRanges(period, now);
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
  return {
    ranges,
    cash: { income, expense, net: income - expense, previous: previousIncome, change: metricChange(income, previousIncome) },
    patients: { count: followed, previous: previousFollowed, change: metricChange(followed, previousFollowed), visits: currentVisits.length,
      completed: currentVisits.filter(a => a.status === "completed").length,
      newRecords: data.patients.filter(p => within(p.createdAt, ranges.current)).length },
    actions: { count: actions.length, previous: previousActions.length, change: metricChange(actions.length, previousActions.length),
      urgent: actions.filter(a => a.tone === "critical").length,
      reminders: actions.filter(a => a.source === "vaccine").length,
      tasks: actions.filter(a => a.source === "task").length },
  };
}
