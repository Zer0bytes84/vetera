import { formatDinars } from "@/utils/display-format";
import type {
  Appointment,
  Owner,
  Patient,
  Product,
  Task,
  Transaction,
} from "@/types/db";

const SQLITE_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseDashboardDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  // Calendar dates (journal/vaccine due dates) have no timezone. Parsing them
  // as UTC midnight shifts them to the previous day west of Greenwich.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  }

  const sqliteLike = SQLITE_TIMESTAMP_REGEX.test(value);
  const normalized = sqliteLike ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (Number.isFinite(date.getTime())) {
    return date;
  }

  if (sqliteLike) {
    const localDate = new Date(value.replace(" ", "T"));
    return Number.isFinite(localDate.getTime()) ? localDate : null;
  }

  return null;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function formatCurrency(value: number) {
  return formatDinars(value, 0);
}

/** Repository amounts are integer centimes; chart metrics already use dinars. */
export function formatCentimes(value: number) {
  return formatCurrency(value / 100);
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ScheduleStatus = Appointment["status"];

export interface ScheduleEntry {
  appointment: Appointment;
  end: Date;
  ownerName: string;
  patientName: string;
  species: string;
  start: Date;
}

export function buildTodaySchedule({
  appointments,
  owners,
  patients,
  referenceDate,
}: {
  appointments: Appointment[];
  owners: Owner[];
  patients: Patient[];
  referenceDate: Date;
}): ScheduleEntry[] {
  const patientsById = new Map(
    patients.map((patient) => [patient.id, patient])
  );
  const ownersById = new Map(owners.map((owner) => [owner.id, owner]));

  return appointments
    .flatMap((appointment) => {
      const start = parseDashboardDate(appointment.startTime);
      const end = parseDashboardDate(appointment.endTime);
      if (!(start && end && isSameDay(start, referenceDate))) {
        return [];
      }

      const patient = patientsById.get(appointment.patientId);
      const owner = ownersById.get(appointment.ownerId);
      return [
        {
          appointment,
          start,
          end,
          patientName: patient?.name || appointment.title,
          species: patient?.species || "Animal",
          ownerName: owner
            ? `${owner.firstName} ${owner.lastName}`.trim()
            : "Propriétaire non renseigné",
        },
      ];
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime());
}

export type AlertTone = "critical" | "warning" | "info";

export interface ClinicalAlert {
  detail: string;
  id: string;
  patientId?: string;
  source: "task" | "stock" | "vaccine" | "appointment";
  title: string;
  tone: AlertTone;
}

/** A medical_reminders row, as read by the patient reminders service. */
export interface ClinicalReminderRow {
  echeance: string;
  id: string;
  patient_id: string;
  statut: string;
  type: string;
}

export function buildClinicalAlerts({
  appointments,
  patients,
  products,
  tasks,
  reminders,
  reminderTypes,
  referenceDate,
}: {
  appointments: Appointment[];
  patients: Patient[];
  products: Product[];
  tasks: Task[];
  reminders: ClinicalReminderRow[];
  reminderTypes: { code?: string; id: string; name: string }[];
  referenceDate: Date;
}): ClinicalAlert[] {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const today = startOfDay(referenceDate);
  const next30Days = endOfDay(addDays(referenceDate, 30));
  const lastSevenDays = startOfDay(addDays(referenceDate, -7));

  const taskAlerts = tasks.flatMap<ClinicalAlert>((task) => {
    if (task.status === "done") {
      return [];
    }
    const dueDate = parseDashboardDate(task.dueDate);
    if (dueDate ? dueDate > endOfDay(addDays(referenceDate,7)) : task.priority !== "high") {
      return [];
    }
    const patient = task.patientId
      ? patientById.get(task.patientId)
      : undefined;
    return [
      {
        id: `task:${task.id}`,
        source: "task",
        tone: task.priority === "high" ? "critical" : "warning",
        title: task.title,
        detail: [patient?.name, dueDate ? dueDate <= endOfDay(referenceDate) ? "Action arrivée à échéance" : `Échéance le ${dueDate.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}` : "Priorité haute · sans date"].filter(Boolean).join(" · "),
        patientId: task.patientId,
      },
    ];
  });

  const stockAlerts = products.flatMap<ClinicalAlert>((product) => {
    if (product.quantity > product.minStock) {
      return [];
    }
    return [
      {
        id: `stock:${product.id}`,
        source: "stock",
        tone: product.quantity <= 0 ? "critical" : "warning",
        title: product.name,
        detail:
          product.quantity <= 0
            ? "Rupture de stock"
            : `${product.quantity} ${product.unit} · seuil ${product.minStock}`,
      },
    ];
  });

  // Vaccine due dates live on the medical reminders, not on the vaccination
  // rows: the vaccine form no longer fills nextDueAt, and the dates that were
  // there were migrated to reminders. One open reminder is one obligation;
  // the reminder lifecycle (a renewal closes the previous reminder) replaces
  // the old latest-administration dedupe.
  const typeById = new Map(reminderTypes.map((type) => [type.id, type]));
  const isVaccineType = (typeId: string) => {
    const type = typeById.get(typeId);
    const label = [typeId, type?.code ?? "", type?.name ?? ""]
      .map((value) =>
        value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR")
      )
      .join(" ");
    return /\b(vaccin\w*|immunisation)\b/.test(label);
  };
  const vaccineAlerts = reminders.flatMap<ClinicalAlert>((reminder) => {
    if (reminder.statut !== "en_cours" || !isVaccineType(reminder.type)) {
      return [];
    }
    const dueDate = parseDashboardDate(reminder.echeance);
    if (!(dueDate && dueDate <= next30Days)) {
      return [];
    }
    const patient = patientById.get(reminder.patient_id);
    if (!patient || patient.status === "decede") return [];
    return [
      {
        id: `vaccine:${reminder.id}`,
        source: "vaccine",
        tone:
          dueDate <= endOfDay(addDays(referenceDate, 7)) ? "warning" : "info",
        title: `${patient.name} · ${typeById.get(reminder.type)?.name ?? "Vaccination"}`,
        detail: `${dueDate < today ? "Rappel dépassé ·" : "Rappel le"} ${dueDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })}`,
        patientId: reminder.patient_id,
      },
    ];
  });

  const noShowAlerts = appointments.flatMap<ClinicalAlert>((appointment) => {
    const start = parseDashboardDate(appointment.startTime);
    if (
      !(start && start >= lastSevenDays && start <= referenceDate && appointment.status === "no_show")
    ) {
      return [];
    }
    const patient = patientById.get(appointment.patientId);
    return [
      {
        id: `appointment:${appointment.id}`,
        source: "appointment",
        tone: "info",
        title: patient?.name ?? appointment.title,
        detail: "Rendez-vous manqué · relance recommandée",
        patientId: appointment.patientId,
      },
    ];
  });

  const toneWeight: Record<AlertTone, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return [
    ...taskAlerts,
    ...stockAlerts,
    ...vaccineAlerts,
    ...noShowAlerts,
  ].sort((left, right) => toneWeight[left.tone] - toneWeight[right.tone]);
}

export interface CashflowPoint {
  expense: number;
  income: number;
  label: string;
  net: number;
}

export function buildCashflowSeries(
  transactions: Transaction[],
  referenceDate: Date,
  days: number
): CashflowPoint[] {
  const paid = transactions.filter(
    (transaction) => transaction.status === "paid"
  );
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(referenceDate, -days + 1 + index);
    const daily = paid.filter((transaction) => {
      const date = parseDashboardDate(transaction.date);
      return date && isSameDay(date, day);
    });
    const income =
      daily
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0) / 100;
    const expense =
      daily
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0) / 100;

    return {
      income,
      expense,
      net: income - expense,
      label: day.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: days > 31 ? undefined : "short",
      }),
    };
  });
}

export interface CapacityDay {
  available: number;
  count: number;
  date: Date;
  label: string;
  load: number;
}

const REFERENCE_DAILY_SLOTS = 8;

export function buildCapacitySeries(
  appointments: Appointment[],
  referenceDate: Date
): CapacityDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(referenceDate, index);
    const count = appointments.filter((appointment) => {
      const start = parseDashboardDate(appointment.startTime);
      return (
        start &&
        isSameDay(start, date) &&
        !["cancelled", "no_show"].includes(appointment.status)
      );
    }).length;

    return {
      date,
      count,
      available: Math.max(REFERENCE_DAILY_SLOTS - count, 0),
      load: Math.min((count / REFERENCE_DAILY_SLOTS) * 100, 100),
      label: date.toLocaleDateString("fr-FR", { weekday: "short" }),
    };
  });
}
