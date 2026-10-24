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
  searchEngineInfo,
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
import { LocalInferenceSession } from "@/modules/consultations/local-ai/inference-client";
import { getLocalModelUrls } from "@/modules/consultations/local-ai/models";
import type { SearchModel } from "@/modules/consultations/local-ai/worker-protocol";
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
  // Raw output of each attempt, with the model that actually produced it (no silent fallback in a measure).
  const outputs: { number: 1 | 2; seconds: number; generator?: string; fellBack?: boolean; text: string }[] = [];
  const onAttempt = (attempt: { number: 1 | 2; text: string; generator?: string; fellBack?: boolean }) =>
    outputs.push({ ...attempt, seconds: seconds(started) });
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
      onAttempt,
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
        generators: outputs.map((output) => output.generator ?? null),
        fellBack: outputs.some((output) => output.fellBack),
        attemptSeconds: outputs.map((output) => output.seconds),
        totalSeconds: seconds(started),
        loadedAtSeconds: marks.generating ?? null,
        fidelity: score.fidelity,
        alteredWords: score.alteredWords.length,
        sectionAgreement: score.sectionAgreement,
        inventedDosages: score.inventedDosages.length,
      },
      details: { id: item.id, alteredWords: score.alteredWords, inventedDosages: score.inventedDosages, note: draft, outputs },
    };
  } catch (error) {
    return {
      result: {
        id: item.id,
        origin: item.origin,
        accepted: false,
        attempts,
        generators: outputs.map((output) => output.generator ?? null),
        fellBack: outputs.some((output) => output.fellBack),
        attemptSeconds: outputs.map((output) => output.seconds),
        totalSeconds: seconds(started),
        loadedAtSeconds: marks.generating ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
      details: { id: item.id, error: error instanceof Error ? error.message : String(error), outputs },
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

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);

/**
 * Embeds texts one by one; a text the worker refuses (too long) is counted, not indexed.
 * With a checkpoint path, vectors are saved every 500 texts and a rerun resumes from them.
 */
async function embedEach(models: LocalModelStatus, chunks: SearchChunk[], model: SearchModel = "embeddinggemma", checkpoint = "") {
  let rows: (SearchChunk & { vector: number[] })[] = [];
  let refused = 0;
  let start = 0;
  if (checkpoint)
    try {
      const saved = JSON.parse(await readTextFile(checkpoint)) as { next: number; refused: number; rows: typeof rows };
      ({ rows, refused, next: start } = saved);
      log(`    reprise au texte ${start} sur ${chunks.length}`);
    } catch {
      /* No checkpoint yet. */
    }
  const t0 = performance.now();
  // Small batches: one request must stay well under the engine's 480 s timeout,
  // even with long texts on a slow computer.
  for (; start < chunks.length; start += 10) {
    const batch = chunks.slice(start, start + 10);
    try {
      const vectors = await embedTexts(models, batch.map((chunk) => chunk.text), new AbortController().signal, quiet, false, model);
      batch.forEach((chunk, index) => rows.push({ ...chunk, vector: vectors[index] }));
    } catch (error) {
      log(`    lot ${start} refusé : ${errorText(error)}`);
      for (const chunk of batch)
        try {
          const [vector] = await embedTexts(models, [chunk.text], new AbortController().signal, quiet, false, model);
          rows.push({ ...chunk, vector });
        } catch (single) {
          refused++;
          log(`    texte refusé (${chunk.text.length} caractères) : ${errorText(single)}`);
        }
    }
    const done = start + batch.length;
    // Heartbeat: if the engine freezes again, the log says at which text and after how long.
    if (done % 100 === 0) log(`    … ${done} textes, ${seconds(t0)} s, moteur ${JSON.stringify(searchEngineInfo())}`);
    if (checkpoint && (done % 500 === 0 || done === chunks.length)) {
      await writeTextFile(checkpoint, JSON.stringify({ next: done, refused, rows }));
      log(`    ${done}/${chunks.length} textes, ${seconds(t0)} s depuis le départ`);
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
  dumpName = "",
) {
  const started = performance.now();
  // A2: the passage index can use EmbeddingGemma 2; the section index (A1 baseline) may be skipped.
  const passageModel = (params.get("searchModel") ?? "embeddinggemma") as SearchModel;
  const skipSections = params.get("skipSections") === "1";
  log(`  index par rubriques : ${skipSections ? "non refait" : sections.length + " textes"}`);
  const sectionIndex = skipSections ? { rows: [] as (SearchChunk & { vector: number[] })[], refused: 0 } : await embedEach(models, sections);
  const sectionSeconds = seconds(started);
  const passageIndexes: Array<{ size: number; rows: (SearchChunk & { vector: number[] })[]; refused: number; seconds: number }> = [];
  for (const size of passageSizes) {
    const t0 = performance.now();
    log(`  index par extraits ${size} (${passageModel})`);
    const checkpoint = dumpName ? `${params.get("out")!.replace(/\.json$/, "")}.ckpt-${dumpName}-${size}.json` : "";
    const index = await embedEach(models, passageChunks(sections, size), passageModel, checkpoint);
    passageIndexes.push({ size, ...index, seconds: seconds(t0) });
  }
  const queryMs: number[] = [];
  const ranked: Array<{ id: string; sections: string[]; passages: Record<number, string[]> }> = [];
  for (const question of questions) {
    const t0 = performance.now();
    const [vector] = await embedTexts(models, [question.text], new AbortController().signal, quiet, true, passageModel);
    queryMs.push(performance.now() - t0);
    const sectionVector = skipSections || passageModel === "embeddinggemma"
      ? vector
      : (await embedTexts(models, [question.text], new AbortController().signal, quiet, true))[0];
    const lexical = [...sections, ...managed]
      .filter((chunk) => matchesSearchTerms(question.text, chunk.text))
      .map((chunk) => ({ ...chunk, score: 0.95, match: "text" as "text" | "semantic" }));
    const before = mergeLexicalFirst<SearchChunk & { score: number; match: "text" | "semantic" }>(
      lexical,
      skipSections ? [] : rankPatientChunks(sectionIndex.rows, sectionVector, scope, limit, MIN_SEARCH_SCORE, question.text),
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
  // Real-engine vectors for offline calibration sweeps (stays on this computer).
  if (params.get("dumpVectors") === "1" && dumpName) {
    const round = (vector: number[]) => vector.map((value) => Math.round(value * 1e5) / 1e5);
    const questionVectors: { id: string; text: string; vector: number[] }[] = [];
    for (const question of questions)
      questionVectors.push({ id: question.id, text: question.text, vector: round((await embedTexts(models, [question.text], new AbortController().signal, quiet, true, passageModel))[0]) });
    for (const index of passageIndexes)
      await writeTextFile(
        `${params.get("out")!.replace(/\.json$/, "")}.vectors-${dumpName}-${index.size}.json`,
        JSON.stringify({ model: passageModel, scope, passages: index.rows.map((row) => ({ ...row, vector: round(row.vector) })), lexicalOnly: managed, questions: questionVectors }),
      );
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
    queryWarmMaxMs: queryMs.length > 1 ? Math.round(Math.max(...queryMs.slice(1))) : null,
    queryWarmMs: queryMs.slice(1).map(Math.round),
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

/**
 * A2 proof of concept: Whisper (transformers.js 3), then EmbeddingGemma 2
 * (transformers.js 4 alias), then v1 and Whisper again, in the same app.
 */
/**
 * Latency only (no corpus, no patient data): model loading, then short and long
 * queries, three rounds each. Used on the Windows floor computer as well.
 */
async function runQueries(models: LocalModelStatus, publicPath: string | null) {
  const model = (params.get("searchModel") ?? "arctic") as SearchModel;
  const short = ["antibiotique", "vomissements", "fièvre", "insuffisance rénale", "allergie pénicilline", "rappel vaccin", "diarrhée", "bilan rénal", "réaction allergique", "boiterie"];
  const long = publicPath
    ? (JSON.parse(await readTextFile(publicPath)) as { sets: PublicSet[] }).sets
        .find((set) => set.name === "PublicHealthQA")!.queries.map((query) => query.text).sort((a, b) => b.length - a.length).slice(0, 10)
    : [];
  const time = async (text: string) => {
    const t0 = performance.now();
    await embedTexts(models, [text], new AbortController().signal, quiet, true, model);
    return Math.round(performance.now() - t0);
  };
  const firstWithLoadMs = await time("premier chargement");
  const measure = async (texts: string[]) => {
    const ms: number[] = [];
    for (let round = 0; round < 3; round++) for (const text of texts) ms.push(await time(text));
    const sorted = [...ms].sort((a, b) => a - b);
    return { n: ms.length, medianMs: sorted[sorted.length >> 1] ?? null, p95Ms: sorted[Math.floor(0.95 * (sorted.length - 1))] ?? null, maxMs: sorted.at(-1) ?? null, characters: texts.map((text) => text.length) };
  };
  return { model, firstWithLoadMs, short: await measure(short), long: await measure(long), engine: searchEngineInfo() };
}

/** Under cross-origin isolation, every local engine still loads and answers (OCR, PDF, dictation, generator). */
async function runIsolationCheck(models: LocalModelStatus) {
  const urls = getLocalModelUrls(models);
  const out: Record<string, unknown> = {};
  const step = async (name: string, run: () => Promise<unknown>) => {
    const t0 = performance.now();
    try {
      out[name] = { ok: true, result: await run(), seconds: seconds(t0) };
    } catch (error) {
      out[name] = { ok: false, error: String(error) };
    }
    log(`  ${name} : ${JSON.stringify(out[name]).slice(0, 160)}`);
  };
  await step("ocr", async () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 900, height: 220 });
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 900, 220);
    context.fillStyle = "#000";
    context.font = "64px sans-serif";
    context.fillText("Vaccin rage 2026", 40, 130);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), "image/png"));
    const read = await readLocalDocument(new File([blob], "essai.png", { type: "image/png" }), new AbortController().signal, quiet);
    return read.pages.map((page) => page.text).join(" ");
  });
  await step("pdf", async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    pdf.text("Ordonnance de controle Baitari", 20, 20);
    const read = await readLocalDocument(new File([pdf.output("arraybuffer")], "essai.pdf", { type: "application/pdf" }), new AbortController().signal, quiet);
    return read.pages.map((page) => page.text).join(" ");
  });
  await step("whisper", async () => {
    const session = await LocalInferenceSession.create("whisper", new AbortController().signal, quiet);
    try {
      return (await session.request({ type: "load-whisper", modelRoot: urls.modelRoot, runtimeRoot: urls.runtimeRoot }, "ready")).type;
    } finally {
      session.close();
    }
  });
  await step("generator", async () => {
    const session = await LocalInferenceSession.create("soap", new AbortController().signal, quiet);
    try {
      const result = await session.request({ type: "generate", generators: urls.generators, runtimeRoot: urls.runtimeRoot, prompt: "Réponds seulement : bonjour." }, "generated");
      return result.type === "generated" ? { text: result.text.trim().slice(0, 40), generator: result.generator, fellBack: result.fellBack ?? false } : result.type;
    } finally {
      session.close();
    }
  });
  return out;
}

