import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
const mock = vi.hoisted(() => ({ admin: vi.fn(), password: vi.fn(), backup: vi.fn(), operation: vi.fn() }));
vi.mock("@/services/adminAccess", () => ({ requireAdministrator: mock.admin, verifyAdministratorPassword: mock.password }));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => true }));
vi.mock("@/services/backupService", () => ({ createBackup: mock.backup }));
vi.mock("@/services/sqlite/database", () => ({ runDbOperation: mock.operation }));
import { resetLocalData, RESET_CONFIRMATION } from "@/services/localDataReset";
beforeEach(() => { mock.admin.mockReset().mockResolvedValue({ id: "admin" }); mock.password.mockReset().mockResolvedValue({ id: "admin" }); mock.backup.mockReset().mockResolvedValue({ filename: "backup.db" }); mock.operation.mockReset(); vi.stubGlobal("window", { dispatchEvent: vi.fn() }); vi.stubGlobal("localStorage", { clear: vi.fn() }); });
describe("local reset safety", () => {
  it("requires exact confirmation before authentication or writes", async () => { await expect(resetLocalData("oui", "secret")).rejects.toThrow("RÉINITIALISER"); expect(mock.password).not.toHaveBeenCalled(); expect(mock.operation).not.toHaveBeenCalled(); });
  it("refuses wrong credentials without backup or mutation", async () => { mock.password.mockRejectedValue(new Error("Mot de passe incorrect")); await expect(resetLocalData(RESET_CONFIRMATION, "wrong")).rejects.toThrow("incorrect"); expect(mock.backup).not.toHaveBeenCalled(); });
  it("aborts when the backup fails", async () => { mock.backup.mockResolvedValue(null); await expect(resetLocalData(RESET_CONFIRMATION, "secret")).rejects.toThrow("sauvegarde"); expect(mock.operation).not.toHaveBeenCalled(); });
  it.each([false, true])("resets all 35 migrations safely, simulated write failure: %s", async fail => {
    const sql = new DatabaseSync(":memory:");
    const db = { execute: async (query: string, values: unknown[] = []) => values.length ? sql.prepare(query).run(...values as never[]) : sql.exec(query), select: async <T>(query: string, values: unknown[] = []) => sql.prepare(query).all(...values as never[]) as T };
    try {
      await runSqliteMigrations(db, SQLITE_MIGRATIONS);
      sql.exec("CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT); INSERT INTO users (id, email, password_hash, display_name, role, status) VALUES ('admin','admin@test','hash','Admin','admin','active'); INSERT INTO owners (id, first_name, last_name, phone) VALUES ('owner', 'Owner', 'Test', '000'); INSERT INTO app_settings (key, value) VALUES ('license_activation_token', 'preserved');");
      sql.exec("INSERT INTO invoices (id, owner_id, document_status, subtotal_amount, discount_amount, tax_amount, gross_amount) VALUES ('invoice','owner','draft',100,0,0,100); INSERT INTO invoice_lines (id, invoice_id, description, quantity_milli, unit_amount, discount_bps, tax_bps, base_amount, discount_amount, tax_amount, gross_amount) VALUES ('line','invoice','Consultation',1000,100,0,0,100,0,0,100); UPDATE invoices SET document_status='issued', number='INV-2026-1', issued_at='2026-10-16T12:00:00Z', owner_snapshot='{}', clinic_snapshot='{}', issue_idempotency_key='issue1' WHERE id='invoice';");
      const triggerCount = sql.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'").get()?.n;
      mock.operation.mockImplementation(fn => fn({ ...db, execute: async (query: string, values: unknown[] = []) => {
        if (fail && query.startsWith('CREATE TABLE IF NOT EXISTS users')) throw new Error("Simulated disk failure");
        return db.execute(query, values);
      }}));
      if (fail) {
        await expect(resetLocalData(RESET_CONFIRMATION, "secret")).rejects.toThrow("Simulated disk failure");
        expect(sql.prepare("SELECT COUNT(*) AS n FROM owners").get()?.n).toBe(1);
        expect(sql.prepare("SELECT COUNT(*) AS n FROM invoices").get()?.n).toBe(1);
        expect(sql.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'").get()?.n).toBe(triggerCount);
        expect(sql.prepare("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
        return;
      }
      await resetLocalData(RESET_CONFIRMATION, "secret");
      expect(sql.prepare("SELECT COUNT(*) AS n FROM owners").get()?.n).toBe(0);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM users").get()?.n).toBe(0);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM sessions").get()?.n).toBe(0);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM app_settings").get()?.n).toBe(0);
      expect(mock.backup.mock.invocationCallOrder[0]).toBeLessThan(mock.operation.mock.invocationCallOrder[0]);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM migrations").get()?.n).toBe(35);
      expect(sql.prepare("SELECT value FROM app_settings WHERE key='license_activation_token'").get()).toBeUndefined();
      expect(sql.prepare("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
      expect(sql.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM invoices").get()?.n).toBe(0);
      expect(sql.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'").get()?.n).toBe(triggerCount);
    } finally { sql.close(); }
  });
});
