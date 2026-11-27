import type {
  DocumentAttachment,
  PatientDocument,
} from "@/modules/documents/document-domain";
import {
  generateId,
  runDbRead,
  runDbTransaction,
} from "@/services/sqlite/database";
import type { ConsultationSoap, Note } from "@/types/db";
import {
  assertSearchScope,
  consultationSearchChunks,
  type DocumentType,
  documentSearchChunks,
  embeddingBytesFromHex,
  embeddingFromHex,
  embeddingToHex,
  MIN_SEARCH_SCORE,
  managedDocumentSearchChunks,
  normalizedEmbedding,
  passageCosine,
  patientSearchChunks,
  productSearchChunks,
  rankPatientChunks,
  type SearchChunk,
  type SearchScope,
  type SearchSection,
  type SourceType,
  soapSearchChunks,
} from "./embedding-index";
import {
  type IndexingFailure,
  recordIndexingOutcome,
  recordSearchIssue,
} from "./index-coverage-state";
import { LocalInferenceSession } from "./inference-client";
import { syncLexicalIndex, syncSoapLexicalIndex } from "./lexical-index";
import {
  getLocalModels,
  getLocalModelUrls,
  type LocalModelStatus,
} from "./models";
import {
  type NativeVectorQuery,
  type NativeVectorReply,
  nativeVectorSearchEnabled,
  searchVectorsNatively,
} from "./native-vector-search";
import {
  bestPassage,
  GENERATION_MODEL,
  indexedGenerations,
  MODEL_CALIBRATION,
  mergeLexicalFirst,
  passageChunks,
  rankPassages,
  SEARCH_INDEX_KEYS,
  type SearchGeneration,
} from "./passage-search";
import { getActiveSearchGeneration } from "./search-generation";
import { isSoapReviewed, soapMetadata } from "./soap-review";
import { SOAP_SECTIONS } from "./soap-schema";
import {
  exactTermsExpression,
  lexicalMatchExpression,
  matchesExactSearchTerms,
  matchesSearchTerms,
} from "./veterinary-lexicon";
import type { LocalAiProgress, SearchModel } from "./worker-protocol";

/** Rows of the given index generation for one source. */
const forGeneration = (chunks: SearchChunk[], generation: SearchGeneration) =>
  generation === "sections" ? chunks : passageChunks(chunks);
/** The active index, falling back to the v1 passages while the v2 model is not installed. */
const effectiveGeneration = (models: LocalModelStatus): SearchGeneration => {
  const active = getActiveSearchGeneration();
  if (active === "passages2" && !models.embedding2Ready) {
    return "passages";
  }
  if (active === "passages3" && !models.arcticReady) {
    return "passages";
  }
  return active;
};
export interface SearchDatabase {
  execute(query: string, values?: unknown[]): Promise<unknown>;
  select<T>(query: string, values?: unknown[]): Promise<T>;
}
const SOAP_COLUMNS =
  "id,patient_id AS patientId,subjective,objective,assessment,plan,content,ai_draft AS aiDraft";
const NOTE_COLUMNS = "id,patient_id AS patientId,content,tags";

/** Read current final documents only; no embeddings, remote lookup or write occurs here. */
async function managedPatientChunks(
  db: SearchDatabase,
  patientId?: string
): Promise<SearchChunk[]> {
  const rows = await db.select<
    Array<
      Pick<
        PatientDocument,
        | "id"
        | "patientId"
        | "patientName"
        | "title"
        | "content"
        | "kind"
        | "status"
        | "updatedAt"
      > & { attachmentJson: string | null }
    >
  >(
    "SELECT d.id,d.patient_id AS patientId,p.name AS patientName,d.type_document AS kind,d.titre AS title,d.contenu_genere AS content,d.statut AS status,d.updated_at AS updatedAt,d.attachment_json AS attachmentJson FROM documents d JOIN patients p ON p.id=d.patient_id WHERE d.statut='finalise'" +
      (patientId ? " AND d.patient_id=?" : ""),
    patientId ? [patientId] : []
  );
  return rows.flatMap((row) => {
    try {
      const attachment: DocumentAttachment | null = row.attachmentJson
        ? JSON.parse(row.attachmentJson)
        : null;
      return managedDocumentSearchChunks({ ...row, attachment });
    } catch {
      return [];
    }
  });
}
export async function persistSearchChunks(
  db: SearchDatabase,
  chunks: SearchChunk[],
  vectors: number[][],
  generation: SearchGeneration = "sections"
) {
  if (!chunks.length) {
    return;
  }
  if (chunks.length !== vectors.length) {
    throw new Error("La préparation des extraits est incomplète.");
  }
  const first = chunks[0];
  if (
    chunks.some(
      (chunk) =>
        chunk.patientId !== first.patientId ||
        chunk.sourceType !== first.sourceType ||
        chunk.sourceId !== first.sourceId ||
        chunk.sourceKey !== first.sourceKey ||
        chunk.documentType !== first.documentType
    )
  ) {
    throw new Error(
      "Un lot doit appartenir à un seul document et un seul patient."
    );
  }
  let actual: SearchChunk[];
  if (first.sourceType === "soap") {
    const rows = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE id=? AND patient_id=?`,
      [first.sourceId, first.patientId]
    );
    if (!rows[0]) {
      throw new Error("La note n’appartient pas à ce patient.");
    }
    actual = forGeneration(soapSearchChunks(rows[0]), generation);
  } else {
    const rows = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE id=? AND patient_id=?`,
      [first.sourceId, first.patientId]
    );
    if (!rows[0]) {
      throw new Error("Le document n’appartient pas à ce patient.");
    }
    actual = forGeneration(
      documentSearchChunks(
        rows[0],
        plainDocumentText(rows[0].content),
        first.documentType as Exclude<DocumentType, "consultation">
      ),
      generation
    );
  }
  if (JSON.stringify(actual) !== JSON.stringify(chunks)) {
    throw new Error(
      "La source a changé. Relisez-la avant de préparer la recherche."
    );
  }
  const blobs = vectors.map(embeddingToHex);
  // Bindings in the native SQL plugin do not support binary arrays. This literal
  // is constructed solely from validated float32 bytes, never user input.
  // Only this generation's rows are replaced: the other index stays for rollback.
  await db.execute(
    "DELETE FROM embeddings WHERE patient_id=? AND source_type=? AND source_id=? AND model_key=?",
    [
      first.patientId,
      first.sourceType,
      first.sourceId,
      SEARCH_INDEX_KEYS[generation],
    ]
  );
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await db.execute(
      `INSERT INTO embeddings (id,source_type,source_id,patient_id,section,chunk_index,embedding,chunk_text,source_key,model_key,document_type,soap_id,note_id) VALUES (?,?,?,?,?,?,X'${blobs[i]}',?,?,?,?,?,?)`,
      [
        generateId(),
        chunk.sourceType,
        chunk.sourceId,
        chunk.patientId,
        chunk.section,
        chunk.chunkIndex,
        chunk.text,
        chunk.sourceKey,
        SEARCH_INDEX_KEYS[generation],
        chunk.documentType,
        chunk.sourceType === "soap" ? chunk.sourceId : null,
        chunk.sourceType === "soap" ? null : chunk.sourceId,
      ]
    );
  }
}
export function plainDocumentText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
/**
 * ONNX threads of arctic: half the logical cores, at most 4. Measured on an
 * 8-core M1 (A2 conditions): 4 threads ≈ 2.7× faster than 1, 6 slower than 4.
 */
export const arcticThreadCount = (
  cores = globalThis.navigator?.hardwareConcurrency ?? 1
) => Math.max(1, Math.min(4, Math.floor(cores / 2)));
/** Engine of the last encoding: threads actually used and page isolation. */
let lastEngine: {
  threads: number;
  isolated: boolean;
  sharedMemory: boolean;
} | null = null;
export const searchEngineInfo = () => lastEngine;
// Development builds let the bench compare thread counts (?searchThreads=N).
const arcticThreads = () =>
  (import.meta.env.DEV &&
    Number(
      new URLSearchParams(globalThis.location?.search ?? "").get(
        "searchThreads"
      )
    )) ||
  arcticThreadCount();
