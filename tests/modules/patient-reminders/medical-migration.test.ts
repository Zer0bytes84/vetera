import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations, type MigrationDatabase } from "@/services/sqlite/migration-runner";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const db of databases) db.close(); databases.length = 0; });

async function oldDatabase() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  const adapter: MigrationDatabase = {
    async execute(sql, values = []) { return values.length ? db.prepare(sql).run(...values) : db.exec(sql); },
    async select<T>(sql, values = []) { return db.prepare(sql).all(...values) as T; },
  };
  await runSqliteMigrations(adapter, SQLITE_MIGRATIONS.filter((migration) => migration.version < "036"));
  db.exec(`INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Lina','Benali','0550123456');
    INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Milo','Chien');
    INSERT INTO tasks(id,title,status,due_date,reminder_type_id) VALUES('manual','Appeler Lina','todo','2026-10-12','vaccination');
    INSERT INTO patient_reminders(id,patient_id,type_id,source_id,family_key,due_date,origin,status,completed_at) VALUES('old','patient','vaccination','source','rage','2027-10-12','auto','traite','2026-10-12T12:00:00Z');
    INSERT INTO reminder_history(id,reminder_id,action,old_status,new_status,new_due_date) VALUES('history','old','traitement_manuel','en_cours','traite','2027-10-12');
    UPDATE reminder_types SET interval_months=6,active=0 WHERE id='vaccination';`);
  return { db, adapter };
}

it("migre les rappels patients et leur historique tout en conservant les rappels manuels", async () => {
  const { db, adapter } = await oldDatabase();
  const before = db.prepare("SELECT * FROM tasks").all();
  const typeBefore = db.prepare("SELECT name,interval_months,active FROM reminder_types WHERE id='vaccination'").get();
  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["036", "037", "038", "039", "040"]);
  expect(db.prepare("SELECT * FROM tasks").all()).toEqual(before);
  expect(db.prepare("SELECT name,interval_months,active FROM reminder_types WHERE id='vaccination'").get()).toEqual(typeBefore);
  expect(db.prepare("SELECT patient_id,client_id,type,statut,intervalle_mois FROM medical_reminders").get()).toEqual({ patient_id: "patient", client_id: "owner", type: "vaccin", statut: "termine", intervalle_mois: 6 });
  expect(db.prepare("SELECT new_status FROM medical_reminder_history").get()?.new_status).toBe("termine");
  expect(db.prepare("SELECT status FROM patient_reminders").get()?.status).toBe("traite");
});

it("conserve les réglages configurés et les cinq types préventifs au second démarrage", async () => {
  const { db, adapter } = await oldDatabase();
  await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
  expect(db.prepare("SELECT intervalle_defaut_mois,actif FROM reminder_types WHERE id='vaccin'").get()).toEqual({ intervalle_defaut_mois: 6, actif: 0 });
  expect(db.prepare("SELECT id FROM reminder_types WHERE id IN ('vaccin','vermifuge','controle_annuel','soin_dentaire','autre')").all()).toHaveLength(5);
  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual([]);
  expect(db.prepare("SELECT id FROM medical_reminders").all()).toHaveLength(1);
  expect(db.prepare("SELECT id FROM medical_reminder_history").all()).toHaveLength(1);
});

it("ouvre une base en migration 036 sans rejouer les rappels et conserve ses données après la mise à niveau documentaire", async () => {
  const { db, adapter } = await oldDatabase();
  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS.filter(({ version }) => version <= "036"))).resolves.toEqual(["036"]);
  const tables = ["tasks", "patients", "owners", "reminder_types", "patient_reminders", "medical_reminders", "medical_reminder_history"];
  const before = tables.map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());

  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["037", "038", "039", "040"]);

  for (const [index, table] of tables.entries()) {
    expect(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(before[index]);
  }
  expect(db.prepare("PRAGMA user_version").get()?.user_version).toBe(40);
  expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'").get()?.name).toBe("documents");
  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual([]);
});

it("annule sans perte une migration interrompue et la rejoue au démarrage suivant", async () => {
  const { db, adapter } = await oldDatabase();
  let fail = true;
  const failing: MigrationDatabase = {
    ...adapter,
    async execute(sql, values) {
      if (fail && sql.startsWith("CREATE INDEX IF NOT EXISTS idx_medical_reminders_due")) {
        fail = false;
        throw new Error("Interruption simulée");
      }
      return adapter.execute(sql, values);
    },
  };
  await expect(runSqliteMigrations(failing, SQLITE_MIGRATIONS)).rejects.toMatchObject({ version: "036" });
  expect(db.prepare("SELECT name FROM pragma_table_info('reminder_types') WHERE name='libelle'").all()).toEqual([]);
  expect(db.prepare("SELECT status FROM tasks WHERE id='manual'").get()?.status).toBe("todo");
  await expect(runSqliteMigrations(adapter, SQLITE_MIGRATIONS)).resolves.toEqual(["036", "037", "038", "039", "040"]);
});
