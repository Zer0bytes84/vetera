import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";

type Db = {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<{ rowsAffected: number }>;
};

const harness = vi.hoisted(() => ({ db: null as Db | null, serial: 0, queue: Promise.resolve() as Promise<unknown> }));
vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `billing-${++harness.serial}`,
  toSQLiteTimestamp: (date: Date) => date.toISOString(),
  runDbRead: async (operation: (db: Db) => Promise<unknown>) => {
    await harness.queue;
    return operation(harness.db!);
  },
  runDbTransaction: (operation: (db: Db) => Promise<unknown>) => transaction(operation),
  runDbOperation: (operation: (db: Db) => Promise<unknown>) => transaction(operation),
}));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true, getBrowserTable: () => [] }));
vi.mock("@/services/invoiceSettingsService", () => ({ getInvoiceSettings: async () => ({ name: "Cabinet de test" }) }));
vi.mock("@/hooks/useSQLite", () => ({
  useSQLite: (table: string) => ({
    data: table === "appointments" ? [{ id: "visit", patientId: "rex", ownerId: "owner", title: "Rex", status: "completed" }] : [],
    add: vi.fn(),
    update: async (id: string, patch: Record<string, unknown>) => {
      if (table === "appointments" && patch.status) {
        harness.db!.execute("UPDATE appointments SET status = ? WHERE id = ?", [patch.status, id]);
      }
      return true;
    },
  }),
  emitSQLiteDataChanged: vi.fn(),
}));
import { useAppointmentsRepository } from "@/data/repositories";
import { billingDraft } from "@/modules/billing/billing-draft";

let sqlite: DatabaseSync;

function transaction<T>(operation: (db: Db) => Promise<T>): Promise<T> {
  const result = harness.queue.then(async () => {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const value = await operation(harness.db!);
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

beforeEach(async () => {
  sqlite = new DatabaseSync(":memory:");
  harness.serial = 0;
  harness.queue = Promise.resolve();
  harness.db = {
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
  await runSqliteMigrations(harness.db, SQLITE_MIGRATIONS);
  sqlite.exec(`PRAGMA foreign_keys = ON;
    INSERT INTO owners(id, first_name, last_name, phone) VALUES ('owner', 'Amina', 'Haddad', '');
    INSERT INTO users(id, email, password_hash, display_name, role) VALUES ('vet', 'vet@cabinet.dz', 'x', 'Dr Karim', 'admin');
    INSERT INTO patients(id, owner_id, name, species) VALUES ('rex', 'owner', 'Rex', 'Chien');
    INSERT INTO appointments(id, patient_id, owner_id, vet_id, title, start_time, end_time, type, status)
      VALUES ('visit', 'rex', 'owner', 'vet', 'Rex', '2026-10-20 10:00', '2026-10-20 10:15', 'Consultation', 'in_progress');`);
});

afterEach(() => {
  sqlite.close();
  harness.db = null;
});

const invoice = () =>
  sqlite.prepare("SELECT gross_amount AS gross, document_status AS status FROM invoices WHERE appointment_id = 'visit'").get();
const payments = () =>
  sqlite.prepare("SELECT amount FROM payments WHERE invoice_id = 'appointment-invoice-visit' AND status = 'completed' ORDER BY created_at").all().map((row) => Number(row.amount));
const stage = () => sqlite.prepare("SELECT stage FROM visit_flow_stages WHERE appointment_id = 'visit'").get()?.stage;

describe("montants de la facturation", () => {
  it("facture exactement le prix saisi et n'encaisse que le règlement saisi", async () => {
    const draft = billingDraft(
      [
        { desc: "Consultation", amount: "3500" },
        { desc: "Injection", amount: "1200" },
      ],
      "4000"
    );
    expect(draft.canConfirm).toBe(true);
    await useAppointmentsRepository().completeWithBilling({ appointmentId: "visit", items: draft.items, amountReceivedDa: draft.received! });

    expect(invoice()).toEqual({ gross: 470000, status: "issued" });
    expect(payments()).toEqual([400000]);
    expect(stage()).toBe("billing");
  });

  it("encaisse ensuite le seul reste dû, depuis la facture existante, et termine la visite", async () => {
    const repository = useAppointmentsRepository();
    const first = billingDraft([{ desc: "Consultation", amount: "5000" }], "0");
    await repository.completeWithBilling({ appointmentId: "visit", items: first.items, amountReceivedDa: first.received! });
    expect(payments()).toEqual([]);

    const existing = { number: "INV", grossDa: 5000, balanceDa: 5000, lines: [{ desc: "Consultation", amountDa: 5000 }] };
    const rest = billingDraft([], "5000", existing);
    expect(rest).toMatchObject({ canConfirm: true, total: 5000, due: 5000 });
    await repository.completeWithBilling({ appointmentId: "visit", items: rest.items, amountReceivedDa: rest.received! });

    expect(invoice()).toEqual({ gross: 500000, status: "issued" });
    expect(payments()).toEqual([500000]);
    expect(stage()).toBe("done");
  });

  it("ne peut plus partir d'un montant supposé : sans saisie, rien n'est envoyé", () => {
    const untouched = billingDraft([{ desc: "Consultation - Contrôle", amount: "" }], "");
    expect(untouched.canConfirm).toBe(false);
    expect(invoice()).toBeUndefined();
  });
});
