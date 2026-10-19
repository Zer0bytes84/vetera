import type { Vaccination } from "@/types/db";

import {
  currentVaccineReminders,
  daysOverdue,
} from "../health-card/health-card-data";

export interface VaccinationBannerEntry {
  /** Jours de retard, pour un rappel dépassé. */
  daysLate?: number;
  name: string;
  nextDueAt: string;
  status: "overdue" | "due_soon";
}

/**
 * Rappels à signaler dans le bandeau du dossier : tous ceux en retard, puis
 * ceux à prévoir dans les 30 jours. Même classement que le carnet de santé.
 */
export function vaccinationBannerEntries(
  patientId: string,
  vaccinations: readonly Vaccination[],
  now: Date
): VaccinationBannerEntry[] {
  return currentVaccineReminders(patientId, vaccinations, now).flatMap(
    (vaccine): VaccinationBannerEntry[] => {
      if (!vaccine.nextDueAt) return [];
      if (vaccine.status === "overdue") {
        return [{ name: vaccine.name, nextDueAt: vaccine.nextDueAt, status: "overdue", daysLate: daysOverdue(vaccine.nextDueAt, now) }];
      }
      if (vaccine.status === "due_soon") {
        return [{ name: vaccine.name, nextDueAt: vaccine.nextDueAt, status: "due_soon" }];
      }
      return [];
    }
  );
}

/** « en retard de 15 jours », « en retard d’1 jour ». */
export function lateLabel(days: number): string {
  return days <= 1 ? "en retard d’1 jour" : `en retard de ${days} jours`;
}
