import type { CareDatabase, CarePersistence } from "../care-tasks/store";
import { assertDateOnly, assertReminderTransition, type PatientReminderStatus, type ReminderOrigin } from "./domain";
export interface PatientReminder {
 id: string; patient_id: string; type_id: string; source_id: string | null; family_key: string;
 due_date: string; origin: ReminderOrigin; status: PatientReminderStatus; author_id: string | null;
 cancellation_reason: string | null; completed_at: string | null;
}
export interface VaccineReminderDraft {
 id: string; patientId: string; vaccineName: string; vaccineType?: string;
 administeredDate: string; dueDate?: string; origin: ReminderOrigin;
 batchNumber?: string; manufacturer?: string; notes?: string;
}
export interface ReminderType {id: string; code: string; name: string; interval_months: number; active: number;}
export function createPatientReminderStore(persistence: CarePersistence, id: () => string, clock = () => new Date()) {
 const requireAuthor = (author: string) => {if (!author.trim()) throw new Error("Un utilisateur connecté est requis.");};
 async function record(db: CareDatabase, reminder: PatientReminder, action: string, author: string, status: PatientReminderStatus, dueDate: string, reason: string | null) {
  await db.execute("INSERT INTO reminder_history(id,reminder_id,action,old_status,new_status,old_due_date,new_due_date,reason,author_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",[id(),reminder.id,action,reminder.status,status,reminder.due_date,dueDate,reason,author,clock().toISOString()]);
 }
 async function get(db: CareDatabase, reminderId: string) {
  const reminder = (await db.select<PatientReminder[]>("SELECT * FROM patient_reminders WHERE id=?",[reminderId]))[0];
  if (!reminder) throw new Error("Ce rappel n’existe plus.");
  return reminder;
 }
 return {
  async saveVaccination(draft: VaccineReminderDraft, author: string) {
   requireAuthor(author); assertDateOnly(draft.administeredDate);
   if (draft.dueDate) {
    assertDateOnly(draft.dueDate);
    if (draft.dueDate < draft.administeredDate) throw new Error("L’échéance ne peut pas précéder la vaccination.");
   }
   if (!draft.id || !draft.patientId || !draft.vaccineName.trim()) throw new Error("Choisissez un patient et indiquez le vaccin.");
   const family=(draft.vaccineType?.trim() || draft.vaccineName.trim()).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
   return persistence.transaction(async db => {
    const existing=(await db.select<{patient_id: string}[]>("SELECT patient_id FROM vaccinations WHERE id=?",[draft.id]))[0];
    if (existing && existing.patient_id !== draft.patientId) throw new Error("Le patient de la vaccination ne peut pas être changé.");
    const now=clock().toISOString();
    const values=[draft.vaccineName.trim(),draft.vaccineType?.trim() || null,new Date(`${draft.administeredDate}T12:00:00`).toISOString(),draft.dueDate ? new Date(`${draft.dueDate}T12:00:00`).toISOString() : null,draft.batchNumber || null,draft.manufacturer || null,author,draft.notes || null,now];
    if (existing) {
     await db.execute("UPDATE vaccinations SET vaccine_name=?,vaccine_type=?,administered_at=?,next_due_at=?,batch_number=?,manufacturer=?,vet_id=?,notes=?,updated_at=? WHERE id=?",[...values,draft.id]);
    } else {
     await db.execute("INSERT INTO vaccinations(vaccine_name,vaccine_type,administered_at,next_due_at,batch_number,manufacturer,vet_id,notes,updated_at,id,patient_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",[...values,draft.id,draft.patientId]);
     const candidates=await db.select<PatientReminder[]>("SELECT * FROM patient_reminders WHERE patient_id=? AND type_id='vaccination' AND status='en_cours' AND (source_id IS NULL OR source_id<>?)",[draft.patientId,draft.id]);
     const prior=candidates.filter(reminder => reminder.family_key.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").trim() === family);
     for (const reminder of prior) {
      await db.execute("UPDATE patient_reminders SET status='traite',completed_at=?,updated_at=? WHERE id=?",[now,now,reminder.id]);
      await record(db,reminder,"traitement_acte",author,"traite",reminder.due_date,`Vaccination enregistrée : ${draft.id}`);
     }
    }
    const current=(await db.select<PatientReminder[]>("SELECT * FROM patient_reminders WHERE source_id=?",[draft.id]))[0];
    if (current) {
     if (current.status === "en_cours" && draft.dueDate && (current.due_date !== draft.dueDate || current.family_key !== family)) {
      await db.execute("UPDATE patient_reminders SET due_date=?,family_key=?,updated_at=? WHERE id=?",[draft.dueDate,family,now,current.id]);
      await record(db,current,"modification_acte",author,current.status,draft.dueDate,null);
     } else if (current.status === "en_cours" && !draft.dueDate) {
      const reason="Échéance retirée de la vaccination";
      await db.execute("UPDATE patient_reminders SET status='annule',cancellation_reason=?,updated_at=? WHERE id=?",[reason,now,current.id]);
      await record(db,current,"annulation",author,"annule",current.due_date,reason);
     }
    } else if (draft.dueDate) {
     const types=await db.select<ReminderType[]>("SELECT * FROM reminder_types WHERE id='vaccination' AND active=1");
     if (types.length) {
      const reminderId=`vaccine-reminder:${draft.id}`;
      await db.execute("INSERT INTO patient_reminders(id,patient_id,type_id,source_id,family_key,due_date,origin,author_id,created_at,updated_at) VALUES (?,?,'vaccination',?,?,?,?,?,?,?)",[reminderId,draft.patientId,draft.id,family,draft.dueDate,draft.origin,author,now,now]);
      await db.execute("INSERT INTO reminder_history(id,reminder_id,action,new_status,new_due_date,author_id,created_at) VALUES (?,?,'creation','en_cours',?,?,?)",[id(),reminderId,draft.dueDate,author,now]);
     }
    }
    return draft.id;
   });
  },
  list() {return persistence.read(db => db.select<PatientReminder[]>("SELECT * FROM patient_reminders ORDER BY due_date,id"));},
  types() {return persistence.read(db => db.select<ReminderType[]>("SELECT * FROM reminder_types ORDER BY name,id"));},
  history(reminderId: string) {return persistence.read(db => db.select<Record<string, unknown>[]>("SELECT * FROM reminder_history WHERE reminder_id=? ORDER BY created_at,rowid",[reminderId]));},
  async transition(reminderId: string, to: PatientReminderStatus, author: string, reason?: string) {
   requireAuthor(author);
   return persistence.transaction(async db => {
    const reminder = await get(db,reminderId);
    assertReminderTransition(reminder.status,to,reason);
    const now=clock().toISOString();
    const result=await db.execute("UPDATE patient_reminders SET status=?,completed_at=?,cancellation_reason=?,updated_at=? WHERE id=? AND status='en_cours'",[to,to === "traite" ? now : null,to === "annule" ? reason!.trim() : null,now,reminderId]);
    if (result.rowsAffected !== 1) throw new Error("Le rappel a été modifié. Actualisez la liste.");
    await record(db,reminder,to === "traite" ? "traitement_manuel" : "annulation",author,to,reminder.due_date,reason?.trim() || null);
   });
  },
  async postpone(reminderId: string, dueDate: string, author: string, reason: string) {
   requireAuthor(author); assertDateOnly(dueDate);
   if (!reason.trim()) throw new Error("Indiquez le motif du report.");
   return persistence.transaction(async db => {
    const reminder=await get(db,reminderId);
    if (reminder.status !== "en_cours") throw new Error("Seul un rappel en cours peut être reporté.");
    if (dueDate <= reminder.due_date) throw new Error("Choisissez une date postérieure à l’échéance actuelle.");
    await db.execute("UPDATE patient_reminders SET due_date=?,updated_at=? WHERE id=?",[dueDate,clock().toISOString(),reminderId]);
    await record(db,reminder,"report",author,reminder.status,dueDate,reason.trim());
   });
  },
  async saveType(draft: {id?: string; name: string; intervalMonths: number; active: boolean}, author: string) {
   requireAuthor(author);
   if (!draft.name.trim() || !Number.isInteger(draft.intervalMonths) || draft.intervalMonths < 1 || draft.intervalMonths > 120) throw new Error("Indiquez un nom et un intervalle de 1 à 120 mois.");
   return persistence.transaction(async db => {
    const now=clock().toISOString();
    if (draft.id) {
     const result=await db.execute("UPDATE reminder_types SET name=?,interval_months=?,active=?,updated_at=? WHERE id=?",[draft.name.trim(),draft.intervalMonths,Number(draft.active),now,draft.id]);
     if (!result.rowsAffected) throw new Error("Ce type de rappel n’existe plus.");
     return draft.id;
    }
    const typeId=id();
    await db.execute("INSERT INTO reminder_types(id,code,name,interval_months,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",[typeId,typeId,draft.name.trim(),draft.intervalMonths,Number(draft.active),now,now]);
    return typeId;
   });
  }
 };
}
