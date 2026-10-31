/**
 * Carnet de santé — assemblage pur.
 *
 * Tout ce qui figure sur le carnet vient du dossier : aucune valeur n'est
 * déduite au-delà de calculs explicites (âge, échéance d'un rappel, fin d'un
 * traitement). Une donnée absente reste absente et le carnet le dit.
 */

import {
  durationToDays,
  isTreatmentActive,
} from "@/modules/prescriptions/lib/prescription-safety";
import type {
  Appointment,
  Hospitalization,
  Owner,
  Patient,
  Prescription,
  PrescriptionItem,
  Vaccination,
  WeightEntry,
} from "@/types/db";

const DAY_MS = 86_400_000;
/** Un rappel est « à prévoir » dans les 30 jours. */
export const DUE_SOON_DAYS = 30;
export const MAX_VACCINATION_ROWS = 5;
export const MAX_HISTORY_ROWS = 6;
export const MAX_TREATMENT_ROWS = 4;
export const MAX_WEIGHT_POINTS = 24;

export type VaccineStatus = "overdue" | "due_soon" | "up_to_date" | "no_reminder";

export interface HealthCardAlert {
  detail?: string;
  kind: "allergy" | "condition" | "vaccine_overdue";
  title: string;
}

export interface HealthCardVaccine {
  administeredAt: string;
  name: string;
  nextDueAt?: string;
  status: VaccineStatus;
}

export interface HealthCardTreatment {
  dose?: string;
  duration?: string;
  frequency?: string;
  name: string;
  since: string;
  /** Date de fin calculée, ou « long cours ». */
  until?: string | "long_cours";
}

export interface HealthCardEvent {
  date: string;
  detail?: string;
  kind: "Consultation" | "Chirurgie" | "Urgence" | "Contrôle" | "Hospitalisation";
  title: string;
}

export interface HealthCard {
  alerts: HealthCardAlert[];
  generatedAt: string;
  history: { events: HealthCardEvent[]; hidden: number };
  identity: {
    ageLabel?: string;
    breed?: string;
    chipNumber?: string;
    dateOfBirth?: string;
    name: string;
    ownerName?: string;
    ownerPhone?: string;
    photoDataUrl?: string;
    /** « ID-0011 ». */
    reference?: string;
    sexLabel: string;
    species: string;
    tattooNumber?: string;
  };
  treatments: { hidden: number; items: HealthCardTreatment[] };
  vaccinations: {
    /** Dernière injection de chaque vaccin, rappels les plus urgents d'abord. */
    current: HealthCardVaccine[];
    hiddenCurrent: number;
    totalInjections: number;
  };
  weight: {
    current?: { date: string; kg: number };
    deltaKg?: number;
    points: { date: string; kg: number }[];
    previous?: { date: string; kg: number };
    /** Nombre total de pesées, y compris celles hors de la courbe. */
    total: number;
  };
}

export interface HealthCardInput {
  appointments: readonly Appointment[];
  hospitalizations: readonly Hospitalization[];
  items: readonly PrescriptionItem[];
  now: Date;
  owner?: Owner | null;
  patient: Patient;
  prescriptions: readonly Prescription[];
  vaccinations: readonly Vaccination[];
  weights: readonly WeightEntry[];
}

/** Une date seule (« 2026-10-18 ») est un jour local, pas minuit UTC. */
export function parseClinicalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function time(value: string | null | undefined): number {
  return parseClinicalDate(value)?.getTime() ?? Number.NaN;
}

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function clean(value: string | null | undefined): string | undefined {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text : undefined;
}

