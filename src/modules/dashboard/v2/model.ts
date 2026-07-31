import type {
  Appointment,
  Owner,
  Patient,
  Product,
  Task,
  Transaction,
  Vaccination,
} from "@/types/db";

const SQLITE_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseDashboardDate(value?: string): Date | null {
  if (!value) {
    return null;
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
  return new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "DZD",
  })
    .format(value)
    .replace("DZD", "DA");
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

export function buildClinicalAlerts({
  appointments,
  patients,
  products,
  tasks,
  vaccinations,
  referenceDate,
}: {
  appointments: Appointment[];
  patients: Patient[];
  products: Product[];
  tasks: Task[];
  vaccinations: Vaccination[];
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
    if (!(dueDate && dueDate <= endOfDay(referenceDate))) {
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
        detail: patient
          ? `${patient.name} · action arrivée à échéance`
          : "Action arrivée à échéance",
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

  const vaccineAlerts = vaccinations.flatMap<ClinicalAlert>((vaccination) => {
    const dueDate = parseDashboardDate(vaccination.nextDueAt);
    if (!(dueDate && dueDate >= today && dueDate <= next30Days)) {
      return [];
    }
    const patient = patientById.get(vaccination.patientId);
    return [
      {
        id: `vaccine:${vaccination.id}`,
        source: "vaccine",
        tone:
          dueDate <= endOfDay(addDays(referenceDate, 7)) ? "warning" : "info",
        title: `${patient?.name ?? "Patient"} · ${vaccination.vaccineName}`,
        detail: `Rappel le ${dueDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        })}`,
        patientId: vaccination.patientId,
      },
    ];
  });

  const noShowAlerts = appointments.flatMap<ClinicalAlert>((appointment) => {
    const start = parseDashboardDate(appointment.startTime);
    if (
      !(start && start >= lastSevenDays && appointment.status === "no_show")
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
