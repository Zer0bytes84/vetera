import type {
  Appointment,
  Hospitalization,
  Owner,
  Patient,
  Transaction,
} from "@/types/db";
import {
  addDays,
  buildTodaySchedule,
  endOfDay,
  parseDashboardDate,
  startOfDay,
  type ScheduleEntry,
} from "../v2/model";

export interface NowSnapshot {
  today: ScheduleEntry[];
  next?: ScheduleEntry;
  allergies?: string;
  waiting: ScheduleEntry[];
  maximumWait: number;
  startsIn: number | null;
}
export function buildNowSnapshot(
  today: ScheduleEntry[],
  patients: Patient[],
  now: Date
): NowSnapshot {
  today = today.filter((row) => row.appointment.status !== "cancelled");
  const waiting = today.filter((row) =>
    ["arrived", "waiting"].includes(row.appointment.status)
  );
  const next =
    today.find((row) => row.appointment.status === "in_progress") ??
    waiting[0] ??
    today.find((row) =>
      ["scheduled", "confirmed"].includes(row.appointment.status)
    );
  // Without an arrival timestamp, report lateness relative to the planned slot.
  // Never invent an elapsed waiting time from the appointment's creation date.
  const maximumWait = Math.max(
    0,
    ...waiting.map((row) =>
      Math.floor((now.getTime() - row.start.getTime()) / 60_000)
    )
  );
  return {
    today,
    next,
    waiting,
    maximumWait,
    startsIn: next
      ? Math.round((next.start.getTime() - now.getTime()) / 60_000)
      : null,
    allergies: patients
      .find((patient) => patient.id === next?.appointment.patientId)
      ?.allergies?.trim(),
  };
}
export function buildClinicalTrends(
  appointments: Appointment[],
  now: Date,
  days: 30 | 90
) {
  const start = startOfDay(addDays(now, 1 - days));
  const completed = appointments.filter((row) => {
    const date = parseDashboardDate(row.startTime);
    return (
      date &&
      date >= start &&
      date <= endOfDay(now) &&
      row.status === "completed"
    );
  });
  const points = Array.from({ length: Math.ceil(days / 7) }, (_, index) => {
    const from = addDays(start, index * 7),
      to = endOfDay(addDays(from, Math.min(6, days - index * 7 - 1)));
    return {
      label: from.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      count: completed.filter((row) => {
        const date = parseDashboardDate(row.startTime)!;
        return date >= from && date <= to;
      }).length,
    };
  });
  const specialties = Object.entries(
    completed.reduce<Record<string, number>>((counts, row) => {
      counts[row.type] = (counts[row.type] ?? 0) + 1;
      return counts;
    }, {})
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return { points, specialties, total: completed.length, days };
}
export function buildClinicalFollowUp(
  patients: Patient[],
  hospitalizations: Hospitalization[]
) {
  const active = patients.filter((patient) => patient.status !== "decede");
  const activeIds = new Set(active.map((patient) => patient.id));
  const hospitalized = new Set([
    ...active
      .filter((patient) => patient.status === "hospitalise")
      .map((patient) => patient.id),
    ...hospitalizations
      .filter(
        (stay) =>
          activeIds.has(stay.patientId) &&
          ["admitted", "monitoring", "critical"].includes(stay.status)
      )
      .map((stay) => stay.patientId),
  ]);
  return {
    count: active.length,
    underTreatment: active.filter((patient) => patient.status === "traitement")
      .length,
    hospitalized: hospitalized.size,
  };
}
export function buildPatientFollowUpRows(
  patients: Patient[],
  owners: Owner[],
  stays: Hospitalization[]
) {
  const hospitalized = new Set(
    stays
      .filter((stay) =>
        ["admitted", "monitoring", "critical"].includes(stay.status)
      )
      .map((stay) => stay.patientId)
  );
  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
  const priority = (patient: Patient) =>
    hospitalized.has(patient.id) || patient.status === "hospitalise"
      ? 0
      : patient.status === "traitement"
        ? 1
        : 2;
  return patients
    .filter((patient) => patient.status !== "decede")
    .sort(
      (a, b) =>
        priority(a) - priority(b) ||
        (parseDashboardDate(b.lastVisit)?.getTime() ?? 0) -
          (parseDashboardDate(a.lastVisit)?.getTime() ?? 0) ||
        a.name.localeCompare(b.name, "fr")
    )
    .map((patient) => {
      const owner = ownerById.get(patient.ownerId);
      return {
        patient,
        ownerName: owner
          ? `${owner.firstName} ${owner.lastName}`.trim()
          : "Propriétaire non renseigné",
        hospitalized:
          hospitalized.has(patient.id) || patient.status === "hospitalise",
      };
    });
}

export type ClinicalCashPeriod =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year";
export function buildClinicalCash(
  transactions: Transaction[],
  now: Date,
  period: ClinicalCashPeriod
) {
  const start = startOfDay(period === "quarter" ? addDays(now, -89) : now);
  if (period === "month") start.setDate(1);
  if (period === "week")
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "year") {
    start.setMonth(0, 1);
  }
  const paid = transactions.filter((row) => row.status === "paid");
  const selected = paid.filter((row) => {
    const date = parseDashboardDate(row.date);
    return date && date >= start && date <= endOfDay(now);
  });
  const recent = [...paid]
    .filter(
      (row) =>
        (parseDashboardDate(row.date)?.getTime() ?? Infinity) <=
        endOfDay(now).getTime()
    )
    .sort(
      (a, b) =>
        (parseDashboardDate(b.date)?.getTime() ?? 0) -
        (parseDashboardDate(a.date)?.getTime() ?? 0)
    )
    .slice(0, 3);
  return {
    income: selected
      .filter((row) => row.type === "income")
      .reduce((sum, row) => sum + row.amount, 0),
    expense: selected
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + row.amount, 0),
    recent,
    count: selected.length,
  };
}

export function buildDayContext(
  appointments: Appointment[],
  owners: Owner[],
  patients: Patient[],
  now: Date
) {
  const future = appointments.filter((row) =>
    ["scheduled", "confirmed", "arrived", "waiting", "in_progress"].includes(
      row.status
    )
  );
  const datesFor = (rows: Appointment[], next: boolean) =>
    [
      ...new Set(
        rows.flatMap((row) => {
          const date = parseDashboardDate(row.startTime);
          if (!date || (next ? date <= endOfDay(now) : date >= startOfDay(now)))
            return [];
          return [startOfDay(date).getTime()];
        })
      ),
    ]
      .sort((a, b) => (next ? a - b : b - a))
      .slice(0, 3);
  const upcoming = datesFor(future, true)
    .flatMap((date) =>
      buildTodaySchedule({
        appointments: future,
        owners,
        patients,
        referenceDate: new Date(date),
      })
    )
    .slice(0, 3);
  if (upcoming.length) return { label: "Prochaines visites", rows: upcoming };
  const completed = appointments.filter((row) => row.status === "completed");
  return {
    label: "Dernières visites",
    rows: datesFor(completed, false)
      .flatMap((date) =>
        buildTodaySchedule({
          appointments: completed,
          owners,
          patients,
          referenceDate: new Date(date),
        })
      )
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .slice(0, 3),
  };
}
