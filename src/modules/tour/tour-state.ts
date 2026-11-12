/**
 * Le tour guidé : l'état, rien d'autre. Pur et sans React, pour que chaque transition se teste seule.
 *
 * L'état se garde par poste (un seul enregistrement dans le stockage local, comme le ton de la barre latérale) :
 * l'invitation, le statut du tour, l'étape en cours et les deux repères que l'utilisateur a créés (le patient, le rendez-vous).
 * Le tour ne crée aucune donnée : il ne retient que l'heure de départ et les identifiants que l'utilisateur a produits.
 */

export const TOUR_STORAGE_KEY = "baitari-guided-tour-v1";

/** Les quatre étapes, dans l'ordre du circuit du premier patient. */
export const TOUR_STEP_IDS = ["patient", "appointment", "consultation", "invoice"] as const;
export type TourStepId = (typeof TOUR_STEP_IDS)[number];

/** `unseen` : jamais montrée. `shown` : montrée au premier lancement. `closed` : fermée ou tour commencé, jamais plus montrée. */
type TourInvitation = "unseen" | "shown" | "closed";
/** `idle` : pas de tour en cours. `done` : terminé. `quit` : quitté en route. */
type TourStatus = "idle" | "running" | "done" | "quit";

export interface TourState {
  invitation: TourInvitation;
  status: TourStatus;
  /** Index de l'étape en cours dans TOUR_STEP_IDS, tant que le tour tourne. */
  step: number;
  /** ISO. Seules les données créées après cet instant comptent pour une étape. */
  startedAt: string | null;
  patientId: string | null;
  appointmentId: string | null;
}

export const FRESH_TOUR_STATE: TourState = {
  invitation: "unseen",
  status: "idle",
  step: 0,
  startedAt: null,
  patientId: null,
  appointmentId: null,
};

/** Un enregistrement illisible ne doit jamais faire revenir l'invitation : on ne relance pas quelqu'un par accident. */
export const UNREADABLE_TOUR_STATE: TourState = { ...FRESH_TOUR_STATE, invitation: "closed" };

const INVITATIONS: readonly TourInvitation[] = ["unseen", "shown", "closed"];
const STATUSES: readonly TourStatus[] = ["idle", "running", "done", "quit"];

const asId = (value: unknown): string | null => (typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null);

function asInstant(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

/**
 * Lit un enregistrement sans jamais lever. Absent : installation sans historique, l'invitation sera montrée. Illisible
 * ou de forme inattendue : on retient « fermée » (voir UNREADABLE_TOUR_STATE). Chaque champ est validé seul : une valeur
 * inconnue retombe sur le défaut, sans perdre les autres.
 */
export function parseTourState(raw: string | null): TourState {
  if (raw === null) return FRESH_TOUR_STATE;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return UNREADABLE_TOUR_STATE;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return UNREADABLE_TOUR_STATE;
  const record = value as Record<string, unknown>;
  const invitation = INVITATIONS.includes(record.invitation as TourInvitation) ? (record.invitation as TourInvitation) : "closed";
  const statusValid = record.status === undefined || STATUSES.includes(record.status as TourStatus);
  let status = STATUSES.includes(record.status as TourStatus) ? (record.status as TourStatus) : "idle";
  const step = Number.isInteger(record.step) ? Math.min(Math.max(record.step as number, 0), TOUR_STEP_IDS.length - 1) : 0;
  const startedAt = asInstant(record.startedAt);
  // Un tour « en cours » sans heure de départ ne peut rien reconnaître : on le tient pour quitté plutôt que de le laisser bloqué.
  if (status === "running" && !startedAt) status = "quit";
  return {
    // Un champ invalide est un signe de corruption : on ne rouvre jamais l'invitation sur un enregistrement douteux.
    invitation: status === "idle" && statusValid ? invitation : "closed",
    status,
    step,
    startedAt,
    patientId: asId(record.patientId),
    appointmentId: asId(record.appointmentId),
  };
}

export function serializeTourState(state: TourState): string {
  return JSON.stringify(state);
}

/** Première fois : l'invitation est montrée, et ne le sera plus au lancement suivant. */
export function showInvitation(state: TourState): TourState {
  return state.invitation === "unseen" && state.status === "idle" ? { ...state, invitation: "shown" } : state;
}

/** Fermer la carte : pour de bon, sans rien bloquer. */
export function closeInvitation(state: TourState): TourState {
  return state.invitation === "closed" ? state : { ...state, invitation: "closed" };
}

/** Démarre, ou refait depuis le début : l'étape 1, l'heure de départ, aucun repère hérité d'un tour précédent. */
export function startTour(_state: TourState, now: Date): TourState {
  return { invitation: "closed", status: "running", step: 0, startedAt: now.toISOString(), patientId: null, appointmentId: null };
}

/** L'étape en cours est faite (ou passée) : la suivante s'ouvre, ou le tour se termine. */
export function advanceTour(state: TourState, found: { patientId?: string | null; appointmentId?: string | null } = {}): TourState {
  if (state.status !== "running") return state;
  const next: TourState = {
    ...state,
    patientId: found.patientId ?? state.patientId,
    appointmentId: found.appointmentId ?? state.appointmentId,
    step: state.step + 1,
  };
  return next.step >= TOUR_STEP_IDS.length ? { ...next, step: TOUR_STEP_IDS.length - 1, status: "done" } : next;
}

export function quitTour(state: TourState): TourState {
  return state.status === "running" ? { ...state, status: "quit" } : state;
}

/**
 * La carte d'invitation est-elle visible maintenant ? Seulement si aucun tour n'a eu lieu, qu'elle n'a pas été fermée, que
 * le stockage saura se souvenir qu'elle a été montrée, et : soit c'est la première fois, soit elle a déjà été montrée
 * pendant CETTE session (elle ne revient donc pas au lancement suivant).
 */
export function invitationVisible(state: TourState, context: { writable: boolean; shownThisSession: boolean }): boolean {
  if (!context.writable || state.status !== "idle" || state.invitation === "closed") return false;
  return state.invitation === "unseen" || context.shownThisSession;
}
