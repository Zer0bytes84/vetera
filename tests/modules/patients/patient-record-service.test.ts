import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { reviewedSoapContent } from "@/modules/consultations/local-ai/soap-review";
import { DEFAULT_PATIENT_RECORD_OPTIONS, type PatientRecordOptions } from "@/modules/patients/export/patient-record-types";
import type { PatientRecordReadDatabase } from "@/modules/patients/export/patient-record-service";

const state = vi.hoisted(() => ({ native: true, database: null as DatabaseSync | null, auth: vi.fn(), read: vi.fn(), statements: [] as string[] }));
vi.mock("@/data/repositories", () => ({ authRepository: { getCurrentUser: state.auth } }));
vi.mock("@/services/browser-store", async (importOriginal) => ({ ...await importOriginal<typeof import("@/services/browser-store")>(), isTauriRuntime: () => state.native }));
vi.mock("@/services/sqlite/database", () => ({ runDbRead: state.read }));
import { getBrowserTable, replaceBrowserTable } from "@/services/browser-store";
import { loadPatientRecord, readPatientRecordSnapshotData } from "@/modules/patients/export/patient-record-service";
import { assemblePatientRecordSnapshot } from "@/modules/patients/export/patient-record-data";

const user = { id: "vet", displayName: "Dr Test" };
const fields = { subjective: "Toux depuis hier.", objective: "Température normale.", assessment: "Observation réelle.", plan: "Contrôle dans 7 jours." };
const date = "2026-10-17T12:00:00";
const identityOptions: PatientRecordOptions = { period: null, sections: { identity: true, consultations: false, documents: false, reminders: false, notes: false }, includeAttachments: false };
function adapter(db: DatabaseSync): PatientRecordReadDatabase {
  return {
    async select<T>(query: string, values: unknown[] = []) { state.statements.push(query); return db.prepare(query).all(...values as (string | number | null)[]) as T; },
    async execute(query: string, values: unknown[] = []) {
      state.statements.push(query);
      return values.length ? db.prepare(query).run(...values as (string | number | null)[]) : db.exec(query);
    },
  };
}
function dump(db: DatabaseSync): string {
  return JSON.stringify(["patients", "owners", "appointments", "consultation_soaps", "prescriptions", "prescription_items", "notes", "documents", "medical_reminders", "consultation_documents", "weight_entries", "app_settings"].map((table) => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
}
beforeEach(async () => {
  state.native = true; state.auth.mockReset().mockResolvedValue(user); state.read.mockReset(); state.statements = [];
  const db = new DatabaseSync(":memory:"); state.database = db;
  await runSqliteMigrations({
    execute: async (query, values = []) => values.length ? db.prepare(query).run(...values as (string | number | null)[]) : db.exec(query),
    select: async <T>(query: string, values: unknown[] = []) => db.prepare(query).all(...values as (string | number | null)[]) as T,
  }, SQLITE_MIGRATIONS);
  db.exec("PRAGMA foreign_keys = ON");
  db.prepare("INSERT INTO users(id,email,password_hash,display_name,role,status) VALUES('vet','test@example.invalid','test','Dr Test','admin','active'),('team','team@example.invalid','test','Dr Équipe','vet_adjoint','active')").run();
  db.prepare("INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Lina','Martin','010203'),('other-owner','Autre','Patient','999')").run();
  db.prepare("INSERT INTO patients(id,owner_id,name,species,sex,date_of_birth,general_notes) VALUES('patient','owner','Éloïse','Chien','F','2020-10-17','Notes générales réelles'),('other','other-owner','À EXCLURE','Chat','M',NULL,NULL)").run();
  db.prepare("INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES('visit','patient','owner','vet','Visite réelle','2026-10-17 10:00:00','2026-10-17 10:30:00','completed','Consultation'),('other-visit','other','other-owner','vet','VISITE ÉTRANGÈRE','2026-10-17 10:00:00','2026-10-17 10:30:00','completed','Consultation')").run();
  db.prepare("INSERT INTO consultation_soaps(id,patient_id,appointment_id,subjective,objective,assessment,plan,content,transcript) VALUES('soap','patient','visit',?,?,?,?,?,'DICTÉE À EXCLURE')").run(fields.subjective, fields.objective, fields.assessment, fields.plan, reviewedSoapContent(fields, "{}", "vet"));
  db.prepare("INSERT INTO prescriptions(id,patient_id,appointment_id,prescription_date,status) VALUES('rx','patient','visit','2026-10-17','signed'),('bad-rx','other','visit','2026-10-17','signed')").run();
  db.prepare("INSERT INTO prescription_items(id,prescription_id,medication_name,dosage_per_kg,dosage_unit,computed_dose_mg,computed_volume_ml,frequency,duration) VALUES('item','rx','Médicament réel',3,'mg/kg',21.7,0.64,'2x/jour','5 jours'),('bad-item','bad-rx','MÉDICAMENT ÉTRANGER',3,'mg/kg',999,999,'2x/jour','5 jours')").run();
  db.prepare("INSERT INTO weight_entries(id,patient_id,weight_kg,measured_at) VALUES('weight','patient',7.1,'2026-10-17T00:00:00.000Z'),('bad-weight','other',999,'2026-10-17')").run();
  db.prepare("INSERT INTO notes(id,user_id,patient_id,title,content,tags,created_at) VALUES('team-note','team','patient','Note de l’équipe','<p>Texte &amp; suivi.</p>','{}',?),('bad-note','vet','other','NOTE ÉTRANGÈRE','NE PAS EXPORTER','{}',?)").run(date, date);
  const tags = JSON.stringify({ clinicalDocument: { appointmentId: "visit", reviewedAt: date, reviewedBy: "vet", source: { type: "soap" } } });
  db.prepare("INSERT INTO notes(id,user_id,patient_id,title,content,tags,created_at) VALUES('legacy','vet','patient','Document historique','<p>Texte relu conservé.</p>',?,?)").run(tags, date);
  db.prepare("INSERT INTO app_settings(key,value) VALUES('invoice_settings_v1',?)").run(JSON.stringify({ name: "Clinique test", footer: "Mention réelle.", accent: "forest" }));
  db.prepare("INSERT INTO documents(id,patient_id,patient_name,consultation_id,soap_source_id,source_key,type_document,titre,contenu_genere,statut,clinic_snapshot,values_snapshot,pdf_data_url,created_at,updated_at,finalized_at,created_by,author_name) VALUES('document','patient','Éloïse','visit','soap','source','report','Document finalisé','Texte conservé','finalise','{}','{}',?,?,?,?, 'vet','Dr Test')").run("data:application/pdf;base64,JVBERi0xLjQK", date, date, date);
  db.prepare("INSERT INTO documents(id,patient_id,patient_name,type_document,titre,contenu_genere,statut,attachment_json,clinic_snapshot,values_snapshot,created_at,updated_at,finalized_at,created_by,author_name) VALUES('import','patient','Éloïse','import','Photo originale','','finalise',?,'{}','{}',?,?,?,'vet','Dr Test')").run(JSON.stringify({ name: "photo.jpg", mimeType: "image/jpeg", dataUrl: "data:image/jpeg;base64,aW1hZ2U=", size: 5, textState: "image", pages: [] }), date, date, date);
  db.prepare("INSERT INTO consultation_documents(id,appointment_id,patient_id,file_name,mime_type,size_bytes,category,data_url,created_at) VALUES('legacy-file','visit','patient','Laboratoire.pdf','application/pdf',5,'pdf','data:application/pdf;base64,JVBERi0=',?),('bad-file','visit','other','PIÈCE ÉTRANGÈRE.pdf','application/pdf',5,'pdf','data:application/pdf;base64,JVBERi0=',?)").run(date, date);
  db.prepare("INSERT INTO medical_reminders(id,patient_id,type,intervalle_mois,echeance,statut,created_at,note) VALUES('reminder','patient','vaccin',12,'2026-10-17','en_cours',?,'Rappel réel'),('bad-reminder','other','vaccin',12,'2026-10-17','en_cours',?,'RAPPEL ÉTRANGER')").run(date, date);
  state.read.mockImplementation((operation: (connection: PatientRecordReadDatabase) => Promise<unknown>) => operation(adapter(db)));
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
});
afterEach(() => { state.database?.close(); state.database = null; vi.unstubAllGlobals(); });

describe("Isolated SQLite patient record reads", () => {
  it("reads all real migrated sources inside one snapshot and leaves every source row unchanged", async () => {
    const db = state.database!; const before = dump(db);
    const raw = await readPatientRecordSnapshotData(adapter(db), "patient", DEFAULT_PATIENT_RECORD_OPTIONS, "vet");
    const snapshot = assemblePatientRecordSnapshot(raw, DEFAULT_PATIENT_RECORD_OPTIONS, date);
    expect(snapshot.sections.map((section) => section.id)).toEqual(["identity", "consultations", "documents", "reminders", "notes", "attachments"]);
    const output = JSON.stringify(snapshot);
    expect(output).toContain("21,7 mg"); expect(output).toContain("0,64 mL"); expect(output).toContain("Dr Équipe"); expect(output).toContain("Texte relu conservé.");
    expect(output).toContain("Document finalisé"); expect(output).toContain("photo.jpg"); expect(output).toContain("Laboratoire.pdf");
    for (const forbidden of ["ÉTRANGER", "ÉTRANGÈRE", "DICTÉE", "999", "NE PAS EXPORTER"]) expect(output).not.toContain(forbidden);
    expect(dump(db)).toBe(before);
    expect(state.statements[0]).toBe("BEGIN DEFERRED TRANSACTION"); expect(state.statements.at(-1)).toBe("COMMIT");
    expect(state.statements.filter((query) => !/^(SELECT|BEGIN|COMMIT)/.test(query))).toEqual([]);
  });
  it("checks fresh authentication before and after the single queued read", async () => {
    const snapshot = await loadPatientRecord("patient", DEFAULT_PATIENT_RECORD_OPTIONS);
    expect(snapshot.requestedBy).toBe("vet"); expect(state.auth).toHaveBeenCalledTimes(2); expect(state.read).toHaveBeenCalledTimes(1);
    state.auth.mockReset().mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    await expect(loadPatientRecord("patient", identityOptions)).rejects.toThrow("session");
    state.auth.mockReset().mockResolvedValueOnce(user).mockResolvedValueOnce({ id: "other-user" });
    await expect(loadPatientRecord("patient", identityOptions)).rejects.toThrow("session");
  });
  it("rejects missing auth, invalid options and aborts before touching storage", async () => {
    state.auth.mockResolvedValue(null);
    await expect(loadPatientRecord("patient", identityOptions)).rejects.toThrow("Connectez-vous"); expect(state.read).not.toHaveBeenCalled();
    await expect(loadPatientRecord("patient", { ...identityOptions, period: { from: "2026-02-30", to: "2026-10-17" } })).rejects.toThrow("dates civiles");
    const controller = new AbortController(); controller.abort();
    await expect(loadPatientRecord("patient", identityOptions, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(state.read).not.toHaveBeenCalled();
  });
  it("rolls back a failed selected-source read and announces missing medical reminder storage", async () => {
    state.database!.exec("DROP TABLE medical_reminders");
    await expect(loadPatientRecord("patient", DEFAULT_PATIENT_RECORD_OPTIONS)).rejects.toThrow("rappels médicaux ne sont pas disponibles");
    expect(state.statements.at(-1)).toBe("ROLLBACK");
    await expect(loadPatientRecord("patient", identityOptions)).resolves.toMatchObject({ patientName: "Éloïse" });
  });
  it("rolls back cancellation between reads and does not return a partial snapshot", async () => {
    const controller = new AbortController(); const db = adapter(state.database!);
    const interrupted: PatientRecordReadDatabase = { ...db, async select<T>(query: string, values?: unknown[]) { const result = await db.select<T>(query, values); if (query.includes("FROM appointments")) controller.abort(); return result; } };
    await expect(readPatientRecordSnapshotData(interrupted, "patient", DEFAULT_PATIENT_RECORD_OPTIONS, "vet", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(state.statements.at(-1)).toBe("ROLLBACK");
  });
});

describe("Browser sources", () => {
  it("supports available local tables without a native bridge or any browser storage mutation", async () => {
    state.native = false;
    replaceBrowserTable("patients", [{ id: "browser-patient", ownerId: "browser-owner", name: "Félix", species: "Chat", sex: "M" }]);
    replaceBrowserTable("owners", [{ id: "browser-owner", firstName: "Nora", lastName: "Martin", phone: "0123" }]);
    replaceBrowserTable("notes", [{ id: "note", patientId: "browser-patient", userId: "team", title: "Suivi", content: "<p>Texte réel.</p>", createdAt: "2026-10-17" }]);
    replaceBrowserTable("users", [{ id: "team", displayName: "Dr Équipe" }]);
    const before = JSON.stringify(getBrowserTable("notes"));
    const snapshot = await loadPatientRecord("browser-patient", { ...identityOptions, sections: { ...identityOptions.sections, notes: true } });
    expect(snapshot.patientName).toBe("Félix"); expect(JSON.stringify(snapshot.sections)).toContain("Dr Équipe");
    expect(JSON.stringify(getBrowserTable("notes"))).toBe(before); expect(state.read).not.toHaveBeenCalled(); expect(state.auth).toHaveBeenCalledTimes(2);
  });
  it("clearly rejects a selected unavailable medical reminders source", async () => {
    state.native = false;
    await expect(loadPatientRecord("patient", DEFAULT_PATIENT_RECORD_OPTIONS)).rejects.toThrow("Désélectionnez cette section");
    expect(state.read).not.toHaveBeenCalled();
  });
});
