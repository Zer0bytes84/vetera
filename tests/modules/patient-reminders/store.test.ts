import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { createPatientReminderStore, type VaccineReminderDraft } from "../../../src/modules/patient-reminders/store";
import { PATIENT_REMINDERS_MIGRATION_SQL } from "../../../src/modules/patient-reminders/migration";
import type { CareDatabase } from "../../../src/modules/care-tasks/store";
function setup() {
 const db=new DatabaseSync(":memory:");
 db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE patients(id TEXT PRIMARY KEY); INSERT INTO patients VALUES('p1'),('p2');
 CREATE TABLE vaccinations(id TEXT PRIMARY KEY,patient_id TEXT REFERENCES patients(id),vaccine_name TEXT,vaccine_type TEXT,administered_at TEXT,next_due_at TEXT,batch_number TEXT,manufacturer TEXT,vet_id TEXT,notes TEXT,updated_at TEXT);`);
 db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
 const adapter: CareDatabase={async select<T>(sql: string,values: unknown[]=[]) {return db.prepare(sql).all(...values as (string|number|null)[]) as T;},async execute(sql: string,values: unknown[]=[]) {return {rowsAffected:Number(db.prepare(sql).run(...values as (string|number|null)[]).changes)};}};
 let i=0;
 const store=createPatientReminderStore({read:fn=>fn(adapter),transaction:async fn=>{db.exec("BEGIN");try {const result=await fn(adapter);db.exec("COMMIT");return result;}catch(error){db.exec("ROLLBACK");throw error;}}},()=>`history-${++i}`,()=>new Date("2026-10-12T12:00:00Z"));
 return {db,store};
}
const vaccine: VaccineReminderDraft={id:"v1",patientId:"p1",vaccineName:"Rage",vaccineType:"rage",administeredDate:"2026-10-12",dueDate:"2027-10-12",origin:"auto"};
it("acte vers rappel vers traité vers prochain reste atomique, idempotent et limité au patient et à la famille",async()=>{
 const {db,store}=setup();try {
 await store.saveVaccination(vaccine,"vet");
 await store.saveVaccination({...vaccine,id:"other",patientId:"p2"},"vet");
 await store.saveVaccination({...vaccine,id:"other-family",vaccineType:"leptospirose"},"vet");
 await store.saveVaccination({...vaccine,id:"v2",administeredDate:"2027-10-12",dueDate:"2028-10-12"},"vet");
 const rows=await store.list();
 expect(rows.find(r=>r.source_id==="v1")?.status).toBe("traite");
 expect(rows.filter(r=>r.status==="en_cours")).toHaveLength(3);
 await store.saveVaccination({...vaccine,id:"v2",administeredDate:"2027-10-12",dueDate:"2028-11-12"},"vet");
 expect(await store.list()).toHaveLength(4);
 expect((await store.list()).find(r=>r.source_id==="v2")?.due_date).toBe("2028-11-12");
 expect(await store.history("vaccine-reminder:v1")).toHaveLength(2);
 expect(db.prepare("SELECT count(*) AS n FROM vaccinations").get()?.n).toBe(4);
 }finally{db.close();}
});
it("une erreur de stockage du rappel annule aussi la vaccination et la clôture précédente",async()=>{
 const {db,store}=setup();try{
 await store.saveVaccination(vaccine,"vet");
 db.exec("CREATE TRIGGER fail_reminder BEFORE INSERT ON patient_reminders BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
 await expect(store.saveVaccination({...vaccine,id:"v2"},"vet")).rejects.toThrow();
 expect(db.prepare("SELECT count(*) AS n FROM vaccinations").get()?.n).toBe(1);
 expect((await store.list())[0].status).toBe("en_cours");
 expect(await store.history("vaccine-reminder:v1")).toHaveLength(1);
 }finally{db.close();}
});
it("report, annulation et traitement gardent l’origine et l’historique, et refusent les états terminaux",async()=>{
 const {db,store}=setup();try{
 await store.saveVaccination(vaccine,"vet");
 await expect(store.postpone("vaccine-reminder:v1","2028-10-12","vet","")).rejects.toThrow();
 await store.postpone("vaccine-reminder:v1","2028-10-12","vet","Propriétaire indisponible");
 await expect(store.transition("vaccine-reminder:v1","annule","vet")).rejects.toThrow();
 await store.transition("vaccine-reminder:v1","annule","vet","Refus du propriétaire");
 expect((await store.list())[0]).toMatchObject({origin:"auto",status:"annule",due_date:"2028-10-12"});
 await expect(store.transition("vaccine-reminder:v1","traite","vet")).rejects.toThrow();
 expect(await store.history("vaccine-reminder:v1")).toHaveLength(3);
 }finally{db.close();}
});
it("administre les types sans réécrire les échéances et ne génère pas de rappel pour un type désactivé",async()=>{
 const {db,store}=setup();try{
 await store.saveVaccination(vaccine,"vet");
 await store.saveType({id:"vaccination",name:"Vaccination annuelle",intervalMonths:6,active:false},"vet");
 expect((await store.list())[0].due_date).toBe("2027-10-12");
 await store.saveVaccination({...vaccine,id:"v2"},"vet");
 expect(await store.list()).toHaveLength(1);
 expect((await store.list())[0].status).toBe("traite");
 expect(db.prepare("SELECT count(*) AS n FROM vaccinations").get()?.n).toBe(2);
 await expect(store.saveType({name:"",intervalMonths:0,active:true},"vet")).rejects.toThrow();
 }finally{db.close();}
});
it("une édition d’acte conserve les rappels terminaux et une famille importée accentuée est reconnue",async()=>{
 const {db,store}=setup();try{
 await store.saveVaccination({...vaccine,vaccineType:"Félin"},"vet");
 db.exec("UPDATE patient_reminders SET family_key='félin',origin='manuel'");
 await store.saveVaccination({...vaccine,id:"v2",vaccineType:"Félin"},"vet");
 expect((await store.list()).find(r=>r.source_id==="v1")).toMatchObject({status:"traite",origin:"manuel"});
 await store.saveVaccination({...vaccine,vaccineType:"Félin",dueDate:"2029-10-12"},"vet");
 expect((await store.list()).find(r=>r.source_id==="v1")).toMatchObject({status:"traite",due_date:"2027-10-12"});
 await store.transition("vaccine-reminder:v2","traite","vet");
 expect((await store.list()).every(r=>r.status==="traite")).toBe(true);
 }finally{db.close();}
});
it("conserve les dates civiles locales dans le carnet et dans le rappel",async()=>{
 const {db,store}=setup();try{
 await store.saveVaccination(vaccine,"vet");
 const row=db.prepare("SELECT administered_at,next_due_at FROM vaccinations WHERE id='v1'").get();
 const date=new Date(String(row?.administered_at));const due=new Date(String(row?.next_due_at));
 expect([date.getFullYear(),date.getMonth()+1,date.getDate()]).toEqual([2026,10,12]);
 expect([due.getFullYear(),due.getMonth()+1,due.getDate()]).toEqual([2027,10,12]);
 expect((await store.list())[0].due_date).toBe("2027-10-12");
 }finally{db.close();}
});
