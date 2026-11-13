/**
 * Ce que l'état vide « Rien à traiter » montre, lu sur les rappels déjà chargés par la page (même origine, même
 * périmètre) : le prochain rappel ouvert, et où en sont les rappels. Rien n'est calculé qui n'existe déjà : un rappel
 * ouvert est un rappel non terminé ; « d'ici 7 jours » compte les rappels ouverts datés de demain à J+7.
 */
export interface QuietReminder {
  kind: "manual" | "medical" | "automatic";
  date: Date | null;
  completed: boolean;
  title: string;
  patientName?: string;
}

export interface ReminderQuiet<T extends QuietReminder = QuietReminder> {
  next: T | null;
  openManual: number;
  openMedical: number;
  week: number;
  completed: number;
}

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function buildReminderQuiet<T extends QuietReminder>(items: T[], now: Date): ReminderQuiet<T> {
  const today = dayKey(now);
  const horizon = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const open = items.filter((item) => !item.completed);
  const ahead = open
    .filter((item) => item.date && dayKey(item.date) > today)
    .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
  return {
    next: ahead[0] ?? null,
    openManual: open.filter((item) => item.kind === "manual").length,
    openMedical: open.filter((item) => item.kind === "medical").length,
    week: ahead.filter((item) => dayKey(item.date as Date) <= horizon).length,
    completed: items.length - open.length,
  };
}
