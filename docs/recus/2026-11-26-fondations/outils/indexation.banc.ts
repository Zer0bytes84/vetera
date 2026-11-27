// Reproduction du parcours d'indexation « tous patients » sur une COPIE DE TRAVAIL (écrite), faux moteur d'embeddings.
// REPRO_BASE=<copie de travail> npx vitest run --config docs/recus/2026-11-26-fondations/outils/vitest.banc.config.ts indexation
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  db: null as unknown as DatabaseSync,
  embeds: [] as Array<{ model: string; texts: number; maxLength: number }>,
}));
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
  const read = (operation: (db: typeof adapter) => unknown) =>
    Promise.resolve().then(() => operation(adapter));
  const transaction = async (operation: (db: typeof adapter) => unknown) => {
    fixture.db.exec("BEGIN");
    try {
      const value = await operation(adapter);
      fixture.db.exec("COMMIT");
      return value;
    } catch (error) {
      fixture.db.exec("ROLLBACK");
      throw error;
    }
  };
  let n = 0;
  return {
    runDbRead: read,
    runDbOperation: read,
    runDbTransaction: transaction,
    getDatabase: async () => adapter,
    generateId: () => `repro-${++n}`,
    toSQLiteTimestamp: (d: Date) => d.toISOString(),
  };
});
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModels: async () => ({
    embeddingReady: true,
    embedding2Ready: true,
    arcticReady: true,
    root: "local",
  }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));
vi.mock("@/modules/consultations/local-ai/inference-client", () => ({
  LocalInferenceSession: {
    create: async () => ({
      request: (message: { texts: string[]; model?: string }) => {
        fixture.embeds.push({
          model: message.model ?? "embeddinggemma",
          texts: message.texts.length,
          maxLength: Math.max(...message.texts.map((t) => t.length)),
        });
        const size = message.model === "arctic" ? 1024 : 768;
        return Promise.resolve({
          type: "embedded",
          vectors: message.texts.map((t) =>
            Array.from(
              { length: size },
              (_, i) => ((t.charCodeAt(i % t.length) || 1) % 7) + 1
            )
          ),
        });
      },
      isClosed: false,
      close() {
        this.isClosed = true;
      },
      park() {
        // Rien à rendre : la fausse session ne tient aucun modèle.
      },
      resume() {
        // Idem.
      },
    }),
  },
}));

it("indexation de chaque patient", async () => {
  const base = process.env.REPRO_BASE;
  if (!base) {
    throw new Error("REPRO_BASE manquant");
  }
  fixture.db = new DatabaseSync(base);
  const { indexPatientDocuments, indexAllPatientsDocuments } = await import(
    "@/modules/consultations/local-ai/embedding-store"
  );
  const patients = fixture.db
    .prepare("SELECT id, name FROM patients ORDER BY id")
    .all() as Array<{ id: string; name: string }>;
  const count = () =>
    (
      fixture.db.prepare("SELECT COUNT(*) AS n FROM embeddings").get() as {
        n: number;
      }
    ).n;
  const before = count();
  let all: unknown;
  try {
    all = {
      indexed: await indexAllPatientsDocuments(new AbortController().signal),
    };
  } catch (error) {
    all = {
      error: String((error as Error).message),
      stack: String((error as Error).stack)
        .split("\n")
        .slice(0, 8),
    };
  }
  const afterAll = count();
  const each: unknown[] = [];
  for (const p of patients) {
    const start = count();
    try {
      const n = await indexPatientDocuments(
        p.id,
        new AbortController().signal,
        () => {
          // Progression non suivie.
        }
      );
      each.push({ patient: p.name, indexed: n, rows: count() - start });
    } catch (error) {
      each.push({
        patient: p.name,
        error: String((error as Error).message),
        stack: String((error as Error).stack)
          .split("\n")
          .slice(0, 8),
      });
    }
  }
  writeFileSync(
    process.env.REPRO_OUT ?? "/dev/stdout",
    JSON.stringify(
      {
        before,
        all,
        afterAll,
        each,
        after: count(),
        embeds: fixture.embeds.length,
      },
      null,
      1
    )
  );
  fixture.db.close();
  expect(true).toBe(true);
});
