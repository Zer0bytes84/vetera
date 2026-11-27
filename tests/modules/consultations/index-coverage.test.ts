import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mustExist } from "@/lib/must-exist";
import { reviewedSoapContent } from "../../../src/modules/consultations/local-ai/soap-review";
import { emptyPatientScopeMessage } from "../../../src/modules/consultations/search-scope";
import {
  isValidationLost,
  VALIDATION_LOST_MESSAGE,
} from "../../../src/modules/consultations/soap-panel-state";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";

// Couverture de l'index sémantique sur une clinique qui a déjà un historique : anciennes notes jamais marquées,
// notes modifiées après validation, un patient dont l'indexation échoue, et le modèle pris par une autre tâche.

const fixture = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  nextId: 0,
  embeds: 0,
  /** Any text containing this word makes the embedding fail (a model error on one patient). */
  poison: null as string | null,
  failQueries: false,
  /** Questions far from every note (no semantic neighbour), as with a real model for an unrelated question. */
  distantQueries: false,
  /** While set, every embedding waits for it: lets a test act while the catch-up holds the model. */
  hold: null as Promise<void> | null,
  started: null as (() => void) | null,
}));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `row-${++fixture.nextId}`,
  runDbRead: async (fn: (db: unknown) => unknown) => fn(adapter()),
  runDbOperation: async (fn: (db: unknown) => unknown) => fn(adapter()),
  runDbTransaction: async (fn: (db: unknown) => unknown) => {
    const db = mustExist(fixture.db, "test database");
    db.exec("BEGIN");
    try {
      const result = await fn(adapter());
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  },
}));
function adapter() {
  return {
    select: async <T>(sql: string, params: unknown[] = []) =>
      mustExist(fixture.db, "test database")
        .prepare(sql)
        .all(...(params as never[])) as T,
    execute: async (sql: string, params: unknown[] = []) =>
      mustExist(fixture.db, "test database")
        .prepare(sql)
        .run(...(params as never[])),
  };
}
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModels: async () => ({
    embeddingReady: true,
    embedding2Ready: false,
    arcticReady: false,
    root: "local",
  }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));
// A session that behaves like LocalInferenceSession towards the lease: it reserves it (preemptibly when asked),
// closing it (abort, preemption) releases the lease at once and rejects the request in progress.
vi.mock("@/modules/consultations/local-ai/inference-client", async () => {
  const { reserveClinicalModel } = await import(
    "../../../src/modules/consultations/local-ai/model-lease"
  );
  const abortError = () => new DOMException("Tâche annulée.", "AbortError");
  return {
    LocalInferenceSession: {
      // biome-ignore lint/suspicious/useAwait: comme LocalInferenceSession.create, les refus (signal annulé, modèle réservé) doivent arriver en rejet de promesse
      create: async (
        _kind: string,
        signal: AbortSignal,
        _onProgress: unknown,
        onPreempt?: () => void
      ) => {
        if (signal.aborted) {
          throw abortError();
        }
        const release = reserveClinicalModel(onPreempt);
        let reject: ((error: Error) => void) | null = null;
        const session = {
          isClosed: false,
          close() {
            if (session.isClosed) {
              return;
            }
            session.isClosed = true;
            reject?.(abortError());
            release();
          },
          park() {
            session.close();
          },
          resume() {
            throw new Error("Session locale fermée.");
          },
          request: (message: { texts: string[]; query?: boolean }) =>
            new Promise((resolve, fail) => {
              reject = fail;
              fixture.started?.();
              const answer = () => {
                if (session.isClosed) {
                  return;
                }
                if (message.query && fixture.failQueries) {
                  fail(new Error("Le moteur local n’a pas pu démarrer."));
                  return;
                }
                if (
                  fixture.poison &&
                  message.texts.some((text) =>
                    text.includes(fixture.poison as string)
                  )
                ) {
                  fail(new Error("Modèle indisponible pour ce texte"));
                  return;
                }
                fixture.embeds += message.texts.length;
                resolve({
                  type: "embedded",
                  vectors: message.texts.map((_, i) =>
                    Array.from({ length: 768 }, (__, d) => {
                      if (message.query && fixture.distantQueries) {
                        return d === 767 ? 1 : 0;
                      }
                      return d === i % 768 ? 1 : 0.01;
                    })
                  ),
                });
              };
              if (fixture.hold) {
                void fixture.hold.then(answer);
              } else {
                answer();
              }
            }),
        };
        signal.addEventListener("abort", () => session.close(), { once: true });
        return session;
      },
    },
  };
});

