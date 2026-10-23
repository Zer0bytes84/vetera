// Evaluation page: runs the real local pipelines in the desktop webview on a
// corpus extracted read-only (extract-cases.mjs) and writes a report without
// clinical text. Never part of the production bundle (served by Vite in dev only).
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauriRuntime } from "@/services/browser-store";
import {
  getLocalModels,
  type LocalModelStatus,
} from "@/modules/consultations/local-ai/models";
import { prepareSoapDraft } from "@/modules/consultations/local-ai/soap-pipeline";
import { buildPatientContext } from "@/modules/consultations/local-ai/patient-context";
import { buildDictationScaffold } from "@/modules/consultations/local-ai/dictation-scaffold";
import { prepareModelDictation } from "@/modules/consultations/local-ai/treatment-routing";
import { containsDosage } from "@/modules/consultations/local-ai/soap-schema";
import {
  embedTexts,
  plainDocumentText,
} from "@/modules/consultations/local-ai/embedding-store";
import {
  documentSearchChunks,
  managedDocumentSearchChunks,
  matchesSearchTerms,
  MIN_SEARCH_SCORE,
  rankPatientChunks,
  soapSearchChunks,
  type SearchChunk,
  type SearchScope,
} from "@/modules/consultations/local-ai/embedding-index";
import {
  mergeLexicalFirst,
  passageChunks,
  rankPassages,
} from "@/modules/consultations/local-ai/passage-search";
import type { PatientDocument } from "@/modules/documents/document-domain";
import { readDocumentAnswer } from "@/modules/documents/lib/read-document-answer";
import { readLocalDocument } from "@/modules/documents/lib/read-local-document";
import type { ReadDocument } from "@/modules/documents/lib/document-reading";
import type { LocalAiProgress } from "@/modules/consultations/local-ai/worker-protocol";
import type { Appointment, ConsultationSoap, Note, Patient } from "@/types/db";
import {
  citationScores,
  retrievalScores,
  scoreSoapDraft,
  type SoapSections,
} from "./metrics";

interface Bundle {
  patient: Patient;
  appointments: Appointment[];
  soaps: ConsultationSoap[];
  notes: Note[];
  managedDocuments?: Array<Pick<PatientDocument, "id" | "patientId" | "patientName" | "kind" | "title" | "content" | "status" | "attachment" | "updatedAt">>;
}
interface PublicSet {
  name: string;
  docs: { id: string; text: string }[];
  queries: { id: string; text: string }[];
  relevant: Record<string, string[]>;
}
interface SoapCase {
  id: string;
  origin: string;
  transcript: string;
  appointmentId: string;
  patientId: string;
  reference: SoapSections | null;
  bundle?: Bundle;
}
interface Corpus {
  patients: Record<string, Bundle>;
  soapCases: SoapCase[];
  searchCases: {
    id: string;
    patientId: string;
    question: string;
    relevant: { sourceType: string; sourceId: string; section: string }[];
  }[];
  documentCases: {
    id: string;
    question: string;
    expectedPages: number[];
    noAnswer: boolean;
    file: { name: string; mimeType: string; dataUrl: string } | null;
    note: { title: string; content: string } | null;
  }[];
  synthetic: SoapCase[];
}

const params = new URLSearchParams(location.search);
const tasks = new Set((params.get("tasks") ?? "a,b,c,synthetic").split(","));
const runs = Math.max(1, Number(params.get("runs") ?? 3));
const screen = document.getElementById("out")!;
const progressPath = params.get("out")?.replace(/\.json$/, "") + ".progress.log";
const log = (line: string) => {
  screen.textContent += `\n${line}`;
  console.log(line);
  // The desktop window is not inspectable from the command line: keep a trace on disk.
  if (isTauriRuntime())
    void writeTextFile(progressPath, `${new Date().toISOString()} ${line}\n`, { append: true }).catch(() => {});
};
const quiet = () => {};
const seconds = (from: number) => +((performance.now() - from) / 1000).toFixed(2);

