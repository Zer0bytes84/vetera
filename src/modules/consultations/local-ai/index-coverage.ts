import { isTauriRuntime } from "@/services/browser-store";
import { runDbRead, runDbTransaction } from "@/services/sqlite/database";
import { readNetworkLaunchMode } from "@/services/sqlite/remote-database";
import {
  indexPatientDocuments,
  indexValidatedNote,
  indexValidatedSoap,
  readPatientBacklog,
} from "./embedding-store";
import {
  getIndexCoverage,
  type IndexingFailure,
  recordIndexingOutcome,
  updateIndexCoverage,
} from "./index-coverage-state";
import { syncSoapLexicalIndex } from "./lexical-index";
import { isClinicalModelReserved } from "./model-lease";
import { getLocalModels } from "./models";

/**
 * Background catch-up of the semantic index: patient by patient, every validated note and document gets its passages,
 * without waiting for a search. It holds the model lease preemptibly: dictation, a search or any other local task takes
 * the model at once (the patient in progress is abandoned), and the catch-up resumes later on its own.
 */
export const CATCH_UP_DELAY_MS = 20_000;
export const CATCH_UP_RETRY_MS = 30_000;
const PAUSE_BETWEEN_PATIENTS_MS = 200;

let timer: ReturnType<typeof setTimeout> | null = null;
let pass: Promise<void> | null = null;
let current: AbortController | null = null;
let started = false;

const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";
const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export function scheduleIndexCatchUp(delayMs = CATCH_UP_DELAY_MS) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    void runIndexCatchUp();
  }, delayMs);
}
/** Stops the patient in progress; the catch-up resumes after `CATCH_UP_RETRY_MS`. */
export function interruptIndexCatchUp() {
  current?.abort();
  scheduleIndexCatchUp(CATCH_UP_RETRY_MS);
}

/** One pass over every patient; a second call during a pass returns the same pass. */
export function runIndexCatchUp(): Promise<void> {
  pass ??= catchUpPass().finally(() => {
    pass = null;
    current = null;
  });
  return pass;
}

async function catchUpPass() {
  // The bar's SOAP word index is filled here too, so the first search after an update does not pay for it.
  await runDbTransaction((db) => syncSoapLexicalIndex(db)).catch(() => false);
  const models = await getLocalModels();
  if (!models.embeddingReady) {
    updateIndexCoverage({ status: "unavailable" });
    return;
  }
  const patients = await runDbRead((db) =>
    db.select<Array<{ id: string; name: string }>>(
      "SELECT id,name FROM patients ORDER BY id"
    )
  );
  const controller = new AbortController();
  current = controller;
  let interrupted = false;
  const onPreempt = () => {
    interrupted = true;
    controller.abort();
  };
  let indexed = 0;
  let total = 0;
  let pending = 0;
  const failures: IndexingFailure[] = [];
  const succeeded: string[] = [];
  updateIndexCoverage({
    status: "running",
    checkedPatients: 0,
    patientCount: patients.length,
  });
  for (const [position, patient] of patients.entries()) {
    // Another local task holds the model (dictation, a search): wait for it instead of failing.
    if (controller.signal.aborted || isClinicalModelReserved()) {
      interrupted = true;
      break;
    }
    const progress = { counted: false, staleSources: 0 };
    const failure = await catchUpPatient(
      patient.id,
      models,
      controller.signal,
      onPreempt,
      progress
    ).then(
      () => null,
      (error: unknown) => error ?? new Error("Erreur")
    );
    if (failure && (controller.signal.aborted || isAbort(failure))) {
      interrupted = true;
      break;
    }
    total += Number(progress.counted);
    if (failure) {
      pending += progress.staleSources;
      failures.push({
        patientId: patient.id,
        patientName: patient.name,
        message: failure instanceof Error ? failure.message : String(failure),
      });
    } else {
      indexed += Number(progress.counted);
      succeeded.push(patient.id);
    }
    updateIndexCoverage({
      checkedPatients: position + 1,
      indexedPatients: indexed,
      totalPatients: total,
    });
    await wait(PAUSE_BETWEEN_PATIENTS_MS);
  }
  recordIndexingOutcome(failures, succeeded);
  if (interrupted) {
    updateIndexCoverage({ status: "paused", pendingSources: pending });
    scheduleIndexCatchUp(CATCH_UP_RETRY_MS);
    return;
  }
  updateIndexCoverage({
    status: getIndexCoverage().failures.length ? "idle" : "complete",
    indexedPatients: indexed,
    totalPatients: total,
    pendingSources: pending,
  });
}

/** One patient of the pass: reads what is missing, indexes it; `progress` says what it found even when it fails. */
async function catchUpPatient(
  patientId: string,
  models: Awaited<ReturnType<typeof getLocalModels>>,
  signal: AbortSignal,
  onPreempt: () => void,
  progress: { counted: boolean; staleSources: number }
) {
  const backlog = await runDbRead((db) =>
    readPatientBacklog(db, patientId, models)
  );
  progress.staleSources = backlog.staleSources;
  progress.counted = backlog.sources > 0;
  if (backlog.stale.length) {
    await indexPatientDocuments(
      patientId,
      signal,
      () => {
        // Indexation en arrière-plan : seul le compteur est affiché.
      },
      { onPreempt }
    );
  }
}

/** Indexes a note the vet has just validated; if the model is busy, the catch-up does it a little later. */
export function indexValidatedSourceSoon(source: {
  kind: "soap" | "note";
  id: string;
}) {
  const controller = new AbortController();
  const job =
    source.kind === "soap"
      ? indexValidatedSoap(source.id, controller.signal, {
          onPreempt: () => controller.abort(),
        })
      : indexValidatedNote(source.id, controller.signal, {
          onPreempt: () => controller.abort(),
        });
  return job
    .catch((error: unknown) => {
      if (!isAbort(error)) {
        console.warn("[recherche] indexation différée :", error);
      }
      return 0;
    })
    .finally(() => {
      // Refreshes the counter (and catches up what could not be done now).
      scheduleIndexCatchUp(5000);
    });
}

/** Starts the catch-up once per launch, on the main or a standalone workstation, a little after startup. */
export async function startIndexCoverage() {
  if (started || !isTauriRuntime()) {
    return;
  }
  started = true;
  if ((await readNetworkLaunchMode()) === "client") {
    updateIndexCoverage({ status: "remote" });
    return;
  }
  scheduleIndexCatchUp(CATCH_UP_DELAY_MS);
}
/** Tests only. */
export function resetIndexCatchUp() {
  if (timer) {
    clearTimeout(timer);
  }
  timer = null;
  current?.abort();
  current = null;
  pass = null;
  started = false;
}
