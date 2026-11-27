// Diagnostic de couverture de l'index sémantique, en LECTURE SEULE, sur une base réelle (de préférence une copie).
// Pour chaque note SOAP et chaque document : la règle exacte de l'app (isSoapReviewed, documentSearchChunks),
// la raison d'un refus, et les passages présents dans embeddings. Puis la question de la barre, avec la table d'origine
// de chaque résultat. Aucun texte clinique n'est écrit, seulement des longueurs et des noms de rubriques.
// DIAG_BASE=<copie.db> DIAG_OUT=<sortie.json> DIAG_QUERY="Boitement de l'animal" \
//   npx vitest run --config docs/recus/2026-11-26-fondations/outils/vitest.banc.config.ts diagnostic
import { existsSync, writeFileSync } from "node:fs";
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
    // La base est ouverte en lecture seule : toute écriture échoue, et l'app la traite comme un index indisponible.
    execute: () => Promise.reject(new Error("lecture seule")),
  };
  const run = (operation: (db: typeof adapter) => unknown) =>
    Promise.resolve().then(() => operation(adapter));
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
    embeddingReady: false,
    embedding2Ready: false,
    arcticReady: false,
    root: "local",
  }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));

const SECTIONS = ["subjective", "objective", "assessment", "plan"] as const;
type Row = Record<string, string | null>;

/** Why isSoapReviewed refuses a note, in the order of its checks. */
function soapRefusal(
  s: Row,
  review: Record<string, unknown> | undefined,
  currentKey: string
) {
  if (s.aiDraft) {
    return "brouillon IA non effacé (ai_draft)";
  }
  if (!SECTIONS.some((k) => (s[k] ?? "").trim())) {
    return "quatre rubriques vides";
  }
  if (!review) {
    return "aucune marque soapReview";
  }
  if (typeof review.reviewedAt !== "string" || !review.reviewedAt) {
    return "reviewedAt absent";
  }
  if (review.sourceKey !== currentKey) {
    return "texte modifié après validation (sourceKey)";
  }
  return "autre";
}

