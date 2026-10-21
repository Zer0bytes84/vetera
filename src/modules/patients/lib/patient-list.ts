import type { Appointment, Patient } from "@/types/db";

const DAY_MS = 86_400_000;
/** A patient not seen for this long is due a follow-up call. */
export const OVERDUE_VISIT_DAYS = 90;

function time(value: string | undefined) {
  if (!value) {
    return null;
  }
  // Calendar dates (YYYY-MM-DD) are read in local time, as everywhere else.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`).getTime()
    : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** A visit still to come: booked, confirmed or not, and not yet started. */
export function isUpcomingVisit(appointment: Appointment, now: Date) {
  const start = time(appointment.startTime);
  return (
    (appointment.status === "scheduled" || appointment.status === "confirmed") &&
    start !== null &&
    start >= now.getTime()
  );
}

/** What people type when there is nothing: never shown as a flag. */
const NOTHING_TO_REPORT = /^(aucune?s?|ras|r\.a\.s|néant|neant|non|nc|n\/a|-+|\/)$/i;

export type ClinicalFlag ={ kind: "allergy" | "chronic"; label: string };

/**
 * Allergies and chronic conditions already entered in the record, one flag
 * per item. Free text is split on commas, semicolons and line breaks.
 */
export function clinicalFlags(
  patient: Pick<Patient, "allergies" | "chronicConditions">
): ClinicalFlag[] {
  const split = (text: string | undefined) =>
    (text ?? "")
      .split(/[,;\n]/)
      .map((item) => item.trim().replace(/\.$/, ""))
      .filter((item) => item && !NOTHING_TO_REPORT.test(item));
  const seen = new Set<string>();
  const flags: ClinicalFlag[] = [];
  for (const [kind, text] of [
    ["allergy", patient.allergies],
    ["chronic", patient.chronicConditions],
  ] as const) {
    for (const label of split(text)) {
      const key = `${kind}:${label.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        flags.push({ kind, label });
      }
    }
  }
  return flags;
}

/**
 * Not seen for more than 90 days. A record without any finished visit counts
 * from its creation, so a patient registered yesterday is not overdue.
 * Deceased patients are never due a follow-up.
 */
export function isVisitOverdue(
  patient: Pick<Patient, "status" | "createdAt">,
  lastVisit: string | undefined,
  now: Date
) {
  if (patient.status === "decede") {
    return false;
  }
  const reference = time(lastVisit) ?? time(patient.createdAt);
  return reference !== null && now.getTime() - reference > OVERDUE_VISIT_DAYS * DAY_MS;
}

export type PatientSort = "activity" | "name" | "lastVisit" | "nextVisit";

export const PATIENT_SORT_OPTIONS: { value: PatientSort; label: string }[] = [
  { value: "activity", label: "Activité récente" },
  { value: "name", label: "Nom" },
  { value: "lastVisit", label: "Dernière visite" },
  { value: "nextVisit", label: "Prochain rendez-vous" },
];

type SortableRecord = {
  patient: Pick<Patient, "name" | "createdAt">;
  lastVisit?: string;
  upcomingAppointment?: Pick<Appointment, "startTime">;
};

/**
 * "activity" keeps the historical order: next visit, else last visit, else
 * creation, most recent first. Records missing the sorted date go last.
 */
export function sortPatientRecords<T extends SortableRecord>(
  records: T[],
  sort: PatientSort
): T[] {
  const byName = (left: T, right: T) =>
    left.patient.name.localeCompare(right.patient.name, "fr", { sensitivity: "base" });
  const missingLast = (
    pick: (record: T) => number | null,
    direction: 1 | -1
  ) => (left: T, right: T) => {
    const a = pick(left);
    const b = pick(right);
    if (a === null && b === null) return byName(left, right);
    if (a === null) return 1;
    if (b === null) return -1;
    return (a - b) * direction || byName(left, right);
  };
  const compare = {
    activity: missingLast(
      (record) =>
        time(record.upcomingAppointment?.startTime) ??
        time(record.lastVisit) ??
        time(record.patient.createdAt),
      -1
    ),
    name: byName,
    lastVisit: missingLast((record) => time(record.lastVisit), -1),
    nextVisit: missingLast((record) => time(record.upcomingAppointment?.startTime), 1),
  }[sort];
  return [...records].sort(compare);
}
