// Base vide au schéma réel de l'app (SQLITE_MIGRATIONS, comme getDatabase), avec un vétérinaire.
// Sert de base source à gen-clinique.py sur une machine qui n'a pas de base de test.
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs base-schema.mjs <sortie.db>
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
db.exec("INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','vet@exemple.invalid','x','Dr Mesure','admin')");
db.close();
console.log(JSON.stringify({ migrations: applied.length }));
