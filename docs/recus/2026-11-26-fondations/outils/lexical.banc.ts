// Recherche par mots « tous patients » (searchAllPatientsFastLexical) sur une clinique synthétique.
// LEXICAL_MODE=record : enregistre, AVANT le changement, la sortie complète pour chaque question et le temps.
// LEXICAL_MODE=verify : rejoue les mêmes questions et exige une sortie identique (mêmes lignes, même ordre, mêmes champs).
// LEXICAL_BASE=<base> LEXICAL_OUT=<json> LEXICAL_MODE=record|verify npx vitest run --config docs/recus/2026-11-26-fondations/outils/vitest.banc.config.ts lexical
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { LEXICAL_QUERIES } from "./lexical-questions";

const fixture = vi.hoisted(() => ({
  db: null as unknown as DatabaseSync,
  stats: { selects: 0, bytes: 0, writes: 0 },
}));
vi.mock("@/services/sqlite/database", () => {
  const adapter = {
    select: (sql: string, params: unknown[] = []) => {
      fixture.stats.selects++;
      const s = JSON.stringify(
        fixture.db.prepare(sql).all(...(params as never[]))
      );
      fixture.stats.bytes += s.length;
      return Promise.resolve(JSON.parse(s));
    },
    execute: (sql: string, params: unknown[] = []) => {
      fixture.stats.writes++;
      const result = fixture.db.prepare(sql).run(...(params as never[]));
      return Promise.resolve({
        rowsAffected: Number(result.changes),
        lastInsertId: Number(result.lastInsertRowid),
      });
    },
  };
  const run = (operation: (db: typeof adapter) => unknown) =>
    Promise.resolve(operation(adapter));
  return {
    runDbRead: run,
    runDbOperation: run,
    runDbTransaction: run,
    getDatabase: async () => adapter,
    generateId: () => "id",
    toSQLiteTimestamp: (d: Date) => d.toISOString(),
  };
});
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModels: async () => ({
    embeddingReady: true,
    embedding2Ready: false,
    arcticReady: false,
    root: "local",
  }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));

const FILTERS = {
  sourceTypes: [
    "soap",
    "document",
    "protocol",
    "patient",
    "consultation",
    "product",
  ],
  sections: [
    "subjective",
    "objective",
    "assessment",
    "plan",
    "document",
    "protocol",
    "patient",
    "consultation",
    "product",
  ],
} as const;

const base = process.env.LEXICAL_BASE ?? "";
const out = process.env.LEXICAL_OUT ?? "";
const mode = process.env.LEXICAL_MODE ?? "record";

it(`lexical search ${mode} on ${base.split("/").pop()}`, async () => {
  fixture.db = new DatabaseSync(base, { readOnly: mode === "record" });
  const { searchAllPatientsFastLexical } = await import(
    "@/modules/consultations/local-ai/embedding-store"
  );
  const run = async (query: string) => {
    fixture.stats = { selects: 0, bytes: 0, writes: 0 };
    const t = performance.now();
    const results = await searchAllPatientsFastLexical(
      {
        sourceTypes: [...FILTERS.sourceTypes],
        sections: [...FILTERS.sections],
      },
      query
    );
    return {
      results,
      ms: Math.round((performance.now() - t) * 10) / 10,
      ...fixture.stats,
    };
  };
  // Première recherche à part : elle peut construire l'index (phase 1.3) ; elle ne compte pas dans la médiane.
  const first = await run(LEXICAL_QUERIES[0]);
  const runs = [];
  for (const query of LEXICAL_QUERIES) {
    runs.push({ query, ...(await run(query)) });
  }
  const times = runs.map((r) => r.ms).sort((a, b) => a - b);
  const summary = {
    base: base.split("/").pop(),
    questions: runs.length,
    premierMs: first.ms,
    premierEcritures: first.writes,
    medianMs: times[Math.floor(times.length / 2)],
    p95Ms: times[Math.floor(times.length * 0.95)],
    resultats: runs.reduce((s, r) => s + r.results.length, 0),
    sansResultat: runs.filter((r) => r.results.length === 0).length,
    MBmedian:
      [...runs].sort((a, b) => a.bytes - b.bytes)[Math.floor(runs.length / 2)]
        .bytes / 1e6,
  };
  if (mode === "record") {
    writeFileSync(
      out,
      `${JSON.stringify({ summary, runs: runs.map(({ query, results }) => ({ query, results })) })}\n`
    );
    console.log(JSON.stringify(summary));
    return;
  }
  const reference = JSON.parse(readFileSync(out, "utf8"));
  let identical = 0;
  const differences = [];
  for (const [index, run] of runs.entries()) {
    const expected = reference.runs[index];
    expect(expected.query).toBe(run.query);
    if (JSON.stringify(expected.results) === JSON.stringify(run.results)) {
      identical++;
    } else {
      differences.push({
        query: run.query,
        expected: expected.results.length,
        got: run.results.length,
      });
    }
  }
  // Sur-ensemble, vérifié directement sur toute la clinique : chaque extrait que le lexique accepte est un candidat de l'index.
  const lexicon = await import(
    "@/modules/consultations/local-ai/veterinary-lexicon"
  );
  const hasIndex = Boolean(
    fixture.db
      .prepare("SELECT 1 FROM sqlite_master WHERE name = 'embeddings_lexical'")
      .get()
  );
  const passages = fixture.db
    .prepare(
      "SELECT rowid AS id, chunk_text AS text FROM embeddings WHERE model_key = ?"
    )
    .all("embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3") as Array<{
    id: number;
    text: string;
  }>;
  const candidatesOf = (expression: string | null) =>
    new Set(
      expression === null
        ? []
        : (
            fixture.db
              .prepare(
                "SELECT rowid AS id FROM embeddings_lexical WHERE embeddings_lexical MATCH ?"
              )
              .all(expression) as Array<{ id: number }>
          ).map((row) => row.id)
    );
  let accepted = 0,
    candidates = 0,
    missed = 0,
    exactAccepted = 0,
    exactMissed = 0;
  for (const query of hasIndex ? LEXICAL_QUERIES : []) {
    const selected = candidatesOf(lexicon.lexicalMatchExpression(query));
    const exact = candidatesOf(lexicon.exactTermsExpression(query));
    candidates += passages.filter((p) => selected.has(p.id)).length;
    for (const passage of passages) {
      if (lexicon.matchesSearchTerms(query, passage.text)) {
        accepted++;
        if (!selected.has(passage.id)) {
          missed++;
        }
      }
      if (lexicon.matchesExactSearchTerms(query, passage.text)) {
        exactAccepted++;
        if (!exact.has(passage.id)) {
          exactMissed++;
        }
      }
    }
  }
  console.log(
    JSON.stringify({
      ...summary,
      identiques: identical,
      differences: differences.slice(0, 10),
      surensemble: {
        extraits: passages.length,
        acceptes: accepted,
        candidats: candidates,
        manques: missed,
        exactsAcceptes: exactAccepted,
        exactsManques: exactMissed,
      },
    })
  );
  if (process.env.LEXICAL_SUMMARY) {
    writeFileSync(
      process.env.LEXICAL_SUMMARY,
      `${JSON.stringify({ ...summary, identiques: identical, surensemble: { extraits: passages.length, acceptes: accepted, candidats: candidates, manques: missed, exactsAcceptes: exactAccepted, exactsManques: exactMissed } }, null, 1)}\n`
    );
  }
  expect(differences).toEqual([]);
  expect(missed).toBe(0);
  expect(exactMissed).toBe(0);
});
