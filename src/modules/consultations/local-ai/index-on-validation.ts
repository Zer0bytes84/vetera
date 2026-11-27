import { isTauriRuntime } from "@/services/browser-store";

/** Starts the background catch-up of the index; the module is loaded only then. */
export function startIndexCoverageSoon() {
  void import("./index-coverage")
    .then(({ startIndexCoverage }) => startIndexCoverage())
    .catch((error: unknown) => {
      console.warn("[recherche] rattrapage de l’index indisponible :", error);
    });
}

/**
 * Asks for a just-validated note or document to be indexed now, in the background. The indexing module is loaded
 * only then, so the first screen does not carry it; if it cannot run now, the catch-up does it later.
 */
export function indexAfterValidation(source: {
  kind: "soap" | "note";
  id: string | null | undefined;
}) {
  const { id } = source;
  if (!(id && isTauriRuntime())) {
    return;
  }
  void import("./index-coverage")
    .then(({ indexValidatedSourceSoon }) =>
      indexValidatedSourceSoon({ kind: source.kind, id })
    )
    .catch((error: unknown) => {
      console.warn(
        "[recherche] indexation à la validation impossible :",
        error
      );
    });
}