export async function embedTexts(
  models: LocalModelStatus,
  texts: string[],
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  query = false,
  model: SearchModel = "embeddinggemma",
  options: IndexingOptions = {}
) {
  const ready = {
    embeddinggemma: models.embeddingReady,
    embeddinggemma2: models.embedding2Ready,
    arctic: models.arcticReady,
  };
  if (!ready[model]) {
    throw new Error(
      "La recherche locale n’est pas installée. Vos documents restent accessibles."
    );
  }
  const urls = getLocalModelUrls(models);
  const session = await takeEmbeddingSession(
    urls.modelRoot,
    signal,
    onProgress,
    options.onPreempt
  );
  let succeeded = false;
  try {
    const result = await session.request(
      {
        type: "embed",
        modelRoot: urls.modelRoot,
        runtimeRoot: urls.runtimeRoot,
        texts,
        query,
        model,
        threads: model === "arctic" ? arcticThreads() : 1,
      },
      "embedded"
    );
    if (result.type !== "embedded") {
      throw new Error("La préparation de la recherche a échoué.");
    }
    succeeded = true;
    lastEngine = result.engine ?? null;
    // Vectors are stored in SQLite as 768 dimensions. arctic (1 024, trained for
    // truncation) keeps its first 768; measured equal or better on the bench (A2).
    return result.vectors.map((vector) =>
      normalizedEmbedding(model === "arctic" ? vector.slice(0, 768) : vector)
    );
  } finally {
    if (succeeded) {
      parkEmbeddingSession(session, urls.modelRoot);
    } else {
      session.close();
    }
  }
}

/** The worker accepts at most 100 texts per request: long documents are sent in slices. */
async function embedInBatches(
  models: LocalModelStatus,
  texts: string[],
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  model: SearchModel = "embeddinggemma",
  options: IndexingOptions = {}
) {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += 100) {
    vectors.push(
      ...(await embedTexts(
        models,
        texts.slice(start, start + 100),
        signal,
        onProgress,
        false,
        model,
        options
      ))
    );
  }
  return vectors;
}

// Successive searches reuse the loaded model instead of reloading it each
// time. The idle model holds no lease: dictation, notes and document reading
// evict it, and it is freed after a short idle delay.
const EMBEDDING_IDLE_MS = 120_000;
let idleEmbedding: {
  session: LocalInferenceSession;
  modelRoot: string;
  timer: ReturnType<typeof setTimeout>;
} | null = null;
// biome-ignore lint/suspicious/useAwait: relance l'erreur de idle.session.resume et rend tantôt la session en cache, tantôt LocalInferenceSession.create ; async garde l'erreur en rejet et une promesse dans les deux cas
async function takeEmbeddingSession(
  modelRoot: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  onPreempt?: () => void
) {
  const idle = idleEmbedding;
  idleEmbedding = null;
  if (idle) {
    clearTimeout(idle.timer);
    if (!idle.session.isClosed && idle.modelRoot === modelRoot) {
      try {
        idle.session.resume(signal, onProgress, onPreempt);
      } catch (error) {
        idle.session.close();
        throw error;
      }
      return idle.session;
    }
    idle.session.close();
  }
  return LocalInferenceSession.create(
    "embedding",
    signal,
    onProgress,
    onPreempt
  );
}
function parkEmbeddingSession(
  session: LocalInferenceSession,
  modelRoot: string
) {
  idleEmbedding?.session.close();
  session.park();
  if (session.isClosed) {
    return;
  }
  const timer = setTimeout(() => {
    if (idleEmbedding?.session === session) {
      idleEmbedding = null;
    }
    session.close();
  }, EMBEDDING_IDLE_MS);
  idleEmbedding = { session, modelRoot, timer };
}
/** How an indexing run takes the model lease: with `onPreempt`, any other local task stops it first (background catch-up). */
export interface IndexingOptions {
  onPreempt?: () => void;
}
export async function indexReviewedSource(
  source: ConsultationSoap | Note,
  type: DocumentType = "consultation",
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {
    // Sans suivi demandé, la progression n’est pas signalée.
  },
  options: IndexingOptions = {}
) {
  const chunks =
    type === "consultation"
      ? soapSearchChunks(source as ConsultationSoap)
      : documentSearchChunks(
          source as Note,
          plainDocumentText((source as Note).content),
          type
        );
  if (!chunks.length) {
    return 0;
  }
  const models = await getLocalModels();
  let count = 0;
  for (const generation of indexedGenerations(models)) {
    const rows = forGeneration(chunks, generation);
    const vectors = await embedInBatches(
      models,
      rows.map((chunk) => chunk.text),
      signal,
      onProgress,
      GENERATION_MODEL[generation],
      options
    );
    await runDbTransaction((db) =>
      persistSearchChunks(db, rows, vectors, generation)
    );
    count += rows.length;
  }
  return count;
}
/** Indexes one SOAP note right after its validation; 0 when it is not (or no longer) validated. */
export async function indexValidatedSoap(
  soapId: string,
  signal = new AbortController().signal,
  options: IndexingOptions = {}
) {
  const [row] = await runDbRead((db) =>
    db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE id=?`,
      [soapId]
    )
  );
  if (!(row && isSoapReviewed(row))) {
    return 0;
  }
  return indexReviewedSource(
    row,
    "consultation",
    signal,
    () => {
      // Indexation en arrière-plan : pas de progression affichée.
    },
    options
  );
}
/** Indexes one document right after it was saved validated; 0 when it is not eligible. */
export async function indexValidatedNote(
  noteId: string,
  signal = new AbortController().signal,
  options: IndexingOptions = {}
) {
  const [row] = await runDbRead((db) =>
    db.select<Note[]>(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id=?`, [noteId])
  );
  if (!row) {
    return 0;
  }
  try {
    documentSearchChunks(row, plainDocumentText(row.content), noteType(row));
  } catch {
    return 0;
  }
  return indexReviewedSource(
    row,
    noteType(row),
    signal,
    () => {
      // Indexation en arrière-plan : pas de progression affichée.
    },
    options
  );
}
// biome-ignore lint/suspicious/useAwait: lève « Le patient est requis » avant db.select ; async garde ce refus en rejet
export async function detectSearchOrphans(
  db: SearchDatabase,
  patientId: string
) {
  if (!patientId) {
    throw new Error("Le patient est requis.");
  }
  return db.select<Array<{ id: string }>>(
    "SELECT id FROM embeddings WHERE patient_id=? AND (NOT EXISTS(SELECT 1 FROM patients p WHERE p.id=embeddings.patient_id) OR (source_type='soap' AND NOT EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=embeddings.source_id AND s.patient_id=embeddings.patient_id)) OR (source_type!='soap' AND NOT EXISTS(SELECT 1 FROM notes n WHERE n.id=embeddings.source_id AND n.patient_id=embeddings.patient_id)))",
    [patientId]
  );
}
export async function readPatientSearchRows(
  db: SearchDatabase,
  scope: SearchScope,
  generation: SearchGeneration = getActiveSearchGeneration()
) {
  assertSearchScope(scope);
  const rows = await db.select<Array<SearchChunk & { embedding: string }>>(
    "SELECT patient_id AS patientId,source_id AS sourceId,source_type AS sourceType,document_type AS documentType,section,chunk_index AS chunkIndex,chunk_text AS text,source_key AS sourceKey,hex(embedding) AS embedding FROM embeddings WHERE patient_id=? AND model_key=? AND source_type IN (" +
      scope.sourceTypes.map(() => "?").join(",") +
      ") AND section IN (" +
      scope.sections.map(() => "?").join(",") +
      ") AND EXISTS(SELECT 1 FROM patients p WHERE p.id=embeddings.patient_id) AND ((source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=embeddings.source_id AND s.patient_id=embeddings.patient_id)) OR (source_type!='soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id=embeddings.source_id AND n.patient_id=embeddings.patient_id))) ORDER BY source_id,chunk_index",
    [
      scope.patientId,
      SEARCH_INDEX_KEYS[generation],
      ...scope.sourceTypes,
      ...scope.sections,
    ]
  );
  return rows
    .filter(
      (row) =>
        row.patientId === scope.patientId &&
        scope.sourceTypes.includes(row.sourceType) &&
        scope.sections.includes(row.section)
    )
    .flatMap((row) => {
      try {
        return [{ ...row, vector: embeddingFromHex(row.embedding) }];
      } catch {
        return [];
      }
    });
}
function noteType(note: Note): Exclude<DocumentType, "consultation"> {
  try {
    const metadata = JSON.parse(note.tags ?? "{}").clinicalDocument;
    const type =
      metadata?.type ?? metadata?.kind ?? metadata?.source?.template?.kind;
    if (
      [
        "prescription",
        "certificate",
        "report",
        "laboratory",
        "protocol",
      ].includes(type)
    ) {
      return type;
    }
  } catch {
    /* Legacy document. */
  }
  return "document";
}
/**
 * The validated sources of one patient (reviewed SOAP notes, validated documents) and, per indexed generation, those
 * whose passages are missing or outdated. Reads only; the catch-up measures its coverage with it.
 */
