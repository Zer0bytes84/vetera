import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mustExist } from "@/lib/must-exist";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";

// La barre lisait les 100 rendez-vous les plus récents de la clinique et 100 patients sans ordre : au-delà, rien, en
// silence. Avec les index des fiches (migration 049), elle lit tout, présélectionné par les mots, et ne trouve pas moins.

const fixture = vi.hoisted(() => ({ db: null as DatabaseSync | null }));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => "id",
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
    embeddingReady: false,
    embedding2Ready: false,
    arcticReady: false,
    root: "local",
  }),
  getLocalModelUrls: () => ({ modelRoot: "local/", runtimeRoot: "runtime/" }),
}));

import {
  searchAllPatientsClinical,
  searchAllPatientsFastLexical,
} from "../../../src/modules/consultations/local-ai/embedding-store";
import {
  syncAppointmentLexicalIndex,
  syncPatientLexicalIndex,
} from "../../../src/modules/consultations/local-ai/lexical-index";
import { lexicalMatchExpression } from "../../../src/modules/consultations/local-ai/veterinary-lexicon";

let directory: string;
function db() {
  return mustExist(fixture.db, "test database");
}
const bar = (sourceType: "consultation" | "patient", query: string) =>
  searchAllPatientsFastLexical(
    { sourceTypes: [sourceType], sections: [sourceType] },
    query
  );
