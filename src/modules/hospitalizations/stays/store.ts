import type { CareTask, CareType } from "@/modules/care-tasks/domain";
import type { CareDatabase, CarePersistence } from "@/modules/care-tasks/store";
import { assertStayTransition, carePlanOccurrences, type StayStatus } from "./domain";
export interface Stay {
 id: string; patient_id: string; location_id: string | null; status: StayStatus;
 admitted_at: string; planned_discharge_at: string | null; discharged_at: string | null;
 reason: string; discharge_summary: string; cancellation_reason: string | null;
 author_id: string; created_at: string; updated_at: string;
}
export interface CarePlan { id: string; stay_id: string; label: string; type: CareType; product_id: string | null; note: string; starts_at: string; ends_at: string; times_json: string; active: number; }
export interface CarePlanDraft { label: string; type: string; startsAt: string; endsAt: string; times: string[]; productId?: string; note?: string; }
export interface StayHistory { id: string; event: string; from_status: StayStatus | null; to_status: StayStatus; author_id: string; reason: string | null; changed_at: string; }
export interface StayLocation { id: string; name: string; type: "cage" | "box" | "chenil"; species: string | null; active: number; note: string; }
export interface VitalDraft { recordedAt: string; temperatureC?: number; heartRate?: number; respiratoryRate?: number; weightKg?: number; generalState?: string; appetite?: string; note?: string; }
export interface VitalSign { id: string; stay_id: string; recorded_at: string; temperature_c: number | null; heart_rate: number | null; respiratory_rate: number | null; weight_kg: number | null; general_state: string | null; appetite: string | null; note: string; author_id: string; }
export function createStayStore(persistence: CarePersistence, id: () => string, clock = () => new Date()) {
 const authorRequired = (author: string) => { if (!author.trim()) throw new Error("Un utilisateur connecté est requis."); };
 const iso = (value: string) => { const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new Error("Vérifiez la date du séjour."); return date.toISOString(); };
 const get = async (db: CareDatabase, stayId: string) => {
  const [stay] = await db.select<Stay[]>("SELECT * FROM stays WHERE id=$1", [stayId]);
  if (!stay) throw new Error("Ce séjour n’existe plus."); return stay;
 };
 const history = (db: CareDatabase, stayId: string, event: string, from: StayStatus | null, to: StayStatus, author: string, reason: string | null, location: string | null) => db.execute(
  "INSERT INTO stay_history(id,stay_id,event,from_status,to_status,location_id,author_id,reason,changed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
  [id(), stayId, event, from, to, location, author, reason, clock().toISOString()]
 );
 return {
  list(patientId?: string) { return persistence.read(db => patientId ? db.select<Stay[]>("SELECT * FROM stays WHERE patient_id=$1 ORDER BY admitted_at DESC,id", [patientId]) : db.select<Stay[]>("SELECT * FROM stays ORDER BY admitted_at DESC,id")); },
  get(stayId: string) { return persistence.read(db => get(db, stayId)); },
  history(stayId: string) { return persistence.read(db => db.select<StayHistory[]>("SELECT * FROM stay_history WHERE stay_id=$1 ORDER BY changed_at,rowid", [stayId])); },
  locations() { return persistence.read(db => db.select<StayLocation[]>("SELECT * FROM locations ORDER BY name,id")); },
  async createLocation(name: string, type: StayLocation["type"], author: string, species?: string) {
   authorRequired(author); if (!name.trim()) throw new Error("Indiquez le nom de l’emplacement.");
   const locationId=id(), now=clock().toISOString();
   await persistence.transaction(db => db.execute("INSERT INTO locations(id,name,type,species,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)", [locationId,name.trim(),type,species?.trim() || null,now,now])); return locationId;
  },
  async setLocationActive(locationId: string, active: boolean, author: string) {
   authorRequired(author);
   return persistence.transaction(async db => {
    const [location]=await db.select<StayLocation[]>("SELECT * FROM locations WHERE id=$1", [locationId]);
    if (!location) throw new Error("Cet emplacement n’existe plus.");
    if (!active) {
     const occupants=await db.select<{id: string}[]>("SELECT id FROM stays WHERE location_id=$1 AND status IN ('admis','en_cours','sortie_prevue')", [locationId]);
     if (occupants.length) throw new Error("Un emplacement occupé ne peut pas être désactivé.");
    }
    await db.execute("UPDATE locations SET active=$1,updated_at=$2 WHERE id=$3", [active ? 1 : 0,clock().toISOString(),locationId]);
   });
  },
  async admit(draft: { patientId: string; locationId?: string; admittedAt: string; reason: string }, author: string) {
   authorRequired(author); if (!draft.patientId || !draft.reason.trim()) throw new Error("Choisissez le patient et indiquez le motif.");
   const stayId=id(), now=clock().toISOString(), admittedAt=iso(draft.admittedAt);
   return persistence.transaction(async db => {
    await db.execute("INSERT INTO stays(id,patient_id,location_id,status,admitted_at,reason,author_id,created_at,updated_at) VALUES($1,$2,$3,'admis',$4,$5,$6,$7,$8)", [stayId,draft.patientId,draft.locationId || null,admittedAt,draft.reason.trim(),author,now,now]);
    await history(db,stayId,"admission",null,"admis",author,null,draft.locationId || null); return get(db,stayId);
   });
  },
  async transition(stayId: string, to: StayStatus, author: string, options: { reason?: string; dischargedAt?: string; summary?: string; plannedAt?: string } = {}) {
   return persistence.transaction(async db => {
    const stay=await get(db,stayId); assertStayTransition(stay.status,to,author,options.reason);
    const discharge=to === "sorti" ? iso(options.dischargedAt || clock().toISOString()) : stay.discharged_at;
    const planned=options.plannedAt ? iso(options.plannedAt) : stay.planned_discharge_at;
    if (to === "sortie_prevue" && !planned) throw new Error("Indiquez la date de sortie prévue.");
    if (to === "sorti" && !options.summary?.trim()) throw new Error("Renseignez le résumé de sortie.");
    const result=await db.execute("UPDATE stays SET status=$1,planned_discharge_at=$2,discharged_at=$3,discharge_summary=$4,cancellation_reason=$5,updated_at=$6 WHERE id=$7 AND status=$8", [to,planned,discharge,options.summary?.trim() || stay.discharge_summary,to === "annule" ? options.reason?.trim() : null,clock().toISOString(),stayId,stay.status]);
    if (result.rowsAffected !== 1) throw new Error("Le séjour a changé. Rechargez son détail.");
    if (to === "sorti" || to === "annule") {
     const cutoff=to === "sorti" ? discharge! : clock().toISOString();
     const tasks=await db.select<{id: string; statut: string}[]>("SELECT id,statut FROM care_tasks WHERE stay_id=$1 AND heure_prevue >= $2 AND statut IN ('a_faire','en_cours')", [stayId,cutoff]);
     const reason=to === "sorti" ? "Sortie du patient" : options.reason!.trim();
     for (const task of tasks) {
      await db.execute("UPDATE care_tasks SET statut='annule',motif_annulation=$1,updated_at=$2 WHERE id=$3", [reason,clock().toISOString(),task.id]);
      await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES($1,$2,$3,'annule',$4,$5,$6)", [id(),task.id,task.statut,author,clock().toISOString(),reason]);
     }
     await db.execute("UPDATE care_plans SET active=0,updated_at=$1 WHERE stay_id=$2", [clock().toISOString(),stayId]);
    }
    await history(db,stayId,"statut",stay.status,to,author,options.reason?.trim() || null,stay.location_id);
    return get(db,stayId);
   });
  },
  followUp(stayId: string) {
   return persistence.read(async db => {
    const [task]=await db.select<{id: string; due_date: string; status: string}[]>("SELECT id,due_date,status FROM tasks WHERE id=$1", [`stay-follow-up:${stayId}`]);
    return task ?? null;
   });
  },
  async scheduleFollowUp(stayId: string, dueDate: string, author: string) {
   authorRequired(author);
   const parsed=new Date(`${dueDate}T12:00:00Z`);
   if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== dueDate) throw new Error("Choisissez une date de contrôle valide.");
   return persistence.transaction(async db => {
    const stay=await get(db,stayId);
    if (stay.status !== "sorti" || !stay.discharged_at) throw new Error("Confirmez la sortie avant de planifier le contrôle.");
    const discharge=new Date(stay.discharged_at);
    const dischargeDay=`${discharge.getFullYear()}-${String(discharge.getMonth()+1).padStart(2,"0")}-${String(discharge.getDate()).padStart(2,"0")}`;
    if (dueDate < dischargeDay) throw new Error("Le contrôle ne peut pas précéder la sortie.");
    const taskId=`stay-follow-up:${stayId}`;
    const existing=await db.select<{id: string}[]>("SELECT id FROM tasks WHERE id=$1", [taskId]);
    if (existing.length) throw new Error("Un contrôle est déjà planifié pour ce séjour. Modifiez-le dans Rappels.");
    const now=clock().toISOString();
    await db.execute("INSERT INTO tasks(id,title,description,status,priority,due_date,is_reminder,patient_id,created_at,updated_at) VALUES($1,$2,$3,'todo','medium',$4,1,$5,$6,$7)", [taskId,"Contrôle après hospitalisation",stay.discharge_summary,dueDate,stay.patient_id,now,now]);
    await history(db,stayId,"controle",stay.status,stay.status,author,dueDate,stay.location_id);
    return taskId;
   });
  },
  vitals(stayId: string) { return persistence.read(db => db.select<VitalSign[]>("SELECT * FROM vital_signs WHERE stay_id=$1 ORDER BY recorded_at,id", [stayId])); },
  async addVitals(stayId: string, draft: VitalDraft, author: string) {
   authorRequired(author); const recorded=iso(draft.recordedAt);
   const values=[draft.temperatureC,draft.heartRate,draft.respiratoryRate,draft.weightKg];
   if (values.some(value => value != null && (!Number.isFinite(value) || value <= 0))) throw new Error("Les constantes doivent être des nombres positifs.");
   if (values.every(value => value == null) && !draft.generalState?.trim() && !draft.appetite?.trim()) throw new Error("Renseignez au moins une constante.");
   const vitalId=id(), now=clock().toISOString();
   await persistence.transaction(async db => {
    const stay=await get(db,stayId);
    if (stay.status === "sorti" || stay.status === "annule") throw new Error("Ce séjour est terminé.");
    if (recorded < stay.admitted_at) throw new Error("La mesure ne peut pas précéder l’admission.");
    await db.execute("INSERT INTO vital_signs(id,stay_id,recorded_at,temperature_c,heart_rate,respiratory_rate,weight_kg,general_state,appetite,note,author_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [vitalId,stayId,recorded,draft.temperatureC ?? null,draft.heartRate ?? null,draft.respiratoryRate ?? null,draft.weightKg ?? null,draft.generalState?.trim() || null,draft.appetite?.trim() || null,draft.note || "",author,now,now]);
    await history(db,stayId,"constantes",stay.status,stay.status,author,null,stay.location_id);
   }); return vitalId;
  },
  async regeneratePlan(planId: string, author: string) {
   authorRequired(author);
   return persistence.transaction(async db => {
    const [plan]=await db.select<{stay_id: string;label: string;type: string;product_id: string | null;note: string;starts_at: string;ends_at: string;times_json: string;active: number}[]>("SELECT * FROM care_plans WHERE id=$1", [planId]);
    if (!plan || !plan.active) throw new Error("Ce plan n’est plus actif.");
    const stay=await get(db,plan.stay_id);
    if (stay.status === "sorti" || stay.status === "annule") throw new Error("Ce séjour est terminé.");
    const times: unknown=JSON.parse(plan.times_json);
    if (!Array.isArray(times) || times.some(value => typeof value !== "string")) throw new Error("Les horaires du plan sont invalides.");
    const occurrences=carePlanOccurrences(new Date(plan.starts_at),new Date(plan.ends_at),times as string[]);
    let added=0; const now=clock().toISOString();
    for (const scheduled of occurrences.filter(value => value >= now)) {
     const key=`${planId}:${scheduled}`;
     const existing=await db.select<{id: string}[]>("SELECT id FROM care_tasks WHERE occurrence_key=$1", [key]);
     if (existing.length) continue;
     const taskId=id();
     await db.execute("INSERT INTO care_tasks(id,patient_id,label,type,heure_prevue,statut,note,produit_id,created_at,updated_at,stay_id,care_plan_id,occurrence_key) VALUES($1,$2,$3,$4,$5,'a_faire',$6,$7,$8,$9,$10,$11,$12)", [taskId,stay.patient_id,plan.label,plan.type,scheduled,plan.note,plan.product_id,now,now,stay.id,planId,key]);
     await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES($1,$2,NULL,'a_faire',$3,$4,$5)", [id(),taskId,author,now,"Plan d’hospitalisation"]); added++;
    }
    return added;
   });
  },
  plans(stayId: string) { return persistence.read(db => db.select<CarePlan[]>("SELECT * FROM care_plans WHERE stay_id=$1 ORDER BY starts_at,id", [stayId])); },
  tasks(stayId: string) { return persistence.read(db => db.select<CareTask[]>("SELECT * FROM care_tasks WHERE stay_id=$1 ORDER BY heure_prevue,id", [stayId])); },
  async updatePlan(planId: string, draft: CarePlanDraft, author: string) {
   authorRequired(author); if (!draft.label.trim()) throw new Error("Indiquez le soin à planifier.");
   const starts=iso(draft.startsAt), ends=iso(draft.endsAt);
   const occurrences=carePlanOccurrences(new Date(starts),new Date(ends),draft.times);
   const times=JSON.stringify([...new Set(draft.times)].sort());
   return persistence.transaction(async db => {
    const [plan]=await db.select<CarePlan[]>("SELECT * FROM care_plans WHERE id=$1", [planId]);
    if (!plan?.active) throw new Error("Ce plan n’est plus actif.");
    const stay=await get(db,plan.stay_id);
    if (stay.status === "sorti" || stay.status === "annule") throw new Error("Ce séjour est terminé.");
    if (starts < stay.admitted_at) throw new Error("Le plan ne peut pas commencer avant l’admission.");
    if (plan.label === draft.label.trim() && plan.type === draft.type && plan.starts_at === starts && plan.ends_at === ends && plan.times_json === times && plan.product_id === (draft.productId || null) && plan.note === (draft.note || "")) return 0;
    const now=clock().toISOString();
    await db.execute("UPDATE care_plans SET label=$1,type=$2,product_id=$3,note=$4,starts_at=$5,ends_at=$6,times_json=$7,updated_at=$8 WHERE id=$9", [draft.label.trim(),draft.type,draft.productId || null,draft.note || "",starts,ends,times,now,planId]);
    const future=await db.select<CareTask[]>("SELECT * FROM care_tasks WHERE care_plan_id=$1 AND heure_prevue >= $2 AND statut='a_faire'", [planId,now]);
    for (const task of future) {
     await db.execute("UPDATE care_tasks SET statut='annule',motif_annulation='Plan de soins modifié',occurrence_key=NULL,updated_at=$1 WHERE id=$2", [now,task.id]);
     await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES($1,$2,'a_faire','annule',$3,$4,'Plan de soins modifié')", [id(),task.id,author,now]);
    }
    let added=0;
    for (const scheduled of occurrences.filter(value => value >= now)) {
     const key=`${planId}:${scheduled}`;
     const existing=await db.select<{id: string}[]>("SELECT id FROM care_tasks WHERE occurrence_key=$1", [key]);
     if (existing.length) continue;
     const taskId=id();
     await db.execute("INSERT INTO care_tasks(id,patient_id,label,type,heure_prevue,statut,note,produit_id,created_at,updated_at,stay_id,care_plan_id,occurrence_key) VALUES($1,$2,$3,$4,$5,'a_faire',$6,$7,$8,$9,$10,$11,$12)", [taskId,stay.patient_id,draft.label.trim(),draft.type,scheduled,draft.note || "",draft.productId || null,now,now,stay.id,planId,key]);
     await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES($1,$2,NULL,'a_faire',$3,$4,'Plan de soins modifié')", [id(),taskId,author,now]); added++;
    }
    await history(db,stay.id,"plan_modifie",stay.status,stay.status,author,draft.label.trim(),stay.location_id);
    return added;
   });
  },
  async createPlan(stayId: string, draft: CarePlanDraft, author: string) {
   authorRequired(author); if (!draft.label.trim()) throw new Error("Indiquez le soin à planifier.");
   const starts=iso(draft.startsAt), ends=iso(draft.endsAt);
   const occurrences=carePlanOccurrences(new Date(starts),new Date(ends),draft.times);
   if (!occurrences.length) throw new Error("Aucun horaire ne se trouve dans la période choisie.");
   const planId=id(), now=clock().toISOString();
   return persistence.transaction(async db => {
    const stay=await get(db,stayId);
    if (stay.status === "sorti" || stay.status === "annule") throw new Error("Ce séjour est terminé.");
    if (starts < stay.admitted_at) throw new Error("Le plan ne peut pas commencer avant l’admission.");
    await db.execute("INSERT INTO care_plans(id,stay_id,label,type,product_id,note,starts_at,ends_at,times_json,author_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [planId,stayId,draft.label.trim(),draft.type,draft.productId || null,draft.note || "",starts,ends,JSON.stringify([...new Set(draft.times)].sort()),author,now,now]);
    for (const scheduled of occurrences) {
     const taskId=id();
     await db.execute("INSERT INTO care_tasks(id,patient_id,label,type,heure_prevue,statut,note,produit_id,created_at,updated_at,stay_id,care_plan_id,occurrence_key) VALUES($1,$2,$3,$4,$5,'a_faire',$6,$7,$8,$9,$10,$11,$12)", [taskId,stay.patient_id,draft.label.trim(),draft.type,scheduled,draft.note || "",draft.productId || null,now,now,stayId,planId,`${planId}:${scheduled}`]);
     await db.execute("INSERT INTO care_task_history(id,task_id,from_status,to_status,author_id,changed_at,reason) VALUES($1,$2,NULL,'a_faire',$3,$4,$5)", [id(),taskId,author,now,"Plan d’hospitalisation"]);
    }
    await history(db,stayId,"plan",stay.status,stay.status,author,draft.label.trim(),stay.location_id);
    return planId;
   });
  },
  async transfer(stayId: string, locationId: string, author: string, reason: string) {
   authorRequired(author); if (!reason.trim()) throw new Error("Indiquez le motif du changement d’emplacement.");
   return persistence.transaction(async db => {
    const stay=await get(db,stayId); if (stay.status === "sorti" || stay.status === "annule") throw new Error("Ce séjour est terminé.");
    if (stay.location_id === locationId) throw new Error("Le patient occupe déjà cet emplacement.");
    const [location]=await db.select<StayLocation[]>("SELECT * FROM locations WHERE id=$1", [locationId]);
    if (!location?.active) throw new Error("Cet emplacement n’est pas disponible.");
    const occupants=await db.select<{id: string}[]>("SELECT id FROM stays WHERE location_id=$1 AND status IN ('admis','en_cours','sortie_prevue')", [locationId]);
    if (occupants.length) throw new Error("Cet emplacement est déjà occupé.");
    await db.execute("UPDATE stays SET location_id=$1,updated_at=$2 WHERE id=$3", [locationId,clock().toISOString(),stayId]);
    await history(db,stayId,"emplacement",stay.status,stay.status,author,reason.trim(),locationId); return get(db,stayId);
   });
  }
 };
}