export async function readPatientBacklog(
  db: SearchDatabase,
  patientId: string,
  models: Awaited<ReturnType<typeof getLocalModels>>
) {
  const soaps = await db.select<ConsultationSoap[]>(
    `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE patient_id=?`,
    [patientId]
  );
  const notes = await db.select<Note[]>(
    `SELECT ${NOTE_COLUMNS} FROM notes WHERE patient_id=?`,
    [patientId]
  );
  const groups = soaps.filter(isSoapReviewed).map(soapSearchChunks);
  for (const note of notes) {
    try {
      groups.push(
        documentSearchChunks(
          note,
          plainDocumentText(note.content),
          noteType(note)
        )
      );
    } catch {
      /* Only validated sources. */
    }
  }
  const sources = groups.filter((group) => group.length);
  // One read of the patient's passages: per source and model, its versions (source_key) and their passage counts.
  const existing = new Map<
    string,
    Array<{ sourceKey: string; count: number }>
  >();
  for (const row of await db.select<
    Array<{
      sourceType: string;
      sourceId: string;
      modelKey: string;
      sourceKey: string;
      count: number;
    }>
  >(
    "SELECT source_type AS sourceType,source_id AS sourceId,model_key AS modelKey,source_key AS sourceKey,COUNT(*) AS count FROM embeddings WHERE patient_id=? GROUP BY source_type,source_id,model_key,source_key",
    [patientId]
  )) {
    const key = `${row.sourceType}|${row.sourceId}|${row.modelKey}`;
    existing.set(key, [...(existing.get(key) ?? []), row]);
  }
  const stale: Array<{
    generation: SearchGeneration;
    chunks: SearchChunk[];
  }> = [];
  for (const generation of indexedGenerations(models)) {
    for (const chunks of sources.map((group) =>
      forGeneration(group, generation)
    )) {
      const first = chunks[0];
      const versions =
        existing.get(
          `${first.sourceType}|${first.sourceId}|${SEARCH_INDEX_KEYS[generation]}`
        ) ?? [];
      if (
        versions.length !== 1 ||
        versions[0].sourceKey !== first.sourceKey ||
        versions[0].count !== chunks.length
      ) {
        stale.push({ generation, chunks });
      }
    }
  }
  return {
    sources: sources.length,
    staleSources: new Set(stale.map(({ chunks }) => chunks[0].sourceId)).size,
    stale,
  };
}
export async function indexPatientDocuments(
  patientId: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  options: IndexingOptions = {}
) {
  if (!patientId) {
    throw new Error("Ouvrez une fiche patient avant de préparer la recherche.");
  }
  const models = await getLocalModels();
  const sources = (
    await runDbRead((db) => readPatientBacklog(db, patientId, models))
  ).stale;
  const orphans = await runDbRead((db) => detectSearchOrphans(db, patientId));
  if (orphans.length) {
    await runDbTransaction(async (db) => {
      for (const orphan of orphans) {
        await db.execute("DELETE FROM embeddings WHERE id=? AND patient_id=?", [
          orphan.id,
          patientId,
        ]);
      }
    });
  }
  if (!sources.length) {
    return 0;
  }
  // One worker per batch, only one patient's data; split batches at source boundaries.
  let count = 0;
  let batch: Array<{ generation: SearchGeneration; chunks: SearchChunk[] }> =
    [];
  const flush = async () => {
    if (!batch.length) {
      return;
    }
    const groups = batch;
    batch = [];
    // One model per request: each generation is embedded with its own model.
    const vectors: number[][] = [];
    for (const group of groups) {
      vectors.push(
        ...(await embedInBatches(
          models,
          group.chunks.map((chunk) => chunk.text),
          signal,
          onProgress,
          GENERATION_MODEL[group.generation],
          options
        ))
      );
    }
    const flat = groups.flatMap((group) => group.chunks);
    let offset = 0;
    await runDbTransaction(async (db) => {
      for (const group of groups) {
        await persistSearchChunks(
          db,
          group.chunks,
          vectors.slice(offset, offset + group.chunks.length),
          group.generation
        );
        offset += group.chunks.length;
      }
    });
    count += flat.length;
  };
  for (const source of sources) {
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    const pending = batch.reduce((sum, group) => sum + group.chunks.length, 0);
    if (pending + source.chunks.length > 100) {
      await flush();
    }
    batch.push(source);
  }
  await flush();
  return count;
}
/** Read current approved sources directly: an exact clinical term must not
 * disappear because its section embedding is unavailable or below threshold. */
export async function readPatientLexicalMatches(
  db: SearchDatabase,
  scope: SearchScope,
  query: string
) {
  assertSearchScope(scope);
  const chunks: SearchChunk[] = [];
  if (scope.sourceTypes.includes("soap")) {
    const notes = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE patient_id=?`,
      [scope.patientId]
    );
    chunks.push(...notes.filter(isSoapReviewed).flatMap(soapSearchChunks));
  }
  if (
    scope.sourceTypes.some((type) => type === "document" || type === "protocol")
  ) {
    const notes = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE patient_id=?`,
      [scope.patientId]
    );
    for (const note of notes) {
      try {
        chunks.push(
          ...documentSearchChunks(
            note,
            plainDocumentText(note.content),
            noteType(note)
          )
        );
      } catch {
        /* Only current human-reviewed documents are eligible. */
      }
    }
  }
  if (
    scope.sourceTypes.includes("document") &&
    scope.sections.includes("document")
  ) {
    chunks.push(...(await managedPatientChunks(db, scope.patientId)));
  }
  return chunks
    .filter(
      (chunk) =>
        chunk.patientId === scope.patientId &&
        scope.sourceTypes.includes(chunk.sourceType) &&
        scope.sections.includes(chunk.section) &&
        matchesSearchTerms(query, chunk.text)
    )
    .map((chunk) => ({ ...chunk, score: 0.95, match: "text" as const }));
}
/**
 * Notes and documents of one patient that contain the query's words but are not validated (never reviewed, changed
 * since their validation, documents without a validation mark). The word search of the bar finds them; the assistant
 * shows them apart, as not validated, so it does not find less than the bar. They never enter the semantic ranking.
 */
export async function readPatientUnreviewedMatches(
  db: SearchDatabase,
  scope: SearchScope,
  query: string
) {
  assertSearchScope(scope);
  return [
    ...(scope.sourceTypes.includes("soap")
      ? await unreviewedSoapMatches(db, scope, query)
      : []),
    ...(scope.sourceTypes.some(
      (type) => type === "document" || type === "protocol"
    )
      ? await unreviewedNoteMatches(db, scope, query)
      : []),
  ];
}
type UnreviewedMatch = SearchChunk & { reason: string };
async function unreviewedSoapMatches(
  db: SearchDatabase,
  scope: SearchScope,
  query: string
) {
  const found: UnreviewedMatch[] = [];
  const soaps = await db.select<ConsultationSoap[]>(
    `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE patient_id=?`,
    [scope.patientId]
  );
  for (const note of soaps.filter((soap) => !isSoapReviewed(soap))) {
    const reason = soapMetadata(note.content ?? "{}").soapReview
      ? "modifiée depuis sa validation"
      : "jamais validée";
    SOAP_SECTIONS.forEach(({ key }, chunkIndex) => {
      const text = note[key] ?? "";
      if (
        scope.sections.includes(key) &&
        text.trim() &&
        matchesSearchTerms(query, text)
      ) {
        found.push({
          patientId: scope.patientId,
          sourceId: note.id,
          sourceType: "soap",
          documentType: "consultation",
          section: key,
          chunkIndex,
          text,
          sourceKey: note.id,
          reason,
        });
      }
    });
  }
  return found;
}
function isValidatedDocument(note: Note, plain: string) {
  try {
    documentSearchChunks(note, plain, noteType(note));
    return true;
  } catch {
    return false;
  }
}
async function unreviewedNoteMatches(
  db: SearchDatabase,
  scope: SearchScope,
  query: string
) {
  const found: UnreviewedMatch[] = [];
  const notes = await db.select<Array<Note & { title: string | null }>>(
    `SELECT ${NOTE_COLUMNS},title FROM notes WHERE patient_id=?`,
    [scope.patientId]
  );
  for (const note of notes) {
    const type = noteType(note);
    const sourceType = type === "protocol" ? "protocol" : "document";
    const plain = plainDocumentText(note.content ?? "");
    if (
      !(
        plain &&
        scope.sourceTypes.includes(sourceType) &&
        scope.sections.includes(sourceType)
      ) ||
      isValidatedDocument(note, plain)
    ) {
      continue;
    }
    // The same text as the bar reads (title, then the document).
    const text = `${note.title ? `${note.title} — ` : ""}${plain}`;
    if (matchesSearchTerms(query, text)) {
      found.push({
        patientId: scope.patientId,
        sourceId: note.id,
        sourceType,
        documentType: type,
        section: sourceType,
        chunkIndex: 0,
        text,
        sourceKey: note.id,
        reason: "document sans validation",
      });
    }
  }
  return found;
}
/**
 * What the bar finds by words outside one patient's record, for the assistant's empty answer: the number of results
 * (the bar returns at most RESULT_LIMIT, so `capped` says there may be more) and of other records they come from.
 */
