import type { Vaccination } from "@/types/db";
import type { MedicalReminder, ReminderType } from "@/modules/patient-reminders/store";
import { currentVaccineReminders } from "../health-card/health-card-data";

export interface PreventionCountdown {
  id: string;
  label: string;
  /** Calendar day of the due date, local time. */
  dueDate: string;
  /** Whole days until the due date; negative once it is past. */
  days: number;
  source: "vaccine" | "reminder";
}

const DAY_MS = 86_400_000;

function localDay(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function daysUntil(day: string, now: Date) {
  const [year, month, date] = day.split("-").map(Number);
  const due = new Date(year, month - 1, date).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / DAY_MS);
}

const family = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleLowerCase("fr-FR");

/**
 * What is due next for the patient, soonest first: each vaccine's current
 * booster and each open medical reminder. A booster already followed by an
 * open « vaccin » reminder is listed once, as that reminder.
 */
export function preventionCountdowns({
  now,
  patientId,
  reminders,
  types,
  vaccinations,
}: {
  now: Date;
  patientId: string;
  reminders: readonly MedicalReminder[];
  types: readonly ReminderType[];
  vaccinations: readonly Vaccination[];
}): PreventionCountdown[] {
  const typeName = new Map(types.map((type) => [type.id, type.name]));
  const vaccinationById = new Map(vaccinations.map((vaccination) => [vaccination.id, vaccination]));
  const open = reminders.filter((reminder) => reminder.patient_id === patientId && reminder.statut === "en_cours");
  const followed = new Set(
    open.flatMap((reminder) => {
      const source = reminder.acte_source_id ? vaccinationById.get(reminder.acte_source_id) : undefined;
      return source ? [family(source.vaccineType?.trim() || source.vaccineName)] : [];
    })
  );
  const items: PreventionCountdown[] = [];
  for (const vaccine of currentVaccineReminders(patientId, vaccinations, now)) {
    const day = vaccine.nextDueAt ? localDay(vaccine.nextDueAt) : null;
    if (!day || followed.has(family(vaccine.name))) continue;
    items.push({ id: `vaccine-${vaccine.name}`, label: vaccine.name, dueDate: day, days: daysUntil(day, now), source: "vaccine" });
  }
  for (const reminder of open) {
    const day = localDay(reminder.echeance);
    if (!day) continue;
    const source = reminder.acte_source_id ? vaccinationById.get(reminder.acte_source_id) : undefined;
    items.push({
      id: `reminder-${reminder.id}`,
      label: source?.vaccineName || typeName.get(reminder.type) || reminder.type,
      dueDate: day,
      days: daysUntil(day, now),
      source: "reminder",
    });
  }
  return items.sort((a, b) => a.days - b.days || a.label.localeCompare(b.label, "fr"));
}

/** « dans 12 jours », « aujourd’hui », « en retard de 3 jours ». */
export function countdownLabel(days: number) {
  if (days === 0) return "aujourd’hui";
  if (days === 1) return "demain";
  if (days > 1) return days > 60 ? `dans ${Math.round(days / 30)} mois` : `dans ${days} jours`;
  return days === -1 ? "en retard d’1 jour" : `en retard de ${-days} jours`;
}
