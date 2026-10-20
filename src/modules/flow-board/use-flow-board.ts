import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAppointmentsRepository,
  usePatientsRepository,
  useUsersRepository,
  useVaccinationsRepository,
} from "@/data/repositories";
import { useAuth } from "@/contexts/AuthContext";
import { isTauriRuntime } from "@/services/browser-store";
import { VISIT_FLOW_CHANGED, VISIT_FLOW_STAGE_LABELS } from "@/modules/visit-flow/domain";
import { visitFlowService } from "@/modules/visit-flow/service";
import type { VisitFlowBoardState } from "@/modules/visit-flow/store";
import { useFlowUndo } from "@/modules/visit-flow/use-flow-undo";
import { roomsService } from "@/modules/rooms/service";
import type { Appointment, Patient } from "@/types/db";
import { boardMove, buildFlowBoard, isSameLocalDay, walkInFor, type BoardLane, type FlowCard } from "./model";

const REFRESH_MS = 30_000;
const OPEN_STATUSES = new Set(["arrived", "waiting", "in_progress"]);

/** Today's board, kept fresh, with the moves a click or a key can make. */
export function useFlowBoard(vetId: string, query = "") {
  const appointments = useAppointmentsRepository();
  const patients = usePatientsRepository();
  const users = useUsersRepository();
  const vaccinations = useVaccinationsRepository();
  const { currentUser } = useAuth();
  const flowUndo = useFlowUndo();
  const [states, setStates] = useState<VisitFlowBoardState[]>([]);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const request = useRef(0);

  // Today's visits, plus open ones from other days so they can be counted.
  const ids = useMemo(
    () =>
      appointments.data
        .filter((appointment) => isSameLocalDay(appointment.startTime, now) || OPEN_STATUSES.has(appointment.status))
        .map((appointment) => appointment.id)
        .sort(),
    [appointments.data, now]
  );
  const idsKey = ids.join(",");

  const refresh = useCallback(async () => {
    if (!isTauriRuntime()) return;
    const current = ++request.current;
    try {
      const next = await visitFlowService.boardStates(idsKey ? idsKey.split(",") : []);
      if (current === request.current) {
        setStates(next);
        setStatesError(null);
      }
    } catch {
      if (current === request.current) setStatesError("Le tableau n'a pas pu lire les étapes des visites.");
    }
  }, [idsKey]);

  // Appointment changes (status, new booking) arrive through the shared cache.
  useEffect(() => {
    void refresh();
  }, [refresh, appointments.data]);

  // Timers and payments made elsewhere: a light periodic refresh.
  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      void refresh();
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    const changed = () => void refresh();
    window.addEventListener("focus", tick);
    window.addEventListener(VISIT_FLOW_CHANGED, changed);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener(VISIT_FLOW_CHANGED, changed);
    };
  }, [refresh]);

  const board = useMemo(
    () =>
      buildFlowBoard({
        appointments: appointments.data,
        now,
        owners: patients.owners,
        patients: patients.data,
        states,
        users: users.data,
        vaccinations: vaccinations.data,
        query,
        vetId: vetId || undefined,
      }),
    [appointments.data, now, patients.owners, patients.data, query, states, users.data, vaccinations.data, vetId]
  );

  const move = useCallback(
    async (card: FlowCard, to: BoardLane, onClose?: (card: FlowCard) => void) => {
      const outcome = boardMove(card.lane, to);
      if (!outcome) return;
      if ("refused" in outcome) {
        toast.info(outcome.refused);
        return;
      }
      if (outcome.kind === "close") {
        toast.info(`Clôturez la consultation de ${card.patientName} : compte rendu, puis facture.`);
        onClose?.(card);
        return;
      }
      if (busyId) return;
      setBusyId(card.appointmentId);
      const label = to === "planned" ? "" : VISIT_FLOW_STAGE_LABELS[to];
      try {
        if (outcome.kind === "status") {
          await appointments.transitionStatus(card.appointmentId, outcome.status);
        } else {
          await visitFlowService.setCare(card.appointmentId, outcome.care, currentUser?.id ?? null, card.version);
        }
        void flowUndo.confirm(card.appointmentId, `${card.patientName} : ${label}`);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Le patient n'a pas pu être déplacé.");
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [appointments, busyId, currentUser?.id, flowUndo, refresh]
  );

  /**
   * A patient at the desk without being expected: straight to the waiting
   * room. A booked patient simply arrives; one already here is not doubled.
   */
  const walkIn = useCallback(
    async (patient: Patient) => {
      if (!patient.ownerId) throw new Error("Ce patient doit être rattaché à un propriétaire.");
      const actor = currentUser?.id;
      if (!actor) throw new Error("Reconnectez-vous avant d'enregistrer une arrivée.");
      const found = walkInFor(patient.id, appointments.data, new Date());
      if (found.kind === "already-here") {
        toast.info(`${patient.name} est déjà au cabinet aujourd'hui.`);
        return found.appointment.id;
      }
      let appointment: Appointment | null = found.kind === "booked" ? found.appointment : null;
      if (appointment) {
        await appointments.transitionStatus(appointment.id, "arrived");
      } else {
        const start = new Date();
        const room = await roomsService.defaultRoomId().catch(() => null);
        appointment = await appointments.add({
          endTime: new Date(start.getTime() + 15 * 60_000).toISOString(),
          ownerId: patient.ownerId,
          patientId: patient.id,
          reason: "Sans rendez-vous",
          ...(room ? { room } : {}),
          startTime: start.toISOString(),
          status: "scheduled",
          title: `${patient.name} · Sans rendez-vous`,
          type: "Consultation",
          vetId: vetId || actor,
        } as Omit<Appointment, "id" | "createdAt" | "updatedAt">);
        if (!appointment) throw new Error("L'arrivée n'a pas pu être enregistrée. Réessayez.");
        // Just created: not in this render's data yet, so set the status by id.
        if (!(await appointments.update(appointment.id, { status: "arrived" }))) {
          throw new Error("L'arrivée n'a pas pu être enregistrée. Réessayez.");
        }
      }
      void flowUndo.confirm(appointment.id, `${patient.name} : Attente`);
      await refresh();
      return appointment.id;
    },
    [appointments, currentUser?.id, flowUndo, refresh, vetId]
  );

  const appointmentById = useCallback(
    (id: string) => appointments.data.find((appointment) => appointment.id === id) ?? null,
    [appointments.data]
  );

  const vets = useMemo(() => {
    const booked = new Set(appointments.data.filter((a) => isSameLocalDay(a.startTime, now)).map((a) => a.vetId));
    return users.data
      .filter((user) => booked.has(user.id) || (user.status === "active" && user.role !== "assistant"))
      .map((user) => ({ id: user.id, name: user.displayName || user.email }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [appointments.data, now, users.data]);

  return {
    appointmentById,
    board,
    completeWithBilling: appointments.completeWithBilling,
    owners: patients.owners,
    patients: patients.data,
    refresh,
    walkIn,
    busyId,
    error: statesError ?? appointments.error ?? null,
    loading: appointments.loading,
    move,
    now,
    vets,
  };
}
