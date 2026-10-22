let reserved = false;
// A model kept loaded between tasks holds no lease, but its memory must be
// freed before any other local model starts.
let idleEvictor: (() => void) | null = null;
export function isClinicalModelReserved() {
  return reserved;
}
export function reserveClinicalModel() {
  if (reserved)
    throw new Error(
      "Une tâche locale est déjà en cours. Attendez sa fin ou annulez-la."
    );
  if (idleEvictor) {
    const evict = idleEvictor;
    idleEvictor = null;
    evict();
  }
  reserved = true;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      reserved = false;
    }
  };
}
/** Registers the idle model to evict on the next reservation; returns an unregister. */
export function parkIdleModel(evict: () => void) {
  idleEvictor?.();
  idleEvictor = evict;
  return () => {
    if (idleEvictor === evict) idleEvictor = null;
  };
}
export function assertChatModelAvailable() {
  if (reserved)
    throw new Error(
      "Le modèle est réservé à une tâche locale. Terminez ou annulez cette tâche avant d’ouvrir un autre modèle."
    );
}
