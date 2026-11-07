import { careDisplayStatus, type CareTask } from "@/modules/care-tasks/domain";
import type { Appointment, Invoice, Patient, Product } from "@/types/db";
import { isOpenInvoice } from "../v2/financial-model";
import { parseDashboardDate, startOfDay } from "../v2/model";

/**
 * « Alertes »: the clinic's open alerts, day by day. Three categories stack upward (reminders, care, stock), and what is
 * late hangs below the line, in red: late items are a subset of the stack, as in TuffUI's Diverging Bars.
 *  - Rappels: medical reminders still `en_cours`, by their due day; late once the day has passed.
 *  - Soins: care still to do or under way, by its planned day; late once its planned time has passed (the Soins view's own rule).
 *  - Créances: issued invoices with a balance left to collect (the « Créances » figure's own rule), by due day, or today
 *    when none was set; late when the invoice is settled as « overdue », the status the Créances card counts.
 *  - Rendez-vous non traités: appointments already over that are still « planifié » or « confirmé », never marked done,
 *    cancelled or missed (the agenda's own « planned » states); by their day, all of them late: a visit with no outcome is a gap
 *    (no consultation, no invoice, nothing in the patient's timeline).
 *  - Stock: lots expiring on their day (late when already expired), and a shortage (out of stock or under the threshold),
 *    which is dated today because it is a state, not a date.
 * The window is six days back to seven days ahead; whatever is dated before it gathers in a first column, « Avant », so that
 * nothing open is left out of the chart (`chart`); the plain 14-day arrays stay for callers that want the window alone.
 */

export interface AlertReminder {
  id: string;
  patient_id: string;
  statut: string;
  echeance: string;
}

export type AlertCategory =
  "reminders" | "care" | "stock" | "receivables" | "appointments";

export const ALERT_CATEGORIES: { id: AlertCategory; label: string }[] = [
  { id: "reminders", label: "Rappels" },
  { id: "care", label: "Soins" },
  { id: "stock", label: "Stock" },
  { id: "receivables", label: "Créances" },
  { id: "appointments", label: "Rendez-vous non traités" },
];

export const ALERT_DAYS_BACK = 6;
export const ALERT_DAYS_AHEAD = 7;

const DAY_MS = 86_400_000;

/** "2026-10-18" is midnight local, with no time-zone shift. */
function dateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return parseDashboardDate(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const dayDiff = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

export function alertWindow(now: Date) {
  const today = startOfDay(now);
  return {
    from: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - ALERT_DAYS_BACK,
    ),
    to: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + ALERT_DAYS_AHEAD,
    ),
  };
}