/** The four sections as they were when the note was validated, or null. */
function storedSections(
  review: Record<string, unknown> | undefined
): unknown[] | null {
  if (typeof review?.sourceKey !== "string") {
    return null;
  }
  try {
    const value: unknown = JSON.parse(review.sourceKey);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Why documentSearchChunks refuses a document. */
function documentRefusal(
  n: Row,
  tags: Record<string, unknown>,
  tagsError: boolean,
  error: unknown
) {
  if (!n.patientId) {
    return "sans patient";
  }
  if (tagsError) {
    return "tags illisibles";
  }
  if (!(tags.clinicalDocument || tags.offVisitNote)) {
    return `ni clinicalDocument ni offVisitNote (clés : ${Object.keys(tags).join(", ") || "aucune"})`;
  }
  return String((error as Error).message);
}

it("diagnostic de couverture", async () => {
  const base = process.env.DIAG_BASE;
  if (!base) {
    throw new Error("DIAG_BASE manquant");
  }
  fixture.db = new DatabaseSync(base, { readOnly: true });
  const { isSoapReviewed, soapMetadata, soapSourceKey } = await import(
    "@/modules/consultations/local-ai/soap-review"
  );
  const { documentSearchChunks } = await import(
    "@/modules/consultations/local-ai/embedding-index"
  );
  const { plainDocumentText, searchAllPatientsFastLexical } = await import(
    "@/modules/consultations/local-ai/embedding-store"
  );
  const db = fixture.db;
  const embeddings = (type: "soap" | "note", id: string) =>
    Object.fromEntries(
      (
        db
          .prepare(
            type === "soap"
              ? "SELECT model_key AS k, COUNT(*) AS n, COUNT(DISTINCT source_key) AS keys FROM embeddings WHERE source_type='soap' AND source_id=? GROUP BY model_key"
              : "SELECT model_key AS k, COUNT(*) AS n, COUNT(DISTINCT source_key) AS keys FROM embeddings WHERE source_type!='soap' AND source_id=? GROUP BY model_key"
          )
          .all(id) as Array<{ k: string; n: number; keys: number }>
      ).map((r) => [r.k, { passages: r.n, versions: r.keys }])
    );

  const soaps = db
    .prepare(
      "SELECT s.id, s.patient_id AS patientId, p.name AS patient, s.subjective, s.objective, s.assessment, s.plan, s.content, s.ai_draft AS aiDraft, s.created_at AS createdAt, s.updated_at AS updatedAt FROM consultation_soaps s LEFT JOIN patients p ON p.id=s.patient_id ORDER BY p.name, s.created_at"
    )
    .all() as Record<string, string | null>[];
  const soapReport = soaps.map((s) => {
    const note = {
      ...s,
      subjective: s.subjective ?? "",
      objective: s.objective ?? "",
      assessment: s.assessment ?? "",
      plan: s.plan ?? "",
      content: s.content ?? "{}",
    } as never;
    const review = soapMetadata(s.content ?? "{}").soapReview as
      | Record<string, unknown>
      | undefined;
    const stored = storedSections(review);
    const differs = stored
      ? SECTIONS.filter((k, i) => stored[i] !== (s[k] ?? ""))
      : null;
    const eligible = isSoapReviewed(note);
    const reason = eligible
      ? null
      : soapRefusal(s, review, soapSourceKey(note));
    return {
      patient: s.patient,
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      reviewedAt: review?.reviewedAt ?? null,
      eligible,
      reason,
      rubriquesModifiees: differs,
      longueurs: Object.fromEntries(
        SECTIONS.map((k) => [k, (s[k] ?? "").length])
      ),
      depasse6000: SECTIONS.filter((k) => (s[k] ?? "").length > 6000),
      embeddings: embeddings("soap", s.id as string),
    };
  });

  const notes = db
    .prepare(
      "SELECT n.id, n.patient_id AS patientId, p.name AS patient, n.title, n.content, n.tags, n.created_at AS createdAt, n.updated_at AS updatedAt FROM notes n LEFT JOIN patients p ON p.id=n.patient_id ORDER BY p.name, n.created_at"
    )
    .all() as Record<string, string | null>[];
  const noteReport = notes.map((n) => {
    let tags: Record<string, unknown> = {};
    let tagsError = false;
    try {
      tags = JSON.parse(n.tags ?? "{}") ?? {};
    } catch {
      tagsError = true;
    }
    const marks = Object.keys(tags);
    let eligible = false;
    let reason: string | null = null;
    try {
      documentSearchChunks(n as never, plainDocumentText(n.content ?? ""));
      eligible = true;
    } catch (error) {
      reason = documentRefusal(n, tags, tagsError, error);
    }
    return {
      patient: n.patient,
      id: n.id,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      clesTags: marks,
      eligible,
      reason,
      longueurTexte: plainDocumentText(n.content ?? "").length,
      embeddings: embeddings("note", n.id as string),
    };
  });

  const parPatient = db
    .prepare(
      "SELECT p.name AS patient, e.source_type AS type, e.model_key AS modele, COUNT(*) AS passages, COUNT(DISTINCT e.source_id) AS sources FROM embeddings e LEFT JOIN patients p ON p.id=e.patient_id GROUP BY p.name, e.source_type, e.model_key ORDER BY p.name"
    )
    .all();
  const tables = Object.fromEntries(
    ["patient_documents", "appointments"].map((t) => {
      try {
        return [
          t,
          (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number })
            .n,
        ];
      } catch {
        return [t, null];
      }
    })
  );

  // A copy made without its -wal file misses the latest writes (migrations, passages): say so in the output.
  const state = {
    userVersion: (
      db.prepare("PRAGMA user_version").get() as { user_version: number }
    ).user_version,
    walAcote: existsSync(`${base}-wal`),
  };
  const query = process.env.DIAG_QUERY ?? "Boitement de l'animal";
  const ALL = {
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
  } as never;
  const barre = (await searchAllPatientsFastLexical(ALL, query)).map((m) => ({
    patient: m.patientName,
    type: m.sourceType,
    rubrique: m.section,
    sourceId: m.sourceId,
    // D'où vient le résultat : un passage indexé (embeddings) ou une lecture directe d'une table.
    dansEmbeddings: !!db
      .prepare("SELECT 1 FROM embeddings WHERE source_id=? LIMIT 1")
      .get(m.sourceId),
  }));

  const out = {
    base,
    state,
    query,
    soaps: soapReport,
    documents: noteReport,
    embeddingsParPatient: parPatient,
    tables,
    barre,
  };
  if (process.env.DIAG_OUT) {
    writeFileSync(process.env.DIAG_OUT, JSON.stringify(out, null, 1));
  }
  console.log(
    JSON.stringify(
      {
        state,
        soaps: soapReport.map((s) => [
          s.patient,
          s.eligible ? "indexable" : s.reason,
          s.rubriquesModifiees,
          Object.keys(s.embeddings),
        ]),
        documents: noteReport.map((n) => [
          n.patient,
          n.eligible ? "indexable" : n.reason,
          Object.keys(n.embeddings),
        ]),
        barre: barre.map((b) => [
          b.patient,
          b.type,
          b.rubrique,
          b.dansEmbeddings,
        ]),
      },
      null,
      1
    )
  );
  db.close();
  expect(true).toBe(true);
});
