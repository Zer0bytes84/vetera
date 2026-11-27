/**
 * What the assistant shows about the semantic index: how many patients have every validated source indexed, the
 * patients whose indexing failed (with the error), and the last semantic search that fell back to words only.
 * Kept apart from index-coverage.ts so embedding-store.ts can record failures without importing the catch-up.
 */
export interface IndexingFailure {
  message: string;
  patientId: string;
  patientName: string;
}
export interface IndexCoverage {
  /** Patients the current or last pass has looked at, among `patientCount`. */
  checkedPatients: number;
  failures: IndexingFailure[];
  /** Patients whose validated notes and documents all have their passages, among `totalPatients`. */
  indexedPatients: number;
  /** The last semantic search that failed and answered with words only, or null. */
  lastSearchIssue: string | null;
  patientCount: number;
  /** Validated sources still without their passages. */
  pendingSources: number;
  /**
   * unavailable: no embedding model on this computer; remote: a secondary workstation (the main one indexes);
   * paused: another local task took the model, the catch-up resumes on its own.
   */
  status:
    | "unknown"
    | "unavailable"
    | "remote"
    | "idle"
    | "running"
    | "paused"
    | "complete";
  /** Patients that have at least one validated note or document. */
  totalPatients: number;
}

const INITIAL: IndexCoverage = {
  status: "unknown",
  checkedPatients: 0,
  patientCount: 0,
  indexedPatients: 0,
  totalPatients: 0,
  pendingSources: 0,
  failures: [],
  lastSearchIssue: null,
};
let state = INITIAL;
const listeners = new Set<() => void>();

export function getIndexCoverage() {
  return state;
}
export function subscribeIndexCoverage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function updateIndexCoverage(patch: Partial<IndexCoverage>) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
}
/** Records the patients that failed, and forgets earlier failures of the patients that succeeded since. */
export function recordIndexingOutcome(
  failures: IndexingFailure[],
  succeeded: string[] = []
) {
  const cleared = new Set([
    ...succeeded,
    ...failures.map(({ patientId }) => patientId),
  ]);
  updateIndexCoverage({
    failures: [
      ...state.failures.filter(({ patientId }) => !cleared.has(patientId)),
      ...failures,
    ],
  });
}
export function recordSearchIssue(message: string | null) {
  if (message) {
    console.error("[recherche] repli sur les mots :", message);
  }
  updateIndexCoverage({ lastSearchIssue: message });
}
/** Tests only. */
export function resetIndexCoverage() {
  state = INITIAL;
}
