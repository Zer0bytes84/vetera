// Applique à une copie de base les migrations de l'app qui lui manquent (runSqliteMigrations, comme getDatabase).
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs migre-base.mjs <base>
import { DatabaseSync } from "node:sqlite";
const { runSqliteMigrations } = await import("../../../../src/services/sqlite/migration-runner.ts");
const { SQLITE_MIGRATIONS } = await import("../../../../src/services/sqlite/migrations.ts");
const db = new DatabaseSync(process.argv[2]);
const applied = await runSqliteMigrations(
  {
    execute: async (sql, params = []) => (params.length ? db.prepare(sql).run(...params) : db.exec(sql)),
    select: async (sql, params = []) => db.prepare(sql).all(...params),
  },
  SQLITE_MIGRATIONS
);
db.close();
console.log(JSON.stringify({ applied }));
