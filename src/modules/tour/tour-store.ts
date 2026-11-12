import { useSyncExternalStore } from "react";
import {
  FRESH_TOUR_STATE,
  parseTourState,
  serializeTourState,
  TOUR_STORAGE_KEY,
  UNREADABLE_TOUR_STATE,
  type TourState,
} from "./tour-state";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Le magasin du tour : l'état courant, sa persistance par poste, et deux drapeaux qui ne se gardent jamais.
 *
 * - `writable` : le stockage accepte-t-il une écriture ? Sinon l'invitation ne s'affiche pas (on ne saurait pas se souvenir
 *   qu'elle a été montrée, elle reviendrait à chaque lancement : même règle que « Quoi de neuf »).
 * - `shownThisSession` : l'invitation montrée au premier lancement reste sur le tableau de bord jusqu'à ce qu'on la ferme,
 *   mais ne revient pas au lancement suivant. Ce drapeau est volontairement en mémoire seulement.
 * - `justFinished` : la carte de fin, montrée une fois juste après la dernière étape.
 */
export interface TourStore {
  get(): TourState;
  subscribe(listener: () => void): () => void;
  /** Applique une transition, la garde, prévient les abonnés. Une transition sans effet n'écrit rien. */
  update(transition: (state: TourState) => TourState): void;
  isWritable(): boolean;
  markInvitationShown(): void;
  invitationShownThisSession(): boolean;
  markFinished(finished: boolean): void;
  justFinished(): boolean;
  /** Relit le stockage (une autre fenêtre de l'application a pu le changer). */
  reload(): void;
}

function readFrom(storage: Storage | null): { state: TourState; writable: boolean } {
  if (!storage) return { state: UNREADABLE_TOUR_STATE, writable: false };
  let raw: string | null;
  try {
    raw = storage.getItem(TOUR_STORAGE_KEY);
  } catch {
    return { state: UNREADABLE_TOUR_STATE, writable: false };
  }
  let writable = true;
  try {
    const probe = `${TOUR_STORAGE_KEY}-probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    writable = false;
  }
  return { state: parseTourState(raw), writable };
}

export function createTourStore(storage: Storage | null): TourStore {
  const initial = readFrom(storage);
  let state = initial.state;
  let writable = initial.writable;
  let shownThisSession = false;
  let finished = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(transition) {
      const next = transition(state);
      if (next === state) return;
      state = next;
      try {
        storage?.setItem(TOUR_STORAGE_KEY, serializeTourState(next));
      } catch {
        writable = false;
      }
      notify();
    },
    isWritable: () => writable,
    markInvitationShown() {
      shownThisSession = true;
    },
    invitationShownThisSession: () => shownThisSession,
    markFinished(value) {
      if (finished === value) return;
      finished = value;
      notify();
    },
    justFinished: () => finished,
    reload() {
      const reread = readFrom(storage);
      state = reread.state;
      writable = reread.writable;
      notify();
    },
  };
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const tourStore: TourStore = createTourStore(browserStorage());

if (typeof window !== "undefined") {
  // Un autre poste de travail de la même machine (une seconde fenêtre) change le tour : on suit, sans le relancer.
  window.addEventListener("storage", (event) => {
    if (event.key === TOUR_STORAGE_KEY) tourStore.reload();
  });
}

export function useTourState(store: TourStore = tourStore): TourState {
  return useSyncExternalStore(store.subscribe, store.get, () => FRESH_TOUR_STATE);
}

/** Vrai tant que la carte de fin doit s'afficher. */
export function useTourFinished(store: TourStore = tourStore): boolean {
  return useSyncExternalStore(store.subscribe, store.justFinished, () => false);
}
