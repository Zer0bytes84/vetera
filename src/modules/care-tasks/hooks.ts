import type { CareTask } from "./domain";
export interface CareCompletedEvent {
  taskId: string;
  patientId: string;
  act: string;
  scheduledAt: string;
  completedAt: string;
  executorId: string;
  productId: string | null;
}
type CompletionHook = (task: Readonly<CareTask>) => void | Promise<void>;
let completionHook: CompletionHook = () => undefined;
/** Reserved for B4. No stock write occurs in V1. Returns an unsubscribe function. */
export function registerCareCompletionHook(hook: CompletionHook) {
  const previous = completionHook;
  completionHook = hook;
  return () => {
    if (completionHook === hook) completionHook = previous;
  };
}
export async function onCareTaskCompleted(task: CareTask): Promise<void> {
  await completionHook(Object.freeze({ ...task }));
}
const listeners = new Set<
  (event: CareCompletedEvent) => void | Promise<void>
>();
export function subscribeCareTaskCompleted(
  listener: (event: CareCompletedEvent) => void | Promise<void>,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
/** Called only after commit. Integration failures never undo a saved care task. */
export async function notifyCareTaskCompleted(task: CareTask) {
  const event: CareCompletedEvent = {
    taskId: task.id,
    patientId: task.patient_id,
    act: task.label,
    scheduledAt: task.heure_prevue,
    completedAt: task.completed_at!,
    executorId: task.execute_par!,
    productId: task.produit_id,
  };
  try {
    await onCareTaskCompleted(task);
  } catch (error) {
    console.error("[Care] Completion hook failed after commit", error);
  }
  for (const listener of listeners) {
    try {
      await listener(Object.freeze({ ...event }));
    } catch (error) {
      console.error("[Care] Completion event listener failed", error);
    }
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("careTaskCompleted", { detail: event }),
    );
}
