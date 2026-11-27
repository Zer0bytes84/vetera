import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  embeddingBytesFromHex,
  embeddingFromHex,
  embeddingToHex,
  passageCosine,
} from "../../../src/modules/consultations/local-ai/embedding-index";
import {
  rankAllPatientsPassages,
  rankAllPatientsPassagesNatively,
  readPatientSearchRows,
} from "../../../src/modules/consultations/local-ai/embedding-store";
import { syncLexicalIndex } from "../../../src/modules/consultations/local-ai/lexical-index";
import type {
  NativeVectorQuery,
  NativeVectorReply,
} from "../../../src/modules/consultations/local-ai/native-vector-search";
import {
  MODEL_CALIBRATION,
  PASSAGE_MODEL_KEY,
  rankPassages,
} from "../../../src/modules/consultations/local-ai/passage-search";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";

// La recherche « tous patients » réparée (une requête, vecteurs typés) doit rendre exactement ce que rendait la boucle
// par patient : mêmes résultats, même ordre, scores égaux aux derniers bits près.
const FILTERS = {
  sourceTypes: ["soap", "document", "protocol"] as const,
  sections: [
    "subjective",
    "objective",
    "assessment",
    "plan",
    "document",
    "protocol",
  ] as const,
};
const filters = {
  sourceTypes: [...FILTERS.sourceTypes],
  sections: [...FILTERS.sections],
} as Parameters<typeof rankAllPatientsPassages>[1];

let seed = 1;
const random = () => {
  seed = (seed * 16_807) % 2_147_483_647;
  return seed / 2_147_483_647 - 0.5;
};
const randomVector = () => Array.from({ length: 768 }, random);
const near = (base: number[], noise: number) =>
  base.map((value) => value + noise * random());

let db: DatabaseSync;
const adapter = {
  select: <T>(sql: string, params: unknown[] = []) =>
    Promise.resolve(db.prepare(sql).all(...(params as never[])) as T),
  execute: (sql: string, params: unknown[] = []) =>
    Promise.resolve(db.prepare(sql).run(...(params as never[]))),
};

const TEXTS = [
  "Boiterie postérieure droite, méloxicam prescrit.",
  "Vomissements depuis deux jours, déshydratation modérée.",
  "Otite externe bilatérale, prurit intense.",
  "Créatinine 2 mg/dl, insuffisance rénale chronique.",
  "Contrôle dans dix jours, plaie suture propre.",
];

let target: number[];
beforeEach(async () => {
  seed = 7;
  db = new DatabaseSync(":memory:");
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length
          ? db.prepare(sql).run(...(params as never[]))
          : db.exec(sql),
      select: async <T>(sql: string, params: unknown[] = []) =>
        db.prepare(sql).all(...(params as never[])) as T,
    },
    SQLITE_MIGRATIONS
  );
  db.exec(
    "INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','v@x.invalid','x','Dr','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('o','A','B','0');"
  );
  target = randomVector();
  const insertEmbedding = db.prepare(
    "INSERT INTO embeddings(id,source_type,source_id,patient_id,section,chunk_index,embedding,chunk_text,source_key,model_key,document_type,soap_id) VALUES(?,?,?,?,?,?,unhex(?),?,?,?,?,?)"
  );
  let n = 0;
  for (const patient of ["p1", "p2", "p3", "p4"]) {
    db.prepare(
      "INSERT INTO patients(id,owner_id,name,species,sex) VALUES(?,'o',?,'chien','M')"
    ).run(patient, `Animal ${patient}`);
    for (let visit = 0; visit < 4; visit++) {
      const appointment = `a-${patient}-${visit}`;
      const soap = `s-${patient}-${visit}`;
      db.prepare(
        "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES(?,?,'o','vet','C','2026-01-01 10:00:00','2026-01-01 10:30:00','completed','Consultation')"
      ).run(appointment, patient);
      db.prepare(
        "INSERT INTO consultation_soaps(id,appointment_id,patient_id,subjective,objective,assessment,plan,content,vet_id) VALUES(?,?,?,'s','o','a','p','{}','vet')"
      ).run(soap, appointment, patient);
      for (const section of ["subjective", "objective", "assessment", "plan"]) {
        const text = TEXTS[n % TEXTS.length];
        // Some passages lie close to the question, others are noise; one is far but holds the exact terms.
        const vector =
          n % 7 === 0
            ? near(target, 0.6)
            : n % 11 === 0
              ? near(target, 2)
              : randomVector();
        insertEmbedding.run(
          `e${n}`,
          "soap",
          soap,
          patient,
          section,
          0,
          embeddingToHex(vector),
          text,
          `${soap}:${section}`,
          PASSAGE_MODEL_KEY,
          "consultation",
          soap
        );
        n++;
      }
    }
  }
});