/** « 4 ans 2 mois », « 8 mois », « 3 semaines ». */
export function ageLabel(dateOfBirth: string | undefined, now: Date): string | undefined {
  const birth = dateOfBirth ? new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`) : null;
  if (!birth || Number.isNaN(birth.getTime()) || birth.getTime() > now.getTime()) {
    return undefined;
  }
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 1) {
    const weeks = Math.floor((startOfDay(now) - birth.getTime()) / (7 * DAY_MS));
    return weeks > 1 ? `${weeks} semaines` : weeks === 1 ? "1 semaine" : "Moins d'une semaine";
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(years > 1 ? `${years} ans` : "1 an");
  if (rest > 0) parts.push(`${rest} mois`);
  return parts.join(" ");
}

/** Liste libre (« Pénicillines, AINS ; poulet ») découpée en éléments. */
export function splitClinicalList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[\n;,•]+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function photo(value: string | undefined): string | undefined {
  // Seules les images locales embarquées sont reprises : aucun accès réseau.
  return value && /^data:image\/(png|jpe?g);base64,[a-z0-9+/=]+$/i.test(value)
    ? value
    : undefined;
}

function vaccineKey(vaccination: Vaccination): string {
  return (clean(vaccination.vaccineType) ?? clean(vaccination.vaccineName) ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function vaccineStatus(nextDueAt: string | undefined, now: Date): VaccineStatus {
  const due = time(nextDueAt);
  if (Number.isNaN(due)) return "no_reminder";
  const today = startOfDay(now);
  if (due < today) return "overdue";
  if (due < today + (DUE_SOON_DAYS + 1) * DAY_MS) return "due_soon";
  return "up_to_date";
}

const STATUS_RANK: Record<VaccineStatus, number> = {
  overdue: 0,
  due_soon: 1,
  up_to_date: 2,
  no_reminder: 3,
};

/**
 * Dernière injection de chaque vaccin du patient, avec l'état de son rappel,
 * les plus urgents d'abord. Une injection déjà renouvelée n'est jamais « en
 * retard » : seule la plus récente porte le rappel en cours. Partagé par le
 * carnet de santé et le bandeau du dossier.
 */
export function currentVaccineReminders(
  patientId: string,
  all: readonly Vaccination[],
  now: Date
): HealthCardVaccine[] {
  return buildVaccinations(patientId, all, now).all;
}

/** Jours entiers écoulés depuis l'échéance (0 si elle n'est pas dépassée). */
export function daysOverdue(nextDueAt: string | undefined, now: Date): number {
  const due = time(nextDueAt);
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(new Date(due))) / DAY_MS));
}

function buildVaccinations(patientId: string, all: readonly Vaccination[], now: Date) {
  const own = all.filter(
    (v) => v.patientId === patientId && !Number.isNaN(time(v.administeredAt))
  );
  // Dernière injection de chaque vaccin : c'est elle qui porte le rappel en cours.
  const latest = new Map<string, Vaccination>();
  for (const vaccination of own) {
    const key = vaccineKey(vaccination);
    const known = latest.get(key);
    if (!known || time(vaccination.administeredAt) > time(known.administeredAt)) {
      latest.set(key, vaccination);
    }
  }
  const current = [...latest.values()]
    .map(
      (v): HealthCardVaccine => ({
        name: clean(v.vaccineName) ?? clean(v.vaccineType) ?? "Vaccin",
        administeredAt: v.administeredAt,
        nextDueAt: clean(v.nextDueAt),
        status: vaccineStatus(v.nextDueAt, now),
      })
    )
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (time(a.nextDueAt) || Infinity) - (time(b.nextDueAt) || Infinity) ||
        time(b.administeredAt) - time(a.administeredAt)
    );
  return {
    all: current,
    current: current.slice(0, MAX_VACCINATION_ROWS),
    hiddenCurrent: Math.max(0, current.length - MAX_VACCINATION_ROWS),
    totalInjections: own.length,
    overdue: current.filter((v) => v.status === "overdue"),
  };
}

function doseLabel(item: PrescriptionItem): string | undefined {
  const format = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  if (item.computedDoseMg != null && item.computedDoseMg > 0) {
    const ml = item.computedVolumeMl != null && item.computedVolumeMl > 0 ? ` (${format(item.computedVolumeMl)} mL)` : "";
    return `${format(item.computedDoseMg)} mg${ml}`;
  }
  if (item.dosagePerKg > 0) {
    return `${format(item.dosagePerKg)} ${item.dosageUnit}`;
  }
  return undefined;
}

/** Treatments still running today, from signed or dispensed prescriptions. */
export function buildTreatments(
  input: Pick<HealthCardInput, "items" | "now" | "patient" | "prescriptions">
) {
  const byId = new Map(
    input.prescriptions
      .filter(
        (p) =>
          p.patientId === input.patient.id &&
          (p.status === "signed" || p.status === "dispensed")
      )
      .map((p) => [p.id, p])
  );
  const active = input.items
    .flatMap((item): HealthCardTreatment[] => {
      const prescription = byId.get(item.prescriptionId);
      if (!prescription || !isTreatmentActive(prescription.prescriptionDate, item.duration, input.now)) {
        return [];
      }
      const days = durationToDays(item.duration);
      const start = parseClinicalDate(prescription.prescriptionDate) ?? new Date(Number.NaN);
      start.setHours(0, 0, 0, 0);
      let until: HealthCardTreatment["until"];
      if (days === Number.POSITIVE_INFINITY) {
        until = "long_cours";
      } else if (days != null) {
        // Dernier jour de traitement inclus.
        until = new Date(start.getTime() + (days - 1) * DAY_MS).toISOString();
      }
      return [
        {
          name: item.medicationName,
          dose: doseLabel(item),
          frequency: clean(item.frequency),
          duration: clean(item.duration),
          since: prescription.prescriptionDate,
          until,
        },
      ];
    })
    .sort((a, b) => time(b.since) - time(a.since));
  return {
    items: active.slice(0, MAX_TREATMENT_ROWS),
    hidden: Math.max(0, active.length - MAX_TREATMENT_ROWS),
  };
}

const CLOSED_STATUSES = new Set<Appointment["status"]>(["cancelled", "no_show"]);

function buildHistory(input: HealthCardInput) {
  const nowTime = input.now.getTime();
  const visits = input.appointments
    .filter(
      (a) =>
        a.patientId === input.patient.id &&
        a.type !== "Vaccin" &&
        !CLOSED_STATUSES.has(a.status) &&
        time(a.startTime) <= nowTime &&
        (a.status === "completed" || a.type === "Chirurgie" || a.type === "Urgence" || Boolean(clean(a.diagnosis)))
    )
    .map(
      (a): HealthCardEvent => ({
        date: a.startTime,
        kind: a.type as HealthCardEvent["kind"], // Les vaccins sont exclus ci-dessus.
        title: clean(a.diagnosis) ?? clean(a.reason) ?? clean(a.title) ?? a.type,
        detail: clean(a.diagnosis) ? clean(a.reason) ?? clean(a.title) : undefined,
      })
    );
  const stays = input.hospitalizations
    .filter((h) => h.patientId === input.patient.id && time(h.admissionDate) <= nowTime)
    .map(
      (h): HealthCardEvent => ({
        date: h.admissionDate,
        kind: "Hospitalisation",
        title: clean(h.diagnosis) ?? clean(h.reason) ?? "Hospitalisation",
        detail: clean(h.diagnosis) ? clean(h.reason) : undefined,
      })
    );
  // Chirurgies, urgences et hospitalisations d'abord : ce sont les antécédents majeurs.
  const major = (event: HealthCardEvent) =>
    event.kind === "Chirurgie" || event.kind === "Urgence" || event.kind === "Hospitalisation";
  const all = [...visits, ...stays].sort((a, b) => time(b.date) - time(a.date));
  const kept = [...all.filter(major), ...all.filter((event) => !major(event))]
    .slice(0, MAX_HISTORY_ROWS)
    .sort((a, b) => time(b.date) - time(a.date));
  return { events: kept, hidden: Math.max(0, all.length - kept.length) };
}

function buildWeight(patientId: string, weights: readonly WeightEntry[]) {
  const all = weights
    .filter(
      (w) =>
        w.patientId === patientId &&
        Number.isFinite(w.weightKg) &&
        w.weightKg > 0 &&
        !Number.isNaN(time(w.measuredAt))
    )
    .sort((a, b) => time(a.measuredAt) - time(b.measuredAt))
    .map((w) => ({ date: w.measuredAt, kg: w.weightKg }));
  const points = all.slice(-MAX_WEIGHT_POINTS);
  const current = points.at(-1);
  const previous = points.length > 1 ? points.at(-2) : undefined;
  return {
    points,
    current,
    previous,
    total: all.length,
    deltaKg: current && previous ? Math.round((current.kg - previous.kg) * 100) / 100 : undefined,
  };
}

export function buildHealthCard(input: HealthCardInput): HealthCard {
  const { patient, owner, now } = input;
  const vaccinations = buildVaccinations(patient.id, input.vaccinations, now);
  const alerts: HealthCardAlert[] = [
    ...splitClinicalList(patient.allergies).map(
      (title): HealthCardAlert => ({ kind: "allergy", title })
    ),
    ...vaccinations.overdue.map(
      (v): HealthCardAlert => ({
        kind: "vaccine_overdue",
        title: v.name,
        detail: v.nextDueAt,
      })
    ),
    ...splitClinicalList(patient.chronicConditions).map(
      (title): HealthCardAlert => ({ kind: "condition", title })
    ),
  ];
  const ownerName = owner
    ? clean(`${owner.firstName ?? ""} ${owner.lastName ?? ""}`)
    : undefined;
  return {
    generatedAt: now.toISOString(),
    identity: {
      name: patient.name,
      species: patient.species,
      breed: clean(patient.breed),
      sexLabel: `${patient.sex === "F" ? "Femelle" : "Mâle"}${
        patient.sterilized ? (patient.sex === "F" ? " stérilisée" : " castré") : ""
      }`,
      dateOfBirth: clean(patient.dateOfBirth),
      ageLabel: ageLabel(patient.dateOfBirth, now),
      chipNumber: clean(patient.chipNumber),
      tattooNumber: clean(patient.tattooNumber),
      photoDataUrl: photo(patient.avatarUrl),
      reference: clean(patient.reference),
      ownerName,
      ownerPhone: owner ? clean(owner.phone) : undefined,
    },
    alerts,
    vaccinations: {
      current: vaccinations.current,
      hiddenCurrent: vaccinations.hiddenCurrent,
      totalInjections: vaccinations.totalInjections,
    },
    treatments: buildTreatments(input),
    weight: buildWeight(patient.id, input.weights),
    history: buildHistory(input),
  };
}