export async function countMatchesOutsidePatient(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  patientId: string,
  signal = new AbortController().signal
) {
  const found = await searchAllPatientsFastLexical(filters, query, signal);
  const outside = found.filter((match) => match.patientId !== patientId);
  return {
    results: outside.length,
    patients: new Set(outside.map((match) => match.patientId)).size,
    capped: found.length >= RESULT_LIMIT,
  };
}
/** The name of a patient, for the scope shown in the assistant; null when unknown. */
export async function readPatientName(patientId: string) {
  const [row] = await runDbRead((db) =>
    db.select<Array<{ name: string }>>("SELECT name FROM patients WHERE id=?", [
      patientId,
    ])
  );
  return row?.name ?? null;
}
/** readPatientUnreviewedMatches on the database. */
export function findPatientUnreviewedMatches(
  scope: SearchScope,
  query: string
) {
  return runDbRead((db) => readPatientUnreviewedMatches(db, scope, query));
}
/** readUnreviewedSources on the database. */
export function findUnreviewedSources(
  sources: Pick<SearchChunk, "sourceId" | "sourceType">[]
) {
  return runDbRead((db) => readUnreviewedSources(db, sources));
}
/** Among SOAP notes and documents found by words, those that are not validated (they carry no passage). */
export async function readUnreviewedSources(
  db: SearchDatabase,
  sources: Pick<SearchChunk, "sourceId" | "sourceType">[]
) {
  const soapIds = sources
    .filter(({ sourceType }) => sourceType === "soap")
    .map(({ sourceId }) => sourceId);
  const noteIds = sources
    .filter(
      ({ sourceType }) => sourceType === "document" || sourceType === "protocol"
    )
    .map(({ sourceId }) => sourceId);
  const unreviewed = new Set<string>();
  if (soapIds.length) {
    const soaps = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE id IN (${soapIds.map(() => "?").join(",")})`,
      soapIds
    );
    for (const note of soaps) {
      if (!isSoapReviewed(note)) {
        unreviewed.add(note.id);
      }
    }
  }
  if (noteIds.length) {
    const notes = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE id IN (${noteIds.map(() => "?").join(",")})`,
      noteIds
    );
    for (const note of notes) {
      try {
        documentSearchChunks(
          note,
          plainDocumentText(note.content),
          noteType(note)
        );
      } catch {
        unreviewed.add(note.id);
      }
    }
  }
  return unreviewed;
}
export async function searchPatientDocuments(
  scope: SearchScope,
  query: string,
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {
    // Sans suivi demandé, la progression n’est pas signalée.
  }
) {
  assertSearchScope(scope);
  if (!query.trim()) {
    throw new Error("Écrivez ce que vous souhaitez retrouver.");
  }
  const generation = effectiveGeneration(await getLocalModels());
  return generation === "sections"
    ? searchPatientSections(scope, query, signal, onProgress)
    : searchPatientPassages(scope, query, signal, onProgress, generation);
}
/** Section index (v2), unchanged: exact terms first, then whole-section cosine. */
async function searchPatientSections(
  scope: SearchScope,
  query: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void
) {
  const readLexical = () =>
    runDbRead((db) => readPatientLexicalMatches(db, scope, query));
  try {
    await indexPatientDocuments(scope.patientId, signal, onProgress);
    const rows = await runDbRead((db) =>
      readPatientSearchRows(db, scope, "sections")
    );
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    if (!rows.length) {
      return (await readLexical()).slice(0, 5);
    }
    const models = await getLocalModels();
    const [vector] = await embedTexts(
      models,
      [query],
      signal,
      onProgress,
      true
    );
    const currentRows = await runDbRead((db) =>
      readPatientSearchRows(db, scope, "sections")
    );
    const semantic = rankPatientChunks(
      currentRows,
      vector,
      scope,
      5,
      MIN_SEARCH_SCORE,
      query
    );
    recordSearchIssue(null);
    return mergeLexicalFirst<
      SearchChunk & { score: number; match: "text" | "semantic" }
    >(await readLexical(), semantic);
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw error;
    }
    recordSearchIssue(error instanceof Error ? error.message : String(error));
    const current = await readLexical();
    if (current.length) {
      return current.slice(0, 5);
    }
    throw error;
  }
}
/** Passage index (v3): best passage per source, vector score plus lexical bonus. */
async function searchPatientPassages(
  scope: SearchScope,
  query: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  generation: Exclude<SearchGeneration, "sections">
) {
  // Final managed documents are not embedded: they join as lexical-only sources.
  const lexicalOnly = () =>
    scope.sourceTypes.includes("document") &&
    scope.sections.includes("document")
      ? runDbRead((db) => managedPatientChunks(db, scope.patientId))
      : Promise.resolve([] as SearchChunk[]);
  const lexicalFallback = async () =>
    rankPassages(
      [],
      null,
      scope,
      query,
      5,
      await runDbRead((db) => readPatientLexicalMatches(db, scope, query))
    );
  try {
    await indexPatientDocuments(scope.patientId, signal, onProgress);
    const rows = await runDbRead((db) =>
      readPatientSearchRows(db, scope, generation)
    );
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    if (!rows.length) {
      return lexicalFallback();
    }
    const models = await getLocalModels();
    const [vector] = await embedTexts(
      models,
      [query],
      signal,
      onProgress,
      true,
      GENERATION_MODEL[generation]
    );
    const currentRows = await runDbRead((db) =>
      readPatientSearchRows(db, scope, generation)
    );
    const ranked = rankPassages(
      currentRows,
      vector,
      scope,
      query,
      5,
      await lexicalOnly(),
      MODEL_CALIBRATION[GENERATION_MODEL[generation]]
    );
    recordSearchIssue(null);
    return ranked;
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw error;
    }
    recordSearchIssue(error instanceof Error ? error.message : String(error));
    const current = await lexicalFallback();
    if (current.length) {
      return current;
    }
    throw error;
  }
}

export interface IndexingReport {
  failures: IndexingFailure[];
  indexed: number;
}
const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";
/**
 * Explicit cross-patient mode. Each source remains indexed and read in its own scope. Each patient is indexed on its
 * own: a failure is reported with the patient and the others are still indexed; only a cancellation stops the run.
 */
export async function indexAllPatientsDocuments(
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void = () => {
    // Sans suivi demandé, la progression n’est pas signalée.
  },
  options: IndexingOptions = {}
): Promise<IndexingReport> {
  const patients = await runDbRead((db) =>
    db.select<Array<{ id: string; name: string }>>(
      "SELECT id,name FROM patients ORDER BY id"
    )
  );
  let indexed = 0;
  const failures: IndexingFailure[] = [];
  const succeeded: string[] = [];
  try {
    for (const patient of patients) {
      if (signal.aborted) {
        throw new DOMException("Tâche annulée.", "AbortError");
      }
      try {
        indexed += await indexPatientDocuments(
          patient.id,
          signal,
          onProgress,
          options
        );
        succeeded.push(patient.id);
      } catch (error) {
        if (signal.aborted || isAbort(error)) {
          throw error;
        }
        failures.push({
          patientId: patient.id,
          patientName: patient.name,
          message:
            error instanceof Error ? error.message : String(error ?? "Erreur"),
        });
      }
    }
  } finally {
    recordIndexingOutcome(failures, succeeded);
  }
  return { indexed, failures };
}
/** The generation counter of the passages (migration 047), or null when it cannot be read. */
async function readPassageGeneration(db: SearchDatabase) {
  try {
    const [row] = await db.select<Array<{ generation: number }>>(
      "SELECT generation FROM search_index_state WHERE id = 1"
    );
    return typeof row?.generation === "number" ? row.generation : null;
  } catch {
    return null;
  }
}
/** Brings the SOAP word index up to date before the bar reads the notes; false when it cannot be used. */
function prepareSoapLexicalIndex() {
  return runDbTransaction((db) => syncSoapLexicalIndex(db)).catch(() => false);
}
/** Brings the word index up to date before a search; false when it cannot be used (the search then reads every passage). */
function prepareLexicalIndex() {
  return runDbTransaction((db) => syncLexicalIndex(db)).catch(() => false);
}
type PassageCandidate = SearchChunk & {
  cosine: number;
  embedding?: string;
  patientName: string;
};

