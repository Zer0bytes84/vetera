import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { createVisitFlowStore, type FlowDatabase } from "@/modules/visit-flow/store";
import { visitFlowStage } from "@/modules/visit-flow/domain";
import type { AppointmentStatus } from "@/types/db";

const harness = vi.hoisted(() => ({ db: null as FlowDatabase | null, serial: 0, queue: Promise.resolve() }));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `billing-${++harness.serial}`,
  toSQLiteTimestamp: (date: Date) => date.toISOString(),
  runDbRead: async (operation: (db: FlowDatabase) => Promise<unknown>) => {
    await harness.queue;
    return operation(harness.db!);
  },
  runDbTransaction: (operation: (db: FlowDatabase) => Promise<unknown>) => transaction(operation),
}));
import { createInvoiceDraft, issueInvoice, recordPayment } from "@/services/billingService";

let sqlite: DatabaseSync;
let db: FlowDatabase;

function transaction<T>(operation: (db: FlowDatabase) => Promise<T>): Promise<T> {
  const result = harness.queue.then(async () => {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const value = await operation(db);
      sqlite.exec("COMMIT");
      return value;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  });
  harness.queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

const flow = () => createVisitFlowStore({ read: (op) => op(db), transaction });
const beforeFlow = SQLITE_MIGRATIONS.filter(({ version }) => version < "039");

async function open(migrations = SQLITE_MIGRATIONS) {
  sqlite = new DatabaseSync(":memory:");
  db = {
    async select<T>(sql: string, args: unknown[] = []) {
      return sqlite.prepare(sql).all(...(args as (string | number | null)[])) as T;
    },
    async execute(sql: string, args: unknown[] = []) {
      if (!args.length) {
        sqlite.exec(sql);
        return { rowsAffected: 0 };
      }
      return { rowsAffected: Number(sqlite.prepare(sql).run(...(args as (string | number | null)[])).changes) };
    },
  };
  harness.db = db;
  harness.serial = 0;
  harness.queue = Promise.resolve();
  await runSqliteMigrations(db, migrations);
  sqlite.exec(`PRAGMA foreign_keys = ON;
    INSERT INTO owners(id, first_name, last_name, phone) VALUES ('owner', 'Amina', 'Haddad', '');
    INSERT INTO users(id, email, password_hash, display_name, role) VALUES ('vet', 'vet@cabinet.dz', 'x', 'Dr Karim', 'admin');
    INSERT INTO patients(id, owner_id, name, species) VALUES ('rex', 'owner', 'Rex', 'Chien');`);
}

function book(id: string, status: AppointmentStatus = "scheduled") {
  sqlite
    .prepare(
      `INSERT INTO appointments(id, patient_id, owner_id, vet_id, title, start_time, end_time, type, status)
       VALUES (?, 'rex', 'owner', 'vet', 'Rex', '2026-10-19 10:00', '2026-10-19 10:15', 'Consultation', ?)`
    )
    .run(id, status);
}

const setStatus = (id: string, status: AppointmentStatus) =>
  sqlite.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);

const stage = (id: string) =>
  sqlite.prepare("SELECT stage FROM visit_flow_stages WHERE appointment_id = ?").get(id)?.stage ?? null;

const journal = (id: string) =>
  sqlite
    .prepare("SELECT from_stage, to_stage, from_status, to_status, cause, version FROM visit_flow_events WHERE appointment_id = ? ORDER BY id")
    .all(id);

async function bill(appointmentId: string, amount: number) {
  const draft = await createInvoiceDraft({
    actor: { id: "vet" },
    appointmentId,
    lines: [{ description: "Consultation", quantityMilli: 1000, unitAmount: amount }],
    ownerId: "owner",
    patientId: "rex",
  });
  return issueInvoice({
    actor: { id: "vet" },
    clinicSnapshot: { name: "Cabinet de test" },
    idempotencyKey: `issue:${draft.id}`,
    invoiceId: draft.id,
    issuedAt: "2026-10-19T10:20:00.000Z",
  });
}