export function buildAlertBars({
  now,
  reminders,
  careTasks,
  products,
  patients,
  invoices,
  appointments,
}: {
  now: Date;
  reminders: AlertReminder[];
  careTasks: Pick<CareTask, "statut" | "heure_prevue">[];
  products: Pick<
    Product,
    | "archivedAt"
    | "stockTracked"
    | "quantity"
    | "availableQuantity"
    | "minStock"
    | "expiryDate"
    | "nearestExpiryDate"
    | "expiredQuantity"
  >[];
  patients: Pick<Patient, "id" | "status">[];
  invoices: Pick<
    Invoice,
    | "documentStatus"
    | "issuedAt"
    | "createdAt"
    | "dueAt"
    | "grossAmount"
    | "creditAmount"
    | "balanceAmount"
    | "settlementStatus"
  >[];
  appointments: Pick<Appointment, "startTime" | "endTime" | "status">[];
}) {
  const today = startOfDay(now);
  const { from } = alertWindow(now);
  const count = ALERT_DAYS_BACK + ALERT_DAYS_AHEAD + 1;
  const days = Array.from(
    { length: count },
    (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i),
  );
  const values: Record<AlertCategory, number[]> = {
    reminders: Array(count).fill(0),
    care: Array(count).fill(0),
    stock: Array(count).fill(0),
    receivables: Array(count).fill(0),
    appointments: Array(count).fill(0),
  };
  const late = Array<number>(count).fill(0);
  let olderLate = 0;
  const older: Record<AlertCategory, number> = {
    reminders: 0,
    care: 0,
    stock: 0,
    receivables: 0,
    appointments: 0,
  };

  /** Files one alert on its day: stacked in its category, and below the line when late. */
  const file = (category: AlertCategory, day: Date, isLate: boolean) => {
    const index = dayDiff(from, day);
    if (index < 0) {
      older[category] += 1;
      if (isLate) olderLate += 1;
      return;
    }
    if (index >= count) return;
    values[category][index] += 1;
    if (isLate) late[index] += 1;
  };

  const deceased = new Set(
    patients.filter((p) => p.status === "decede").map((p) => p.id),
  );
  for (const reminder of reminders) {
    if (reminder.statut !== "en_cours" || deceased.has(reminder.patient_id))
      continue;
    const due = dateOnly(reminder.echeance);
    if (due) file("reminders", due, due < today);
  }

  for (const task of careTasks) {
    if (task.statut !== "a_faire" && task.statut !== "en_cours") continue;
    const planned = parseDashboardDate(task.heure_prevue);
    if (planned)
      file("care", planned, careDisplayStatus(task, now) === "en_retard");
  }

  for (const product of products) {
    if (product.archivedAt || product.stockTracked === false) continue;
    const quantity = product.availableQuantity ?? product.quantity;
    if (quantity <= 0 || quantity <= product.minStock)
      file("stock", today, false);
    const expiryValue = product.nearestExpiryDate ?? product.expiryDate;
    const expiry = expiryValue ? dateOnly(expiryValue) : null;
    if ((product.expiredQuantity ?? 0) > 0 || (expiry && expiry < today))
      file("stock", expiry ?? today, true);
    else if (expiry) file("stock", expiry, false);
  }

  for (const invoice of invoices) {
    if (!isOpenInvoice(invoice)) continue;
    // No due date: what is owed is a state, dated today like a shortage, never lost before the window.
    const due = invoice.dueAt ? dateOnly(invoice.dueAt) : today;
    if (due) file("receivables", due, invoice.settlementStatus === "overdue");
  }

  for (const appointment of appointments) {
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "confirmed"
    )
      continue;
    const start = parseDashboardDate(appointment.startTime);
    const end = parseDashboardDate(appointment.endTime) ?? start;
    if (start && end && end.getTime() < now.getTime())
      file("appointments", start, true);
  }

  const olderTotal =
    older.reminders +
    older.care +
    older.stock +
    older.receivables +
    older.appointments;
  const beforeTitle = `Avant le ${from.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;

  const total = days.map(
    (_, i) =>
      values.reminders[i] +
      values.care[i] +
      values.stock[i] +
      values.receivables[i] +
      values.appointments[i],
  );
  const sum = (list: number[]) => list.reduce((n, v) => n + v, 0);
  const lateInWindow = sum(late);
  return {
    days,
    labels: days.map((d) =>
      d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    ),
    titles: days.map((d) => {
      const text = d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      return text[0].toLocaleUpperCase("fr-FR") + text.slice(1);
    }),
    values,
    late,
    total,
    open: sum(total) + olderTotal,
    lateInWindow,
    olderLate,
    lateAll: lateInWindow + olderLate,
    todayIndex: ALERT_DAYS_BACK,
    older,
    olderTotal,
    /** What the chart draws: « Avant » first, then the 14 days. */
    chart: {
      labels: [
        "Avant",
        ...days.map((d) =>
          d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        ),
      ],
      titles: [
        beforeTitle,
        ...days.map((d) => {
          const text = d.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return text[0].toLocaleUpperCase("fr-FR") + text.slice(1);
        }),
      ],
      values: {
        reminders: [older.reminders, ...values.reminders],
        care: [older.care, ...values.care],
        stock: [older.stock, ...values.stock],
        receivables: [older.receivables, ...values.receivables],
        appointments: [older.appointments, ...values.appointments],
      },
      late: [olderLate, ...late],
      todayIndex: ALERT_DAYS_BACK + 1,
    },
  };
}