const PASSAGE_SCOPE_SQL = (
  filters: Pick<SearchScope, "sourceTypes" | "sections">
) =>
  "FROM embeddings e JOIN patients p ON p.id=e.patient_id WHERE e.model_key=? AND e.source_type IN (" +
  filters.sourceTypes.map(() => "?").join(",") +
  ") AND e.section IN (" +
  filters.sections.map(() => "?").join(",") +
  ") AND ((e.source_type='soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=e.source_id AND s.patient_id=e.patient_id)) OR (e.source_type!='soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id=e.source_id AND n.patient_id=e.patient_id)))";
const PASSAGE_ORDER_SQL =
  " ORDER BY e.patient_id,e.source_id,e.chunk_index,e.source_type,e.section,e.rowid";
const PASSAGE_COLUMNS_SQL =
  "SELECT e.rowid AS lexicalRow,e.patient_id AS patientId,p.name AS patientName,e.source_id AS sourceId,e.source_type AS sourceType,e.document_type AS documentType,e.section,e.chunk_index AS chunkIndex,e.chunk_text AS text,e.source_key AS sourceKey";

/** What both ways of computing the cosine share: the question, its floor and the passages with the literal terms. */
async function passageSearchSetup(
  db: SearchDatabase,
  query: string,
  vector: number[],
  generation: Exclude<SearchGeneration, "sections">,
  lexicalIndex: boolean
) {
  const calibration = MODEL_CALIBRATION[GENERATION_MODEL[generation]];
  const queryNorm = Math.hypot(...vector);
  const unitQuery = Float64Array.from(vector, (value) => value / queryNorm);
  const floor = Math.min(calibration.minimum, calibration.lexicalFloor);
  // Below the floor a passage counts only with the literal terms of the question: the word index names the passages
  // that hold them all, matchesExactSearchTerms still decides. Without the index every such passage is checked.
  const exactExpression = lexicalIndex
    ? exactTermsExpression(query)
    : undefined;
  const withLiteralTerms =
    exactExpression === undefined
      ? null
      : new Set(
          exactExpression === null
            ? []
            : (
                await db.select<Array<{ id: number }>>(
                  "SELECT rowid AS id FROM embeddings_lexical WHERE embeddings_lexical MATCH ?",
                  [exactExpression]
                )
              ).map((row) => row.id)
        );
  /** Whether a passage can be kept at all: above the floor, or holding the literal terms of the question. */
  const eligible = (cosine: number, lexicalRow: number, text: string) =>
    cosine >= floor ||
    ((withLiteralTerms === null || withLiteralTerms.has(lexicalRow)) &&
      matchesExactSearchTerms(query, text));
  return { calibration, eligible, floor, unitQuery, withLiteralTerms };
}

/** rankPassages patient by patient on the candidates (in passage order), then the global sort of the search. */
async function rankPassageCandidates(
  db: SearchDatabase,
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  vector: number[],
  calibration: (typeof MODEL_CALIBRATION)[keyof typeof MODEL_CALIBRATION],
  candidates: PassageCandidate[]
) {
  const lexicalOnly =
    filters.sourceTypes.includes("document") &&
    filters.sections.includes("document")
      ? await managedPatientChunks(db)
      : [];
  const byPatient = new Map<
    string,
    {
      lexicalOnly: SearchChunk[];
      name: string;
      rows: Array<SearchChunk & { cosine: number; embedding?: string }>;
    }
  >();
  const patientEntry = (patientId: string, name: string) => {
    let entry = byPatient.get(patientId);
    if (!entry) {
      entry = { lexicalOnly: [], name, rows: [] };
      byPatient.set(patientId, entry);
    }
    return entry;
  };
  for (const { patientName, ...row } of candidates) {
    patientEntry(row.patientId, patientName).rows.push(row);
  }
  if (lexicalOnly.length) {
    const names = new Map(
      (
        await db.select<Array<{ id: string; name: string }>>(
          "SELECT id,name FROM patients"
        )
      ).map((patient) => [patient.id, patient.name])
    );
    for (const chunk of lexicalOnly) {
      const name = names.get(chunk.patientId);
      if (name !== undefined) {
        patientEntry(chunk.patientId, name).lexicalOnly.push(chunk);
      }
    }
  }
  const ranked: Array<
    ReturnType<typeof rankPassages>[number] & { patientName: string }
  > = [];
  for (const [patientId, entry] of byPatient) {
    ranked.push(
      ...rankPassages(
        entry.rows,
        vector,
        { patientId, ...filters },
        query,
        5,
        entry.lexicalOnly,
        calibration
      ).map((row) => ({ ...row, patientName: entry.name }))
    );
  }
  return ranked
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.patientId.localeCompare(b.patientId) ||
        a.sourceId.localeCompare(b.sourceId)
    )
    .slice(0, 5);
}

/**
 * La recherche par passages dans tous les dossiers, une fois la question vectorisée. Une seule requête lit les extraits
 * de toute la clinique (au lieu d'une par patient), les vecteurs sont décodés en tableaux typés et le cosinus y est
 * calculé au bit près comme rankPassages le ferait. Le classement reste celui de rankPassages, patient par patient,
 * puis le même tri global. Seules les lignes qui peuvent être retenues lui sont passées : sous le plus bas des deux
 * seuils, une ligne ne l'est que si elle contient les termes exacts de la question (matchesExactSearchTerms).
 */
export async function rankAllPatientsPassages(
  db: SearchDatabase,
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  vector: number[],
  generation: Exclude<SearchGeneration, "sections">,
  lexicalIndex = false
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  const rows = await db.select<
    Array<
      SearchChunk & {
        embedding: string;
        lexicalRow: number;
        patientName: string;
      }
    >
  >(
    `${PASSAGE_COLUMNS_SQL},hex(e.embedding) AS embedding ${PASSAGE_SCOPE_SQL(filters)}${PASSAGE_ORDER_SQL}`,
    [SEARCH_INDEX_KEYS[generation], ...filters.sourceTypes, ...filters.sections]
  );
  const { calibration, eligible, unitQuery } = await passageSearchSetup(
    db,
    query,
    vector,
    generation,
    lexicalIndex
  );
  const candidates: PassageCandidate[] = [];
  for (const { lexicalRow, ...row } of rows) {
    if (
      !(
        filters.sourceTypes.includes(row.sourceType) &&
        filters.sections.includes(row.section)
      )
    ) {
      continue;
    }
    const raw = embeddingBytesFromHex(row.embedding);
    if (!raw) {
      continue;
    }
    const cosine = passageCosine(raw, unitQuery);
    if (eligible(cosine, lexicalRow, row.text)) {
      candidates.push({ ...row, cosine });
    }
  }
  return rankPassageCandidates(
    db,
    filters,
    query,
    vector,
    calibration,
    candidates
  );
}

/** Passage order, as PASSAGE_ORDER_SQL sorts (ids and section names are plain ASCII, compared like SQLite does). */
const byPassageOrder = (
  a: PassageCandidate & { lexicalRow: number },
  b: PassageCandidate & { lexicalRow: number }
) => {
  for (const key of [
    "patientId",
    "sourceId",
    "chunkIndex",
    "sourceType",
    "section",
    "lexicalRow",
  ] as const) {
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1;
    }
  }
  return 0;
};
/** Passages with the literal terms are read by decreasing cosine, this many at a time. */
const LITERAL_BATCH = 200;

/**
 * The same search with the cosines computed by Rust (recherche_vecteurs), which keeps the vectors in memory: only the
 * question goes in, only rowids and cosines come out. The texts of those passages are then read and ranked as
 * rankAllPatientsPassages does.
 *
 * A passage below the floor counts only with the literal terms of the question and then scores cosine + bonus. Those
 * passages are read by decreasing cosine, and reading stops once the fifth result reaches what the next one could
 * score at most: nothing read afterwards could enter the answer. Rejects when Rust cannot answer; the caller then
 * falls back on rankAllPatientsPassages.
 */
