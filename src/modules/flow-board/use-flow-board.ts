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
import { boardMove, buildFlowBoard, isSameLocalDay, type BoardLane, type FlowCard } from "./model";

const REFRESH_MS = 30_000;
const OPEN_STATUSES = new Set(["arrived", "waiting", "in_progress"]);

/** Today's board, kept fresh, with the moves a click or a key can make. */
export function useFlowBoard(vetId: string) {
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
        vetId: vetId || undefined,
      }),
    [appointments.data, now, patients.owners, patients.data, states, users.data, vaccinations.data, vetId]
  );

  const move = useCallback(
    async (card: FlowCard, to: BoardLane) => {
      const outcome = boardMove(card.lane, to);
      if (!outcome) return;
      if ("refused" in outcome) {
        toast.info(outcome.refused);
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

  const vets = useMemo(() => {
    const booked = new Set(appointments.data.filter((a) => isSameLocalDay(a.startTime, now)).map((a) => a.vetId));
    return users.data
      .filter((user) => booked.has(user.id) || (user.status === "active" && user.role !== "assistant"))
      .map((user) => ({ id: user.id, name: user.displayName || user.email }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [appointments.data, now, users.data]);

  return {
    board,
    busyId,
    error: statesError ?? appointments.error ?? null,
    loading: appointments.loading,
    move,
    now,
    vets,
  };
}
