// Vérifie sur une base (copie, lecture seule) que, dans un dossier, l'assistant a tout ce que la barre y trouve
// pour la même question. Aucun texte clinique n'est écrit : types, identifiants et raisons seulement.
// DIAG_BASE=<copie.db> PATIENT_ID=<id> QUERY="Boitement" DIAG_OUT=<json> \
//   npx vitest run --config docs/recus/2026-11-26-fondations/outils/vitest.banc.config.ts perimetre
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ db: null as unknown as DatabaseSync }));
vi.mock("@/services/sqlite/database", () => {
  const adapter = {
    select: (sql: string, params: unknown[] = []) =>
      Promise.resolve(
        JSON.parse(
          JSON.stringify(fixture.db.prepare(sql).all(...(params as never[])))
        )
      ),
    execute: () => Promise.reject(new Error("lecture seule")),
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
      embeddingReady: false,
      embedding2Ready: false,
      arcticReady: false,
      root: "local",
    }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));

const TYPES = ["soap", "document", "protocol", "consultation", "patient"];
const SECTIONS = [
  "subjective",
  "objective",
  "assessment",
  "plan",
  "document",
  "protocol",
  "consultation",
  "patient",
];

it("périmètre d'un dossier", async () => {
  fixture.db = new DatabaseSync(process.env.DIAG_BASE ?? "", {
    readOnly: true,
  });
  const patientId = process.env.PATIENT_ID ?? "";
  const query = process.env.QUERY ?? "Boitement";
  const { findPatientUnreviewedMatches, searchAllPatientsFastLexical } =
    await import("@/modules/consultations/local-ai/embedding-store");
  const bar = (
    await searchAllPatientsFastLexical(
      { sourceTypes: TYPES as never, sections: SECTIONS as never },
      query
    )
  ).filter((match) => match.patientId === patientId);
  const words = await findPatientUnreviewedMatches(
    { patientId, sourceTypes: TYPES as never, sections: SECTIONS as never },
    query
  );
  const assistant = new Set(
    words.map(({ sourceType, sourceId }) => `${sourceType}:${sourceId}`)
  );
  const out = {
    query,
    barre: bar.map(({ sourceType, sourceId }) => `${sourceType}:${sourceId}`),
    assistantParMots: words.map(({ sourceType, sourceId, reason }) => ({
      source: `${sourceType}:${sourceId}`,
      reason,
    })),
    // Validated SOAP notes and documents are found by the semantic search, not by this word list.
    absentsHorsNotesValidees: bar
      .filter(
        ({ sourceType, sourceId }) =>
          !assistant.has(`${sourceType}:${sourceId}`) &&
          (sourceType === "consultation" || sourceType === "patient")
      )
      .map(({ sourceType, sourceId }) => `${sourceType}:${sourceId}`),
  };
  writeFileSync(
    process.env.DIAG_OUT ?? "/dev/stdout",
    JSON.stringify(out, null, 1)
  );
  fixture.db.close();
  expect(out.absentsHorsNotesValidees).toEqual([]);
});