export async function rankAllPatientsPassagesNatively(
  db: SearchDatabase,
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  vector: number[],
  generation: Exclude<SearchGeneration, "sections">,
  native: (
    request: NativeVectorQuery
  ) => Promise<NativeVectorReply> = searchVectorsNatively
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  const setup = await passageSearchSetup(db, query, vector, generation, false);
  const ask = (extraRows: number[]) =>
    native({
      modelKey: SEARCH_INDEX_KEYS[generation],
      unitQuery: Array.from(setup.unitQuery),
      floor: setup.floor,
      extraRows,
    });
  const candidates: Array<PassageCandidate & { lexicalRow: number }> = [];
  const read = async (
    cosines: Map<number, number>,
    keep: (cosine: number, text: string) => boolean
  ) => {
    if (!cosines.size) {
      return;
    }
    const rows = await db.select<
      Array<SearchChunk & { lexicalRow: number; patientName: string }>
    >(
      `${PASSAGE_COLUMNS_SQL} ${PASSAGE_SCOPE_SQL(filters)} AND e.rowid IN (SELECT value FROM json_each(?))${PASSAGE_ORDER_SQL}`,
      [
        SEARCH_INDEX_KEYS[generation],
        ...filters.sourceTypes,
        ...filters.sections,
        JSON.stringify([...cosines.keys()]),
      ]
    );
    for (const row of rows) {
      const cosine = cosines.get(row.lexicalRow);
      if (cosine !== undefined && keep(cosine, row.text)) {
        candidates.push({ ...row, cosine });
      }
    }
  };
  const rank = () =>
    rankPassageCandidates(
      db,
      filters,
      query,
      vector,
      setup.calibration,
      [...candidates]
        .sort(byPassageOrder)
        .map(({ lexicalRow: _row, ...row }) => row)
    );
  // Above the floor.
  const above = await ask([]);
  await read(
    new Map(above.rows.map((row, i) => [row, above.cosines[i]])),
    (cosine) => cosine >= setup.floor
  );
  let ranked = await rank();
  const settled = (bestRemaining: number) =>
    ranked.length === 5 &&
    ranked[4].score >= bestRemaining + setup.calibration.bonus;
  if (settled(setup.floor)) {
    return ranked;
  }
  // Below the floor, with the literal terms (named by the word index), best cosines first.
  const literal = await passageSearchSetup(db, query, vector, generation, true);
  const belowRows = [...(literal.withLiteralTerms ?? [])];
  if (!belowRows.length) {
    return ranked;
  }
  const below = await ask(belowRows);
  const pending = below.rows
    .map((row, i) => ({ row, cosine: below.cosines[i] }))
    .filter(({ cosine }) => cosine < setup.floor)
    .sort((a, b) => b.cosine - a.cosine || a.row - b.row);
  for (let start = 0; start < pending.length; start += LITERAL_BATCH) {
    const batch = pending.slice(start, start + LITERAL_BATCH);
    await read(
      new Map(batch.map(({ row, cosine }) => [row, cosine])),
      (_cosine, text) => matchesExactSearchTerms(query, text)
    );
    ranked = await rank();
    const next = pending[start + LITERAL_BATCH];
    if (next === undefined || settled(next.cosine)) {
      return ranked;
    }
  }
  return ranked;
}
export async function searchAllPatientsDocuments(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {
    // Sans suivi demandé, la progression n’est pas signalée.
  }
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  if (!query.trim()) {
    throw new Error("Écrivez ce que vous souhaitez retrouver.");
  }
  await indexAllPatientsDocuments(signal, onProgress);
  const models = await getLocalModels();
  const generation = effectiveGeneration(models);
  const [vector] = await embedTexts(
    models,
    [query],
    signal,
    onProgress,
    true,
    GENERATION_MODEL[generation]
  );
  if (generation !== "sections") {
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    const lexicalIndex = await prepareLexicalIndex();
    // Native search behind its switch; any refusal (older main workstation, no word index, Rust error) falls back on
    // the TypeScript search, which gives the same answer.
    const ranked = await runDbRead(async (db) => {
      if (lexicalIndex && nativeVectorSearchEnabled()) {
        try {
          return await rankAllPatientsPassagesNatively(
            db,
            filters,
            query,
            vector,
            generation
          );
        } catch {
          /* fall back below */
        }
      }
      return rankAllPatientsPassages(
        db,
        filters,
        query,
        vector,
        generation,
        lexicalIndex
      );
    });
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    return ranked;
  }
  // Section index (v2, rollback only): unchanged, one read per patient.
  const patients = await runDbRead((db) =>
    db.select<Array<{ id: string; name: string }>>(
      "SELECT id,name FROM patients ORDER BY id"
    )
  );
  const found = [] as Awaited<ReturnType<typeof searchPatientSections>>;
  for (const patient of patients) {
    if (signal.aborted) {
      throw new DOMException("Tâche annulée.", "AbortError");
    }
    const scope = { patientId: patient.id, ...filters };
    const rows = await runDbRead((db) =>
      readPatientSearchRows(db, scope, "sections")
    );
    const lexical =
      filters.sourceTypes.includes("document") &&
      filters.sections.includes("document")
        ? (await runDbRead((db) => managedPatientChunks(db, patient.id)))
            .filter((chunk) => matchesSearchTerms(query, chunk.text))
            .map((chunk) => ({ ...chunk, score: 0.95, match: "text" as const }))
        : [];
    found.push(
      ...[
        ...lexical,
        ...rankPatientChunks(rows, vector, scope, 5, MIN_SEARCH_SCORE, query),
      ].map((row) => ({ ...row, patientName: patient.name }))
    );
  }
  return found
    .sort(
      (a, b) =>
        Number(b.match === "text") - Number(a.match === "text") ||
        b.score - a.score ||
        a.patientId.localeCompare(b.patientId) ||
        a.sourceId.localeCompare(b.sourceId)
    )
    .slice(0, 5);
}

/**
 * Fast local veterinary clinical search across all patients.
 * Executes in ~1ms directly against SQLite using French morphological stems,
 * brand/DCI bidirectional mappings, and acronym expansions.
 */
