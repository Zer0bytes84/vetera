import type { VaccinationStatus } from "@/config/status-meta";
import type { Vaccination } from "@/types/db";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Détermine l'état d'une vaccination par rapport à aujourd'hui.
 * - "overdue" : nextDueAt < aujourd'hui
 * - "due_soon" : nextDueAt < aujourd'hui + 30 jours
 * - "up_to_date" : nextDueAt >= aujourd'hui + 30 jours
 * - "unknown" : pas de nextDueAt (vaccin sans rappel planifié)
 */
export function getVaccinationStatus(
  vaccination: Pick<Vaccination, "nextDueAt">,
  now: Date = new Date()
): VaccinationStatus {
  if (!vaccination.nextDueAt) {
    return "unknown";
  }
  const due = new Date(vaccination.nextDueAt);
  if (Number.isNaN(due.getTime())) {
    return "unknown";
  }
  const diff = (due.getTime() - now.getTime()) / DAY_MS;
  if (diff < 0) {
    return "overdue";
  }
  if (diff < 30) {
    return "due_soon";
  }
  return "up_to_date";
}

/**
 * Pour un carnet de vaccination complet, détermine le statut agrégé
 * (le pire statut l'emporte : overdue > due_soon > up_to_date > unknown)
 */
export function getOverallVaccinationStatus(
  vaccinations: Vaccination[],
  now: Date = new Date()
): VaccinationStatus {
  if (vaccinations.length === 0) {
    return "unknown";
  }
  const priority: Record<VaccinationStatus, number> = {
    overdue: 3,
    due_soon: 2,
    up_to_date: 1,
    unknown: 0,
  };
  return vaccinations.reduce<VaccinationStatus>((acc, vacc) => {
    const status = getVaccinationStatus(vacc, now);
    return priority[status] > priority[acc] ? status : acc;
  }, "up_to_date");
}

/**
 * Renvoie la prochaine vaccination à venir (la plus proche non dépassée),
 * ou la plus récente dépassée si toutes sont passées.
 */
export function getNextDueVaccination(
  vaccinations: Vaccination[],
  now: Date = new Date()
): Vaccination | null {
  if (vaccinations.length === 0) {
    return null;
  }
  const upcoming = vaccinations
    .filter((v) => {
      if (!v.nextDueAt) {
        return false;
      }
      const due = new Date(v.nextDueAt);
      return !Number.isNaN(due.getTime()) && due.getTime() >= now.getTime();
    })
    .sort(
      (a, b) =>
        new Date(a.nextDueAt!).getTime() - new Date(b.nextDueAt!).getTime()
    );
  if (upcoming.length > 0) {
    return upcoming[0];
  }
  // Sinon, la plus récemment dépassée
  const overdue = vaccinations
    .filter((v) => v.nextDueAt)
    .sort(
      (a, b) =>
        new Date(b.nextDueAt!).getTime() - new Date(a.nextDueAt!).getTime()
    );
  return overdue[0] ?? null;
}
