import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { createStayStore } from "../../../src/modules/hospitalizations/stays/store";
import { STAYS_MIGRATION_SQL } from "../../../src/modules/hospitalizations/stays/migration";
import { CARE_TASKS_MIGRATION_SQL } from "../../../src/modules/care-tasks/migration";
import type { CareDatabase } from "../../../src/modules/care-tasks/store";
const databases: DatabaseSync[]=[];
afterEach(() => { for (const db of databases) db.close(); databases.length=0; });
function setup() {
 const db=new DatabaseSync(":memory:"); databases.push(db);
 db.exec("PRAGMA foreign_keys=ON; CREATE TABLE patients(id TEXT PRIMARY KEY); INSERT INTO patients VALUES('p1'),('p2');" + CARE_TASKS_MIGRATION_SQL + STAYS_MIGRATION_SQL);
 db.exec("CREATE TABLE tasks(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,status TEXT,priority TEXT,due_date TEXT,is_reminder INTEGER,patient_id TEXT REFERENCES patients(id),created_at TEXT,updated_at TEXT);");
 const adapter: CareDatabase={
  async select<T>(sql: string,args: unknown[] = []) { return db.prepare(sql.replace(/\$\d+/g,"?")).all(...args as (string | number | null)[]) as T; },
  async execute(sql: string,args: unknown[] = []) { return {rowsAffected:Number(db.prepare(sql.replace(/\$\d+/g,"?")).run(...args as (string | number | null)[]).changes)}; }
 };
 let counter=0;
 let queue: Promise<unknown>=Promise.resolve();
 const store=createStayStore({read: fn => queue.then(() => fn(adapter)),transaction: fn => {
  const result=queue.then(async () => { db.exec("BEGIN IMMEDIATE"); try { const value=await fn(adapter); db.exec("COMMIT"); return value; } catch(error) { db.exec("ROLLBACK"); throw error; } });
  queue=result.catch(() => undefined); return result;
 }}, () => `id-${++counter}`, () => new Date("2026-10-12T12:00:00Z"));
 return {db,store};
}
it("admission vers sortie conserve toutes les transitions et libère l’emplacement", async () => {
 const {store}=setup(); const locationId=await store.createLocation("Box A","box","vet");
 const stay=await store.admit({patientId:"p1",locationId,admittedAt:"2026-10-12T12:00:00Z",reason:"Observation"},"vet");
 await store.transition(stay.id,"en_cours","vet");
 await store.transition(stay.id,"sortie_prevue","vet",{plannedAt:"2026-10-13T12:00:00Z"});
 await expect(store.transition(stay.id,"sorti","vet")).rejects.toThrow();
 const discharged=await store.transition(stay.id,"sorti","vet",{dischargedAt:"2026-10-13T12:00:00Z",summary:"Retour à domicile"});
 expect(discharged.discharge_summary).toBe("Retour à domicile");
 expect(await store.history(stay.id)).toHaveLength(4);
 await expect(store.admit({patientId:"p2",locationId,admittedAt:"2026-10-13T12:00:00Z",reason:"Surveillance"},"vet")).resolves.toMatchObject({status:"admis"});
});
it("une occupation refusée ne crée ni séjour ni historique incomplet", async () => {
 const {store,db}=setup(); const locationId=await store.createLocation("Cage A","cage","vet");
 await store.admit({patientId:"p1",locationId,admittedAt:"2026-10-12T12:00:00Z",reason:"Observation"},"vet");
 await expect(store.admit({patientId:"p2",locationId,admittedAt:"2026-10-12T12:00:00Z",reason:"Observation"},"vet")).rejects.toThrow();
 expect(await store.list()).toHaveLength(1);
 expect(db.prepare("SELECT count(*) AS n FROM stay_history").get()).toEqual({n:1});
});
it("transfert tracé, puis annulation motivée terminale", async () => {
 const {store}=setup(); const first=await store.createLocation("Box A","box","vet"), second=await store.createLocation("Chenil B","chenil","vet");
 const stay=await store.admit({patientId:"p1",locationId:first,admittedAt:"2026-10-12T12:00:00Z",reason:"Observation"},"vet");
 expect((await store.transfer(stay.id,second,"vet","Isolement")).location_id).toBe(second);
 await expect(store.transition(stay.id,"annule","vet")).rejects.toThrow();
 await store.transition(stay.id,"annule","vet",{reason:"Admission annulée"});
 await expect(store.transfer(stay.id,first,"vet","Retour")).rejects.toThrow();
 expect(await store.history(stay.id)).toHaveLength(3);
});
it("génère les mêmes tâches de soins et annule seulement les occurrences futures à la sortie", async () => {
 const {store,db}=setup();
 const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 const plan=await store.createPlan(stay.id,{label:"Contrôle",type:"controle",startsAt:"2026-10-12T00:00:00Z",endsAt:"2026-10-14T23:59:59Z",times:["08:00","18:00"]},"vet");
 expect(await store.tasks(stay.id)).toHaveLength(6);
 expect(db.prepare("SELECT count(*) AS n FROM care_tasks WHERE care_plan_id=?").get(plan)).toEqual({n:6});
 await store.transition(stay.id,"en_cours","vet");
 await store.transition(stay.id,"sortie_prevue","vet",{plannedAt:"2026-10-13T12:00:00Z"});
 await store.transition(stay.id,"sorti","vet",{dischargedAt:"2026-10-13T12:00:00Z",summary:"Retour"});
 const future=db.prepare("SELECT heure_prevue,statut FROM care_tasks WHERE stay_id=?").all(stay.id) as {heure_prevue: string;statut: string}[];
 for (const task of future) expect(task.statut).toBe(task.heure_prevue >= "2026-10-13T12:00:00.000Z" ? "annule" : "a_faire");
 await expect(store.createPlan(stay.id,{label:"Contrôle",type:"controle",startsAt:"2026-10-14T00:00:00Z",endsAt:"2026-10-14T23:59:59Z",times:["08:00"]},"vet")).rejects.toThrow();
});
it("une erreur de plan ne laisse aucune occurrence ni plan partiel", async () => {
 const {store}=setup(); const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 await expect(store.createPlan(stay.id,{label:"Contrôle",type:"invalid",startsAt:"2026-10-12T00:00:00Z",endsAt:"2026-10-13T00:00:00Z",times:["08:00"]},"vet")).rejects.toThrow();
 expect(await store.plans(stay.id)).toHaveLength(0); expect(await store.tasks(stay.id)).toHaveLength(0);
});
it("régénérer un plan est idempotent et conserve les tâches exécutées", async () => {
 const {store,db}=setup(); const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 const plan=await store.createPlan(stay.id,{label:"Surveillance",type:"controle",startsAt:"2026-10-12T00:00:00Z",endsAt:"2026-10-13T23:59:59Z",times:["08:00"]},"vet");
 const first=db.prepare("SELECT id FROM care_tasks ORDER BY heure_prevue LIMIT 1").get() as {id:string};
 db.prepare("UPDATE care_tasks SET statut='fait',execute_par='vet',completed_at='2026-10-12T12:00:00Z' WHERE id=?").run(first.id);
 expect(await store.regeneratePlan(plan,"vet")).toBe(0);
 expect(await store.regeneratePlan(plan,"vet")).toBe(0);
 expect(await store.tasks(stay.id)).toHaveLength(2);
 expect(db.prepare("SELECT statut FROM care_tasks WHERE id=?").get(first.id)).toEqual({statut:"fait"});
});
it("enregistre les constantes avec leur auteur sans remplacer les précédentes", async () => {
 const {store}=setup(); const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 await store.addVitals(stay.id,{recordedAt:"2026-10-12T08:00:00Z",temperatureC:38.5,weightKg:4,generalState:"Alerte"},"vet");
 await store.addVitals(stay.id,{recordedAt:"2026-10-12T09:00:00Z",heartRate:100,appetite:"Conservé"},"assistant");
 const vitals=await store.vitals(stay.id); expect(vitals).toHaveLength(2); expect(vitals[0].temperature_c).toBe(38.5); expect(vitals[1].author_id).toBe("assistant");
 await expect(store.addVitals(stay.id,{recordedAt:"2026-10-12T10:00:00Z",weightKg:-1},"vet")).rejects.toThrow();
 expect(await store.vitals(stay.id)).toHaveLength(2);
});

