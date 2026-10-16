export type PatientReminderStatus = "en_cours" | "traite" | "annule";
export type ReminderOrigin = "auto" | "manuel";

export function assertDateOnly(value: string): void {
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Choisissez une date valide.");
  }
}

export function addCalendarMonths(value: string, months: number): string {
  assertDateOnly(value);
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("L’intervalle doit être compris entre 1 et 120 mois.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function isReminderOverdue(status: PatientReminderStatus, dueDate: string, today = localToday()): boolean {
  assertDateOnly(dueDate);
  assertDateOnly(today);
  return status === "en_cours" && dueDate < today;
}

export function assertReminderTransition(from: PatientReminderStatus, to: PatientReminderStatus, reason?: string): void {
  if (from !== "en_cours" || !["traite", "annule"].includes(to)) {
    throw new Error("Ce rappel ne peut plus changer de statut.");
  }
  if (to === "annule" && !reason?.trim()) {
    throw new Error("Indiquez le motif d’annulation.");
  }
}