import {
  countMatchesOutsidePatient,
  findPatientUnreviewedMatches,
  findUnreviewedSources,
  indexAllPatientsDocuments,
  indexValidatedNote,
  indexValidatedSoap,
  searchAllPatientsClinical,
  searchAllPatientsFastLexical,
  searchPatientDocuments,
} from "../../../src/modules/consultations/local-ai/embedding-store";
import {
  resetIndexCatchUp,
  runIndexCatchUp,
} from "../../../src/modules/consultations/local-ai/index-coverage";
import {
  getIndexCoverage,
  resetIndexCoverage,
} from "../../../src/modules/consultations/local-ai/index-coverage-state";
import {
  isClinicalModelReserved,
  reserveClinicalModel,
} from "../../../src/modules/consultations/local-ai/model-lease";

const ALL = {
  sourceTypes: ["soap", "document", "protocol"],
  sections: [
    "subjective",
    "objective",
    "assessment",
    "plan",
    "document",
    "protocol",
  ],
} as const;
const FIELDS = {
  subjective: "Boitement de l’animal depuis trois jours.",
  objective: "Douleur à la palpation du grasset.",
  assessment: "Rupture du ligament croisé probable.",
  plan: "Repos strict, radiographie.",
};
let directory: string;
let visit = 0;

