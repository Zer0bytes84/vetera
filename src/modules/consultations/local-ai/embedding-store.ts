import {
  generateId,
  runDbRead,
  runDbTransaction,
} from "@/services/sqlite/database";
import type { ConsultationSoap, Note } from "@/types/db";
import {
  getLocalModels,
  getLocalModelUrls,
  type LocalModelStatus,
} from "./models";
import { LocalInferenceSession } from "./inference-client";
import { isSoapReviewed } from "./soap-review";
import type { LocalAiProgress } from "./worker-protocol";
import {
  EMBEDDING_MODEL_KEY,
  MIN_SEARCH_SCORE,
  assertSearchScope,
  documentSearchChunks,
  embeddingFromHex,
  embeddingToHex,
  matchesSearchTerms,
  normalizedEmbedding,
  rankPatientChunks,
  soapSearchChunks,
  consultationSearchChunks,
  patientSearchChunks,
  productSearchChunks,
  type SearchChunk,
  type DocumentType,
  type SearchScope,
  type SourceType,
  type SearchSection,
} from "./embedding-index";
export interface SearchDatabase {
  select<T>(query: string, values?: unknown[]): Promise<T>;
  execute(query: string, values?: unknown[]): Promise<unknown>;
}
const SOAP_COLUMNS =
  "id,patient_id AS patientId,subjective,objective,assessment,plan,content,ai_draft AS aiDraft";
