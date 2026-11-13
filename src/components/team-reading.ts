import type { User } from "@/types/db";

/**
 * La lecture de l'équipe pour la bande des chiffres clés, avec les règles que la page appliquait déjà : un membre actif a
 * le statut « active » ; un praticien est vétérinaire principal ou adjoint ; un soignant est assistant ou stagiaire ; un
 * accès est en attente quand le compte n'est pas actif. Chaque ligne est courte et vraie, jamais un slogan.
 */
export interface TeamReading {
  total: number;
  active: number;
  vets: number;
  principals: number;
  adjoints: number;
  support: number;
  assistants: number;
  trainees: number;
  pending: number;
  /** La ligne d'état sous le titre de la bande, sans le jour et l'heure. */
  state: string;
  lines: { active: string; vets: string; support: string; access: string };
}

const n = (count: number, one: string, many = `${one}s`) => `${count} ${count > 1 ? many : one}`;

export function readTeam(users: Pick<User, "role" | "status">[]): TeamReading {
  const count = (test: (user: Pick<User, "role" | "status">) => boolean) => users.filter(test).length;
  const total = users.length;
  const active = count((user) => user.status === "active");
  const principals = count((user) => user.role === "vet_principal");
  const adjoints = count((user) => user.role === "vet_adjoint");
  const assistants = count((user) => user.role === "assistant");
  const trainees = count((user) => user.role === "stagiaire");
  const vets = principals + adjoints;
  const support = assistants + trainees;
  const pending = total - active;
  const others = total - vets - support;

  const staffing = total === 0 ? "aucun membre" : pending === 0 ? "effectif complet" : `${active} sur ${total} en poste`;
  const roles = `${n(vets, "praticien")}, ${n(support, "soignant")}`;
  const access = pending === 0 ? "accès à jour" : n(pending, "accès en attente", "accès en attente");

  return {
    total,
    active,
    vets,
    principals,
    adjoints,
    support,
    assistants,
    trainees,
    pending,
    state: `${staffing} · ${roles} · ${access}`,
    lines: {
      active:
        total === 0
          ? "Aucun membre enregistré"
          : `${n(vets, "praticien")} · ${n(support, "soignant")}${others ? ` · ${n(others, "autre rôle", "autres rôles")}` : ""}`,
      vets: vets === 0 ? "Aucun vétérinaire" : `${principals} principal · ${n(adjoints, "adjoint")}`,
      support: support === 0 ? "Aucun assistant ni stagiaire" : `${n(assistants, "assistant")} · ${n(trainees, "stagiaire")}`,
      access: pending === 0 ? "Tous les comptes sont actifs" : n(pending, "compte inactif", "comptes inactifs"),
    },
  };
}