async function perPatientLoop(query: string, vector: number[]) {
  const patients = db
    .prepare("SELECT id,name FROM patients ORDER BY id")
    .all() as Array<{ id: string; name: string }>;
  const ranked: Array<
    ReturnType<typeof rankPassages>[number] & { patientName: string }
  > = [];
  for (const patient of patients) {
    const scope = { patientId: patient.id, ...filters };
    const rows = await readPatientSearchRows(adapter, scope, "passages");
    ranked.push(
      ...rankPassages(
        rows,
        vector,
        scope,
        query,
        5,
        [],
        MODEL_CALIBRATION.embeddinggemma
      ).map((row) => ({
        ...row,
        patientName: patient.name,
      }))
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

describe("typed passage cosine", () => {
  it("decodes a stored vector to the same float32 values, and refuses what embeddingFromHex refuses", () => {
    const vector = randomVector();
    const hex = embeddingToHex(vector);
    const raw = embeddingBytesFromHex(hex);
    const norm = Math.hypot(...(raw ?? []));
    expect(Array.from(raw ?? [], (value) => value / norm)).toEqual(
      embeddingFromHex(hex)
    );
    expect(embeddingBytesFromHex("zz")).toBeNull();
    expect(embeddingBytesFromHex("0".repeat(6144))).toBeNull();
    expect(embeddingBytesFromHex("ffffffff".repeat(768))).toBeNull();
  });

  it("gives rankPassages the cosine it would compute itself, to the last bits", () => {
    const query = randomVector();
    const unit = Float64Array.from(
      query,
      (value) => value / Math.hypot(...query)
    );
    for (let i = 0; i < 20; i++) {
      const hex = embeddingToHex(randomVector());
      const viaArrays = rankPassages(
        [
          {
            patientId: "p",
            sourceId: `s${i}`,
            sourceType: "soap",
            documentType: "consultation",
            section: "plan",
            chunkIndex: 0,
            text: "x",
            sourceKey: "k",
            vector: embeddingFromHex(hex),
          },
        ],
        query,
        { patientId: "p", sourceTypes: ["soap"], sections: ["plan"] },
        "question sans rapport",
        5,
        [],
        { ...MODEL_CALIBRATION.embeddinggemma, minimum: -1 }
      );
      const cosine = passageCosine(
        embeddingBytesFromHex(hex) as Float32Array,
        unit
      );
      expect(Math.abs(cosine - viaArrays[0].score)).toBeLessThan(1e-12);
    }
  });
});

describe("all-patients passage search in one read", () => {
  const strip = (rows: Array<{ score: number }>) =>
    rows.map(({ score, ...row }) => ({
      ...row,
      score: Math.round(score * 1e12),
    }));
  it("returns what the per-patient loop returned", async () => {
    for (const [query, vector] of [
      ["boiterie méloxicam", target],
      ["otite", near(target, 1)],
      ["créatinine 2", target],
      ["chat qui ne mange plus", randomVector()],
      ["déshydratation", randomVector()],
    ] as const) {
      const expected = await perPatientLoop(query, [...vector]);
      const got = await rankAllPatientsPassages(
        adapter,
        filters,
        query,
        [...vector],
        "passages"
      );
      expect(strip(got)).toEqual(strip(expected));
    }
  });

  it("keeps a far passage that holds the exact terms of the question", async () => {
    const query = "vomissements déshydratation";
    const vector = randomVector();
    const expected = await perPatientLoop(query, vector);
    const got = await rankAllPatientsPassages(
      adapter,
      filters,
      query,
      vector,
      "passages"
    );
    expect(strip(got)).toEqual(strip(expected));
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((row) => row.match === "text")).toBe(true);
  });

  it("reads the whole clinic in a single query", async () => {
    let selects = 0;
    const counting = {
      ...adapter,
      select: <T>(sql: string, params: unknown[] = []) => {
        selects++;
        return adapter.select<T>(sql, params);
      },
    };
    await rankAllPatientsPassages(
      counting,
      { sourceTypes: ["soap"], sections: ["plan"] },
      "otite",
      target,
      "passages"
    );
    expect(selects).toBe(1);
  });
});

/** What recherche_vecteurs does, written in JS over the same table: rows above the floor, plus the extra rows. */
function fakeNative(request: NativeVectorQuery): Promise<NativeVectorReply> {
  const rows: number[] = [];
  const cosines: number[] = [];
  const extra = new Set(request.extraRows);
  const unit = Float64Array.from(request.unitQuery);
  for (const row of db
    .prepare(
      "SELECT rowid AS id, hex(embedding) AS hex FROM embeddings WHERE model_key = ? ORDER BY rowid"
    )
    .all(request.modelKey) as Array<{ id: number; hex: string }>) {
    const raw = embeddingBytesFromHex(row.hex);
    if (!raw) {
      continue;
    }
    const cosine = passageCosine(raw, unit);
    if (cosine >= request.floor || extra.has(row.id)) {
      rows.push(row.id);
      cosines.push(cosine);
    }
  }
  return Promise.resolve({
    rows,
    cosines,
    indexed: rows.length,
    loaded: false,
    loadMs: 0,
    searchMs: 0,
  });
}

describe("all-patients passage search with native cosines", () => {
  it("does not read the passages below the floor when the answer is already out of their reach", async () => {
    await syncLexicalIndex(adapter as never);
    const calls: number[] = [];
    const counting = (request: NativeVectorQuery) => {
      calls.push(request.extraRows.length);
      return fakeNative(request);
    };
    const expected = await rankAllPatientsPassages(
      adapter,
      filters,
      "boiterie",
      target,
      "passages",
      true
    );
    const got = await rankAllPatientsPassagesNatively(
      adapter,
      filters,
      "boiterie",
      target,
      "passages",
      counting
    );
    expect(got.map(({ score, sourceId }) => [sourceId, score])).toEqual(
      expected.map(({ score, sourceId }) => [sourceId, score])
    );
    expect(calls).toEqual([0]);
  });

  it("returns exactly what the TypeScript search returns", async () => {
    await syncLexicalIndex(adapter as never);
    const drop = (rows: Record<string, unknown>[]) =>
      rows.map(({ embedding: _embedding, ...row }) => row);
    for (const [query, vector] of [
      ["boiterie méloxicam", target],
      ["otite", near(target, 1)],
      ["créatinine 2", target],
      ["vomissements déshydratation", randomVector()],
      ["chat qui ne mange plus", randomVector()],
    ] as const) {
      const expected = await rankAllPatientsPassages(
        adapter,
        filters,
        query,
        [...vector],
        "passages",
        true
      );
      const got = await rankAllPatientsPassagesNatively(
        adapter,
        filters,
        query,
        [...vector],
        "passages",
        fakeNative
      );
      expect(drop(got)).toEqual(drop(expected));
    }
  });

  it("rejects when Rust cannot answer, so the caller can fall back", async () => {
    await expect(
      rankAllPatientsPassagesNatively(
        adapter,
        filters,
        "otite",
        target,
        "passages",
        () => Promise.reject(new Error("no host route"))
      )
    ).rejects.toThrow("no host route");
  });
});
