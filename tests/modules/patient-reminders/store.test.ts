import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { createPatientReminderStore, type MedicalReminderProposal, type VaccineReminderDraft } from "@/modules/patient-reminders/store";
import { PATIENT_REMINDERS_MIGRATION_SQL } from "@/modules/patient-reminders/migration";
import { MEDICAL_REMINDERS_MIGRATION_SQL } from "@/modules/patient-reminders/medical-reminders-migration";
import { onMedicalActRecorded } from "@/modules/patient-reminders/on-medical-act-recorded";
import type { CareDatabase } from "@/modules/care-tasks/store";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const db of databases) db.close(); databases.length = 0; });

function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE owners(id TEXT PRIMARY KEY);
    INSERT INTO owners VALUES('o1'),('o2');
    CREATE TABLE patients(id TEXT PRIMARY KEY, owner_id TEXT REFERENCES owners(id));
    INSERT INTO patients VALUES('p1','o1'),('p2','o2');
    CREATE TABLE vaccinations(id TEXT PRIMARY KEY,patient_id TEXT REFERENCES patients(id),vaccine_name TEXT,vaccine_type TEXT,administered_at TEXT,next_due_at TEXT,batch_number TEXT,manufacturer TEXT,vet_id TEXT,notes TEXT,updated_at TEXT);
    CREATE TABLE tasks(id TEXT PRIMARY KEY,title TEXT,status TEXT,due_date TEXT);
    INSERT INTO tasks VALUES('manual','Appeler le propriétaire','todo','2026-10-12');
    CREATE TABLE reminders(id TEXT PRIMARY KEY,status TEXT);
    INSERT INTO reminders VALUES('appointment','pending');`);
  db.exec(PATIENT_REMINDERS_MIGRATION_SQL);
  db.exec(MEDICAL_REMINDERS_MIGRATION_SQL);
  const adapter: CareDatabase = {
    async select<T>(sql, values = []) { return db.prepare(sql).all(...values as (string | number | null)[]) as T; },
    async execute(sql, values = []) { return { rowsAffected: Number(db.prepare(sql).run(...values as (string | number | null)[]).changes) }; },
  };
  let serial = 0;
  let now = new Date("2026-10-12T12:00:00Z");
  let queue: Promise<unknown> = Promise.resolve();
  const transaction = <T,>(fn: (connection: CareDatabase) => Promise<T>): Promise<T> => {
    const job = queue.then(async () => {
      db.exec("BEGIN");
      try { const result = await fn(adapter); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    });
    queue = job.catch(() => undefined);
    return job;
  };
  const store = createPatientReminderStore({
    read: (fn) => queue.then(() => fn(adapter)),
    transaction,
  }, () => `medical-${++serial}`, () => now);
  return { db, store, setNow: (value: string) => { now = new Date(value); } };
}
const vaccine: VaccineReminderDraft = { id: "v1", patientId: "p1", vaccineName: "Rage", vaccineType: "rage", administeredDate: "2026-10-12" };
async function saveAndConfirm(store: ReturnType<typeof setup>["store"], draft = vaccine) {
  await store.saveVaccination(draft, "vet");
  const proposal = await onMedicalActRecorded({ id: draft.id, patientId: draft.patientId, type: "vaccin", date: draft.administeredDate }, store);
  return store.createFromProposal(proposal!, "vet");
}
async function propose(store: ReturnType<typeof setup>["store"], type = "vaccin") {
  return (await onMedicalActRecorded({ id: "act", patientId: "p1", type, date: "2026-10-12" }, store))!;
}

it("enregistre le vaccin puis propose 12 mois sans créer de rappel silencieux", async () => {
  const { db, store } = setup();
  await store.saveVaccination(vaccine, "vet");
  expect(await store.list()).toEqual([]);
  const proposal = await onMedicalActRecorded({ id: "v1", patientId: "p1", type: "vaccin", date: vaccine.administeredDate }, store);
  expect(proposal).toMatchObject({ clientId: "o1", type: "vaccin", intervalleMois: 12, echeance: "2027-10-12" });
  expect(await store.list()).toEqual([]);
  expect(db.prepare("SELECT next_due_at FROM vaccinations WHERE id='v1'").get()?.next_due_at).toBeNull();
});

it("confirme une échéance ajustée une seule fois, même sur double validation", async () => {
  const { store } = setup();
  const proposal = { ...await propose(store), echeance: "2027-04-30", intervalleMois: 6 };
  const ids = await Promise.all([store.createFromProposal(proposal, "vet"), store.createFromProposal(proposal, "vet")]);
  expect(ids[0]).toBe(ids[1]);
  expect(await store.list()).toHaveLength(1);
  expect((await store.list())[0]).toMatchObject({ client_id: "o1", intervalle_mois: 6, echeance: "2027-04-30", statut: "en_cours", acte_source_id: "act" });
  expect(await store.history(ids[0])).toHaveLength(1);
});

it("un nouvel acte clôture seulement le vaccin correspondant du même patient", async () => {
  const { store } = setup();
  const first = await saveAndConfirm(store);
  const otherPatient = await saveAndConfirm(store, { ...vaccine, id: "other", patientId: "p2" });
  const otherFamily = await saveAndConfirm(store, { ...vaccine, id: "lepto", vaccineType: "leptospirose" });
  await store.saveVaccination({ ...vaccine, id: "v2", administeredDate: "2027-10-12" }, "vet");
  const rows = await store.list();
  expect(rows.find((row) => row.id === first)?.statut).toBe("termine");
  expect(rows.find((row) => row.id === otherPatient)?.statut).toBe("en_cours");
  expect(rows.find((row) => row.id === otherFamily)?.statut).toBe("en_cours");
  expect(rows).toHaveLength(3);
  expect(await store.history(first)).toHaveLength(2);
});

it("un échec de confirmation conserve l’acte et annule toute écriture partielle du rappel", async () => {
  const { db, store } = setup();
  await store.saveVaccination(vaccine, "vet");
  const proposal = await onMedicalActRecorded({ id: "v1", patientId: "p1", type: "vaccin", date: vaccine.administeredDate }, store);
  db.exec("CREATE TRIGGER fail_history BEFORE INSERT ON medical_reminder_history BEGIN SELECT RAISE(ABORT,'échec simulé'); END;");
  await expect(store.createFromProposal(proposal!, "vet")).rejects.toThrow("échec simulé");
  expect(await store.list()).toEqual([]);
  expect(db.prepare("SELECT next_due_at FROM vaccinations WHERE id='v1'").get()?.next_due_at).toBeNull();
  expect(db.prepare("SELECT count(*) AS n FROM vaccinations").get()?.n).toBe(1);
});

it("garde le report et l’annulation motivés dans l’historique, sans rouvrir un état terminal", async () => {
  const { store } = setup();
  const id = await store.createFromProposal(await propose(store), "vet");
  await expect(store.postpone(id, "2028-10-12", "vet", "")).rejects.toThrow();
  await expect(store.postpone(id, "2027-10-11", "vet", "Plus tard")).rejects.toThrow();
  await store.postpone(id, "2028-10-12", "vet", "Propriétaire indisponible");
  await expect(store.transition(id, "annule", "vet")).rejects.toThrow();
  await store.transition(id, "annule", "vet", "Refus du propriétaire");
  expect((await store.list())[0]).toMatchObject({ statut: "annule", echeance: "2028-10-12", motif_annulation: "Refus du propriétaire" });
  await expect(store.transition(id, "termine", "vet")).rejects.toThrow();
  expect(await store.history(id)).toHaveLength(3);
});

it("le traitement propose le suivant depuis la date de traitement sans le créer", async () => {
  const { store, setNow } = setup();
  const id = await store.createFromProposal(await propose(store), "vet");
  await expect(store.nextProposal(id)).rejects.toThrow();
  setNow("2028-01-31T12:00:00Z");
  await store.transition(id, "termine", "vet");
  const next = await store.nextProposal(id);
  expect(next).toMatchObject({ dateActe: "2028-01-31", echeance: "2029-01-31", intervalleMois: 12 });
  expect(await store.list()).toHaveLength(1);
  await store.createFromProposal(next, "vet");
  expect(await store.list()).toHaveLength(2);
  expect((await store.list()).filter((row) => row.statut === "en_cours")).toHaveLength(1);
});

it("les réglages s’appliquent aux futurs actes et un type inactif ne propose rien", async () => {
  const { store } = setup();
  const id = await store.createFromProposal(await propose(store), "vet");
  await store.saveType({ id: "vaccin", name: "Vaccin annuel", intervalMonths: 6, active: true }, "vet");
  expect((await propose(store)).echeance).toBe("2027-04-12");
  expect((await store.list()).find((row) => row.id === id)?.echeance).toBe("2027-10-12");
  await store.saveType({ id: "vaccin", name: "Vaccin annuel", intervalMonths: 6, active: false }, "vet");
  expect(await onMedicalActRecorded({ id: "other", patientId: "p1", type: "vaccin", date: "2026-10-12" }, store)).toBeNull();
  await expect(store.createFromProposal(await propose(store, "autre").then((draft) => ({ ...draft, type: "vaccin" })), "vet")).rejects.toThrow("actif");
});

it("conserve le carnet vaccinal et les dates civiles après confirmation et édition", async () => {
  const { db, store } = setup();
  await saveAndConfirm(store);
  await store.saveVaccination({ ...vaccine, notes: "Lot vérifié" }, "vet");
  const row = db.prepare("SELECT administered_at,next_due_at FROM vaccinations WHERE id='v1'").get();
  const date = new Date(String(row?.administered_at));
  const due = new Date(String(row?.next_due_at));
  expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2026, 10, 12]);
  expect([due.getFullYear(), due.getMonth() + 1, due.getDate()]).toEqual([2027, 10, 12]);
});

it.each([["vermifuge", 3], ["controle_annuel", 12], ["soin_dentaire", 12], ["autre", 12]])("propose le type %s avec son intervalle, sans écriture", async (type, months) => {
  const { store } = setup();
  expect(await propose(store, String(type))).toMatchObject({ type, intervalleMois: months });
  expect(await store.list()).toEqual([]);
});

it("refuse les dates, patients, auteurs et intervalles invalides", async () => {
  const { store } = setup();
  const draft = await propose(store);
  for (const patch of [{ echeance: "2026-02-30" }, { echeance: "2026-10-11" }, { intervalleMois: 0 }, { intervalleMois: 1.5 }, { patientId: "absent" }, { type: "absent" }]) {
    await expect(store.createFromProposal({ ...draft, ...patch } as MedicalReminderProposal, "vet")).rejects.toThrow();
  }
  await expect(store.createFromProposal(draft, "")).rejects.toThrow();
  expect(await store.list()).toEqual([]);
});

it("toutes les opérations médicales laissent les rappels manuels et les notifications intacts", async () => {
  const { db, store } = setup();
  const beforeTasks = db.prepare("SELECT * FROM tasks").all();
  const beforeNotifications = db.prepare("SELECT * FROM reminders").all();
  const id = await saveAndConfirm(store);
  await store.postpone(id, "2028-10-12", "vet", "Report demandé");
  await store.transition(id, "termine", "vet");
  await store.createFromProposal(await store.nextProposal(id), "vet");
  expect(db.prepare("SELECT * FROM tasks").all()).toEqual(beforeTasks);
  expect(db.prepare("SELECT * FROM reminders").all()).toEqual(beforeNotifications);
});
