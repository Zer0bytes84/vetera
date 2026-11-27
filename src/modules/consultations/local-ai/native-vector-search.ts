import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/services/browser-store";

/**
 * Switch of the native semantic search (prototype, phase 2 of the foundations work). Off unless this workstation
 * sets it; the all-patients search then asks Rust for the cosines instead of reading every vector.
 */
export const NATIVE_VECTOR_SEARCH_KEY = "baitari:recherche-vecteurs-native";

export function nativeVectorSearchEnabled() {
  try {
    return (
      isTauriRuntime() &&
      globalThis.localStorage?.getItem(NATIVE_VECTOR_SEARCH_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export interface NativeVectorQuery {
  /** Passages that hold the literal terms of the question: their cosine is wanted whatever it is. */
  extraRows: number[];
  floor: number;
  modelKey: string;
  /** The question already divided by its norm, as rankAllPatientsPassages computes it. */
  unitQuery: number[];
}

export interface NativeVectorReply {
  cosines: number[];
  indexed: number;
  loaded: boolean;
  loadMs: number;
  /** rowids in `embeddings`; cosines[i] belongs to rows[i]. */
  rows: number[];
  searchMs: number;
}

/** Cosines of the passages above the floor, plus those of extraRows. Rejects when Rust cannot answer. */
export function searchVectorsNatively(query: NativeVectorQuery) {
  return invoke<NativeVectorReply>("recherche_vecteurs", { query });
}