/** How many results the all-patients word search returns. */
const RESULT_LIMIT = 15;
interface LexicalPassageRow {
  chunkIndex: number;
  documentType: DocumentType;
  patientId: string;
  patientName: string;
  section: SearchSection;
  sourceId: string;
  sourceKey: string;
  sourceType: SourceType;
  text: string;
}
export async function searchAllPatientsFastLexical(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  signal = new AbortController().signal
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const lexicalIndex = await prepareLexicalIndex();
  const soapIndex = filters.sourceTypes.includes("soap")
    ? await prepareSoapLexicalIndex()
    : false;

  return runDbRead(async (db) => {
    const matches: Array<
      SearchChunk & {
        patientName: string;
        score: number;
        match: "text" | "semantic";
      }
    > = [];
    const seen = new Set<string>();

    const onePerSource = getActiveSearchGeneration() !== "sections";
    const matchedSources = new Set<string>();
    const addMatch = (
      item: SearchChunk & { patientName: string; score: number }
    ) => {
      const key = `${item.sourceType}:${item.patientId}:${item.sourceId}:${item.section}:${item.chunkIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        matchedSources.add(`${item.sourceType}:${item.sourceId}`);
        matches.push({
          ...item,
          match: "text",
        });
      }
    };
    // The answer keeps the first RESULT_LIMIT sources (one passage each) or, with the section index, the first
    // RESULT_LIMIT matches. Once they are found, nothing read afterwards can change it.
    const resultSettled = () =>
      onePerSource
        ? matchedSources.size >= RESULT_LIMIT
        : matches.length >= RESULT_LIMIT;
    const settledResult = () => {
      if (onePerSource) {
        // One result per source, showing the passage that contains the term.
        const sources = new Set<string>();
        return matches
          .filter((match) => {
            const source = `${match.sourceType}:${match.sourceId}`;
            if (sources.has(source)) {
              return false;
            }
            sources.add(source);
            return true;
          })
          .map((match) => ({
            ...match,
            text: bestPassage(match.text, trimmed),
          }))
          .slice(0, RESULT_LIMIT);
      }
      return matches.slice(0, RESULT_LIMIT);
    };

    const allowedSources = new Set(filters.sourceTypes);

    if (
      allowedSources.has("document") &&
      filters.sections.includes("document")
    ) {
      for (const chunk of await managedPatientChunks(db)) {
        if (matchesSearchTerms(trimmed, chunk.text)) {
          addMatch({
            ...chunk,
            patientName: chunk.patientName || "Patient",
            score: 0.95,
          });
        }
      }
    }

    // 1. Pre-computed indexed vector chunks (SOAP & documents in SQLite embeddings table)
    const embeddingTypes = filters.sourceTypes.filter((t) =>
      ["soap", "document", "protocol"].includes(t)
    );
    const embeddingSections = filters.sections.filter((s) =>
      [
        "subjective",
        "objective",
        "assessment",
        "plan",
        "document",
        "protocol",
      ].includes(s)
    );

    // What the passage reading has examined, so the SOAP reading below can leave out the notes it already judged:
    // the active index key, the generation counter of the passages when the reading started (migration 047), and
    // whether every candidate passage was read.
    let passageKey: string | null = null;
    let passageGeneration: number | null = null;
    let passagesExamined = false;
    if (embeddingTypes.length > 0 && embeddingSections.length > 0) {
      try {
        const passagesSql = `SELECT
            e.patient_id AS patientId,
            p.name AS patientName,
            e.source_id AS sourceId,
            e.source_type AS sourceType,
            e.document_type AS documentType,
            e.section AS section,
            e.chunk_index AS chunkIndex,
            e.chunk_text AS text,
            e.source_key AS sourceKey
          FROM embeddings e
          JOIN patients p ON p.id = e.patient_id
          WHERE e.model_key = ?
            AND e.source_type IN (${embeddingTypes.map(() => "?").join(",")})
            AND e.section IN (${embeddingSections.map(() => "?").join(",")})
            AND ((e.source_type = 'soap' AND EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id = e.source_id AND s.patient_id = e.patient_id))
              OR (e.source_type != 'soap' AND EXISTS(SELECT 1 FROM notes n WHERE n.id = e.source_id AND n.patient_id = e.patient_id)))
          ORDER BY e.patient_id, e.source_id, e.chunk_index, e.source_type, e.section, e.rowid`;
        const params = [
          SEARCH_INDEX_KEYS[effectiveGeneration(await getLocalModels())],
          ...embeddingTypes,
          ...embeddingSections,
        ];
        passageKey = params[0];
        passageGeneration = await readPassageGeneration(db);
        // The order is written out to the last column: before, the ties (sections of one passage) came out in the order
        // of whichever index the planner picked; this is that order (idx_embeddings_v2_scope), now independent of the plan.
        // With the word index, only the passages its expansion of the query selects are read; matchesSearchTerms
        // below still decides, so the matches are the same. Without it (or if it fails), every passage is read.
        const expression = lexicalIndex
          ? lexicalMatchExpression(trimmed)
          : undefined;
        // Passages are read page by page, in order, and reading stops once the answer is settled (resultSettled): later
        // matches could only come after the first RESULT_LIMIT sources, which is all the search returns.
        let useIndex = expression !== undefined;
        const indexedSql = passagesSql.replace(
          "ORDER BY e.patient_id",
          "AND e.rowid IN (SELECT rowid FROM embeddings_lexical WHERE embeddings_lexical MATCH ?) ORDER BY e.patient_id"
        );
        const readPage = async (
          offset: number,
          size: number
        ): Promise<{ restarted: boolean; rows: LexicalPassageRow[] }> => {
          if (useIndex) {
            try {
              return {
                restarted: false,
                rows: await db.select<LexicalPassageRow[]>(
                  `${indexedSql} LIMIT ? OFFSET ?`,
                  [...params, expression, size, offset]
                ),
              };
            } catch {
              // The index failed: every passage is read from the start; addMatch ignores those already matched.
              useIndex = false;
              return {
                restarted: true,
                rows: await db.select<LexicalPassageRow[]>(
                  `${passagesSql} LIMIT ? OFFSET ?`,
                  [...params, size, 0]
                ),
              };
            }
          }
          return {
            restarted: false,
            rows: await db.select<LexicalPassageRow[]>(
              `${passagesSql} LIMIT ? OFFSET ?`,
              [...params, size, offset]
            ),
          };
        };
        let offset = 0;
        let size = 200;
        while (expression !== null && !signal.aborted && !resultSettled()) {
          const { restarted, rows } = await readPage(offset, size);
          if (restarted) {
            offset = 0;
          }
          for (const row of rows) {
            if (matchesSearchTerms(trimmed, row.text)) {
              addMatch({ ...row, score: 0.95 });
              if (resultSettled()) {
                break;
              }
            }
          }
          if (rows.length < size) {
            break;
          }
          offset += rows.length;
          size = Math.min(size * 2, 3200);
        }
        passagesExamined = !signal.aborted;
      } catch {
        passagesExamined = false;
        /* proceed to direct table queries */
      }
    }

    if (signal.aborted) {
      return [];
    }
    if (resultSettled()) {
      return settledResult();
    }

    // 2. Direct SOAP Notes query (covers active/newly reviewed SOAP notes)
    if (allowedSources.has("soap")) {
      const soapSections = filters.sections.filter((s) =>
        ["subjective", "objective", "assessment", "plan"].includes(s)
      );
      if (soapSections.length > 0) {
        try {
          interface SoapRow {
            assessment: string;
            id: string;
            objective: string;
            patientId: string;
            patientName: string;
            plan: string;
            subjective: string;
          }
          // The order is written out: it is the one the planner gave this query before the index (patients scanned,
          // then each patient's notes by idx_consultation_soaps_patient_id), now independent of the plan. CROSS JOIN
          // and the unary + keep that plan with the index: the scan already comes in this order, so a page is read
          // without sorting every candidate note (1.1 s a page at 3 000 patients otherwise) and stops at its LIMIT.
          const soapSql = `SELECT s.id, s.patient_id AS patientId, p.name AS patientName,
                    s.subjective, s.objective, s.assessment, s.plan
             FROM patients p
             CROSS JOIN consultation_soaps s ON s.patient_id = p.id`;
          const soapOrder = " ORDER BY p.rowid, s.rowid";
          // With the SOAP word index, only the notes whose sections its expansion of the query selects are read;
          // matchesSearchTerms below still decides, so the matches are the same. Without it (or if it fails), every
          // note is read. Null: no section can match.
          const soapExpression = soapIndex
            ? lexicalMatchExpression(trimmed)
            : undefined;
          // A note can be left out only when each of its sections has a passage of the active index with exactly the
          // same text (a short section is one passage) and the passage reading above examined every candidate with no
          // passage written since: that reading has then already given the same verdict on the same text. Any doubt
          // (long section split in passages, note not indexed, index or counter unavailable) and the note is read.
          const skipExamined =
            passagesExamined &&
            passageKey !== null &&
            passageGeneration !== null &&
            passageGeneration === (await readPassageGeneration(db));
          const examinedSql = skipExamined
            ? ` AND NOT (${soapSections
                .map(
                  (section) =>
                    `(s.${section} = '' OR EXISTS (SELECT 1 FROM embeddings e WHERE e.source_type = 'soap' AND e.source_id = s.id AND e.patient_id = s.patient_id AND e.model_key = ? AND e.section = '${section}' AND e.chunk_text = s.${section}))`
                )
                .join(" AND ")})`
            : "";
          const examinedParams = skipExamined
            ? soapSections.map(() => passageKey)
            : [];
          const addSoapMatches = (soaps: SoapRow[]) => {
            for (const s of soaps) {
              for (const sec of soapSections as Array<
                "subjective" | "objective" | "assessment" | "plan"
              >) {
                const text = s[sec];
                if (text && matchesSearchTerms(trimmed, text)) {
                  addMatch({
                    patientId: s.patientId,
                    patientName: s.patientName,
                    sourceId: s.id,
                    sourceType: "soap",
                    documentType: "consultation",
                    section: sec,
                    chunkIndex: 0,
                    text,
                    sourceKey: s.id,
                    score: 0.95,
                  });
                }
              }
            }
          };
          // Notes are read page by page, in order, and reading stops once the answer is settled (resultSettled), as
          // for the passages: later notes could only add sources after the first RESULT_LIMIT.
          let useSoapIndex = soapExpression !== undefined;
          const readSoaps = async (
            offset: number,
            size: number
          ): Promise<{ restarted: boolean; rows: SoapRow[] }> => {
            if (useSoapIndex) {
              try {
                return {
                  restarted: false,
                  rows: await db.select<SoapRow[]>(
                    `${soapSql} WHERE +s.rowid IN (SELECT rowid / 4 FROM soap_lexical WHERE soap_lexical MATCH ?)${examinedSql}${soapOrder} LIMIT ? OFFSET ?`,
                    [soapExpression, ...examinedParams, size, offset]
                  ),
                };
              } catch {
                // The index failed: every note is read from the start; addMatch ignores those already matched.
                useSoapIndex = false;
                return {
                  restarted: true,
                  rows: await db.select<SoapRow[]>(
                    `${soapSql} WHERE 1 = 1${examinedSql}${soapOrder} LIMIT ? OFFSET ?`,
                    [...examinedParams, size, 0]
                  ),
                };
              }
            }
            return {
              restarted: false,
              rows: await db.select<SoapRow[]>(
                `${soapSql} WHERE 1 = 1${examinedSql}${soapOrder} LIMIT ? OFFSET ?`,
                [...examinedParams, size, offset]
              ),
            };
          };
          let soapOffset = 0;
          let soapPage = 200;
          while (
            soapExpression !== null &&
            !signal.aborted &&
            !resultSettled()
          ) {
            const { restarted, rows: soaps } = await readSoaps(
              soapOffset,
              soapPage
            );
            if (restarted) {
              soapOffset = 0;
            }
            addSoapMatches(soaps);
            if (soaps.length < soapPage) {
              break;
            }
            soapOffset += soaps.length;
            soapPage = Math.min(soapPage * 2, 3200);
          }
        } catch {
          /* table might not have rows */
        }
      }
    }

    if (signal.aborted) {
      return [];
    }

    // 3. Consultations & Appointments (title, type, reason, diagnosis, treatment, notes)
    if (allowedSources.has("consultation")) {
      try {
        const appts = await db.select<
          Array<{
            id: string;
            patientId: string;
            patientName: string;
            title: string;
            type: string;
            reason: string | null;
            diagnosis: string | null;
            treatment: string | null;
            notes: string | null;
          }>
        >(
          `SELECT a.id, a.patient_id AS patientId, p.name AS patientName,
                  a.title, a.type, a.reason, a.diagnosis, a.treatment, a.notes
           FROM appointments a
           JOIN patients p ON p.id = a.patient_id
           ORDER BY a.start_time DESC
           LIMIT 100`
        );

        for (const a of appts) {
          const chunks = consultationSearchChunks(a, a.patientName);
          for (const chunk of chunks) {
            if (matchesSearchTerms(trimmed, chunk.text)) {
              addMatch({ ...chunk, patientName: a.patientName, score: 0.95 });
            }
          }
        }
      } catch {
        /* table query ignored on error */
      }
    }

    if (signal.aborted) {
      return [];
    }

    // 4. Products / Stock / Pharmacie (name, category, sub_category, unit, quantity)
    if (allowedSources.has("product")) {
      try {
        const prods = await db.select<
          Array<{
            id: string;
            name: string;
            category: string;
            sub_category: string | null;
            unit: string | null;
            quantity: number | null;
          }>
        >(
          `SELECT id, name, category, sub_category, unit, quantity
           FROM products
           WHERE archived_at IS NULL
           ORDER BY name ASC
           LIMIT 200`
        );

        for (const p of prods) {
          const chunks = productSearchChunks(p);
          for (const chunk of chunks) {
            if (matchesSearchTerms(trimmed, chunk.text)) {
              addMatch({
                ...chunk,
                patientName: "Pharmacie & Stock",
                score: 0.95,
              });
            }
          }
        }
      } catch {
        /* table query ignored on error */
      }
    }

    if (signal.aborted) {
      return [];
    }

    // 5. Patient profiles (signalement, allergies, chronic conditions, medical notes)
    if (allowedSources.has("patient")) {
      try {
        const pts = await db.select<
          Array<{
            id: string;
            name: string;
            species: string;
            breed: string | null;
            chip_number: string | null;
            allergies: string | null;
            chronic_conditions: string | null;
            general_notes: string | null;
          }>
        >(
          `SELECT id, name, species, breed, chip_number, allergies, chronic_conditions, general_notes
           FROM patients
           LIMIT 100`
        );

        for (const p of pts) {
          const chunks = patientSearchChunks(p);
          for (const chunk of chunks) {
            if (matchesSearchTerms(trimmed, chunk.text)) {
              addMatch({ ...chunk, patientName: p.name, score: 0.95 });
            }
          }
        }
      } catch {
        /* table query ignored on error */
      }
    }

    if (signal.aborted) {
      return [];
    }

    // 6. Clinical Documents & Protocols from notes table
    if (allowedSources.has("document") || allowedSources.has("protocol")) {
      try {
        const docNotes = await db.select<
          Array<{
            id: string;
            patientId: string | null;
            patientName: string | null;
            title: string;
            content: string;
            tags: string | null;
          }>
        >(
          `SELECT n.id, n.patient_id AS patientId, p.name AS patientName,
                  n.title, n.content, n.tags
           FROM notes n
           LEFT JOIN patients p ON p.id = n.patient_id
           ORDER BY n.updated_at DESC, n.id
           LIMIT 1000`
        );

        for (const n of docNotes) {
          const plain = plainDocumentText(n.content);
          if (!plain) {
            continue;
          }
          const type = noteType(n as unknown as Note);
          if (
            !allowedSources.has(type === "protocol" ? "protocol" : "document")
          ) {
            continue;
          }

          const fullText = `${n.title ? `${n.title} — ` : ""}${plain}`;
          if (matchesSearchTerms(trimmed, fullText)) {
            addMatch({
              patientId: n.patientId || "",
              patientName: n.patientName || "Document clinique",
              sourceId: n.id,
              sourceType: type === "protocol" ? "protocol" : "document",
              documentType: type,
              section: type === "protocol" ? "protocol" : "document",
              chunkIndex: 0,
              text: fullText,
              sourceKey: n.id,
              score: 0.95,
            });
          }
        }
      } catch {
        /* table query ignored on error */
      }
    }

    return settledResult();
  });
}

/**
 * Robust hybrid clinical search for command palettes and clinical query bars.
 * 1. Returns instantaneous French morphological / DCI / acronym matches across all 6 clinic domains.
 * 2. If vector embedding models are ready, enriches and supplements with cosine similarity.
 */
export async function searchAllPatientsClinical(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {
    // Sans suivi demandé, la progression n’est pas signalée.
  },
  onIssue: (message: string) => void = () => {
    // The issue is recorded for the assistant in any case (recordSearchIssue).
  }
): Promise<
  Array<
    SearchChunk & {
      patientName: string;
      score: number;
      match: "text" | "semantic";
    }
  >
> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  // 1. Fast lexical retrieval with French veterinary dictionary across all 6 domains
  const instantMatches = await searchAllPatientsFastLexical(
    filters,
    trimmed,
    signal
  );
  if (signal.aborted) {
    return [];
  }

  // 2. Vector search if local embedding models are available
  try {
    const models = await getLocalModels();
    if (models.embeddingReady && !signal.aborted) {
      const vectorSourceTypes = filters.sourceTypes.filter((t) =>
        ["soap", "document", "protocol"].includes(t)
      );
      const vectorSections = filters.sections.filter((s) =>
        [
          "subjective",
          "objective",
          "assessment",
          "plan",
          "document",
          "protocol",
        ].includes(s)
      );

      if (vectorSourceTypes.length > 0 && vectorSections.length > 0) {
        const vectorMatches = await searchAllPatientsDocuments(
          { sourceTypes: vectorSourceTypes, sections: vectorSections },
          trimmed,
          signal,
          onProgress
        );
        if (signal.aborted) {
          return instantMatches;
        }
        recordSearchIssue(null);

        const map = new Map<
          string,
          SearchChunk & {
            patientName: string;
            score: number;
            match: "text" | "semantic";
          }
        >();

        for (const m of vectorMatches) {
          const key = `${m.sourceType}:${m.patientId}:${m.sourceId}:${m.section}:${m.chunkIndex}`;
          map.set(key, {
            ...m,
            patientName: m.patientName ?? "",
          });
        }

        if (getActiveSearchGeneration() !== "sections") {
          // Vector results already carry cosine + lexical bonus; other lexical
          // matches (profiles, consultations, products…) join at LEXICAL_ONLY_SCORE.
          const sources = new Set(
            vectorMatches.map((m) => `${m.sourceType}:${m.sourceId}`)
          );
          return [
            ...Array.from(map.values()),
            ...instantMatches
              .filter((m) => {
                const source = `${m.sourceType}:${m.sourceId}`;
                if (sources.has(source)) {
                  return false;
                }
                sources.add(source);
                return true;
              })
              .map((m) => ({
                ...m,
                text: bestPassage(m.text, trimmed),
                score:
                  MODEL_CALIBRATION[
                    GENERATION_MODEL[effectiveGeneration(models)]
                  ].lexicalOnly,
              })),
          ]
            .sort(
              (a, b) =>
                b.score - a.score || a.patientId.localeCompare(b.patientId)
            )
            .slice(0, 15);
        }

        for (const m of instantMatches) {
          const key = `${m.sourceType}:${m.patientId}:${m.sourceId}:${m.section}:${m.chunkIndex}`;
          const existing = map.get(key);
          if (existing) {
            map.set(key, {
              ...existing,
              patientName: m.patientName || existing.patientName,
              match: "text",
              score: Math.max(existing.score, m.score),
            });
          } else {
            map.set(key, m);
          }
        }

        return Array.from(map.values())
          .sort(
            (a, b) =>
              Number(b.match === "text") - Number(a.match === "text") ||
              b.score - a.score ||
              a.patientId.localeCompare(b.patientId)
          )
          .slice(0, 15);
      }
    }
  } catch (error) {
    // The word matches are still returned (the bar keeps its recall), but the failure is no longer silent: it is
    // logged, recorded for the assistant, and given to the caller.
    if (!(signal.aborted || isAbort(error))) {
      const message =
        error instanceof Error ? error.message : String(error ?? "Erreur");
      recordSearchIssue(message);
      onIssue(message);
    }
  }

  return instantMatches;
}
