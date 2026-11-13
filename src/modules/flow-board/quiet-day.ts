import type { Appointment, Patient, Transaction } from "@/types/db";
import { parseDashboardDate } from "@/modules/dashboard/v2/model";
import { isSameLocalDay } from "./model";

/**
 * Ce que le Flux montre quand la journée n'a aucune visite : le prochain rendez-vous, et le résumé du jour tel que les
 * dossiers le disent (rendez-vous annulés et absences du jour, encaissements du jour). Rien n'est calculé qui n'existe
 * déjà : un rendez-vous à venir est « planifié » ou « confirmé », comme dans l'agenda ; un encaissement est une recette
 * payée, comme dans le journal de trésorerie. Le filtre de vétérinaire du tableau s'applique aux rendez-vous, pas à la
 * caisse, qui est celle du cabinet.
 */
export interface QuietDay {
  next: {
    appointmentId: string;
    startTime: string;
    patientName: string;
    reason: string;
    vetName: string;
    /** Le prochain rendez-vous est aujourd'hui, plus tard. */
    today: boolean;
  } | null;
  /** Rendez-vous planifiés ou confirmés des sept prochains jours, aujourd'hui compris. */
  week: number;
  cancelledToday: number;
  noShowToday: number;
  /** Recettes payées aujourd'hui, en centimes. */
  receiptsToday: number;
}

const UPCOMING = new Set<Appointment["status"]>(["scheduled", "confirmed"]);

export function buildQuietDay({
  appointments,
  patients,
  vets,
  transactions,
  now,
  vetId = "",
}: {
  appointments: Pick<Appointment, "id" | "patientId" | "vetId" | "startTime" | "status" | "reason" | "type">[];
  patients: Pick<Patient, "id" | "name">[];
  vets: { id: string; name: string }[];
  transactions: Pick<Transaction, "type" | "status" | "date" | "amount">[];
  now: Date;
  vetId?: string;
}): QuietDay {
  const mine = vetId ? appointments.filter((appointment) => appointment.vetId === vetId) : appointments;
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const upcoming = mine
    .filter((appointment) => UPCOMING.has(appointment.status))
    .map((appointment) => ({ appointment, at: new Date(appointment.startTime) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()) && at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const first = upcoming[0]?.appointment;
  const patientName = (id: string) => patients.find((patient) => patient.id === id)?.name ?? "Patient";
  const today = mine.filter((appointment) => isSameLocalDay(appointment.startTime, now));
  return {
    next: first
      ? {
          appointmentId: first.id,
          startTime: first.startTime,
          patientName: patientName(first.patientId),
          reason: first.reason?.trim() || first.type,
          vetName: vets.find((vet) => vet.id === first.vetId)?.name ?? "",
          today: isSameLocalDay(first.startTime, now),
        }
      : null,
    week: upcoming.filter(({ at }) => at < weekEnd).length,
    cancelledToday: today.filter((appointment) => appointment.status === "cancelled").length,
    noShowToday: today.filter((appointment) => appointment.status === "no_show").length,
    receiptsToday: transactions
      .filter((row) => {
        if (row.type !== "income" || row.status !== "paid") return false;
        // Read as the dashboard's Trésorerie reads it: a SQLite timestamp is UTC, a bare day is local.
        const day = parseDashboardDate(row.date);
        return Boolean(day && day.toDateString() === now.toDateString());
      })
      .reduce((sum, row) => sum + (row.amount || 0), 0),
  };
}
