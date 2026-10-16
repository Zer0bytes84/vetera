import type { Appointment, Patient } from "@/types/db";

/** Local suggestions based on scheduled visits, then recently consulted patients. */
export function suggestedPatients(
  patients: Patient[],
  appointments: Appointment[],
  now: number,
) {
  const upcoming = appointments
    .filter(
      (visit) =>
        Number.isFinite(Date.parse(visit.startTime)) &&
        Date.parse(visit.startTime) >= now &&
        !["cancelled", "completed", "no_show"].includes(visit.status),
    )
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const ordered = [
    ...upcoming.map((visit) => visit.patientId),
    ...[...patients]
      .filter((patient) => patient.status !== "decede" && patient.lastVisit)
      .sort(
        (a, b) =>
          (Date.parse(b.lastVisit!) || 0) - (Date.parse(a.lastVisit!) || 0),
      )
      .map((patient) => patient.id),
  ];
  const ids = [...new Set(ordered)];
  return ids
    .flatMap((id) => {
      const patient = patients.find(
        (item) => item.id === id && item.status !== "decede",
      );
      return patient ? [patient] : [];
    })
    .slice(0, 3);
}