it("le contrôle de sortie utilise Rappels, reste lié au patient et ne peut être dupliqué", async () => {
 const {store,db}=setup();
 const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 await expect(store.scheduleFollowUp(stay.id,"2026-10-14","vet")).rejects.toThrow("Confirmez la sortie");
 await store.transition(stay.id,"en_cours","vet");
 await store.transition(stay.id,"sortie_prevue","vet",{plannedAt:"2026-10-13T12:00:00Z"});
 await store.transition(stay.id,"sorti","vet",{dischargedAt:"2026-10-13T12:00:00Z",summary:"Surveiller l’appétit"});
 await expect(store.scheduleFollowUp(stay.id,"2026-02-30","vet")).rejects.toThrow("date");
 await expect(store.scheduleFollowUp(stay.id,"2026-10-12","vet")).rejects.toThrow("précéder");
 await store.scheduleFollowUp(stay.id,"2026-10-15","vet");
 expect(await store.followUp(stay.id)).toMatchObject({due_date:"2026-10-15",status:"todo"});
 expect(db.prepare("SELECT patient_id,description,is_reminder FROM tasks").get()).toEqual({patient_id:"p1",description:"Surveiller l’appétit",is_reminder:1});
 await expect(store.scheduleFollowUp(stay.id,"2026-10-16","vet")).rejects.toThrow("déjà planifié");
 expect(db.prepare("SELECT count(*) AS n FROM tasks").get()).toEqual({n:1});
 expect(await store.history(stay.id)).toHaveLength(5);
});
it("désactivation protégée et transfert refusé vers une cage occupée ou inactive", async () => {
 const {store}=setup();
 const first=await store.createLocation("A","cage","vet"), second=await store.createLocation("B","box","vet"), third=await store.createLocation("C","chenil","vet");
 const draft={admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"};
 const stay=await store.admit({...draft,patientId:"p1",locationId:first},"vet");
 await store.admit({...draft,patientId:"p2",locationId:second},"vet");
 await expect(store.setLocationActive(first,false,"vet")).rejects.toThrow("occupé");
 await expect(store.transfer(stay.id,second,"vet","Isolement")).rejects.toThrow("occupé");
 await store.setLocationActive(third,false,"vet");
 await expect(store.transfer(stay.id,third,"vet","Isolement")).rejects.toThrow("disponible");
 await store.setLocationActive(third,true,"vet");
 await store.transfer(stay.id,third,"vet","Isolement");
 await store.setLocationActive(first,false,"vet");
 expect((await store.locations()).find(item => item.id === first)?.active).toBe(0);
 expect((await store.get(stay.id)).location_id).toBe(third);
 expect(await store.history(stay.id)).toHaveLength(2);
});

it("deux admissions concurrentes ne doublent ni patient ni emplacement", async () => {
 const {store}=setup(); const locationId=await store.createLocation("Unique","box","vet");
 const draft={locationId,admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"};
 const result=await Promise.allSettled([store.admit({...draft,patientId:"p1"},"vet"),store.admit({...draft,patientId:"p2"},"vet")]);
 expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1);
 expect(result.filter(item => item.status === "rejected")).toHaveLength(1);
 const [stay]=await store.list();
 await expect(store.admit({...draft,locationId:undefined,patientId:stay.patient_id},"vet")).rejects.toThrow();
 expect(await store.list()).toHaveLength(1); expect(await store.history(stay.id)).toHaveLength(1);
});
it("modifier un plan remplace seulement les soins futurs à faire et garde les réalisés et en cours", async () => {
 const {store,db}=setup(); const stay=await store.admit({patientId:"p1",admittedAt:"2026-10-12T00:00:00Z",reason:"Observation"},"vet");
 const draft={label:"Surveillance",type:"controle",startsAt:"2026-10-12T00:00:00Z",endsAt:"2026-10-14T23:59:59Z",times:["07:00","18:00"]};
 const plan=await store.createPlan(stay.id,draft,"vet");
 const tasks=await store.tasks(stay.id);
 const finished=tasks.find(task => task.heure_prevue >= "2026-10-13T00:00:00Z")!;
 const ongoing=tasks.find(task => task.heure_prevue > finished.heure_prevue)!;
 db.prepare("UPDATE care_tasks SET statut='fait',execute_par='vet',completed_at='2026-10-12T12:00:00Z' WHERE id=?").run(finished.id);
 db.prepare("UPDATE care_tasks SET statut='en_cours' WHERE id=?").run(ongoing.id);
 const updated={...draft,label:"Contrôle renforcé",times:["07:00","18:00","20:00"]};
 expect(await store.updatePlan(plan,updated,"vet")).toBeGreaterThan(0);
 expect(db.prepare("SELECT statut,label,execute_par FROM care_tasks WHERE id=?").get(finished.id)).toEqual({statut:"fait",label:"Surveillance",execute_par:"vet"});
 expect(db.prepare("SELECT statut,label FROM care_tasks WHERE id=?").get(ongoing.id)).toEqual({statut:"en_cours",label:"Surveillance"});
 const past=tasks.find(task => task.heure_prevue < "2026-10-12T12:00:00.000Z")!;
 expect(db.prepare("SELECT statut,label FROM care_tasks WHERE id=?").get(past.id)).toEqual({statut:"a_faire",label:"Surveillance"});
 const cancelled=db.prepare("SELECT count(*) AS n FROM care_tasks WHERE care_plan_id=? AND statut='annule'").get(plan) as {n:number};
 expect(cancelled.n).toBeGreaterThan(0);
 const before=await store.tasks(stay.id);
 expect(await store.updatePlan(plan,updated,"vet")).toBe(0);
 expect(await store.regeneratePlan(plan,"vet")).toBe(0);
 expect(await store.tasks(stay.id)).toHaveLength(before.length);
 await expect(store.updatePlan(plan,{...updated,type:"invalid"},"vet")).rejects.toThrow();
 expect(await store.tasks(stay.id)).toEqual(before);
});