const pay = (invoiceId: string, amount: number, key: string) =>
  recordPayment({ actor: { id: "vet" }, amount, idempotencyKey: key, invoiceId, method: "cash", paidAt: "2026-10-19T10:21:00.000Z" });

afterEach(() => {
  sqlite.close();
  harness.db = null;
});

describe("mise à niveau", () => {
  it("laisse toutes les tables existantes identiques, ligne par ligne", async () => {
    await open(beforeFlow);
    book("a1", "completed");
    book("a2", "in_progress");
    book("a3", "cancelled");
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> 'migrations'")
      .all()
      .map((row) => String(row.name));
    const snapshot = () => Object.fromEntries(tables.map((t) => [t, sqlite.prepare(`SELECT * FROM "${t}" ORDER BY rowid`).all()]));
    const before = snapshot();
    await runSqliteMigrations(db, SQLITE_MIGRATIONS);
    // Migration 042 adds the empty restraint column to patients, nothing else.
    expect(snapshot()).toEqual({
      ...before,
      patients: before.patients.map((row) => ({ ...row, restraint: null })),
    });
  });

  it("donne leur étape aux visites existantes sans inventer d'historique", async () => {
    await open(beforeFlow);
    book("arrive", "arrived");
    book("ouverte", "in_progress");
    book("finie", "completed");
    book("prevue", "scheduled");
    book("annulee", "cancelled");
    await runSqliteMigrations(db, SQLITE_MIGRATIONS);
    expect(sqlite.prepare("SELECT appointment_id, stage, version FROM visit_flow ORDER BY appointment_id").all()).toEqual([
      { appointment_id: "annulee", stage: null, version: 0 },
      { appointment_id: "arrive", stage: "waiting", version: 0 },
      { appointment_id: "finie", stage: "billing", version: 0 },
      { appointment_id: "ouverte", stage: "consultation", version: 0 },
      { appointment_id: "prevue", stage: null, version: 0 },
    ]);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM visit_flow_events").get()?.n).toBe(0);
  });
});

describe("correspondance statut et étape", () => {
  beforeEach(() => open());

  it("la vue SQL et la fonction TypeScript donnent la même étape pour chaque statut", async () => {
    const statuses: AppointmentStatus[] = ["scheduled", "confirmed", "arrived", "waiting", "in_progress", "completed", "cancelled", "no_show"];
    for (const status of statuses) {
      book(status, status);
      expect(stage(status), status).toBe(visitFlowStage({ care: false, settled: false, status }));
    }
    sqlite.exec("UPDATE visit_flow SET care = 1 WHERE appointment_id = 'in_progress'");
    expect(stage("in_progress")).toBe(visitFlowStage({ care: true, settled: false, status: "in_progress" }));
    const invoice = await bill("completed", 2500);
    await pay(invoice.id, 2500, "pay:full");
    expect(stage("completed")).toBe(visitFlowStage({ care: false, settled: true, status: "completed" }));
  });
});

