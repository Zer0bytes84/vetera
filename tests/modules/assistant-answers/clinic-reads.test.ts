import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";

vi.mock("@/services/sqlite/database", async (original) => ({
  ...(await original<object>()),
  runDbRead: vi.fn(),
}));

import { mapTableRow, tableReadSql } from "@/hooks/useSQLite";
import { answerQuestion } from "@/modules/assistant-answers/answer";
import {
  CLINIC_TABLES,
  ReadIntegrityError,
  readClinicData,
  readClinicTables,
} from "@/modules/assistant-answers/clinic-reads";
import {
  guardReadConnection,
  isReadStatement,
  type ReadConnection,
  ReadRefused,
} from "@/modules/assistant-answers/read-port";

/**
 * The Données tab reads through the read port carried over from the agent harness (19 November 2026): one snapshot,
 * SELECT only, every statement counted, SQLite's count of changes equal before and after. Tested on an in-memory base
 * built by the app's own migrations, as the harness's tests are.
 */
let db: DatabaseSync;
let statements: string[];
const NOW = new Date("2026-11-19T10:00:00+01:00");

const connection = (): ReadConnection => ({
  async select<T>(query: string, values: unknown[] = []) {
    statements.push(query);
    return db
      .prepare(query)
      .all(...(values as (string | number | null)[])) as T;
  },
  async execute(query: string, values: unknown[] = []) {
    statements.push(query);
    return values.length
      ? db.prepare(query).run(...(values as (string | number | null)[]))
      : db.exec(query);
  },
});
const dump = () =>
  JSON.stringify(
    CLINIC_TABLES.map((table) =>
      db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()
    )
  );

beforeEach(async () => {
  statements = [];
  db = new DatabaseSync(":memory:");
  await runSqliteMigrations(
    {
      execute: async (query, values = []) =>
        values.length
          ? db.prepare(query).run(...(values as (string | number | null)[]))
          : db.exec(query),
      select: async <T>(query: string, values: unknown[] = []) =>
        db.prepare(query).all(...(values as (string | number | null)[])) as T,
    },
    SQLITE_MIGRATIONS
  );
  db.prepare(
    "INSERT INTO users(id,email,password_hash,display_name,role,status) VALUES('vet','vet@example.invalid','x','Dr Test','admin','active')"
  ).run();
  db.prepare(
    "INSERT INTO owners(id,first_name,last_name,phone) VALUES('o1','Lina','Martin','0102')"
  ).run();
  db.prepare(
    "INSERT INTO patients(id,owner_id,name,species,sex) VALUES('p1','o1','Filou','Chien','M'),('p2','o1','Moka','Chat','F')"
  ).run();
  db.prepare(
    "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES ('a1','p1','o1','vet','Contrôle','2026-11-18T09:00:00.000Z','2026-11-18T09:30:00.000Z','completed','Contrôle')"
  ).run();
  db.prepare(
    "INSERT INTO transactions(id,type,amount,date,category,description,status,method) VALUES ('t1','income',150000,'2026-11-10T10:00:00.000Z','Consultation','Consultation Filou','paid','cash'),('t2','expense',20000,'2026-11-12T10:00:00.000Z','Achats','Gants','paid','card')"
  ).run();
});

describe("porte de lecture de l'onglet Données", () => {
  it("ne laisse passer qu'un SELECT ou un WITH, et refuse toute écriture avant SQLite", () => {
    expect(isReadStatement("SELECT total_changes() AS changes")).toBe(true);
    for (const write of [
      "INSERT INTO patients(id) VALUES('x')",
      "UPDATE patients SET name='x'",
      "DELETE FROM patients",
      "WITH x AS (SELECT 1) DELETE FROM patients",
      "SELECT 1; DELETE FROM patients",
      "PRAGMA writable_schema = 1",
      "ATTACH DATABASE 'x' AS y",
    ]) {
      expect(isReadStatement(write), write).toBe(false);
    }
    const guarded = guardReadConnection(connection());
    expect(() => guarded.select("DELETE FROM patients")).toThrow(ReadRefused);
    expect(() => guarded.execute("INSERT INTO owners(id) VALUES('x')")).toThrow(
      ReadRefused
    );
    expect(() => guarded.execute("COMMIT", ["x"])).toThrow(ReadRefused);
    expect(statements).toEqual([]);
  });

  it("lit toutes les tables en un instantané, comme les magasins les lisent, sans rien modifier", async () => {
    const before = dump();
    const counter = { statements: 0 };
    const { tables, invoices, changes } = await readClinicTables(
      connection(),
      counter
    );
    expect(dump()).toBe(before);
    expect(changes).toBe(0);
    expect(statements[0]).toBe("BEGIN DEFERRED TRANSACTION");
    expect(statements.at(-1)).toBe("COMMIT");
    expect(
      statements.every(
        (query) =>
          isReadStatement(query) ||
          ["BEGIN DEFERRED TRANSACTION", "COMMIT"].includes(query)
      )
    ).toBe(true);
    expect(counter.statements).toBe(statements.length);
    // The same statements and the same mapping as the stores: what the tab answered from before is what it reads now.
    for (const table of CLINIC_TABLES) {
      const expected = (
        db.prepare(tableReadSql(table)).all() as Record<string, unknown>[]
      ).map((row) => mapTableRow(table, row));
      expect(tables[table], table).toEqual(expected);
    }
    expect(invoices).toEqual([]);
  });

  it("une lecture pendant laquelle la connexion a écrit est rejetée, et rien n'est répondu", async () => {
    let calls = 0;
    const moving: ReadConnection = {
      ...connection(),
      async select<T>(query: string, values: unknown[] = []) {
        if (query.startsWith("SELECT total_changes()")) {
          return [{ changes: calls++ === 0 ? 4 : 5 }] as T;
        }
        return connection().select<T>(query, values);
      },
    };
    await expect(
      readClinicData({
        browser: false,
        runRead: (operation) => operation(moving),
        now: NOW,
      })
    ).rejects.toBeInstanceOf(ReadIntegrityError);
  });

  it("une réponse est calculée sur ce que la porte a lu, et le reçu dit ce qui est passé", async () => {
    const { data, receipt } = await readClinicData({
      browser: false,
      runRead: (operation) => operation(connection()),
      now: NOW,
    });
    expect(receipt).toMatchObject({ via: "sqlite", changes: 0, rows: 6 });
    expect(receipt.statements).toBe(statements.length);
    const answer = answerQuestion("recettes de ce mois", data, { now: NOW });
    expect(answer.kind).toBe("answer");
    if (answer.kind === "answer") {
      expect(
        answer.figures.find((figure) => figure.id === "income")?.value
      ).toBe(150_000);
    }
  });
});
