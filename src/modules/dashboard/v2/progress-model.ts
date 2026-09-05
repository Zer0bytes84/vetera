import type { Appointment, Task, Transaction } from "@/types/db";
import { addDays, endOfDay, parseDashboardDate, startOfDay } from "./model";

/** Period membership uses local calendar dates for date-only task deadlines. */
export function isInProgressPeriod(
  value: string | undefined,
  referenceDate: Date,
  days: number
) {
  if (!value) return false;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : parseDashboardDate(value);
  return Boolean(
    date &&
      date >= startOfDay(addDays(referenceDate, 1 - days)) &&
      date <= endOfDay(referenceDate)
  );
}

export function buildClinicProgress({
  appointments,
  tasks,
  transactions,
  referenceDate,
  days,
}: {
  appointments: Appointment[];
  tasks: Task[];
  transactions: Transaction[];
  referenceDate: Date;
  days: number;
}) {
  const visits = appointments.filter(
    (item) =>
      item.status !== "cancelled" &&
      isInProgressPeriod(item.startTime, referenceDate, days)
  );
  const actions = tasks.filter((item) =>
    isInProgressPeriod(item.dueDate || item.createdAt, referenceDate, days)
  );
  const payments = transactions.filter(
    (item) =>
      item.type === "income" &&
      isInProgressPeriod(item.date, referenceDate, days)
  );
  return [
    {
      id: "appointments",
      label: "RDV terminés",
      shortLabel: "Rendez-vous",
      done: visits.filter((item) => item.status === "completed").length,
      total: visits.length,
      route: "agenda",
      color: "#ea62b4",
    },
    {
      id: "tasks",
      label: "Actions réalisées",
      shortLabel: "Actions",
      done: actions.filter((item) => item.status === "done").length,
      total: actions.length,
      route: "taches",
      color: "#a8eb20",
    },
    {
      id: "payments",
      label: "Encaissements reçus",
      shortLabel: "Paiements",
      done: payments.filter((item) => item.status === "paid").length,
      total: payments.length,
      route: "finances",
      color: "#38baf2",
    },
  ] as const;
}
