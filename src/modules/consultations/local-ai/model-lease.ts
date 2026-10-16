let reserved = false;
export function isClinicalModelReserved() {
  return reserved;
}
export function reserveClinicalModel() {
  if (reserved)
    throw new Error(
      "Une tâche locale est déjà en cours. Attendez sa fin ou annulez-la."
    );
  reserved = true;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      reserved = false;
    }
  };
}
export function assertChatModelAvailable() {
  if (reserved)
    throw new Error(
      "Le modèle est réservé à une tâche locale. Terminez ou annulez cette tâche avant d’ouvrir un autre modèle."
    );
}