function db() {
  return mustExist(fixture.db, "test database");
}
function addPatient(id: string, name = id) {
  db()
    .prepare(
      "INSERT INTO patients(id,owner_id,name,species,sex) VALUES(?,'owner',?,'Chien','M')"
    )
    .run(id, name);
}
/** A SOAP note: validated (current mark), never validated (old note), or validated then modified. */
function addSoap(
  patientId: string,
  state: "validated" | "old" | "modified",
  fields: typeof FIELDS = FIELDS
) {
  const appointment = `visit-${++visit}`;
  db()
    .prepare(
      "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES(?,?,'owner','vet','Consultation','2026-10-09 10:00:00','2026-10-09 10:30:00','completed','Consultation')"
    )
    .run(appointment, patientId);
  const content =
    state === "old"
      ? "{}"
      : reviewedSoapContent(
          state === "validated" ? fields : { ...fields, plan: "Ancien plan." },
          "{}",
          "vet"
        );
  const id = `soap-${visit}`;
  db()
    .prepare(
      "INSERT INTO consultation_soaps (id,appointment_id,patient_id,subjective,objective,assessment,plan,content) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      appointment,
      patientId,
      fields.subjective,
      fields.objective,
      fields.assessment,
      fields.plan,
      content
    );
  return id;
}
function addDocument(
  patientId: string,
  validated: boolean,
  title = "Compte rendu"
) {
  const id = `note-${++visit}`;
  const tags = validated
    ? JSON.stringify({
        clinicalDocument: {
          type: "report",
          reviewedAt: "2026-11-10T10:00:00.000Z",
        },
      })
    : "{}";
  db()
    .prepare(
      "INSERT INTO notes(id,user_id,patient_id,title,content,tags) VALUES(?,'vet',?,?,?,?)"
    )
    .run(
      id,
      patientId,
      title,
      "<p>Boitement de l’animal, radiographie du grasset.</p>",
      tags
    );
  return id;
}
function passages(patientId?: string) {
  return (
    db()
      .prepare(
        patientId
          ? "SELECT COUNT(*) AS n FROM embeddings WHERE patient_id=?"
          : "SELECT COUNT(*) AS n FROM embeddings"
      )
      .get(...(patientId ? [patientId] : [])) as { n: number }
  ).n;
}

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "baitari-coverage-"));
  fixture.db = new DatabaseSync(join(directory, "coverage.db"));
  fixture.nextId = 0;
  fixture.embeds = 0;
  fixture.poison = null;
  fixture.failQueries = false;
  fixture.distantQueries = false;
  fixture.hold = null;
  fixture.started = null;
  visit = 0;
  resetIndexCoverage();
  resetIndexCatchUp();
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length
          ? db()
              .prepare(sql)
              .run(...(params as never[]))
          : db().exec(sql),
      select: async <T>(sql: string, params: unknown[] = []) =>
        db()
          .prepare(sql)
          .all(...(params as never[])) as T,
    },
    SQLITE_MIGRATIONS
  );
  db().exec(
    "PRAGMA foreign_keys=ON; INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Dr Test','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0');"
  );
});
afterEach(() => {
  resetIndexCatchUp();
  fixture.db?.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("Une clinique avec un historique : les cas similaires ne restent pas vides en silence", () => {
  it("montre à part, comme non validées, les anciennes notes que la barre trouve par leurs mots", async () => {
    addPatient("dora", "Dora");
    const old = addSoap("dora", "old");
    const modified = addSoap("dora", "modified");
    const document = addDocument("dora", false);
    const scope = {
      patientId: "dora",
      sourceTypes: [...ALL.sourceTypes],
      sections: [...ALL.sections],
    };

    // Rien de validé : la recherche par le sens n'a rien à classer.
    expect(await searchPatientDocuments(scope, "boitement")).toEqual([]);
    // Mais l'assistant voit ce que voit la barre, et dit pourquoi ce n'est pas classé.
    const unreviewed = await findPatientUnreviewedMatches(scope, "boitement");
    expect(
      unreviewed.map(({ sourceId, reason }) => [sourceId, reason])
    ).toEqual([
      [old, "jamais validée"],
      [modified, "modifiée depuis sa validation"],
      [document, "document sans validation"],
    ]);
    const bar = await searchAllPatientsFastLexical(
      { sourceTypes: [...ALL.sourceTypes], sections: [...ALL.sections] },
      "boitement"
    );
    for (const { sourceId } of bar) {
      expect(unreviewed.map((match) => match.sourceId)).toContain(sourceId);
    }
    // Tous patients : les mêmes résultats sont étiquetés « non validés ».
    expect(await findUnreviewedSources(bar)).toEqual(
      new Set([old, modified, document])
    );
  });

  it("un patient dont l'indexation échoue n'arrête plus les autres, et l'erreur est rapportée", async () => {
    addPatient("a-rifka", "Rifka");
    addPatient("b-kejounti", "Kejounti");
    addPatient("c-lisa", "Lisa");
    addSoap("a-rifka", "validated", { ...FIELDS, plan: "Plan empoisonné." });
    addSoap("b-kejounti", "validated");
    addSoap("c-lisa", "validated");
    fixture.poison = "empoisonné";

    const report = await indexAllPatientsDocuments(
      new AbortController().signal
    );

    expect(report.failures).toEqual([
      {
        patientId: "a-rifka",
        patientName: "Rifka",
        message: "Modèle indisponible pour ce texte",
      },
    ]);
    expect(passages("a-rifka")).toBe(0);
    expect(passages("b-kejounti")).toBeGreaterThan(0);
    expect(passages("c-lisa")).toBeGreaterThan(0);
    expect(
      getIndexCoverage().failures.map(({ patientName }) => patientName)
    ).toEqual(["Rifka"]);
  });

  it("la barre garde ses résultats quand la recherche par le sens échoue, mais l'échec n'est plus muet", async () => {
    addPatient("dora", "Dora");
    addSoap("dora", "validated");
    fixture.failQueries = true;
    const issues: string[] = [];

    const found = await searchAllPatientsClinical(
      { sourceTypes: [...ALL.sourceTypes], sections: [...ALL.sections] },
      "boitement",
      new AbortController().signal,
      () => {
        // Progression non suivie.
      },
      (message) => issues.push(message)
    );

    expect(found.length).toBeGreaterThan(0);
    expect(issues).toEqual(["Le moteur local n’a pas pu démarrer."]);
    expect(getIndexCoverage().lastSearchIssue).toBe(
      "Le moteur local n’a pas pu démarrer."
    );
  });

  it("la barre lit toutes les notes SOAP, au-delà des 100 premières", async () => {
    addPatient("rex", "Rex");
    for (let i = 0; i < 120; i++) {
      addSoap("rex", "validated", {
        subjective: `Contrôle annuel ${i}.`,
        objective: "Examen normal.",
        assessment: "Bonne santé.",
        plan: "Rappel dans un an.",
      });
    }
    addPatient("zora", "Zora");
    const late = addSoap("zora", "old", {
      ...FIELDS,
      subjective: "Épistaxis récidivante.",
    });

    const found = await searchAllPatientsFastLexical(
      {
        sourceTypes: ["soap"],
        sections: ["subjective", "objective", "assessment", "plan"],
      },
      "épistaxis"
    );

    expect(found.map(({ sourceId }) => sourceId)).toContain(late);
  });
});

describe("Indexation à la validation et rattrapage en arrière-plan", () => {
  it("une note validée est indexée tout de suite ; une note non validée ne l'est pas", async () => {
    addPatient("dora", "Dora");
    const validated = addSoap("dora", "validated");
    const old = addSoap("dora", "old");
    const document = addDocument("dora", true);

    expect(await indexValidatedSoap(validated)).toBeGreaterThan(0);
    expect(await indexValidatedSoap(old)).toBe(0);
    expect(await indexValidatedNote(document)).toBeGreaterThan(0);
    expect(
      db()
        .prepare("SELECT DISTINCT source_id AS id FROM embeddings ORDER BY id")
        .all()
    ).toEqual([{ id: document }, { id: validated }]);
  });

  it("le rattrapage indexe toute la base existante, patient par patient, et le compteur le dit", async () => {
    for (const [id, name] of [
      ["a", "Rifka"],
      ["b", "Kejounti"],
      ["c", "Lisa"],
    ]) {
      addPatient(id, name);
      addSoap(id, "validated");
    }
    addPatient("d", "Loulou");
    addSoap("d", "old");

    await runIndexCatchUp();

    expect(getIndexCoverage()).toMatchObject({
      status: "complete",
      indexedPatients: 3,
      totalPatients: 3,
      checkedPatients: 4,
      patientCount: 4,
      failures: [],
    });
    expect(passages("a") && passages("b") && passages("c")).toBeTruthy();
    expect(passages("d")).toBe(0);
    // Une seconde passe n'a plus rien à calculer.
    const embeds = fixture.embeds;
    await runIndexCatchUp();
    expect(fixture.embeds).toBe(embeds);
  });

  it("un échec reste affiché avec son patient, les autres patients sont indexés", async () => {
    addPatient("a", "Rifka");
    addSoap("a", "validated", { ...FIELDS, plan: "Plan empoisonné." });
    addPatient("b", "Kejounti");
    addSoap("b", "validated");
    fixture.poison = "empoisonné";

    await runIndexCatchUp();

    expect(getIndexCoverage()).toMatchObject({
      status: "idle",
      indexedPatients: 1,
      totalPatients: 2,
      failures: [
        {
          patientId: "a",
          patientName: "Rifka",
          message: "Modèle indisponible pour ce texte",
        },
      ],
    });
    // Une fois le problème réglé, la passe suivante l'efface.
    fixture.poison = null;
    await runIndexCatchUp();
    expect(getIndexCoverage()).toMatchObject({
      status: "complete",
      indexedPatients: 2,
      failures: [],
    });
  });

  it("cède le modèle à toute autre tâche locale (dictée, recherche), puis reprend", async () => {
    addPatient("a", "Rifka");
    addSoap("a", "validated");
    addPatient("b", "Kejounti");
    addSoap("b", "validated");
    let release: () => void = () => undefined;
    fixture.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      fixture.started = resolve;
    });

    const pass = runIndexCatchUp();
    await started;
    expect(isClinicalModelReserved()).toBe(true);
    // A dictation starts: it takes the model without « Une tâche locale est déjà en cours ».
    const dictation = reserveClinicalModel();
    await pass;
    expect(getIndexCoverage().status).toBe("paused");
    expect(passages()).toBe(0);
    dictation();
    fixture.hold = null;
    fixture.started = null;
    release();

    await runIndexCatchUp();
    expect(getIndexCoverage()).toMatchObject({
      status: "complete",
      indexedPatients: 2,
    });
  });

  it("une tâche qui n'est pas d'arrière-plan garde le modèle : la seconde est refusée comme avant", () => {
    const first = reserveClinicalModel();
    expect(() => reserveClinicalModel()).toThrow(
      "Une tâche locale est déjà en cours"
    );
    first();
  });
});

