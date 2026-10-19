import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { emitSQLiteDataChanged } from "@/hooks/useSQLite";
import { isTauriRuntime } from "@/services/browser-store";
import { visitFlowService } from "./service";

const UNDO_SAFETY_MS = 400;

/**
 * After a status change made by a click: names who made it in the journal
 * and offers to take it back for 10 seconds. The journal itself is written
 * by the database, so a failure here never loses the transition.
 */
export function useFlowUndo() {
  const { currentUser } = useAuth();
  const actorId = currentUser?.id ?? null;

  const record = useCallback(
    async (appointmentId: string) => {
      if (!isTauriRuntime()) return;
      await visitFlowService.attribute(appointmentId, actorId).catch(() => undefined);
    },
    [actorId]
  );

  const confirm = useCallback(
    async (appointmentId: string, message: string) => {
      await record(appointmentId);
      const event = isTauriRuntime() ? await visitFlowService.undoable(appointmentId).catch(() => null) : null;
      if (!event) {
        toast.success(message);
        return;
      }
      // The toast pauses while hovered; the database window does not. Close
      // it a little before the window ends so "Annuler" never fails late.
      const visibleMs = Math.max(0, event.remainingMs - UNDO_SAFETY_MS);
      if (visibleMs < 1000) {
        toast.success(message);
        return;
      }
      const toastId = toast.success(message, {
        duration: visibleMs,
        action: {
          label: "Annuler",
          onClick: () => {
            visitFlowService.undo(event.id, actorId).then(
              () => {
                emitSQLiteDataChanged("appointments");
                toast.success("Déplacement annulé.");
              },
              (error: unknown) => {
                toast.error(error instanceof Error ? error.message : "Le déplacement n'a pas pu être annulé.");
              }
            );
          },
        },
      });
      window.setTimeout(() => toast.dismiss(toastId), visibleMs);
    },
    [actorId, record]
  );

  return { confirm, record };
}
