import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The all-patients word search reads passages page by page and stops once its answer (the first 15 sources) is
// settled. With the word index, without it (a network host still on an older version) or when the index fails half
// way, the answer must be the one the full scan gave: the first 15 matching sources, in passage order.
const fixture = vi.hoisted(() => ({
  db: null as unknown as DatabaseSync,
  failMatch: false,
  selects: [] as string[],
}));
vi.mock("@/services/sqlite/database", () => {
  const adapter = {
    select: (sql: string, params: unknown[] = []) => {
      fixture.selects.push(sql);
      if (fixture.failMatch && sql.includes("MATCH")) {
        return Promise.reject(new Error("fts5: corrupt"));
      }
      return Promise.resolve(
        fixture.db.prepare(sql).all(...(params as never[]))
      );
    },
    execute: (sql: string, params: unknown[] = []) =>
      Promise.resolve(fixture.db.prepare(sql).run(...(params as never[]))),
  };
  const run = (operation: (db: typeof adapter) => unknown) =>
    Promise.resolve(operation(adapter));
  return {
    runDbRead: run,
    runDbOperation: run,
    runDbTransaction: run,
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

import { searchAllPatientsFastLexical } from "../../../src/modules/consultations/local-ai/embedding-store";
import { PASSAGE_MODEL_KEY } from "../../../src/modules/consultations/local-ai/passage-search";
import { matchesSearchTerms } from "../../../src/modules/consultations/local-ai/veterinary-lexicon";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";

const FILTERS = {
  sourceTypes: ["soap" as const],
  sections: [
    "subjective" as const,
    "objective" as const,
    "assessment" as const,
    "plan" as const,
  ],
};
const TEXTS = [
  "Boiterie postérieure droite.",
  "Otite externe, prurit.",
  "Vomissements et diarrhée.",
  "Claudication du membre.",
  "Contrôle sans particularité.",
];

async function clinic(withIndex: boolean) {
  const db = new DatabaseSync(":memory:");
  const migrations = withIndex
    ? SQLITE_MIGRATIONS
    : SQLITE_MIGRATIONS.filter((m) => m.version < "046");
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length
          ? db.prepare(sql).run(...(params as never[]))
          : db.exec(sql),
      select: async <T>(sql: string, params: unknown[] = []) =>
        db.prepare(sql).all(...(params as never[])) as T,
    },
    migrations
  );
  db.exec(
    "INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','v@x.invalid','x','Dr','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('o','A','B','0');"
  );
  const vector = new Uint8Array(3072).fill(1);
  let n = 0;
  for (let p = 0; p < 30; p++) {
    db.prepare(
      "INSERT INTO patients(id,owner_id,name,species,sex) VALUES(?,'o',?,'chien','M')"
    ).run(`p${p}`, `Animal ${p}`);
    for (let v = 0; v < 3; v++) {
      const soap = `s${p}-${v}`;
      db.prepare(
        "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES(?,?,'o','vet','C','2026-01-01 10:00:00','2026-01-01 10:30:00','completed','Consultation')"
      ).run(`a${soap}`, `p${p}`);
      db.prepare(
        "INSERT INTO consultation_soaps(id,appointment_id,patient_id,subjective,objective,assessment,plan,content,vet_id) VALUES(?,?,?,'s','o','a','p','{}','vet')"
      ).run(soap, `a${soap}`, `p${p}`);
      for (const section of ["subjective", "objective", "assessment", "plan"]) {
        db.prepare(
          "INSERT INTO embeddings(id,source_type,source_id,patient_id,section,chunk_index,embedding,chunk_text,source_key,model_key,document_type,soap_id) VALUES(?,?,?,?,?,0,?,?,?,?,?,?)"
        ).run(
          `e${n}`,
          "soap",
          soap,
          `p${p}`,
          section,
          vector,
          TEXTS[n % TEXTS.length],
          `${soap}:${section}`,
          PASSAGE_MODEL_KEY,
          "consultation",
          soap
        );
        n++;
      }
    }
  }
  return db;
}

/** The rule before the change: every passage in order, those the lexicon accepts, one per source, the first 15. */
function expected(db: DatabaseSync, query: string) {
  const rows = db
    .prepare(
      "SELECT e.source_type AS sourceType, e.source_id AS sourceId, e.section, e.chunk_text AS text FROM embeddings e WHERE e.model_key=? ORDER BY e.patient_id, e.source_id, e.chunk_index, e.source_type, e.section, e.rowid"
    )
    .all(PASSAGE_MODEL_KEY) as Array<{
    sourceType: string;
    sourceId: string;
    section: string;
    text: string;
  }>;
  const seen = new Set<string>();
  const found: string[] = [];
  for (const row of rows) {
    const source = `${row.sourceType}:${row.sourceId}`;
    if (!seen.has(source) && matchesSearchTerms(query, row.text)) {
      seen.add(source);
      found.push(`${source}:${row.section}`);
    }
  }
  return found.slice(0, 15);
}
const got = async (query: string) =>
  (await searchAllPatientsFastLexical(FILTERS, query)).map(
    (r) => `${r.sourceType}:${r.sourceId}:${r.section}`
  );

beforeEach(() => {
  fixture.failMatch = false;
  fixture.selects = [];
});

describe("all-patients word search, read page by page", () => {
  for (const query of [
    "boiterie",
    "otite",
    "vomissements",
    "contrôle",
    "fracture",
  ]) {
    it(`gives the full-scan answer for « ${query} » with the word index`, async () => {
      fixture.db = await clinic(true);
      expect(await got(query)).toEqual(expected(fixture.db, query));
    });
    it(`gives the same answer for « ${query} » without the word index`, async () => {
      fixture.db = await clinic(false);
      expect(await got(query)).toEqual(expected(fixture.db, query));
    });
    it(`gives the same answer for « ${query} » when the index fails`, async () => {
      fixture.db = await clinic(true);
      fixture.failMatch = true;
      expect(await got(query)).toEqual(expected(fixture.db, query));
    });
  }

  it("stops reading once the first 15 sources are found", async () => {
    fixture.db = await clinic(true);
    await got("boiterie");
    expect(
      fixture.selects.some((sql) => sql.includes("FROM consultation_soaps s\n"))
    ).toBe(false);
    expect(
      fixture.selects.filter((sql) => sql.includes("FROM appointments a"))
        .length
    ).toBe(0);
  });
});
