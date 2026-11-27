import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mustExist } from "@/lib/must-exist";
import { soapSearchChunks } from "../../../src/modules/consultations/local-ai/embedding-index";
import {
  SOAP_LEXICAL_SECTIONS,
  syncSoapLexicalIndex,
} from "../../../src/modules/consultations/local-ai/lexical-index";
import { passageChunks } from "../../../src/modules/consultations/local-ai/passage-search";
import { reviewedSoapContent } from "../../../src/modules/consultations/local-ai/soap-review";
import {
  lexicalMatchExpression,
  matchesSearchTerms,
} from "../../../src/modules/consultations/local-ai/veterinary-lexicon";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";
import type { ConsultationSoap } from "../../../src/types/db";

// L'index des rubriques SOAP (migration 048) ne fait que présélectionner les notes que la barre lit : matchesSearchTerms
// décide toujours. La barre reste la même tant que l'expression d'une question sélectionne toute rubrique acceptée, et
// tant qu'une note laissée de côté a bien été jugée, sur le même texte, par la lecture des passages.

const fixture = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  nextId: 0,
}));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `row-${++fixture.nextId}`,
  runDbRead: async (fn: (db: unknown) => unknown) => fn(adapter()),
  runDbOperation: async (fn: (db: unknown) => unknown) => fn(adapter()),
  runDbTransaction: async (fn: (db: unknown) => unknown) => fn(adapter()),
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

import {
  persistSearchChunks,
  searchAllPatientsFastLexical,
} from "../../../src/modules/consultations/local-ai/embedding-store";

let seed = 7;
const random = () => {
  seed = (seed * 16_807) % 2_147_483_647;
  return seed / 2_147_483_647;
};
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(random() * items.length)];
const WORDS = [
  "boiterie",
  "boiteries",
  "boite",
  "claudication",
  "vomissements",
  "vomit",
  "diarrhée",
  "prurit",
  "grattage",
  "otite",
  "otites",
  "externe",
  "dermatite",
  "toux",
  "tousse",
  "fièvre",
  "fébrile",
  "hyperthermie",
  "abattement",
  "anorexie",
  "polyurie",
  "polydipsie",
  "PUPD",
  "méloxicam",
  "Metacam",
  "amoxicilline",
  "clavulanique",
  "Synulox",
  "Convenia",
  "céfovécine",
  "IRC",
  "insuffisance",
  "rénale",
  "rénal",
  "créatinine",
  "œdème",
  "oedeme",
  "cœur",
  "radiographie",
  "radio",
  "échographie",
  "abdominale",
  "stérilisée",
  "castration",
  "contrôle",
  "dix",
  "jours",
  "10",
  "mg/kg",
  "0,1",
  "AINS",
  "anti-inflammatoire",
  "l'otite",
  "d’otite",
  "le",
  "la",
  "chien",
  "chat",
];
const QUERIES = [
  "boiterie",
  "claudication",
  "vomissements",
  "vomir",
  "prurit",
  "otite externe",
  "otite prurit",
  "toux fièvre",
  "fébrile",
  "PUPD",
  "polyurie polydipsie",
  "méloxicam",
  "Metacam",
  "Synulox",
  "amoxicilline acide clavulanique",
  "céfovécine",
  "IRC",
  "insuffisance rénale",
  "rénal",
  "créatinine 2",
  "œdème",
  "oedeme",
  "cœur",
  "radio",
  "échographie abdominale",
  "stérilisée",
  "contrôle dans dix jours",
  "10 jours",
  "0,1 mg/kg",
  "AINS",
  "anti inflammatoire",
  "l'otite",
  "d’otite",
  "le",
  "zzz",
  "x",
];
const sentence = (n: number) =>
  Array.from({ length: n }, () => pick(WORDS)).join(" ");

let directory: string;
let visit = 0;
function db() {
  return mustExist(fixture.db, "test database");
}
async function migrate() {
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
    "INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Dr Test','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0');"
  );
}
function addPatient(id: string) {
  db()
    .prepare(
      "INSERT INTO patients(id,owner_id,name,species,sex) VALUES(?,'owner',?,'Chien','M')"
    )
    .run(id, id);
}
type Sections = Pick<
  ConsultationSoap,
  "subjective" | "objective" | "assessment" | "plan"
