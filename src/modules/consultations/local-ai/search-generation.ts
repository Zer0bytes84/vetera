import type { SearchGeneration } from "./passage-search";

// Passage index active since phase A1 (validated 23/10/2026). The section
// index is still kept current: rollback = setActiveSearchGeneration("sections").
export const DEFAULT_SEARCH_GENERATION: SearchGeneration = "passages";
const STORAGE_KEY = "baitari.search.generation";

export function getActiveSearchGeneration(): SearchGeneration {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === "sections" || stored === "passages" || stored === "passages2" || stored === "passages3") return stored;
  } catch {
    /* Storage unavailable: keep the default. */
  }
  return DEFAULT_SEARCH_GENERATION;
}

export function setActiveSearchGeneration(generation: SearchGeneration) {
  globalThis.localStorage?.setItem(STORAGE_KEY, generation);
}
