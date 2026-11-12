import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import {
  formatPatientReference,
  matchesPatientReference,
  patientReferenceNumber,
  patientReferenceSearchText,
  PATIENTS_WITH_REFERENCE_SQL,
} from "@/modules/patients/reference/reference";

const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases) db.close();
  databases.length = 0;
});

function open() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec("PRAGMA foreign_keys = ON");
  const adapter = {
    async select<T>(sql: string, args: unknown[] = []) {
      return db.prepare(sql).all(...(args as (string | number | null)[])) as T;
    },
    async execute(sql: string, args: unknown[] = []) {
      if (!args.length) return db.exec(sql);
      return db.prepare(sql).run(...(args as (string | number | null)[]));
    },
  };
  return { db, adapter };
}

const references = (db: DatabaseSync) =>
  db.prepare("SELECT patient_id, reference FROM patient_references ORDER BY sequence_number").all();
const addPatient = (db: DatabaseSync, id: string, createdAt?: string) =>
  db
    .prepare("INSERT INTO patients(id, owner_id, name, species, created_at) VALUES (?, 'o1', ?, 'Chien', COALESCE(?, CURRENT_TIMESTAMP))")
    .run(id, id, createdAt ?? null);

describe("références patient", () => {
  it("attribue les références des patients existants une fois, dans l'ordre de création", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS.filter(({ version }) => version < "041"));
    db.exec("INSERT INTO owners(id, first_name, last_name, phone) VALUES ('o1', 'Amina', 'Haddad', '')");
    // Inserted out of order: the creation date decides, then the insertion order.
    addPatient(db, "troisieme", "2026-05-01 10:00:00");
    addPatient(db, "premier", "2026-04-01 10:00:00");
    addPatient(db, "deuxieme-a", "2026-04-15 10:00:00");
    addPatient(db, "deuxieme-b", "2026-04-15 10:00:00");

    await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["041", "042", "043", "044", "045"]);

    expect(references(db)).toEqual([
      { patient_id: "premier", reference: "ID-0001" },
      { patient_id: "deuxieme-a", reference: "ID-0002" },
      { patient_id: "deuxieme-b", reference: "ID-0003" },
      { patient_id: "troisieme", reference: "ID-0004" },
    ]);
    expect(db.prepare("SELECT last_number FROM patient_reference_counter").get()).toEqual({ last_number: 4 });
    await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual([]);
    expect(references(db)).toHaveLength(4);
  });

  it("attribue la suivante à la création et ne réutilise jamais un numéro supprimé", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
    db.exec("INSERT INTO owners(id, first_name, last_name, phone) VALUES ('o1', 'Amina', 'Haddad', '')");
    addPatient(db, "rex");
    addPatient(db, "mia");
    db.exec("DELETE FROM patients WHERE id = 'mia'");
    addPatient(db, "zou");

    expect(references(db)).toEqual([
      { patient_id: "rex", reference: "ID-0001" },
      { patient_id: "mia", reference: "ID-0002" },
      { patient_id: "zou", reference: "ID-0003" },
    ]);
    expect(db.prepare(`${PATIENTS_WITH_REFERENCE_SQL} WHERE patients.id = ?`).get("zou")).toMatchObject({
      name: "zou",
      reference: "ID-0003",
    });
  });

  it("refuse toute modification, suppression ou numéro hors compteur", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
    db.exec("INSERT INTO owners(id, first_name, last_name, phone) VALUES ('o1', 'Amina', 'Haddad', '')");
    addPatient(db, "rex");

    expect(() => db.exec("UPDATE patient_references SET reference = 'ID-0009'")).toThrow("ne se modifie pas");
    expect(() => db.exec("DELETE FROM patient_references")).toThrow("ne se supprime pas");
    expect(() => db.exec("UPDATE patient_reference_counter SET last_number = 0")).toThrow("d'un pas");
    expect(() => db.exec("DELETE FROM patient_reference_counter")).toThrow("ne se supprime pas");
    expect(() =>
      db.exec("INSERT INTO patient_references(patient_id, sequence_number, reference) VALUES ('x', 7, 'ID-0007')")
    ).toThrow("vient toujours du compteur");
    expect(() =>
      db.exec("INSERT INTO patient_references(patient_id, sequence_number, reference) VALUES ('x', 1, 'ID-0001')")
    ).toThrow(/UNIQUE/);
    expect(references(db)).toEqual([{ patient_id: "rex", reference: "ID-0001" }]);
  });

  it("garde le format au-delà de quatre chiffres", () => {
    expect(formatPatientReference(11)).toBe("ID-0011");
    expect(formatPatientReference(12345)).toBe("ID-12345");
  });

  it("reconnaît la référence tapée telle quelle", () => {
    for (const typed of ["0011", "ID-0011", "ID0011", "id-0011", " id 0011 ", "ID-11"]) {
      expect(matchesPatientReference("ID-0011", typed)).toBe(true);
    }
    for (const typed of ["11", "0012", "Rex", "ID-", ""]) {
      expect(matchesPatientReference("ID-0011", typed)).toBe(false);
    }
    expect(patientReferenceNumber("0011")).toBe(11);
    const index = patientReferenceSearchText("ID-0011").toLowerCase();
    for (const typed of ["0011", "id-0011", "id0011"]) expect(index).toContain(typed);
  });
});

describe("contention", () => {
  it("ajoute la colonne sans toucher aux patients existants", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS.filter(({ version }) => version < "042"));
    db.exec("INSERT INTO owners(id, first_name, last_name, phone) VALUES ('o1', 'Amina', 'Haddad', '')");
    addPatient(db, "rex");
    await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["042", "043", "044", "045"]);
    db.exec("UPDATE patients SET restraint = 'Muselière' WHERE id = 'rex'");
    expect(db.prepare(`${PATIENTS_WITH_REFERENCE_SQL} WHERE patients.id = 'rex'`).get()).toMatchObject({
      name: "rex",
      reference: "ID-0001",
      restraint: "Muselière",
    });
  });
});
