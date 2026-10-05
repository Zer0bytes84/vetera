import { useRef, useState } from "react";
import { toast } from "sonner";
import { useNowTick } from "@/hooks/useNowTick";
import type { AppointmentStatus, Patient } from "@/types/db";
import type { ScheduleEntry } from "./model";
import { buildNowSnapshot } from "../model/clinical-dashboard";
import { VisitFlowBoard } from "../components/visit-flow-board";

export type AppointmentStatusChange = (
  appointmentId: string,
  next: AppointmentStatus
) => Promise<unknown>;

export function NowBoard({
  today,
  patients,
  onStatusChange,
  onOpenConsultation,
  onOpenPatient,
  onOpenAgenda,
  onPlan,
}: {
  today: ScheduleEntry[];
  patients: Patient[];
  onStatusChange?: AppointmentStatusChange;
  onOpenConsultation?: (id: string) => void;
  onOpenPatient?: (id: string) => void;
  onOpenAgenda?: () => void;
  onPlan?: () => void;
}) {
  const now = useNowTick(30_000);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pending = useRef(false);
  const snapshot = buildNowSnapshot(today, patients, now);
  const run = async (
    id: string,
    status: AppointmentStatus,
    after?: () => void
  ) => {
    if (!onStatusChange || pending.current) return;
    pending.current = true;
    setPendingId(id);
    try {
      await onStatusChange(id, status);
      if (status === "arrived")
        toast.success("L’arrivée du patient est enregistrée.");
      after?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Le statut n’a pas pu être mis à jour."
      );
    } finally {
      pending.current = false;
      setPendingId(null);
    }
  };
  return (
    <VisitFlowBoard
      snapshot={snapshot}
      busy={pendingId !== null}
      onAgenda={onOpenAgenda}
      onPlan={onPlan}
      onPatient={onOpenPatient}
      onArrive={
        onStatusChange
          ? (id) => {
              void run(id, "arrived");
            }
          : undefined
      }
      onStart={
        onOpenConsultation &&
        (snapshot.next?.appointment.status === "in_progress" || onStatusChange)
          ? (id) => {
              if (snapshot.next?.appointment.status === "in_progress")
                onOpenConsultation(id);
              else void run(id, "in_progress", () => onOpenConsultation(id));
            }
          : undefined
      }
    />
  );
}
