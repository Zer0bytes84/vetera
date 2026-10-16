import { assembleGuidedNote } from "../../../src/modules/consultations/local-ai/guided-soap";
import { EMPTY_SOAP } from "../../../src/modules/consultations/local-ai/soap-schema";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";
import {
  reviewedSoapContent,
  isSoapReviewed,
} from "../../../src/modules/consultations/local-ai/soap-review";

const fixture = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  nextId: 0,
  fail: false,
  queue: Promise.resolve() as Promise<unknown>,
}));
vi.mock("../../../src/services/browser-store", () => ({
  isTauriRuntime: () => true,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../../src/services/sqlite/database", () => {
  const db = {
    select: async (sql: string, params: unknown[] = []) =>
      fixture.db!.prepare(sql).all(...(params as (string | number | null)[])),
    execute: async (sql: string, params: unknown[] = []) => {
      if (fixture.fail) throw new Error("Écriture indisponible");
      const result = fixture
        .db!.prepare(sql)
        .run(...(params as (string | number | null)[]));
      return {
        rowsAffected: Number(result.changes),
        lastInsertId: Number(result.lastInsertRowid),
      };
    },
  };
  const enqueue = (operation: (connection: typeof db) => unknown) => {
    const job = fixture.queue.then(() => operation(db));
    fixture.queue = job.catch(() => undefined);
    return job;
  };
  return {
    getDatabase: async () => db,
    runDbOperation: enqueue,
    runDbRead: enqueue,
    runDbTransaction: enqueue,
    generateId: () => `soap-${++fixture.nextId}`,
    toSQLiteTimestamp: (date: Date) => date.toISOString(),
  };
});
let directory: string;
let file: string;
beforeEach(async () => {
  vi.resetModules();
  fixture.nextId = 0;
  fixture.fail = false;
  fixture.queue = Promise.resolve();
  vi.stubGlobal("window", new EventTarget());
  directory = mkdtempSync(join(tmpdir(), "baitari-soap-"));
  file = join(directory, "test.db");
  fixture.db = new DatabaseSync(file);
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length
          ? fixture.db!.prepare(sql).run(...(params as string[]))
          : fixture.db!.exec(sql),
      select: async <T>(sql, params = []) =>
        fixture.db!.prepare(sql).all(...(params as string[])) as T,
    },
    SQLITE_MIGRATIONS
  );
  fixture.db.exec(
    "PRAGMA foreign_keys=ON; INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Dr Test','admin'); INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0'); INSERT INTO patients(id,owner_id,name,species,sex) VALUES('rex','owner','Rex','Chien','M'); INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES('visit','rex','owner','vet','Consultation','2026-10-09 10:00:00','2026-10-09 10:30:00','in_progress','Consultation');"
  );
});
afterEach(() => {
  fixture.db?.close();
  fixture.db = null;
  rmSync(directory, { recursive: true, force: true });
  vi.unstubAllGlobals();
});
async function setup() {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const sqlite = await import("../../../src/hooks/useSQLite");
  const repositories = await import("../../../src/data/repositories");
  await sqlite.prefetchSQLiteTables(["consultation_soaps"]);
  return () => {
    let result: ReturnType<typeof repositories.useConsultationSoapsRepository>;
    function Probe() {
      result = repositories.useConsultationSoapsRepository();
      return null;
    }
    renderToStaticMarkup(React.createElement(Probe));
    return result!;
  };
}
const fields = {
  subjective: "Toux depuis hier.",
  objective: "Température : 38,5 °C.",
  assessment: "À surveiller.",
  plan: "Rex a besoin d’un traitement pendant 7 jours.",
};
const approved = {
  ...fields,
  transcript: "Dictée originale : 2.5 mg, pendant sept jours.",
  aiDraft: null,
  aiConfidence: null,
  templateVersion: "local-ai-soap-1",
  content: reviewedSoapContent(
    fields,
    JSON.stringify({ custom: "Métadonnées conservées" }),
    null
  ),
};
describe("SOAP validé : dépôt et hook réels vers SQLite sur disque", () => {
  it("conserve toutes les sections, la dictée, les accents et la validation après réouverture", async () => {
    const read = await setup();
    expect(read().data).toHaveLength(0);
    const saved = await read().upsertForAppointment("visit", "rex", approved);
    expect(saved).toMatchObject(approved);
    fixture.db!.close();
    fixture.db = new DatabaseSync(file);
    const row = fixture.db.prepare("SELECT * FROM consultation_soaps").get()!;
    expect(row).toMatchObject({
      ...fields,
      transcript: approved.transcript,
      content: approved.content,
      appointment_id: "visit",
      patient_id: "rex",
      ai_draft: null,
      template_version: "local-ai-soap-1",
    });
    expect(
      isSoapReviewed({ ...fields, content: String(row.content), aiDraft: null })
    ).toBe(true);
  });
  it("met à jour la même ligne et renvoie le contenu confirmé, sans doublon", async () => {
    const read = await setup();
    const first = await read().upsertForAppointment("visit", "rex", approved);
    const patch = {
      ...approved,
      plan: "Plan relu et corrigé par le vétérinaire.",
    };
    const second = await read().upsertForAppointment("visit", "rex", patch);
    expect(second).toMatchObject(patch);
    expect(second!.id).toBe(first!.id);
    expect(
      fixture.db!.prepare("SELECT plan FROM consultation_soaps").all()
    ).toEqual([{ plan: patch.plan }]);
  });
  it("remplace la section validée en SQLite et conserve les autres après réouverture", async () => {
    const read = await setup();
    await read().upsertForAppointment("visit", "rex", approved);
    const note = assembleGuidedNote(fields, { ...EMPTY_SOAP, assessment: "Cause bactérienne" });
    const patch = { ...approved, ...note, content: reviewedSoapContent(note, approved.content, "vet") };
    await read().upsertForAppointment("visit", "rex", patch);
    await read().upsertForAppointment("visit", "rex", patch);
    fixture.db!.close(); fixture.db = new DatabaseSync(file);
    const rows = fixture.db.prepare("SELECT assessment,subjective,objective,plan FROM consultation_soaps").all();
    expect(rows).toEqual([{ ...fields, assessment: "Cause bactérienne" }]);
  });
  it("ne confirme pas une écriture échouée et conserve la note précédente", async () => {
    const read = await setup();
    await read().upsertForAppointment("visit", "rex", approved);
    fixture.fail = true;
    expect(
      await read().upsertForAppointment("visit", "rex", {
        plan: "Écriture qui échoue",
      })
    ).toBeNull();
    expect(
      fixture.db!.prepare("SELECT plan FROM consultation_soaps").get()!.plan
    ).toBe(fields.plan);
    fixture.fail = false;
    expect(
      await read().upsertForAppointment("visit", "rex", {
        plan: "Nouvel essai validé",
      })
    ).toMatchObject({ plan: "Nouvel essai validé" });
  });
  it("refuse une consultation inexistante sans annoncer un succès", async () => {
    const read = await setup();
    expect(
      await read().upsertForAppointment("missing", "rex", approved)
    ).toBeNull();
    expect(
      fixture
        .db!.prepare("SELECT COUNT(*) AS count FROM consultation_soaps")
        .get()!.count
    ).toBe(0);
  });
});
