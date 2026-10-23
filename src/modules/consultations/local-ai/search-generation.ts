import type { SearchGeneration } from "./passage-search";

// The passage index is built in parallel; search switches to it only after
// the draft questions have been reviewed. Rollback = back to "sections".
export const DEFAULT_SEARCH_GENERATION: SearchGeneration = "sections";
const STORAGE_KEY = "baitari.search.generation";

export function getActiveSearchGeneration(): SearchGeneration {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === "sections" || stored === "passages") return stored;
  } catch {
    /* Storage unavailable: keep the default. */
  }
  return DEFAULT_SEARCH_GENERATION;
}

export function setActiveSearchGeneration(generation: SearchGeneration) {
  globalThis.localStorage?.setItem(STORAGE_KEY, generation);
}
