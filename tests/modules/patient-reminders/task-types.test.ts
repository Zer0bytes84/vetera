import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { PATIENT_REMINDERS_MIGRATION_SQL } from "@/modules/patient-reminders/migration";
import { TASK_REMINDER_TYPES_MIGRATION_SQL } from "@/modules/patient-reminders/task-types-migration";
const databases: DatabaseSync[]=[];
afterEach(()=>{for(const db of databases) db.close();databases.length=0;});
function setup() {
 const db=new DatabaseSync(":memory:");databases.push(db);
 db.exec("PRAGMA foreign_keys=ON; CREATE TABLE patients(id TEXT PRIMARY KEY); CREATE TABLE vaccinations(id TEXT,patient_id TEXT,vaccine_type TEXT,vaccine_name TEXT,next_due_at TEXT,vet_id TEXT); CREATE TABLE tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,status TEXT DEFAULT 'todo',due_date TEXT);");
 db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
 db.exec("INSERT INTO tasks VALUES('legacy','Appeler le propriétaire','todo','2026-10-14');");
 db.exec(TASK_REMINDER_TYPES_MIGRATION_SQL);
 return db;
}
it("préserve les rappels existants, sans leur attribuer un type inventé",()=>{
 const db=setup();expect(db.prepare('SELECT * FROM tasks').get()).toEqual({id:'legacy',title:'Appeler le propriétaire',status:'todo',due_date:'2026-10-14',reminder_type_id:null});
});
it("persiste le type configuré et la date choisie pour le formulaire rapide",()=>{
 const db=setup();db.prepare("INSERT INTO tasks(id,title,due_date,reminder_type_id) VALUES(?,?,?,?)").run('typed','Contrôle','2026-10-20','vaccination');
 expect(db.prepare("SELECT t.due_date,r.name FROM tasks t JOIN reminder_types r ON r.id=t.reminder_type_id WHERE t.id='typed'").get()).toEqual({due_date:'2026-10-20',name:'Vaccination'});
});
it("refuse un type inconnu ou désactivé mais laisse traiter un rappel déjà affecté",()=>{
 const db=setup();const insert=db.prepare("INSERT INTO tasks(id,title,reminder_type_id) VALUES(?,?,?)");
 expect(()=>insert.run('bad','Rappel','inconnu')).toThrow('type de rappel actif');
 insert.run('typed','Rappel','vaccination');db.exec("UPDATE reminder_types SET active=0 WHERE id='vaccination';");
 expect(()=>insert.run('inactive','Rappel','vaccination')).toThrow('type de rappel actif');
 expect(()=>db.exec("UPDATE tasks SET status='done' WHERE id='typed'")).not.toThrow();
 expect(()=>db.exec("UPDATE tasks SET reminder_type_id='vaccination' WHERE id='legacy'")).toThrow('type de rappel actif');
});
it("permet de retirer le type et garde le rappel si un type sans échéance liée est supprimé",()=>{
 const db=setup();db.exec("INSERT INTO tasks(id,title,reminder_type_id) VALUES('typed','Rappel','vaccination'); DELETE FROM reminder_types WHERE id='vaccination';");
 expect(db.prepare("SELECT title,reminder_type_id FROM tasks WHERE id='typed'").get()).toEqual({title:'Rappel',reminder_type_id:null});
});
