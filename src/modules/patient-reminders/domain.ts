export type MedicalReminderStatus = "en_cours" | "termine" | "annule";

const LEGACY_REMINDER_TYPES = new Map([
  ["vaccination", "vaccin"],
  ["antiparasitaire", "vermifuge"],
]);

/** Legacy type identifiers remain readable for manual reminders. */
export function isMedicalReminderType(type: { id: string }): boolean {
  return !LEGACY_REMINDER_TYPES.has(type.id);
}

/** Keep historical identifiers in storage, but offer each type only once. */
export function reminderTypesForSelect<T extends { id: string; name: string; active: number }>(
  types: readonly T[],
  selectedId = "",
): T[] {
  const result: T[] = [];
  const label = (type: T) => type.name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
  const family = (type: T) => LEGACY_REMINDER_TYPES.get(type.id) ?? type.id;

  for (const type of types) {
    if (!type.active && type.id !== selectedId) continue;
    const index = result.findIndex((entry) => family(entry) === family(type) || label(entry) === label(type));
    if (index === -1) {
      result.push(type);
    } else if (type.id === selectedId || (result[index].id !== selectedId && !isMedicalReminderType(result[index]) && isMedicalReminderType(type))) {
      result[index] = type;
    }
  }
  return result;
}

/** Only explicit preventive act labels trigger a proposal. Generic controls do not. */
export function medicalReminderTypeForAct(label: string): string | null {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
  if (/\b(vaccin\w*|immunisation)\b/.test(normalized)) return "vaccin";
  if (/\b(vermifug\w*|deparasitage interne)\b/.test(normalized)) return "vermifuge";
  if (/\b(detartrage|soins? dentaires?|bilan dentaire)\b/.test(normalized)) return "soin_dentaire";
  if (/\b(controle annuel|bilan annuel|visite annuelle)\b/.test(normalized)) return "controle_annuel";
  return null;
}

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

export function isReminderOverdue(status: MedicalReminderStatus, dueDate: string, today = localToday()): boolean {
  assertDateOnly(dueDate);
  assertDateOnly(today);
  return status === "en_cours" && dueDate < today;
}

export function assertReminderTransition(from: MedicalReminderStatus, to: MedicalReminderStatus, reason?: string): void {
  if (from !== "en_cours" || !["termine", "annule"].includes(to)) {
    throw new Error("Ce rappel ne peut plus changer de statut.");
  }
  if (to === "annule" && !reason?.trim()) {
    throw new Error("Indiquez le motif d’annulation.");
  }
}
