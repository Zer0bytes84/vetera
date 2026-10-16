import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { PATIENT_REMINDERS_MIGRATION_SQL } from "../../../src/modules/patient-reminders/migration";
it("importe les échéances manuelles une seule fois sans toucher aux vaccinations ni aux notifications", () => {
 const db = new DatabaseSync(":memory:");
 try {
  db.exec(`PRAGMA foreign_keys=ON;
  CREATE TABLE patients(id TEXT PRIMARY KEY); INSERT INTO patients VALUES ('p1');
  CREATE TABLE vaccinations(id TEXT PRIMARY KEY,patient_id TEXT,vaccine_type TEXT,vaccine_name TEXT,next_due_at TEXT,vet_id TEXT);
  INSERT INTO vaccinations VALUES ('v1','p1','rage','Rage','2027-10-12T00:00:00Z','vet');
  CREATE TABLE reminders(id TEXT PRIMARY KEY,status TEXT); INSERT INTO reminders VALUES ('appointment','pending');`);
  db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
  db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
  expect(db.prepare("SELECT count(*) AS n FROM patient_reminders").get()?.n).toBe(1);
  expect(db.prepare("SELECT origin,due_date FROM patient_reminders").get()).toMatchObject({origin:"manuel",due_date:"2027-10-12"});
  expect(db.prepare("SELECT count(*) AS n FROM reminder_history").get()?.n).toBe(1);
  expect(db.prepare("SELECT next_due_at FROM vaccinations").get()?.next_due_at).toBe("2027-10-12T00:00:00Z");
  expect(db.prepare("SELECT status FROM reminders").get()?.status).toBe("pending");
  expect(() => db.exec("UPDATE patient_reminders SET status='annule'")).toThrow();
  db.exec("UPDATE reminder_types SET interval_months=6 WHERE id='vaccination'");
  db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
  expect(db.prepare("SELECT interval_months FROM reminder_types WHERE id='vaccination'").get()?.interval_months).toBe(6);
 } finally {db.close();}
});
it("ne bloque pas la suppression explicite d’un patient et ne laisse pas de rappel orphelin",()=>{
 const db=new DatabaseSync(":memory:");try{
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE patients(id TEXT PRIMARY KEY);INSERT INTO patients VALUES('p1'),('p2');CREATE TABLE vaccinations(id TEXT,patient_id TEXT,vaccine_type TEXT,vaccine_name TEXT,next_due_at TEXT,vet_id TEXT);INSERT INTO vaccinations VALUES('v1','p1','rage','Rage','2027-10-12','vet'),('v2','p2','rage','Rage','2027-10-12','vet');");
 db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
 db.exec("DELETE FROM patients WHERE id='p1'");
 expect(db.prepare("SELECT patient_id FROM patient_reminders").all()).toEqual([{patient_id:"p2"}]);
 expect(db.prepare("SELECT count(*) AS n FROM reminder_history").get()?.n).toBe(1);
 }finally{db.close();}
});
