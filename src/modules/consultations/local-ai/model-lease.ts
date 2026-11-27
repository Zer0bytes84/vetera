let reserved = false;
// A model kept loaded between tasks holds no lease, but its memory must be
// freed before any other local model starts.
let idleEvictor: (() => void) | null = null;
// A background task (the index catch-up) holds the lease preemptibly: any other reservation stops it first.
let preemptHolder: (() => void) | null = null;
export function isClinicalModelReserved() {
  return reserved;
}
/**
 * Takes the only lease on the local models. With `onPreempt`, the holder is a background task: the next reservation
 * calls it (it must give the lease back synchronously, by aborting its session) instead of failing.
 */
export function reserveClinicalModel(onPreempt?: () => void) {
  if (reserved && preemptHolder) {
    const preempt = preemptHolder;
    preemptHolder = null;
    preempt();
  }
  if (reserved) {
    throw new Error(
      "Une tâche locale est déjà en cours. Attendez sa fin ou annulez-la."
    );
  }
  if (idleEvictor) {
    const evict = idleEvictor;
    idleEvictor = null;
    evict();
  }
  reserved = true;
  preemptHolder = onPreempt ?? null;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      reserved = false;
      preemptHolder = null;
    }
  };
}
/** Registers the idle model to evict on the next reservation; returns an unregister. */
export function parkIdleModel(evict: () => void) {
  idleEvictor?.();
  idleEvictor = evict;
  return () => {
    if (idleEvictor === evict) {
      idleEvictor = null;
    }
  };
}
export function assertChatModelAvailable() {
  if (reserved) {
    throw new Error(
      "Le modèle est réservé à une tâche locale. Terminez ou annulez cette tâche avant d’ouvrir un autre modèle."
    );
  }
}