async function runPoc(models: LocalModelStatus) {
  const urls = getLocalModelUrls(models);
  const steps: Record<string, unknown>[] = [];
  const whisper = async (label: string) => {
    const t0 = performance.now();
    const session = await LocalInferenceSession.create("whisper", new AbortController().signal, quiet);
    try {
      await session.request({ type: "load-whisper", modelRoot: urls.modelRoot, runtimeRoot: urls.runtimeRoot }, "ready");
      steps.push({ step: label, ok: true, seconds: seconds(t0) });
    } catch (error) {
      steps.push({ step: label, ok: false, error: String(error) });
    } finally {
      session.close();
    }
  };
  const embedding = async (label: string, model: SearchModel) => {
    const session = await LocalInferenceSession.create("embedding", new AbortController().signal, quiet);
    const ask = async (texts: string[], query: boolean) => {
      const t0 = performance.now();
      const result = await session.request({ type: "embed", modelRoot: urls.modelRoot, runtimeRoot: urls.runtimeRoot, texts, query, model }, "embedded");
      return { vectors: result.type === "embedded" ? result.vectors : [], ms: Math.round(performance.now() - t0) };
    };
    try {
      const passages = [
        "Chien croisé de sept ans, boiterie du membre postérieur droit, douleur à la palpation du grasset, tiroir antérieur douteux.",
        "Chat de deux ans vacciné contre le typhus et le coryza, aucune anomalie à l'examen.",
      ];
      const first = await ask([passages[0]], false); // includes loading the model
      const second = await ask([passages[1]], false);
      const queryTimes: number[] = [];
      let query: number[] = [];
      for (const term of ["boiterie grasset", "vaccination chat", "douleur patte arrière"]) {
        const result = await ask([term], true);
        queryTimes.push(result.ms);
        if (term === "boiterie grasset") query = result.vectors[0];
      }
      const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0);
      steps.push({
        step: label, ok: true, dimensions: first.vectors[0]?.length,
        firstWithLoadMs: first.ms, passageMs: second.ms, queryMs: queryTimes,
        cosineRelevant: +dot(query, first.vectors[0]).toFixed(3), cosineOther: +dot(query, second.vectors[0]).toFixed(3),
      });
    } catch (error) {
      steps.push({ step: label, ok: false, error: String(error) });
    } finally {
      session.close();
    }
  };
  await whisper("dictée (transformers.js 3) avant");
  await embedding("recherche v2 (transformers.js 4)", "embeddinggemma2");
  await embedding("recherche v1 (transformers.js 3) après", "embeddinggemma");
  await whisper("dictée (transformers.js 3) après");
  for (const item of steps) log(`  ${JSON.stringify(item)}`);
  return steps;
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
    const run = await rankBothGenerations(models, scope(patientId), sections.flat(), managed, questions.map((q) => ({ id: q.id, text: q.question })), passageSizes, 5, `b-${patientId.slice(0, 4)}`);
    const relevant = new Map(questions.map((q) => [q.id, uniqueSources(q.relevant)]));
    const scores = scoreGenerations(run.ranked, (id) => relevant.get(id) ?? [], passageSizes);
    results.push({ patient: patientId.slice(0, 4) + "…", questions: questions.length, index: run.index, queryWarmMedianMs: run.queryWarmMedianMs, queryWarmMaxMs: run.queryWarmMaxMs, queryWarmMs: run.queryWarmMs,
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
    const run = await rankBothGenerations(models, scope, sections, [], set.queries, sizes, 10, set.name);
    const relevant = (id: string) => (set.relevant[id] ?? []).map((docId) => `document:${docId}`);
    const scores = scoreGenerations(run.ranked, relevant, sizes);
    const strip = ({ perQuestion: _perQuestion, ...summary }: ReturnType<typeof scoreGenerations>["sections"]) => (void _perQuestion, summary);
    results.push({
      dataset: set.name, questions: set.queries.length, index: run.index, queryWarmMedianMs: run.queryWarmMedianMs, queryWarmMaxMs: run.queryWarmMaxMs, queryWarmMs: run.queryWarmMs,
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
  if (!outPath) throw new Error("Paramètre out requis.");
  // The clinic corpus is read only by the tasks that use it: latency and public
  // sets run on a computer that holds no patient record (Windows floor kit).
  const needsCorpus = ["a", "b", "c", "synthetic"].some((task) => tasks.has(task));
  if (needsCorpus && !casesPath) throw new Error("Paramètre cases requis pour les tâches a, b, c et synthetic.");
  log(needsCorpus ? "lecture du corpus" : "sans corpus clinique");
  const corpus = needsCorpus ? (JSON.parse(await readTextFile(casesPath!)) as Corpus) : ({ patients: {}, soapCases: [], searchCases: [], documentCases: [], synthetic: [] } as unknown as Corpus);
  const models = await getLocalModels();
  log(`modèles : génération ${models.generatorReady}, recherche ${Boolean(models.embeddingReady)}`);
  const report: Record<string, unknown> = {
    label: params.get("label") ?? "",
    startedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    models: { generator: models.generatorReady, embedding: Boolean(models.embeddingReady) },
    marks: [] as { what: string; at: number }[],
  };
  // Proof of cross-origin isolation in the real engine (needed for ONNX threads).
  report.isolation = { crossOriginIsolated: self.crossOriginIsolated, sharedArrayBuffer: typeof SharedArrayBuffer === "function", cores: navigator.hardwareConcurrency, searchThreads: params.get("searchThreads") ?? null };
  log(`isolation : ${JSON.stringify(report.isolation)}`);
  // Page heartbeat, independent of the engine: if a run freezes, it tells a stuck
  // engine (heartbeat goes on) from a suspended page (heartbeat stops too).
  let beats = 0;
  setInterval(() => log(`pouls ${++beats}`), 60_000);
  const details: unknown[] = [];
  const mark = (what: string) =>
    (report.marks as { what: string; at: number }[]).push({ what, at: Date.now() / 1000 });
  if (tasks.has("synthetic")) {
    const rows: unknown[] = [];
    for (const item of corpus.synthetic)
      for (let run = 1; run <= runs; run++) {
        mark(`synthetic:${item.id}:${run}:start`);
        const { result, details: detail } = await runSoap(item, item.bundle!, models);
        mark(`synthetic:${item.id}:${run}:end`);
        rows.push({ ...result, run });
        if (detail && run === 1) details.push(detail);
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
    // Generation is deterministic (topK 1, temperature 0): repeated runs measure latency only.
    const runsA = Number(params.get("runsA") ?? 1);
    report.generator = params.get("generator") ?? "préférence de l'app";
    const rows: unknown[] = [];
    for (const item of corpus.soapCases)
      for (let run = 1; run <= runsA; run++) {
        mark(`soap:${item.id}:${run}:start`);
        const { result, details: detail } = await runSoap(item, corpus.patients[item.patientId], models);
        mark(`soap:${item.id}:${run}:end`);
        rows.push({ ...result, run });
        if (detail && run === 1) details.push(detail);
        log(`note ${item.id} ${run}/${runsA} : ${result.accepted ? "acceptée" : "refusée"}, ${result.attempts} essai(s), ${result.totalSeconds} s, ${JSON.stringify(result.generators)}`);
      }
    report.soap = rows;
  }
  if (tasks.has("poc")) report.poc = await runPoc(models);
  if (tasks.has("isolation")) report.isolationCheck = await runIsolationCheck(models);
  if (tasks.has("queries")) report.queries = await runQueries(models, params.get("public"));
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
  report.engine = searchEngineInfo();
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
