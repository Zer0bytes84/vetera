import type { Appointment, Patient } from "@/types/db";

type CreateAppointment = (draft: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => Promise<Appointment | null>;

/** Use the existing appointment/session workflow, without an Agenda dialog. */
export async function prepareQuickConsultation({
  patient, userId, appointments, create, now = new Date(),
}: {
  patient: Patient;
  userId?: string;
  appointments: Appointment[];
  create: CreateAppointment;
  now?: Date;
}): Promise<Appointment> {
  if (!userId) throw new Error("Reconnectez-vous avant de démarrer une consultation.");
  if (!patient.ownerId) throw new Error("Ce patient doit être rattaché à un propriétaire.");
  const current = appointments.find(item => item.patientId === patient.id && item.status === "in_progress");
  if (current) return current;
  const appointment = await create({
    patientId: patient.id,
    ownerId: patient.ownerId,
    vetId: userId,
    title: `${patient.name} · Consultation`,
    type: "Consultation",
    status: "scheduled",
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 30 * 60_000).toISOString(),
  });
  if (!appointment) throw new Error("La consultation n’a pas pu être créée. Réessayez.");
  return appointment;
}