const NOTE_COLUMNS = "id,patient_id AS patientId,content,tags";
export async function persistSearchChunks(
  db: SearchDatabase,
  chunks: SearchChunk[],
  vectors: number[][],
) {
  if (!chunks.length) return;
  if (chunks.length !== vectors.length)
    throw new Error("La préparation des extraits est incomplète.");
  const first = chunks[0];
  if (
    chunks.some(
      (chunk) =>
        chunk.patientId !== first.patientId ||
        chunk.sourceType !== first.sourceType ||
        chunk.sourceId !== first.sourceId ||
        chunk.sourceKey !== first.sourceKey ||
        chunk.documentType !== first.documentType,
    )
  )
    throw new Error(
      "Un lot doit appartenir à un seul document et un seul patient.",
    );
  let actual: SearchChunk[];
  if (first.sourceType === "soap") {
    const rows = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE id=? AND patient_id=?`,
      [first.sourceId, first.patientId],
    );
    if (!rows[0]) throw new Error("La note n’appartient pas à ce patient.");
    actual = soapSearchChunks(rows[0]);
  } else {
    const rows = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE id=? AND patient_id=?`,
      [first.sourceId, first.patientId],
    );
    if (!rows[0]) throw new Error("Le document n’appartient pas à ce patient.");
    actual = documentSearchChunks(
      rows[0],
      plainDocumentText(rows[0].content),
      first.documentType as Exclude<DocumentType, "consultation">,
    );
  }
  if (JSON.stringify(actual) !== JSON.stringify(chunks))
    throw new Error(
      "La source a changé. Relisez-la avant de préparer la recherche.",
    );
  const blobs = vectors.map(embeddingToHex);
  // Bindings in the native SQL plugin do not support binary arrays. This literal
  // is constructed solely from validated float32 bytes, never user input.
  await db.execute(
    "DELETE FROM embeddings WHERE patient_id=? AND source_type=? AND source_id=?",
    [first.patientId, first.sourceType, first.sourceId],
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
        EMBEDDING_MODEL_KEY,
        chunk.documentType,
        chunk.sourceType === "soap" ? chunk.sourceId : null,
        chunk.sourceType !== "soap" ? chunk.sourceId : null,
      ],
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
export async function embedTexts(
  models: LocalModelStatus,
  texts: string[],
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
  query = false,
) {
  if (!models.embeddingReady)
    throw new Error(
      "La recherche locale n’est pas installée. Vos documents restent accessibles.",
    );
  const urls = getLocalModelUrls(models);
  const session = await LocalInferenceSession.create(
    "embedding",
    signal,
    onProgress,
  );
  try {
    const result = await session.request(
      {
        type: "embed",
        modelRoot: urls.modelRoot,
        runtimeRoot: urls.runtimeRoot,
        texts,
        query,
      },
      "embedded",
    );
    if (result.type !== "embedded")
      throw new Error("La préparation de la recherche a échoué.");
    return result.vectors.map(normalizedEmbedding);
  } finally {
    session.close();
  }
}
export async function indexReviewedSource(
  source: ConsultationSoap | Note,
  type: DocumentType = "consultation",
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {},
) {
  const chunks =
    type === "consultation"
      ? soapSearchChunks(source as ConsultationSoap)
      : documentSearchChunks(
          source as Note,
          plainDocumentText((source as Note).content),
          type,
        );
  if (!chunks.length) return;
  const models = await getLocalModels();
  const vectors = await embedTexts(
    models,
    chunks.map((chunk) => chunk.text),
    signal,
    onProgress,
  );
  await runDbTransaction((db) => persistSearchChunks(db, chunks, vectors));
}
export async function detectSearchOrphans(
  db: SearchDatabase,
  patientId: string,
) {
  if (!patientId) throw new Error("Le patient est requis.");
  return db.select<Array<{ id: string }>>(
    "SELECT id FROM embeddings WHERE patient_id=? AND (NOT EXISTS(SELECT 1 FROM patients p WHERE p.id=embeddings.patient_id) OR (source_type='soap' AND NOT EXISTS(SELECT 1 FROM consultation_soaps s WHERE s.id=embeddings.source_id AND s.patient_id=embeddings.patient_id)) OR (source_type!='soap' AND NOT EXISTS(SELECT 1 FROM notes n WHERE n.id=embeddings.source_id AND n.patient_id=embeddings.patient_id)))",
    [patientId],
  );
}
export async function readPatientSearchRows(
  db: SearchDatabase,
  scope: SearchScope,
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
      EMBEDDING_MODEL_KEY,
      ...scope.sourceTypes,
      ...scope.sections,
    ],
  );
  return rows
    .filter(
      (row) =>
        row.patientId === scope.patientId &&
        scope.sourceTypes.includes(row.sourceType) &&
        scope.sections.includes(row.section),
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
    )
      return type;
  } catch {
    /* Legacy document. */
  }
  return "document";
}
export async function indexPatientDocuments(
  patientId: string,
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void,
) {
  if (!patientId)
    throw new Error("Ouvrez une fiche patient avant de préparer la recherche.");
  const sources = await runDbRead(async (db) => {
    const soaps = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE patient_id=?`,
      [patientId],
    );
    const notes = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE patient_id=?`,
      [patientId],
    );
    const groups = soaps.filter(isSoapReviewed).map(soapSearchChunks);
    for (const note of notes) {
      try {
        groups.push(
          documentSearchChunks(
            note,
            plainDocumentText(note.content),
            noteType(note),
          ),
        );
      } catch {
        /* Only validated sources. */
      }
    }
    const stale: SearchChunk[][] = [];
    for (const chunks of groups.filter((group) => group.length)) {
      const first = chunks[0];
      const existing = await db.select<
        Array<{ sourceKey: string; count: number }>
      >(
        "SELECT source_key AS sourceKey,COUNT(*) AS count FROM embeddings WHERE patient_id=? AND source_type=? AND source_id=? AND model_key=? GROUP BY source_key",
        [patientId, first.sourceType, first.sourceId, EMBEDDING_MODEL_KEY],
      );
      if (
        existing.length !== 1 ||
        existing[0].sourceKey !== first.sourceKey ||
        existing[0].count !== chunks.length
      )
        stale.push(chunks);
    }
    return stale;
  });
  const orphans = await runDbRead((db) => detectSearchOrphans(db, patientId));
  if (orphans.length)
    await runDbTransaction(async (db) => {
      for (const orphan of orphans)
        await db.execute("DELETE FROM embeddings WHERE id=? AND patient_id=?", [
          orphan.id,
          patientId,
        ]);
    });
  if (!sources.length) return 0;
  const models = await getLocalModels();
  // One worker per batch, only one patient's data; split batches at source boundaries.
  let count = 0;
  let batch: SearchChunk[][] = [];
  const flush = async () => {
    if (!batch.length) return;
    const groups = batch;
    batch = [];
    const flat = groups.flat();
    const vectors = await embedTexts(
      models,
      flat.map((chunk) => chunk.text),
      signal,
      onProgress,
    );
    let offset = 0;
    await runDbTransaction(async (db) => {
      for (const group of groups) {
        await persistSearchChunks(
          db,
          group,
          vectors.slice(offset, offset + group.length),
        );
        offset += group.length;
      }
    });
    count += flat.length;
  };
  for (const chunks of sources) {
    if (signal.aborted) throw new DOMException("Tâche annulée.", "AbortError");
    if (batch.flat().length + chunks.length > 100) await flush();
    batch.push(chunks);
  }
  await flush();
  return count;
}
/** Read current approved sources directly: an exact clinical term must not
 * disappear because its section embedding is unavailable or below threshold. */
