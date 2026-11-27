// La barre (searchAllPatientsFastLexical) sur une clinique synthétique : la sortie complète et le temps par question,
// pour comparer deux versions du code (ici : avec et sans le LIMIT 100 des notes SOAP).
// BARRE_BASE=<copie migrée, écrite> BARRE_OUT=<json> npx vitest run --config docs/recus/2026-11-26-fondations/outils/vitest.banc.config.ts barre
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { LEXICAL_QUERIES } from "./lexical-questions";

const fixture = vi.hoisted(() => ({ db: null as unknown as DatabaseSync }));
vi.mock("@/services/sqlite/database", () => {
  const adapter = {
    select: (sql: string, params: unknown[] = []) =>
      Promise.resolve(
        JSON.parse(
          JSON.stringify(fixture.db.prepare(sql).all(...(params as never[])))
        )
      ),
    execute: (sql: string, params: unknown[] = []) => {
      const result = fixture.db.prepare(sql).run(...(params as never[]));
      return Promise.resolve({
        rowsAffected: Number(result.changes),
        lastInsertId: Number(result.lastInsertRowid),
      });
    },
  };
  const run = (operation: (db: typeof adapter) => unknown) =>
    Promise.resolve().then(() => operation(adapter));
  return {
    runDbRead: run,
    runDbOperation: run,
    runDbTransaction: run,
    getDatabase: () => Promise.resolve(adapter),
    generateId: () => "id",
    toSQLiteTimestamp: (d: Date) => d.toISOString(),
  };
});
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModels: () =>
    Promise.resolve({
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

it("barre de recherche, sortie et temps", async () => {
  fixture.db = new DatabaseSync(process.env.BARRE_BASE ?? "");
  const { searchAllPatientsFastLexical } = await import(
    "@/modules/consultations/local-ai/embedding-store"
  );
  const search = (query: string) =>
    searchAllPatientsFastLexical(
      {
        sourceTypes: [...FILTERS.sourceTypes],
        sections: [...FILTERS.sections],
      },
      query
    );
  // La première recherche peut construire l'index de mots : elle ne compte pas.
  await search(LEXICAL_QUERIES[0]);
  const runs: Array<{ query: string; ms: number; results: unknown[] }> = [];
  for (const query of LEXICAL_QUERIES) {
    const start = performance.now();
    const results = await search(query);
    runs.push({
      query,
      ms: Math.round((performance.now() - start) * 10) / 10,
      results,
    });
  }
  writeFileSync(process.env.BARRE_OUT ?? "/dev/stdout", JSON.stringify(runs));
  fixture.db.close();
  expect(runs.length).toBe(LEXICAL_QUERIES.length);
});
