import { isTauriRuntime } from "./browser-store";
import { requireAdministrator, verifyAdministratorPassword } from "./adminAccess";
import { runSqliteMigrations, type MigrationDatabase } from "./sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "./sqlite/migrations";

export const RESET_CONFIRMATION = "RÉINITIALISER";
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

/** Recreate the canonical schema inside one outer transaction, including seeds. */
export async function resetSqliteSchema(db: MigrationDatabase) {
  await db.execute("PRAGMA foreign_keys = OFF");
  try {
    await db.execute("BEGIN IMMEDIATE TRANSACTION");
    try {
      const objects = await db.select<Array<{ name: string; type: string }>>("SELECT name, type FROM sqlite_master WHERE type IN ('view', 'table') AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'view' THEN 0 ELSE 1 END");
      for (const object of objects) await db.execute(`DROP ${object.type === "view" ? "VIEW" : "TABLE"} ${quote(object.name)}`);
      // Migration transactions belong to this outer reset. Any failure restores
      // the original schema, triggers and data in one rollback.
      const nested: MigrationDatabase = {
        select: (query, values) => db.select(query, values),
        execute: (query, values) => /^(BEGIN IMMEDIATE TRANSACTION|COMMIT|ROLLBACK)$/i.test(query.trim()) ? Promise.resolve(undefined) : db.execute(query, values),
      };
      await runSqliteMigrations(nested, SQLITE_MIGRATIONS);
      await db.execute("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
      const violations = await db.select<unknown[]>("PRAGMA foreign_key_check");
      if (violations.length) throw new Error("La réinitialisation a été annulée : incohérence des relations.");
      await db.execute("COMMIT");
    } catch (error) { await db.execute("ROLLBACK"); throw error; }
  } finally { await db.execute("PRAGMA foreign_keys = ON"); }
}

export async function resetLocalData(confirmation: string, password: string) {
  if (confirmation !== RESET_CONFIRMATION) throw new Error("Saisissez RÉINITIALISER pour confirmer.");
  await verifyAdministratorPassword(password);
  if (!isTauriRuntime()) {
    const key = "vetera.browser-db.v1";
    const backupKey = `${key}.before-reset`;
    const original = localStorage.getItem(key);
    if (!original) throw new Error("Aucune base locale à réinitialiser.");
    const state = JSON.parse(original) as { tables: Record<string, unknown[]> };
    localStorage.setItem(backupKey, original);
    for (const name of Object.keys(state.tables)) state.tables[name] = [];
    state.tables.app_settings = [{ id: "demo_data_disabled", key: "demo_data_disabled", value: "true" }];
    await requireAdministrator();
    localStorage.setItem(key, JSON.stringify(state));
    const preferences = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    for (const name of preferences) if (name && name !== key && name !== backupKey) localStorage.removeItem(name);
    localStorage.removeItem("auth_token");
  } else {
    const { createBackup } = await import("./backupService");
    if (!await createBackup("before-local-data-reset")) throw new Error("La sauvegarde préalable a échoué. Aucune donnée n’a été supprimée.");
    const { runDbOperation } = await import("./sqlite/database");
    await requireAdministrator();
    await runDbOperation(resetSqliteSchema);
    localStorage.clear();
  }
  window.dispatchEvent(new Event("sqlite-data-changed"));
}