function addPatient(id: string, name: string, chronic: string | null = null) {
  db()
    .prepare(
      "INSERT INTO patients(id,owner_id,name,species,sex,chronic_conditions) VALUES(?,'owner',?,'Chien','M',?)"
    )
    .run(id, name, chronic);
}
function addAppointment(
  id: string,
  patientId: string,
  start: string,
  reason: string
) {
  db()
    .prepare(
      "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type,reason) VALUES(?,?,'owner','vet','Consultation',?,?,'completed','Consultation',?)"
    )
    .run(id, patientId, start, start, reason);
}
const day = (n: number) =>
  new Date(Date.UTC(2026, 10, 27) - n * 86_400_000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "baitari-records-"));
  fixture.db = new DatabaseSync(join(directory, "records.db"));
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
});
afterEach(() => {
  fixture.db?.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("La barre lit toutes les fiches, au-delà des 100 premières (migration 049)", () => {
  it("plus de 100 rendez-vous : la fiche cherchée est ancienne", async () => {
    addPatient("rex", "Rex");
    addAppointment("ancien", "rex", day(400), "Épistaxis récidivante");
    for (let i = 0; i < 150; i++) {
      addAppointment(`recent-${i}`, "rex", day(i), "Contrôle annuel");
    }
    // Before: only the 100 most recent appointments were read; this one is the oldest of 151.
    const before = db()
      .prepare("SELECT id FROM appointments ORDER BY start_time DESC LIMIT 100")
      .all() as Array<{ id: string }>;
    expect(before.map(({ id }) => id)).not.toContain("ancien");

    const found = await bar("consultation", "épistaxis");
    expect(found.map(({ sourceId }) => sourceId)).toEqual(["ancien"]);
    // The assistant's all-records mode takes the bar's results: it finds it too.
    const assistant = await searchAllPatientsClinical(
      { sourceTypes: ["consultation"], sections: ["consultation"] },
      "épistaxis"
    );
    expect(assistant.map(({ sourceId }) => sourceId)).toContain("ancien");
  });

  it("plus de 100 patients : le patient cherché est hors des 100", async () => {
    for (let i = 0; i < 140; i++) {
      addPatient(`p-${i}`, `Animal${i}`);
    }
    addPatient("tardif", "Tardif", "Hyperthyroïdie");
    const before = db()
      .prepare("SELECT id FROM patients LIMIT 100")
      .all() as Array<{ id: string }>;
    expect(before.map(({ id }) => id)).not.toContain("tardif");

    const found = await bar("patient", "hyperthyroïdie");
    expect(found.map(({ sourceId }) => sourceId)).toEqual(["tardif"]);
  });

  it("une fiche ajoutée ou modifiée après une recherche est trouvée à la suivante", async () => {
    addPatient("rex", "Rex");
    addAppointment("a1", "rex", day(3), "Otite");
    expect(
      (await bar("consultation", "otite")).map(({ sourceId }) => sourceId)
    ).toEqual(["a1"]);
    // The indexes were checked: nothing changed, the next search skips the check; a write must make it check again.
    addAppointment("a2", "rex", day(1), "Otite externe");
    expect(
      (await bar("consultation", "otite")).map(({ sourceId }) => sourceId)
    ).toEqual(["a2", "a1"]);
    db()
      .prepare("UPDATE appointments SET reason='Boiterie' WHERE id='a1'")
      .run();
    expect(
      (await bar("consultation", "boiterie")).map(({ sourceId }) => sourceId)
    ).toEqual(["a1"]);
    db()
      .prepare("UPDATE patients SET allergies='Pénicilline' WHERE id='rex'")
      .run();
    expect(
      (await bar("patient", "pénicilline")).map(({ sourceId }) => sourceId)
    ).toEqual(["rex"]);
  });

  it("les index suivent les fiches : modifiée, supprimée, rowid réattribué", async () => {
    addPatient("rex", "Rex", "Arthrose");
    addAppointment("a1", "rex", day(2), "Toux");
    await syncAppointmentLexicalIndex(adapter());
    await syncPatientLexicalIndex(adapter());
    const count = (table: string, word: string) =>
      (
        db()
          .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table} MATCH ?`)
          .get(lexicalMatchExpression(word)) as { n: number }
      ).n;
    expect(count("appointment_lexical", "toux")).toBe(1);
    expect(count("patient_lexical", "arthrose")).toBe(1);

    db().prepare("UPDATE appointments SET reason='Prurit' WHERE id='a1'").run();
    expect(count("appointment_lexical", "toux")).toBe(0);
    db()
      .prepare(
        "UPDATE patients SET chronic_conditions='Diabète' WHERE id='rex'"
      )
      .run();
    expect(count("patient_lexical", "arthrose")).toBe(0);

    const { id: rowid } = db()
      .prepare("SELECT rowid AS id FROM appointments WHERE id='a1'")
      .get() as { id: number };
    await syncAppointmentLexicalIndex(adapter());
    db().prepare("DELETE FROM appointments WHERE id='a1'").run();
    expect(count("appointment_lexical", "prurit")).toBe(0);
    addAppointment("a2", "rex", day(1), "Fièvre");
    expect(
      (
        db()
          .prepare("SELECT rowid AS id FROM appointments WHERE id='a2'")
          .get() as { id: number }
      ).id
    ).toBe(rowid);
    await syncAppointmentLexicalIndex(adapter());
    expect(count("appointment_lexical", "fièvre")).toBe(1);
    expect(count("appointment_lexical", "prurit")).toBe(0);

    // INSERT OR REPLACE removes the old row without its delete trigger; when its rowid is given again, the old words
    // must not come back with the new record.
    db()
      .prepare(
        "INSERT OR REPLACE INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type,reason) VALUES('a2','rex','owner','vet','Consultation',?,?,'completed','Consultation','Diarrhée')"
      )
      .run(day(1), day(1));
    db().prepare("DELETE FROM appointments WHERE id='a2'").run();
    addAppointment("a3", "rex", day(0), "Vomissements");
    expect(
      (
        db()
          .prepare("SELECT rowid AS id FROM appointments WHERE id='a3'")
          .get() as { id: number }
      ).id
    ).toBe(rowid);
    expect(count("appointment_lexical", "fièvre")).toBe(0);
  });

  it("garde l'ordre d'origine : du plus récent au plus ancien, à date égale du dernier inscrit au premier", async () => {
    addPatient("rex", "Rex");
    addAppointment("x1", "rex", day(5), "Vaccination");
    addAppointment("x2", "rex", day(5), "Vaccination");
    addAppointment("x3", "rex", day(1), "Vaccination");
    const order = db()
      .prepare(
        "SELECT a.id FROM appointments a JOIN patients p ON p.id = a.patient_id ORDER BY a.start_time DESC LIMIT 100"
      )
      .all() as Array<{ id: string }>;
    expect(
      (await bar("consultation", "vaccination")).map(({ sourceId }) => sourceId)
    ).toEqual(order.map(({ id }) => id));
  });
});
