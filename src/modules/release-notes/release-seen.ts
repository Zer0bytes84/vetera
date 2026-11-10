import { releaseNoteFor, type ReleaseNote } from "./release-notes";

/** Le marqueur local : la dernière version de l'application que cette personne a ouverte. */
export const LAST_SEEN_VERSION_KEY = "baitari:last-seen-version";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readLastSeenVersion(storage: KeyValueStorage | null = browserStorage()): string | null {
  try {
    return storage?.getItem(LAST_SEEN_VERSION_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Retient la version ; `false` si le stockage refuse (alors on n'affiche rien : on ne saurait pas s'en souvenir). */
export function markVersionSeen(version: string, storage: KeyValueStorage | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(LAST_SEEN_VERSION_KEY, version);
    return storage.getItem(LAST_SEEN_VERSION_KEY) === version;
  } catch {
    return false;
  }
}

/**
 * La note à montrer au lancement, ou `null`.
 *
 * - Aucun marqueur : une installation d'avant cette fonction, donc une mise à jour. Une installation neuve, elle, pose le
 *   marqueur à la fin de l'assistant de configuration (voir `App.tsx`) et ne passe jamais ici sans lui.
 * - Marqueur égal à la version courante : déjà vue (ou installation neuve), rien.
 * - Pas de note publiée pour la version courante : rien à dire.
 */
export function releaseNoteToShow(
  currentVersion: string,
  lastSeenVersion: string | null,
  notes?: readonly ReleaseNote[],
): ReleaseNote | null {
  if (lastSeenVersion === currentVersion) return null;
  return releaseNoteFor(currentVersion, notes);
}