describe("Une modification qui fait perdre la validation est signalée", () => {
  it("dès que les rubriques quittent la version validée, et plus quand on y revient", () => {
    expect(isValidationLost(null, FIELDS)).toBe(false);
    expect(isValidationLost(FIELDS, FIELDS)).toBe(false);
    expect(isValidationLost(FIELDS, { ...FIELDS, plan: "Autre plan." })).toBe(
      true
    );
    expect(VALIDATION_LOST_MESSAGE).toContain("cas similaires");
  });
});

describe("Cas similaires limité à un dossier : une réponse vide nomme le périmètre et ce que contiennent les autres", () => {
  it("rien dans ce dossier, des passages existent dans les autres", async () => {
    addPatient("nika", "Nika");
    addSoap("nika", "validated", {
      subjective: "Toux sèche.",
      objective: "Auscultation normale.",
      assessment: "Trachéite.",
      plan: "Contrôle.",
    });
    addPatient("dora", "Dora");
    const dora = addSoap("dora", "validated");
    await runIndexCatchUp();
    fixture.distantQueries = true;
    const scope = {
      patientId: "nika",
      sourceTypes: [...ALL.sourceTypes],
      sections: [...ALL.sections],
    };

    // In Nika's record only: nothing, not even among the notes that are not validated.
    expect(await searchPatientDocuments(scope, "Boitement")).toEqual([]);
    expect(await findPatientUnreviewedMatches(scope, "Boitement")).toEqual([]);

    // What the other records hold, said with the empty answer.
    const outside = await countMatchesOutsidePatient(
      { sourceTypes: [...ALL.sourceTypes], sections: [...ALL.sections] },
      "Boitement",
      "nika"
    );
    expect(outside).toEqual({ results: 1, patients: 1, capped: false });
    const message = emptyPatientScopeMessage("Nika", "Boitement", outside);
    expect(message).toContain(
      "Rien dans le dossier de Nika pour « Boitement »"
    );
    expect(message).toContain("la recherche est limitée à ce dossier");
    expect(message).toContain("1 résultat par mots dans 1 autre dossier.");

    // The one-click widening runs the same question on every record, and finds Dora's note.
    const widened = await searchAllPatientsClinical(
      { sourceTypes: [...ALL.sourceTypes], sections: [...ALL.sections] },
      "Boitement"
    );
    expect(widened.map(({ sourceId }) => sourceId)).toContain(dora);
  });

  it("dit aussi quand les autres dossiers n'ont rien par mots, ou quand le compte est plafonné", () => {
    expect(
      emptyPatientScopeMessage("Nika", "zzz", {
        results: 0,
        patients: 0,
        capped: false,
      })
    ).toContain("ne trouve rien non plus dans les autres dossiers");
    expect(
      emptyPatientScopeMessage(null, "otite", {
        results: 15,
        patients: 9,
        capped: true,
      })
    ).toContain("Rien dans ce dossier pour « otite »");
    expect(
      emptyPatientScopeMessage(null, "otite", {
        results: 15,
        patients: 9,
        capped: true,
      })
    ).toContain("15 ou plus résultats par mots dans 9 autres dossiers.");
    expect(emptyPatientScopeMessage("Nika", "otite", null)).toContain(
      "Elle peut chercher dans tous les dossiers."
    );
  });
});
