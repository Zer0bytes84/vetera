import { useEffect, useRef } from "react";

import { useAppointmentsRepository } from "@/data/repositories";
import { PRE_CONSULTATION_STATUSES } from "@/domain/clinical/scheduling";
import { useFlowUndo } from "@/modules/visit-flow/use-flow-undo";
import type { View } from "@/types";
import type { Appointment } from "@/types/db";

/**
 * Flux is the one place where a visit moves on. Other screens only ask it
 * to show a visit (its consultation when one is under way) or, for a
 * consultation started on purpose, to start it.
 */
const SHOW_KEY = "vetera:flux-show";
const START_KEY = "vetera:pending-consultation-start";
const REQUEST_EVENT = "vetera:flux-request";

function request(key: string, appointmentId: string, navigate: (view: View) => void) {
  window.sessionStorage.setItem(key, appointmentId);
  navigate("flux");
  window.dispatchEvent(new Event(REQUEST_EVENT));
}

/** Shows the visit in Flux, without changing its status. */
export function showInFlux(appointmentId: string, navigate: (view: View) => void) {
  request(SHOW_KEY, appointmentId, navigate);
}

/** Starts the consultation in Flux (Nouvelle consultation). */
export function startInFlux(appointmentId: string, navigate: (view: View) => void) {
  request(START_KEY, appointmentId, navigate);
}

/**
 * Serves the requests above once the visit is loaded: a consultation under
 * way opens, a start request moves the visit into consultation first, any
 * other visit is selected on the board.
 */
export function useFluxRequests({
  appointmentById,
  focus,
  open,
}: {
  appointmentById: (id: string) => Appointment | null;
  focus: (appointmentId: string) => void;
  open: (appointment: Appointment) => void;
}) {
  const { transitionStatus } = useAppointmentsRepository();
  const flowUndo = useFlowUndo();
  const latest = useRef({ appointmentById, focus, flowUndo, open, transitionStatus });
  useEffect(() => {
    latest.current = { appointmentById, focus, flowUndo, open, transitionStatus };
  });

  useEffect(() => {
    const serve = () => {
      const { appointmentById, focus, flowUndo, open, transitionStatus } = latest.current;
      for (const key of [START_KEY, SHOW_KEY]) {
        const id = window.sessionStorage.getItem(key);
        const target = id ? appointmentById(id) : null;
        if (!target) continue;
        window.sessionStorage.removeItem(key);
        if (target.status === "in_progress") open(target);
        else if (key === START_KEY && PRE_CONSULTATION_STATUSES.includes(target.status)) {
          transitionStatus(target.id, "in_progress")
            .then((started) => {
              void flowUndo.record(target.id);
              open(started);
            })
            .catch((error) => console.error("La consultation n'a pas pu démarrer depuis Flux", error));
        } else focus(target.id);
      }
    };
    serve();
    window.addEventListener(REQUEST_EVENT, serve);
    return () => window.removeEventListener(REQUEST_EVENT, serve);
  }, [appointmentById]);
}