async function runSoap(
  item: SoapCase,
  bundle: Bundle,
  models: LocalModelStatus
) {
  const started = performance.now();
  const marks: Record<string, number> = {};
  let attempts = 1;
  const onProgress = (event: LocalAiProgress) => {
    if (event.stage && !(event.stage in marks)) {
      marks[event.stage] = seconds(started);
      log(`  ${item.id} : ${event.stage} à ${marks[event.stage]} s`);
    }
    if (event.stage === "retrying") attempts = 2;
  };
  const scaffold = buildDictationScaffold(
    prepareModelDictation(item.transcript).text
  ) as SoapSections;
  try {
    const context = buildPatientContext(
      bundle.patient,
      bundle.appointments,
      bundle.soaps,
      item.appointmentId
    );
    const draft = await prepareSoapDraft({
      models,
      transcript: item.transcript,
      context,
      signal: new AbortController().signal,
      onProgress,
    });
    const score = scoreSoapDraft(
      item.transcript,
      scaffold,
      draft,
      item.reference,
      containsDosage
    );
    return {
      result: {
        id: item.id,
        origin: item.origin,
        accepted: true,
        attempts,
        totalSeconds: seconds(started),
        loadedAtSeconds: marks.generating ?? null,
        fidelity: score.fidelity,
        alteredWords: score.alteredWords.length,
        sectionAgreement: score.sectionAgreement,
        inventedDosages: score.inventedDosages.length,
      },
      details: { id: item.id, alteredWords: score.alteredWords, inventedDosages: score.inventedDosages },
    };
  } catch (error) {
    return {
      result: {
        id: item.id,
        origin: item.origin,
        accepted: false,
        attempts,
        totalSeconds: seconds(started),
        loadedAtSeconds: marks.generating ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
      details: null,
    };
  }
}

function patientSources(bundle: Bundle) {
  const sections: SearchChunk[][] = [];
  for (const soap of bundle.soaps)
    try {
      sections.push(soapSearchChunks(soap));
    } catch {
      /* Unreviewed notes are never searchable. */
    }
  for (const note of bundle.notes)
    try {
      sections.push(documentSearchChunks(note, plainDocumentText(note.content)));
    } catch {
      /* Unreviewed documents are never searchable. */
    }
  const managed = (bundle.managedDocuments ?? []).flatMap((document) => managedDocumentSearchChunks(document));
  return { sections: sections.filter((group) => group.length), managed };
}

/** Embeds texts one by one; a text the worker refuses (too long) is counted, not indexed. */
async function embedEach(models: LocalModelStatus, chunks: SearchChunk[]) {
  const rows: (SearchChunk & { vector: number[] })[] = [];
  let refused = 0;
  // Small batches: one request must stay well under the engine's 480 s timeout,
  // even with long texts on a slow computer.
  for (let start = 0; start < chunks.length; start += 10) {
    const batch = chunks.slice(start, start + 10);
    try {
      const vectors = await embedTexts(models, batch.map((chunk) => chunk.text), new AbortController().signal, quiet);
      batch.forEach((chunk, index) => rows.push({ ...chunk, vector: vectors[index] }));
    } catch {
      for (const chunk of batch)
        try {
          const [vector] = await embedTexts(models, [chunk.text], new AbortController().signal, quiet);
          rows.push({ ...chunk, vector });
        } catch {
          refused++;
        }
    }
  }
  return { rows, refused };
}

const sourceKeyOf = (item: { sourceType: string; sourceId: string }) => `${item.sourceType}:${item.sourceId}`;
const uniqueSources = (items: { sourceType: string; sourceId: string }[]) => [...new Set(items.map(sourceKeyOf))];

/**
 * Ranks with each index generation exactly as the app does:
 * sections (v2) = exact terms first, then whole-section cosine (sections over
 * 2 048 tokens refused); passages (v3) = best passage per source, cosine + lexical bonus.
 */
async function rankBothGenerations(
  models: LocalModelStatus,
  scope: SearchScope,
  sections: SearchChunk[],
  managed: SearchChunk[],
  questions: { id: string; text: string }[],
  passageSizes: number[],
  limit = 10,
) {
  const started = performance.now();
  log(`  index par rubriques : ${sections.length} textes`);
  const sectionIndex = await embedEach(models, sections);
  const sectionSeconds = seconds(started);
  const passageIndexes: Array<{ size: number; rows: (SearchChunk & { vector: number[] })[]; refused: number; seconds: number }> = [];
  for (const size of passageSizes) {
    const t0 = performance.now();
    log(`  index par extraits ${size}`);
    const index = await embedEach(models, passageChunks(sections, size));
    passageIndexes.push({ size, ...index, seconds: seconds(t0) });
  }
  const queryMs: number[] = [];
  const ranked: Array<{ id: string; sections: string[]; passages: Record<number, string[]> }> = [];
  for (const question of questions) {
    const t0 = performance.now();
    const [vector] = await embedTexts(models, [question.text], new AbortController().signal, quiet, true);
    queryMs.push(performance.now() - t0);
    const lexical = [...sections, ...managed]
      .filter((chunk) => matchesSearchTerms(question.text, chunk.text))
      .map((chunk) => ({ ...chunk, score: 0.95, match: "text" as "text" | "semantic" }));
    const before = mergeLexicalFirst<SearchChunk & { score: number; match: "text" | "semantic" }>(
      lexical,
      rankPatientChunks(sectionIndex.rows, vector, scope, limit, MIN_SEARCH_SCORE, question.text),
      limit,
    );
    ranked.push({
      id: question.id,
      sections: uniqueSources(before),
      passages: Object.fromEntries(
        passageIndexes.map((index) => [index.size, uniqueSources(rankPassages(index.rows, vector, scope, question.text, limit, managed))]),
      ),
    });
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1] ?? null;
  return {
    ranked,
    index: {
      sections: { rows: sectionIndex.rows.length, refused: sectionIndex.refused, total: sections.length, seconds: sectionSeconds },
      passages: passageIndexes.map(({ size, rows, refused, seconds: s }) => ({ size, rows: rows.length, refused, seconds: s })),
    },
    // The first query may include loading the model; the median reflects searches at warm.
    queryWarmMedianMs: median(queryMs.slice(1).map(Math.round)),
  };
}

function scoreGenerations(
  ranked: Awaited<ReturnType<typeof rankBothGenerations>>["ranked"],
  relevant: (id: string) => string[],
  passageSizes: number[],
) {
  const mean = (rows: ReturnType<typeof retrievalScores>[], key: "recallAt5" | "mrrAt10" | "ndcgAt10") => {
    const values = rows.map((row) => row[key]).filter((value): value is number => value !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const summarize = (pick: (row: (typeof ranked)[number]) => string[]) => {
    const rows = ranked.map((row) => retrievalScores(pick(row), relevant(row.id)));
    return { recallAt5: mean(rows, "recallAt5"), mrrAt10: mean(rows, "mrrAt10"), ndcgAt10: mean(rows, "ndcgAt10"), perQuestion: rows };
  };
  return {
    sections: summarize((row) => row.sections),
    passages: Object.fromEntries(passageSizes.map((size) => [size, summarize((row) => row.passages[size])])),
  };
}

const passageSizes = (params.get("sizes") ?? "800").split(",").map(Number).filter((size) => size >= 200);

/** Task B: the clinic's annotated questions, per patient, both index generations. */
async function runSearch(corpus: Corpus, models: LocalModelStatus) {
  const results: unknown[] = [];
  const byPatient = new Map<string, Corpus["searchCases"]>();
  for (const item of corpus.searchCases) byPatient.set(item.patientId, [...(byPatient.get(item.patientId) ?? []), item]);
  const scope = (patientId: string): SearchScope => ({
    patientId,
    sourceTypes: ["soap", "document", "protocol"],
    sections: ["subjective", "objective", "assessment", "plan", "document", "protocol"],
  });
  for (const [patientId, questions] of byPatient) {
    const { sections, managed } = patientSources(corpus.patients[patientId]);
    const run = await rankBothGenerations(models, scope(patientId), sections.flat(), managed, questions.map((q) => ({ id: q.id, text: q.question })), passageSizes, 5);
    const relevant = new Map(questions.map((q) => [q.id, uniqueSources(q.relevant)]));
    const scores = scoreGenerations(run.ranked, (id) => relevant.get(id) ?? [], passageSizes);
    results.push({ patient: patientId.slice(0, 4) + "…", questions: questions.length, index: run.index, queryWarmMedianMs: run.queryWarmMedianMs,
      perQuestion: questions.map((q, i) => ({ id: q.id, sections: scores.sections.perQuestion[i], passages: Object.fromEntries(passageSizes.map((size) => [size, scores.passages[size].perQuestion[i]])) })) });
  }
  return { results };
}

/** Public French sets of the challenge, both index generations, permanent bench. */
async function runPublic(models: LocalModelStatus, sets: PublicSet[], save: (results: unknown[]) => Promise<void>) {
  const results: unknown[] = [];
  // Optional per-set sizes, e.g. "AlloprofRetrieval:800".
  const override = new Map(
    (params.get("setSizes") ?? "").split(";").filter(Boolean).map((item) => {
      const [name, list] = item.split(":");
      return [name, list.split(",").map(Number)] as const;
    }),
  );
  const only = (params.get("onlySets") ?? "").split(",").filter(Boolean);
  for (const set of sets.filter((item) => !only.length || only.includes(item.name))) {
    const sizes = override.get(set.name) ?? passageSizes;
    log(`jeu public ${set.name} : ${set.docs.length} documents, ${set.queries.length} questions`);
    const scope: SearchScope = { patientId: "public", sourceTypes: ["document"], sections: ["document"] };
    const sections = set.docs.map((doc) => ({
      patientId: "public", sourceId: doc.id, sourceType: "document" as const, documentType: "document" as const,
      section: "document" as const, chunkIndex: 0, text: doc.text, sourceKey: doc.id,
    }));
    const run = await rankBothGenerations(models, scope, sections, [], set.queries, sizes, 10);
    const relevant = (id: string) => (set.relevant[id] ?? []).map((docId) => `document:${docId}`);
    const scores = scoreGenerations(run.ranked, relevant, sizes);
    const strip = ({ perQuestion: _perQuestion, ...summary }: ReturnType<typeof scoreGenerations>["sections"]) => (void _perQuestion, summary);
    results.push({
      dataset: set.name, questions: set.queries.length, index: run.index, queryWarmMedianMs: run.queryWarmMedianMs,
      sections: strip(scores.sections),
      passages: Object.fromEntries(sizes.map((size) => [size, strip(scores.passages[size])])),
    });
    log(`  ${set.name} terminé`);
    await save(results);
  }
  return results;
}

async function runDocuments(corpus: Corpus, models: LocalModelStatus) {
  const results: unknown[] = [];
  for (const item of corpus.documentCases) {
    const started = performance.now();
    let pages: number[] = [];
    let answered = false;
    let error: string | undefined;
    try {
      let source: ReadDocument;
      if (item.file) {
        const blob = await (await fetch(item.file.dataUrl)).blob();
        source = await readLocalDocument(
          new File([blob], item.file.name, { type: item.file.mimeType }),
          new AbortController().signal,
          quiet
        );
      } else {
        source = {
          name: item.note!.title,
          pages: [{ number: 1, text: plainDocumentText(item.note!.content), method: "text" }],
        };
      }
      const { answer } = await readDocumentAnswer(source, item.question, models, new AbortController().signal, quiet);
      pages = answer.extraits.map((extract) => extract.page);
      answered = true;
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure);
    }
    results.push({
      id: item.id,
      answered,
      totalSeconds: seconds(started),
      ...citationScores(pages, item.expectedPages, item.noAnswer),
      ...(error ? { error } : {}),
    });
  }
  return results;
}

async function main() {
  if (!isTauriRuntime())
    throw new Error("Le banc s’exécute dans l’application de bureau (tauri:dev) pour mesurer le vrai moteur.");
  const casesPath = params.get("cases");
  const outPath = params.get("out");
  if (!casesPath || !outPath) throw new Error("Paramètres cases et out requis.");
  log("lecture du corpus");
  const corpus = JSON.parse(await readTextFile(casesPath)) as Corpus;
  const models = await getLocalModels();
  log(`modèles : génération ${models.generatorReady}, recherche ${Boolean(models.embeddingReady)}`);
  const report: Record<string, unknown> = {
    label: params.get("label") ?? "",
    startedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    models: { generator: models.generatorReady, embedding: Boolean(models.embeddingReady) },
    marks: [] as { what: string; at: number }[],
  };
  const details: unknown[] = [];
  const mark = (what: string) =>
    (report.marks as { what: string; at: number }[]).push({ what, at: Date.now() / 1000 });
  if (tasks.has("synthetic")) {
    const rows: unknown[] = [];
    for (const item of corpus.synthetic)
      for (let run = 1; run <= runs; run++) {
        mark(`synthetic:${item.id}:${run}:start`);
        const { result } = await runSoap(item, item.bundle!, models);
        mark(`synthetic:${item.id}:${run}:end`);
        rows.push({ ...result, run });
        log(`fictif ${run}/${runs} : ${result.totalSeconds} s, ${result.attempts} essai(s)`);
      }
    report.synthetic = rows;
    if (models.embeddingReady) {
      // Successive searches with fictional terms: latency only.
      const searches: { query: number; seconds: number }[] = [];
      mark("synthetic:search:start");
      for (const [index, term] of ["boiterie", "grasset", "vomissement", "radiographie", "ligament"].entries()) {
        const started = performance.now();
        log(`  recherche fictive ${index + 1}`);
        await embedTexts(models, [term], new AbortController().signal, quiet, true);
        searches.push({ query: index + 1, seconds: seconds(started) });
      }
      mark("synthetic:search:end");
      report.syntheticSearch = searches;
      log(`recherches fictives : ${searches.map((item) => item.seconds).join(" s, ")} s`);
    }
  }
  if (tasks.has("a")) {
    const rows: unknown[] = [];
    for (const item of corpus.soapCases) {
      mark(`soap:${item.id}:start`);
      const { result, details: detail } = await runSoap(item, corpus.patients[item.patientId], models);
      mark(`soap:${item.id}:end`);
      rows.push(result);
      if (detail) details.push(detail);
      log(`note ${rows.length}/${corpus.soapCases.length} : ${result.accepted ? "acceptée" : "refusée"}, ${result.totalSeconds} s`);
    }
    report.soap = rows;
  }
  if (tasks.has("public")) {
    const publicPath = params.get("public");
    if (!publicPath) throw new Error("Paramètre public requis pour les jeux publics.");
    mark("public:start");
    // Results are saved after each set: a long run never loses what it measured.
    report.public = await runPublic(models, (JSON.parse(await readTextFile(publicPath)) as { sets: PublicSet[] }).sets, async (partial) => {
      report.public = partial;
      await writeTextFile(outPath.replace(/\.json$/, "") + ".partial.json", JSON.stringify(report, null, 2));
    });
    mark("public:end");
  }
  if (tasks.has("b") && corpus.searchCases.length) {
    mark("search:start");
    report.search = await runSearch(corpus, models);
    mark("search:end");
    log(`recherche : ${corpus.searchCases.length} question(s)`);
  }
  if (tasks.has("c") && corpus.documentCases.length) {
    mark("documents:start");
    report.documents = await runDocuments(corpus, models);
    mark("documents:end");
    log(`documents : ${corpus.documentCases.length} question(s)`);
  }
  report.finishedAt = new Date().toISOString();
  await writeTextFile(outPath, JSON.stringify(report, null, 2));
  // Words and sentences to reread on this computer only: never in the report.
  await writeTextFile(outPath.replace(/\.json$/, "") + ".details-local.json", JSON.stringify(details, null, 2));
  log(`Rapport écrit : ${outPath}`);
  document.title = "Banc terminé";
}

main().catch(async (error) => {
  log(`Échec : ${error instanceof Error ? error.message : String(error)}`);
  document.title = "Banc en échec";
  const outPath = params.get("out");
  if (outPath && isTauriRuntime())
    await writeTextFile(outPath, JSON.stringify({ failed: String(error) })).catch(quiet);
});
