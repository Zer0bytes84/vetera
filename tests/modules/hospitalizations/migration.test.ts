import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { CARE_TASKS_MIGRATION_SQL } from "../../../src/modules/care-tasks/migration";
import { STAYS_MIGRATION_SQL } from "../../../src/modules/hospitalizations/stays/migration";
const databases: DatabaseSync[] = [];
afterEach(() => { for (const db of databases) db.close(); databases.length = 0; });
function setup() {
 const db = new DatabaseSync(":memory:"); databases.push(db);
 db.exec("PRAGMA foreign_keys=ON; CREATE TABLE patients(id TEXT PRIMARY KEY); INSERT INTO patients VALUES ('p1'),('p2');");
 db.exec(CARE_TASKS_MIGRATION_SQL); db.exec(STAYS_MIGRATION_SQL);
 db.exec("INSERT INTO locations(id,name,type,created_at,updated_at) VALUES ('l1','Box 1','box','2026','2026');");
 return db;
}
function admit(db: DatabaseSync, id: string, patient = "p1", location: string | null = "l1") {
 db.prepare("INSERT INTO stays(id,patient_id,location_id,status,admitted_at,reason,author_id,created_at,updated_at) VALUES (?,?,?,'admis','2026-10-12T12:00:00Z','Observation','vet','2026','2026')").run(id, patient, location);
}
it("protège l’unicité patient et l’occupation jusqu’à la sortie", () => {
 const db = setup(); admit(db, "s1");
 expect(() => admit(db,"s2","p1",null)).toThrow();
 expect(() => admit(db,"s2","p2")).toThrow();
 expect(() => db.exec("UPDATE locations SET active=0")).toThrow();
 db.exec("UPDATE stays SET status='sorti',discharged_at='2026-10-13T12:00:00Z',discharge_summary='Retour à domicile'");
 expect(() => admit(db,"s2","p2")).not.toThrow();
});
it("interdit une admission dans une cage inactive", () => {
 const db = setup(); db.exec("UPDATE locations SET active=0");
 expect(() => admit(db,"s1")).toThrow();
});
it("exige motif d’annulation et préserve les références historiques", () => {
 const db=setup(); admit(db,"s1");
 expect(() => db.exec("UPDATE stays SET status='annule'")).toThrow();
 expect(() => db.exec("DELETE FROM patients WHERE id='p1'")).toThrow();
 db.exec("UPDATE stays SET status='annule',cancellation_reason='Admission annulée'");
 expect(() => admit(db,"s2")).not.toThrow();
});