describe("journal des transitions", () => {
  beforeEach(() => open());

  it("journalise chaque transition de statut, même sans changement d'étape, et incrémente la version", async () => {
    book("v1");
    setStatus("v1", "arrived");
    setStatus("v1", "waiting");
    setStatus("v1", "in_progress");
    setStatus("v1", "completed");
    expect(journal("v1")).toEqual([
      { from_stage: null, to_stage: null, from_status: null, to_status: "scheduled", cause: "status", version: 1 },
      { from_stage: null, to_stage: "waiting", from_status: "scheduled", to_status: "arrived", cause: "status", version: 2 },
      { from_stage: "waiting", to_stage: "waiting", from_status: "arrived", to_status: "waiting", cause: "status", version: 3 },
      { from_stage: "waiting", to_stage: "consultation", from_status: "waiting", to_status: "in_progress", cause: "status", version: 4 },
      { from_stage: "consultation", to_stage: "billing", from_status: "in_progress", to_status: "completed", cause: "status", version: 5 },
    ]);
    expect(await flow().state("v1")).toMatchObject({ stage: "billing", version: 5 });
  });

  it("passe à Terminé quand la facture est entièrement encaissée, pas avant", async () => {
    book("v2", "in_progress");
    setStatus("v2", "completed");
    const invoice = await bill("v2", 5000);
    expect(stage("v2")).toBe("billing");
    await pay(invoice.id, 2000, "pay:partial");
    expect(stage("v2")).toBe("billing");
    await pay(invoice.id, 3000, "pay:rest");
    expect(stage("v2")).toBe("done");
    expect(journal("v2").slice(-1)).toEqual([
      { from_stage: "billing", to_stage: "done", from_status: "completed", to_status: "completed", cause: "billing", version: 3 },
    ]);
  });

  it("passe une consultation en soins ou résultats, et refuse un écran périmé", async () => {
    book("v3", "in_progress");
    const store = flow();
    const { version } = await store.state("v3");
    await expect(store.setCare("v3", true, "vet", version)).resolves.toMatchObject({ stage: "care" });
    await expect(store.setCare("v3", false, "vet", version)).rejects.toThrow(/autre poste/);
    expect((await store.events("v3")).slice(-1)[0]).toMatchObject({ cause: "care", fromStage: "consultation", toStage: "care", actorId: "vet" });
  });

  it("note qui a fait la transition", async () => {
    book("v4", "arrived");
    setStatus("v4", "in_progress");
    await flow().attribute("v4", "vet");
    expect((await flow().events("v4")).slice(-1)[0].actorId).toBe("vet");
  });
});

describe("acte gratuit", () => {
  beforeEach(() => open());

  it("termine sans facture une consultation clôturée à 0 DA, et le journalise", async () => {
    book("free", "in_progress");
    setStatus("free", "completed");
    expect(stage("free")).toBe("billing");
    await expect(flow().markNoCharge("free", "vet")).resolves.toMatchObject({ stage: "done" });
    expect(stage("free")).toBe(visitFlowStage({ care: false, noCharge: true, settled: false, status: "completed" }));
    expect((await flow().events("free")).slice(-1)[0]).toMatchObject({ cause: "billing", fromStage: "billing", toStage: "done", actorId: "vet" });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM invoices WHERE appointment_id = 'free'").get()?.n).toBe(0);
  });

  it("refuse de marquer sans frais une visite encore ouverte", async () => {
    book("open", "in_progress");
    await expect(flow().markNoCharge("open", "vet")).rejects.toThrow(/clôturée/);
    expect(stage("open")).toBe("consultation");
  });
});

describe("annulation", () => {
  beforeEach(() => open());

  it("annule un déplacement pendant 10 secondes et le journalise comme annulation", async () => {
    book("v5", "waiting");
    setStatus("v5", "in_progress");
    const store = flow();
    const last = await store.undoable("v5");
    expect(last).toMatchObject({ fromStatus: "waiting", toStatus: "in_progress" });
    await expect(store.undo(last!.id, "vet")).resolves.toMatchObject({ status: "waiting", stage: "waiting" });
    expect((await store.events("v5")).slice(-1)[0]).toMatchObject({
      cause: "undo",
      undoesEventId: last!.id,
      actorId: "vet",
      toStatus: "waiting",
    });
  });

  it("refuse après 10 secondes, après un autre déplacement, ou pour un encaissement", async () => {
    book("v6", "waiting");
    setStatus("v6", "in_progress");
    const store = flow();
    const stale = await store.undoable("v6");
    setStatus("v6", "completed");
    await expect(store.undo(stale!.id, "vet")).rejects.toThrow(/a bougé depuis/);

    const late = await store.undoable("v6");
    sqlite.prepare("UPDATE visit_flow_events SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-11 seconds') WHERE id = ?").run(late!.id);
    expect(await store.undoable("v6")).toBeNull();
    await expect(store.undo(late!.id, "vet")).rejects.toThrow(/10 secondes/);

    const invoice = await bill("v6", 1000);
    await pay(invoice.id, 1000, "pay:v6");
    const payment = (await store.events("v6")).slice(-1)[0];
    expect(payment.cause).toBe("billing");
    expect(await store.undoable("v6")).toBeNull();
    await expect(store.undo(payment.id, "vet")).rejects.toThrow(/ne s'annule pas/);
    expect(stage("v6")).toBe("done");
  });
});