export async function readPatientLexicalMatches(
  db: SearchDatabase, scope: SearchScope, query: string,
) {
  assertSearchScope(scope);
  const chunks: SearchChunk[] = [];
  if (scope.sourceTypes.includes("soap")) {
    const notes = await db.select<ConsultationSoap[]>(
      `SELECT ${SOAP_COLUMNS} FROM consultation_soaps WHERE patient_id=?`, [scope.patientId],
    );
    chunks.push(...notes.filter(isSoapReviewed).flatMap(soapSearchChunks));
  }
  if (scope.sourceTypes.some(type => type === "document" || type === "protocol")) {
    const notes = await db.select<Note[]>(
      `SELECT ${NOTE_COLUMNS} FROM notes WHERE patient_id=?`, [scope.patientId],
    );
    for (const note of notes) {
      try { chunks.push(...documentSearchChunks(note, plainDocumentText(note.content), noteType(note))); }
      catch { /* Only current human-reviewed documents are eligible. */ }
    }
  }
  return chunks.filter(chunk => chunk.patientId === scope.patientId &&
    scope.sourceTypes.includes(chunk.sourceType) && scope.sections.includes(chunk.section) &&
    matchesSearchTerms(query, chunk.text))
    .map(chunk => ({ ...chunk, score: 0.95, match: "text" as const }));
}
export async function searchPatientDocuments(
  scope: SearchScope,
  query: string,
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {},
) {
  assertSearchScope(scope);
  if (!query.trim()) throw new Error("Écrivez ce que vous souhaitez retrouver.");
  const readLexical = () => runDbRead(db => readPatientLexicalMatches(db, scope, query));
  try {
    await indexPatientDocuments(scope.patientId, signal, onProgress);
    const rows = await runDbRead(db => readPatientSearchRows(db, scope));
    if (signal.aborted) throw new DOMException("Tâche annulée.", "AbortError");
    if (!rows.length) return (await readLexical()).slice(0, 5);
    const models = await getLocalModels();
    const [vector] = await embedTexts(models, [query], signal, onProgress, true);
    const currentRows = await runDbRead(db => readPatientSearchRows(db, scope));
    const semantic = rankPatientChunks(currentRows, vector, scope, 5, MIN_SEARCH_SCORE, query);
    const found = new Map<string, Awaited<ReturnType<typeof readPatientLexicalMatches>>[number] | (typeof semantic)[number]>();
    for (const row of [...await readLexical(), ...semantic]) {
      const key = `${row.sourceType}:${row.sourceId}:${row.section}:${row.chunkIndex}`;
      if (!found.has(key)) found.set(key, row);
    }
    return [...found.values()].slice(0, 5);
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    const current = await readLexical();
    if (current.length) return current.slice(0, 5);
    throw error;
  }
}

/** Explicit cross-patient mode. Each source remains indexed and read in its own scope. */
export async function indexAllPatientsDocuments(
  signal: AbortSignal,
  onProgress: (event: LocalAiProgress) => void = () => {},
) {
  const patients = await runDbRead((db) =>
    db.select<Array<{ id: string }>>("SELECT id FROM patients ORDER BY id"),
  );
  let count = 0;
  for (const patient of patients) {
    if (signal.aborted) throw new DOMException("Tâche annulée.", "AbortError");
    count += await indexPatientDocuments(patient.id, signal, onProgress);
  }
  return count;
}
export async function searchAllPatientsDocuments(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  signal = new AbortController().signal,
  onProgress: (event: LocalAiProgress) => void = () => {},
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  if (!query.trim())
    throw new Error("Écrivez ce que vous souhaitez retrouver.");
  await indexAllPatientsDocuments(signal, onProgress);
  const patients = await runDbRead((db) =>
    db.select<Array<{ id: string; name: string }>>(
      "SELECT id,name FROM patients ORDER BY id",
    ),
  );
  const models = await getLocalModels();
  const [vector] = await embedTexts(models, [query], signal, onProgress, true);
  const found = [] as Awaited<ReturnType<typeof searchPatientDocuments>>;
  for (const patient of patients) {
    if (signal.aborted) throw new DOMException("Tâche annulée.", "AbortError");
    const scope = { patientId: patient.id, ...filters };
    const rows = await runDbRead((db) => readPatientSearchRows(db, scope));
    found.push(
      ...rankPatientChunks(rows, vector, scope, 5, MIN_SEARCH_SCORE, query).map(
        (row) => ({ ...row, patientName: patient.name }),
      ),
    );
  }
  return found
    .sort(
      (a, b) =>
        Number(b.match === "text") - Number(a.match === "text") ||
        b.score - a.score ||
        a.patientId.localeCompare(b.patientId) ||
        a.sourceId.localeCompare(b.sourceId),
    )
    .slice(0, 5);
}

/**
 * Fast local veterinary clinical search across all patients.
 * Executes in ~1ms directly against SQLite using French morphological stems,
 * brand/DCI bidirectional mappings, and acronym expansions.
 */