>;
function addSoap(patientId: string, sections: Sections, validated = true) {
  const appointment = `visit-${++visit}`;
  db()
    .prepare(
      "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES(?,?,'owner','vet','Consultation','2026-10-09 10:00:00','2026-10-09 10:30:00','completed','Consultation')"
    )
    .run(appointment, patientId);
  const id = `soap-${visit}`;
  const content = validated ? reviewedSoapContent(sections, "{}", "vet") : "{}";
  db()
    .prepare(
      "INSERT INTO consultation_soaps (id,appointment_id,patient_id,subjective,objective,assessment,plan,content) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      appointment,
      patientId,
      sections.subjective,
      sections.objective,
      sections.assessment,
      sections.plan,
      content
    );
  return {
    ...sections,
    id,
    patientId,
    appointmentId: appointment,
    content,
    aiDraft: null,
  } as ConsultationSoap;
}
/** The passages of a validated note, for both generations the bar can read. */
async function indexSoap(note: ConsultationSoap) {
  const sections = soapSearchChunks(note);
  const unit = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
  await persistSearchChunks(
    adapter(),
    sections,
    sections.map(() => unit),
    "sections"
  );
  const passages = passageChunks(sections);
  await persistSearchChunks(
    adapter(),
    passages,
    passages.map(() => unit),
    "passages"
  );
}
const FILTERS = {
  sourceTypes: ["soap"],
  sections: ["subjective", "objective", "assessment", "plan"],
} as const;
const bar = (query: string) =>
  searchAllPatientsFastLexical(
    { sourceTypes: [...FILTERS.sourceTypes], sections: [...FILTERS.sections] },
    query
  );

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "baitari-soap-lexical-"));
  fixture.db = new DatabaseSync(join(directory, "soap.db"));
  fixture.nextId = 0;
  visit = 0;
  seed = 7;
  await migrate();
});
afterEach(() => {
  fixture.db?.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("Index des rubriques SOAP (migration 048)", () => {
  it("sélectionne toute rubrique que matchesSearchTerms accepte", async () => {
    addPatient("rex");
    const notes = Array.from({ length: 300 }, () =>
      addSoap("rex", {
        subjective: sentence(6),
        objective: sentence(4),
        assessment: random() < 0.2 ? "" : sentence(3),
        plan: sentence(5),
      })
    );
    expect(await syncSoapLexicalIndex(adapter())).toBe(true);
    let accepted = 0;
    for (const query of QUERIES) {
      const expression = lexicalMatchExpression(query);
      const selected = new Set(
        expression === null
          ? []
          : (
              db()
                .prepare(
                  "SELECT rowid / 4 AS id FROM soap_lexical WHERE soap_lexical MATCH ?"
                )
                .all(expression) as Array<{ id: number }>
            ).map(({ id }) => id)
      );
      for (const note of notes) {
        const { id } = db()
          .prepare("SELECT rowid AS id FROM consultation_soaps WHERE id=?")
          .get(note.id) as { id: number };
        for (const section of SOAP_LEXICAL_SECTIONS) {
          if (note[section] && matchesSearchTerms(query, note[section])) {
            accepted++;
            expect(selected.has(id), `${query} → ${note[section]}`).toBe(true);
          }
        }
      }
    }
    expect(accepted).toBeGreaterThan(500);
  });

  it("suit les notes : modifiée, supprimée, ou une nouvelle note sous un rowid réutilisé", async () => {
    addPatient("rex");
    const first = addSoap("rex", {
      subjective: "Toux.",
      objective: "",
      assessment: "",
      plan: "",
    });
    const last = addSoap("rex", {
      subjective: "Boiterie.",
      objective: "",
      assessment: "",
      plan: "",
    });
    await syncSoapLexicalIndex(adapter());
    const entries = () =>
      (
        db().prepare("SELECT COUNT(*) AS n FROM soap_lexical").get() as {
          n: number;
        }
      ).n;
    const found = (word: string) =>
      (
        db()
          .prepare(
            "SELECT COUNT(*) AS n FROM soap_lexical WHERE soap_lexical MATCH ?"
          )
          .get(lexicalMatchExpression(word)) as { n: number }
      ).n;
    expect(entries()).toBe(8);

    db()
      .prepare("UPDATE consultation_soaps SET subjective='Prurit.' WHERE id=?")
      .run(first.id);
    expect(found("toux")).toBe(0);
    await syncSoapLexicalIndex(adapter());
    expect(found("prurit")).toBe(1);

    // The last note goes, and a new one takes its rowid: the old words must not stay under it.
    const { id: rowid } = db()
      .prepare("SELECT rowid AS id FROM consultation_soaps WHERE id=?")
      .get(last.id) as { id: number };
    db().prepare("DELETE FROM consultation_soaps WHERE id=?").run(last.id);
    expect(entries()).toBe(4);
    const next = addSoap("rex", {
      subjective: "Otite.",
      objective: "",
      assessment: "",
      plan: "",
    });
    expect(
      (
        db()
          .prepare("SELECT rowid AS id FROM consultation_soaps WHERE id=?")
          .get(next.id) as { id: number }
      ).id
    ).toBe(rowid);
    expect(found("boiterie")).toBe(0);
    await syncSoapLexicalIndex(adapter());
    expect(found("otite")).toBe(1);
    expect(found("boiterie")).toBe(0);

    // INSERT OR REPLACE removes the old row without its delete trigger: its entries stay under a rowid no note has.
    // When that rowid is given again to a new note, its old words must not come back with it.
    db()
      .prepare(
        "INSERT OR REPLACE INTO consultation_soaps (id,appointment_id,patient_id,subjective,objective,assessment,plan,content) VALUES (?,?,?,?,?,?,?,?)"
      )
      .run(next.id, next.appointmentId, "rex", "Diarrhée.", "", "", "", "{}");
    db().prepare("DELETE FROM consultation_soaps WHERE id=?").run(next.id);
    const reused = addSoap("rex", {
      subjective: "Fièvre.",
      objective: "",
      assessment: "",
      plan: "",
    });
    expect(
      (
        db()
          .prepare("SELECT rowid AS id FROM consultation_soaps WHERE id=?")
          .get(reused.id) as { id: number }
      ).id
    ).toBe(rowid);
    expect(found("otite")).toBe(0);
    await syncSoapLexicalIndex(adapter());
    expect(found("fièvre")).toBe(1);
    expect(found("otite")).toBe(0);
  });

  it("la barre rend exactement la même chose avec et sans l'index, notes indexées ou non", async () => {
    for (const patient of ["a", "b", "c", "d"]) {
      addPatient(patient);
    }
    // A long section whose two words fall in two different passages: only the section-level reading finds it.
    const long = `Otite externe ancienne.${" Contrôle sans particularité.".repeat(40)} Prurit important ce jour.`;
    const split = addSoap("a", {
      subjective: long,
      objective: "Examen normal.",
      assessment: "",
      plan: "",
    });
    await indexSoap(split);
    for (let i = 0; i < 120; i++) {
      const note = addSoap(
        pick(["a", "b", "c", "d"]),
        {
          subjective: sentence(5),
          objective: sentence(3),
          assessment: sentence(2),
          plan: sentence(4),
        },
        random() < 0.7
      );
      if (note.content !== "{}" && random() < 0.8) {
        await indexSoap(note);
      }
    }
    const withIndex: unknown[] = [];
    for (const query of QUERIES) {
      withIndex.push(await bar(query));
    }
    expect(withIndex.some((results) => (results as unknown[]).length > 0)).toBe(
      true
    );
    expect(
      (await bar("otite prurit")).map((match) => match.sourceId)
    ).toContain(split.id);

    // Reference: no SOAP index and no generation counter, so every note is read in full.
    db().exec("DROP TABLE soap_lexical; DROP TABLE search_index_state;");
    for (const [index, query] of QUERIES.entries()) {
      expect(await bar(query), query).toEqual(withIndex[index]);
    }
  });
});