export async function searchAllPatientsFastLexical(
  filters: Pick<SearchScope, "sourceTypes" | "sections">,
  query: string,
  signal = new AbortController().signal,
) {
  assertSearchScope({ patientId: "explicit-all-patients", ...filters });
  const trimmed = query.trim();
  if (!trimmed) return [];

  return runDbRead(async (db) => {
    const matches: Array<
      SearchChunk & {
        patientName: string;
        score: number;
        match: "text" | "semantic";
      }
    > = [];
    const seen = new Set<string>();

    const addMatch = (
      item: SearchChunk & { patientName: string; score: number },
    ) => {
      const key = `${item.sourceType}:${item.patientId}:${item.sourceId}:${item.section}:${item.chunkIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          ...item,
          match: "text",
        });
      }
    };

    const allowedSources = new Set(filters.sourceTypes);

    // 1. Pre-computed indexed vector chunks (SOAP & documents in SQLite embeddings table)
    const embeddingTypes = filters.sourceTypes.filter((t) =>
      ["soap", "document", "protocol"].includes(t),
    );
    const embeddingSections = filters.sections.filter((s) =>
      [
        "subjective",
        "objective",
        "assessment",
        "plan",
        "document",
        "protocol",
      ].includes(s),
    );

    if (embeddingTypes.length > 0 && embeddingSections.length > 0) {
      try {
        const rows = await db.select<
          Array<{
            patientId: string;
            patientName: string;
            sourceId: string;
            sourceType: SourceType;
            documentType: DocumentType;
            section: SearchSection;
            chunkIndex: number;
            text: string;
            sourceKey: string;
          }>
        >(
          `SELECT
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
          ORDER BY e.patient_id, e.source_id, e.chunk_index`,
          [EMBEDDING_MODEL_KEY, ...embeddingTypes, ...embeddingSections],
        );

        if (!signal.aborted) {
          for (const row of rows) {
            if (matchesSearchTerms(trimmed, row.text)) {
              addMatch({ ...row, score: 0.95 });
            }
          }
        }
      } catch {
        /* proceed to direct table queries */
      }
    }

    if (signal.aborted) return [];

    // 2. Direct SOAP Notes query (covers active/newly reviewed SOAP notes)
    if (allowedSources.has("soap")) {
      const soapSections = filters.sections.filter((s) =>
        ["subjective", "objective", "assessment", "plan"].includes(s),
      );
      if (soapSections.length > 0) {
        try {
          const soaps = await db.select<
            Array<{
              id: string;
              patientId: string;
              patientName: string;
              subjective: string;
              objective: string;
              assessment: string;
              plan: string;
            }>
          >(
            `SELECT s.id, s.patient_id AS patientId, p.name AS patientName,
                    s.subjective, s.objective, s.assessment, s.plan
             FROM consultation_soaps s
             JOIN patients p ON p.id = s.patient_id
             LIMIT 100`,
          );

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
        } catch {
          /* table might not have rows */
        }
      }
    }

    if (signal.aborted) return [];

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
           LIMIT 100`,
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

    if (signal.aborted) return [];

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
           LIMIT 200`,
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

    if (signal.aborted) return [];

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
           LIMIT 100`,
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

    if (signal.aborted) return [];

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
           LIMIT 100`,
        );

        for (const n of docNotes) {
          const plain = plainDocumentText(n.content);
          if (!plain) continue;
          const type = noteType(n as unknown as Note);
          if (!allowedSources.has(type === "protocol" ? "protocol" : "document"))
            continue;

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

    return matches.slice(0, 15);
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
  onProgress: (event: LocalAiProgress) => void = () => {},
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
  if (!trimmed) return [];

  // 1. Fast lexical retrieval with French veterinary dictionary across all 6 domains
  const instantMatches = await searchAllPatientsFastLexical(
    filters,
    trimmed,
    signal,
  );
  if (signal.aborted) return [];

  // 2. Vector search if local embedding models are available
  try {
    const models = await getLocalModels();
    if (models.embeddingReady && !signal.aborted) {
      const vectorSourceTypes = filters.sourceTypes.filter((t) =>
        ["soap", "document", "protocol"].includes(t),
      );
      const vectorSections = filters.sections.filter((s) =>
        [
          "subjective",
          "objective",
          "assessment",
          "plan",
          "document",
          "protocol",
        ].includes(s),
      );

      if (vectorSourceTypes.length > 0 && vectorSections.length > 0) {
        const vectorMatches = await searchAllPatientsDocuments(
          { sourceTypes: vectorSourceTypes, sections: vectorSections },
          trimmed,
          signal,
          onProgress,
        );
        if (signal.aborted) return instantMatches;

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
              a.patientId.localeCompare(b.patientId),
          )
          .slice(0, 15);
      }
    }
  } catch {
    // Graceful fallback to instant lexical matches on model busy or worker error
  }

  return instantMatches;
}
