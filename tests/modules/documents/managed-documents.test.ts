import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";
import { DEFAULT_DOCUMENT_TEMPLATES, renderClinicalDocument } from "../../../src/modules/documents/lib/document-templates";
import { reviewedSoapContent } from "../../../src/modules/consultations/local-ai/soap-review";
import { createDocumentStore, sqliteDocumentPersistence } from "../../../src/modules/documents/document-store";
import { renderDocumentVariables } from "../../../src/modules/documents/document-variables";
import type { CareDatabase } from "../../../src/modules/care-tasks/store";
import type { DocumentAttachment } from "../../../src/modules/documents/document-domain";

let db: DatabaseSync;
let store: ReturnType<typeof createDocumentStore>;
let token = "admin-session";
let sequence = 0;
const now = new Date("2026-10-17T12:00:00.000Z");
const fields = { subjective: "Toux depuis hier.", objective: "Poids 12 kg.", assessment: "Évaluation consignée par le vétérinaire.", plan: "Contrôle dans 7 jours." };
const pdf = "data:application/pdf;base64,JVBERi0xLjQK";
const adapter = (): CareDatabase => ({
  select: async <T>(sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as T,
  execute: async (sql, params = []) => ({ rowsAffected: Number(db.prepare(sql).run(...params).changes) }),
});
const migrationAdapter = () => ({
  execute: async (sql: string, params: unknown[] = []) => params.length ? db.prepare(sql).run(...params) : db.exec(sql),
  select: async <T>(sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as T,
});
function seed() {
  db.exec(`
    INSERT INTO users(id,email,password_hash,display_name,role) VALUES
      ('admin','admin@test.invalid','test','Dr Admin','admin'),
      ('vet','vet@test.invalid','test','Dr Martin','vet_adjoint'),
      ('assistant','assistant@test.invalid','test','Camille','assistant');
    INSERT INTO sessions(id,user_id,token,expires_at) VALUES
      ('s1','admin','admin-session','2099-01-01T00:00:00.000Z'),
      ('s2','vet','vet-session','2099-01-01T00:00:00.000Z'),
      ('s3','assistant','assistant-session','2099-01-01T00:00:00.000Z');
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0123456789');
    INSERT INTO patients(id,owner_id,name,species,sex) VALUES('rex','owner','Rex','Chien','M'),('luna','owner','Luna','Chat','F');
    INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type)
      VALUES('visit','rex','owner','vet','Consultation','2026-10-17T10:00:00','2026-10-17T10:30:00','completed','Consultation');
  `);
  db.prepare("INSERT INTO consultation_soaps(id,patient_id,appointment_id,subjective,objective,assessment,plan,content) VALUES('soap','rex','visit',?,?,?,?,?)")
    .run(fields.subjective, fields.objective, fields.assessment, fields.plan, reviewedSoapContent(fields, "{}", "vet"));
}
beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  await runSqliteMigrations(migrationAdapter(), SQLITE_MIGRATIONS);
  db.exec("PRAGMA foreign_keys=ON");
  seed();
  sequence = 0;
  token = "admin-session";
  store = createDocumentStore(sqliteDocumentPersistence({
    read: (operation) => operation(adapter()),
    transaction: async (operation) => {
      db.exec("BEGIN");
      try { const result = await operation(adapter()); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  }), () => `managed-${++sequence}`, () => now, { sessionToken: () => token });
});
afterEach(() => db.close());

async function draft(template = "document-report") {
  const preparation = await store.prepare("visit", "rex", template, "admin", { certificateType: "Vaccination" });
  return store.createDraft(preparation, { title: preparation.title, content: preparation.content }, "admin", true);
}
function prescription(status = "signed", patientId = "rex", id = "rx") {
  db.prepare("INSERT INTO prescriptions(id,appointment_id,patient_id,prescription_date,status,weight_kg) VALUES(?,'visit',?,'2026-10-17',?,10)").run(id, patientId, status);
  db.prepare(`INSERT INTO prescription_items(id,prescription_id,medication_name,dosage_per_kg,dosage_unit,computed_dose_mg,computed_volume_ml,frequency,duration,route,instructions)
    VALUES(?,?, 'Amoxicilline',20,'mg/kg',200,2,'2 fois par jour','5 jours','PO','Pendant le repas.')`).run(`${id}-line`, id);
}

describe("Moteur de variables local sans invention", () => {
  it("substitutes named values and retains clinician supplied text exactly", () => {
    expect(renderDocumentVariables("{{patient.nom}} : {{soap.plan}}", { "patient.nom": "Rex", "soap.plan": "0,25 mL PO 2x/j pendant 5 jours." }))
      .toBe("Rex : 0,25 mL PO 2x/j pendant 5 jours.");
  });
  it("marks missing, unknown and inherited variables without evaluating expressions", () => {
    const inherited = Object.create({ "patient.nom": "Autre patient" }) as Record<string, string>;
    inherited["soap.plan"] = " ";
    expect(renderDocumentVariables("{{patient.nom}} {{soap.plan}} {{dose.calculee}} {{constructor}}", inherited))
      .toBe("[à compléter] [à compléter] [à compléter] [à compléter]");
  });
});

describe("Migration et administration des modèles", () => {
  it("seeds all four types and preserves the exact three historical bodies", async () => {
    const templates = await store.listTemplates();
    expect(new Set(templates.map((entry) => entry.kind))).toEqual(new Set(["prescription", "certificate", "report", "referral"]));
    for (const old of DEFAULT_DOCUMENT_TEMPLATES) expect(templates.find((entry) => entry.id === old.id)?.body).toBe(old.body);
  });
  it("leaves legacy generated notes and custom template overrides unchanged", async () => {
    const isolated = new DatabaseSync(":memory:");
    const migration = {
      execute: async (sql: string, params: unknown[] = []) => params.length ? isolated.prepare(sql).run(...params) : isolated.exec(sql),
      select: async <T>(sql: string, params: unknown[] = []) => isolated.prepare(sql).all(...params) as T,
    };
    try {
      await runSqliteMigrations(migration, SQLITE_MIGRATIONS.filter((entry) => entry.version < "037"));
      isolated.exec("INSERT INTO users(id,email,password_hash,display_name,role) VALUES('old','old@test.invalid','test','Ancien','admin'); INSERT INTO notes(id,user_id,title,content) VALUES('old-note','old','Ancien document','<p>Dose validée 0,25 mL.</p>'); INSERT INTO document_templates(id,kind,name,body) VALUES('document-report','report','Mon compte-rendu','Texte personnalisé {{soap.s}}');");
      await runSqliteMigrations(migration, SQLITE_MIGRATIONS);
      expect(isolated.prepare("SELECT corps_modele FROM document_templates WHERE id='document-report'").get()?.corps_modele).toBe("Texte personnalisé {{soap.s}}");
      expect(isolated.prepare("SELECT content FROM notes WHERE id='old-note'").get()?.content).toBe("<p>Dose validée 0,25 mL.</p>");
    } finally { isolated.close(); }
  });
  it("keeps the historical renderer output and missing fields unchanged", () => {
    const output = renderClinicalDocument(DEFAULT_DOCUMENT_TEMPLATES[0], {
      patient: { id: "rex", name: "Rex", ownerId: "owner", species: "Chien", sex: "M", status: "sante", createdAt: "" },
      appointment: { id: "visit", patientId: "rex", ownerId: "owner", vetId: "vet", title: "Consultation", startTime: "2026-10-17T10:00:00", endTime: "2026-10-17T10:30:00", status: "completed", type: "Consultation", createdAt: "" },
      soap: { ...fields, objective: "", assessment: "" }, vetName: "Dr Martin",
    });
    expect(output).toBe("ORDONNANCE\n\nPatient : Rex · Chien\nPropriétaire : \nConsultation du 17/10/2026\nVétérinaire : Dr Martin\n\nPlan de soins validé\nContrôle dans 7 jours.\n\nMédicaments, dose, voie et fréquence : à compléter par le vétérinaire.\nSignature : à compléter.");
  });
  it("requires an active matching session and administrator role for template changes", async () => {
    token = "";
    await expect(store.listTemplates()).rejects.toThrow("Connectez-vous");
    token = "vet-session";
    const input = { name: "Modèle", kind: "report" as const, body: "{{patient.nom}}", active: true };
    await expect(store.saveTemplate(input, "admin")).rejects.toThrow("utilisateur connecté");
    await expect(store.saveTemplate(input, "vet")).rejects.toThrow("administrateur");
  });
  it("creates, updates, duplicates, deactivates and deletes unused templates", async () => {
    const id = await store.saveTemplate({ name: "Mon modèle", kind: "referral", body: "À {{reference.destinataire}}", active: true }, "admin");
    const original = (await store.listTemplates()).find((entry) => entry.id === id)!;
    const duplicate = await store.saveTemplate({ ...original, id: undefined, name: "Copie" }, "admin");
    await store.saveTemplate({ ...original, active: false, expectedUpdatedAt: original.updatedAt }, "admin");
    expect((await store.listTemplates()).find((entry) => entry.id === id)?.active).toBe(false);
    await expect(store.prepare("visit", "rex", id, "admin")).rejects.toThrow("modèle actif");
    await store.deleteTemplate(duplicate, "admin");
    expect((await store.listTemplates()).some((entry) => entry.id === duplicate)).toBe(false);
  });
  it("does not resurrect a default template deleted before use", async () => {
    await store.deleteTemplate("document-referral", "admin");
    expect((await store.listTemplates()).some((entry) => entry.id === "document-referral")).toBe(false);
  });
  it("protects templates referenced by historical reviewed notes too", async () => {
    db.prepare("INSERT INTO notes(id,user_id,title,content,tags) VALUES('legacy-doc','admin','Ordonnance ancienne','<p>Dose relue.</p>',?)").run(JSON.stringify({clinicalDocument:{source:{template:{id:"document-prescription"}}}}));
    expect((await store.listTemplates()).find(row=>row.id === "document-prescription")?.usageCount).toBe(1);
    await expect(store.deleteTemplate("document-prescription","admin")).rejects.toThrow("Désactivez");
    expect(()=>db.exec("DELETE FROM document_templates WHERE id='document-prescription'")).toThrow("désactivé");
  });
  it("preserves civil prescription dates in the clinic time zone", async () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Toronto";
    try {
      prescription();
      const result = await store.prepare("visit","rex","document-prescription","admin");
      expect(result.content).toContain("Prescription du 17/10/2026");
    } finally { if(original) process.env.TZ=original; else delete process.env.TZ; }
  });
  it("forbids deleting a used template through both service and SQLite", async () => {
    await draft();
    await expect(store.deleteTemplate("document-report", "admin")).rejects.toThrow("Désactivez");
    expect(() => db.exec("DELETE FROM document_templates WHERE id='document-report'")).toThrow("désactivé");
  });
  it("permet de rétablir un modèle fourni en conservant son identité et les documents déjà générés", async () => {
    const original = DEFAULT_DOCUMENT_TEMPLATES[2];
    await store.saveTemplate({ ...original, body: "Formulation personnalisée {{soap.plan}}", active: true }, "admin");
    const document = await draft();
    await store.saveTemplate({ ...original, active: true }, "admin");
    expect((await store.listTemplates()).find(template => template.id === original.id)?.body).toBe(original.body);
    expect((await store.get(document.id)).templateSnapshot?.body).toBe("Formulation personnalisée {{soap.plan}}");
  });
});

describe("Génération, relecture et traçabilité", () => {
  it("conserve les coordonnées saisies sans troncature silencieuse", async () => {
    const recipient = "Adresse du destinataire. ".repeat(50);
    const result = await store.prepare("visit", "rex", "document-referral", "admin", { recipient });
    expect(result.content).toContain(recipient.trim());
    await expect(store.prepare("visit", "rex", "document-referral", "admin", { recipient: "a".repeat(1501) })).rejects.toThrow("1 500");
  });
  it("requires a validated current SOAP of the selected patient", async () => {
    await expect(store.prepare("visit", "luna", "document-report", "admin")).rejects.toThrow("de ce patient");
    db.exec("UPDATE consultation_soaps SET plan='Nouvelle donnée' WHERE id='soap'");
    await expect(store.prepare("visit", "rex", "document-report", "admin")).rejects.toThrow("Validez la note");
    expect(db.prepare("SELECT COUNT(*) AS n FROM documents").get()?.n).toBe(0);
  });
  it("generates all four types using only recorded facts and explicit certificate/referral inputs", async () => {
    const report = await store.prepare("visit", "rex", "document-report", "admin");
    for (const value of Object.values(fields)) expect(report.content).toContain(value);
    const certificate = await store.prepare("visit", "rex", "document-certificate", "admin", { certificateType: "Vermifugation" });
    expect(certificate.content).toContain("Objet du certificat : Vermifugation");
    expect(certificate.content).not.toContain("certifie que");
    const referral = await store.prepare("visit", "rex", "document-referral", "admin", { recipient: "Dr Dupont", referralReason: "Avis spécialisé demandé." });
    expect(referral.content).toContain("Dr Dupont");
    expect(referral.content).toContain("Avis spécialisé demandé.");
    const prescription = await store.prepare("visit", "rex", "document-prescription", "admin");
    expect(prescription.content).toContain(fields.plan);
    expect(prescription.content).not.toContain("Amoxicilline");
  });
  it("uses explicit missing markers in the managed renderer without inventing patient facts", async () => {
    const id = await store.saveTemplate({ name: "Identité", kind: "report", body: "{{patient.race}} · {{client.email}} · {{dose.calculee}}", active: true }, "admin");
    expect((await store.prepare("visit", "rex", id, "admin")).content).toBe("[à compléter] · [à compléter] · [à compléter]");
  });
  it("stores nothing at preview and records explicit creation against patient, visit, SOAP and template", async () => {
    const preparation = await store.prepare("visit", "rex", "document-report", "admin");
    expect(await store.list("rex")).toEqual([]);
    await expect(store.createDraft(preparation, preparation, "admin", false)).rejects.toThrow("Relisez");
    const document = await store.createDraft(preparation, preparation, "admin", true);
    expect(document).toMatchObject({ patientId: "rex", consultationId: "visit", soapId: "soap", sourceKey: preparation.sourceKey, templateId: "document-report", status: "brouillon" });
    expect(document.templateSnapshot?.body).toBe(preparation.template.body);
    expect((await store.history(document.id))[0]).toMatchObject({ action: "creation", authorId: "admin", createdAt: now.toISOString() });
    expect(await store.list("luna")).toEqual([]);
  });
  it("detects a changed source or template between preview and confirmation", async () => {
    const preparation = await store.prepare("visit", "rex", "document-report", "admin");
    await store.saveTemplate({ ...preparation.template, body: "Autre {{soap.plan}}" }, "admin");
    await expect(store.createDraft(preparation, preparation, "admin", true)).rejects.toThrow("modèle a changé");
  });
  it("copies signed prescription snapshots without recalculating from the patient's changed weight", async () => {
    prescription();
    const result = await store.prepare("visit", "rex", "document-prescription", "admin");
    expect(result.content).toContain("Poids de référence : 10 kg");
    expect(result.content).toContain("Dose calculée enregistrée : 200 mg");
    expect(result.content).toContain("Volume calculé enregistré : 2 mL");
    expect(result.content).toContain("2 fois par jour");
    expect(result.content).toContain("5 jours");
    expect(result.content).toContain("Pendant le repas.");
    expect(result.content).not.toContain("240 mg");
    expect(db.prepare("SELECT status FROM prescriptions WHERE id='rx'").get()?.status).toBe("signed");
    expect(db.prepare("SELECT COUNT(*) AS n FROM stock_movements").get()?.n).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM invoices").get()?.n).toBe(0);
  });
  it("excludes draft, cancelled and another patient's prescriptions", async () => {
    prescription("draft", "rex", "draft");
    prescription("cancelled", "rex", "cancelled");
    prescription("signed", "luna", "foreign");
    expect((await store.prepare("visit", "rex", "document-prescription", "admin")).content).not.toContain("Amoxicilline");
  });
  it("rechecks prescription snapshots before saving a prepared document", async () => {
    prescription();
    const prepared = await store.prepare("visit", "rex", "document-prescription", "admin");
    db.exec("UPDATE prescription_items SET computed_dose_mg=100 WHERE id='rx-line'");
    await expect(store.createDraft(prepared, prepared, "admin", true)).rejects.toThrow("prescription a changé");
  });
});

describe("Statuts verrouillés et corrections", () => {
  it("enforces optimistic preview consistency and finalization by a veterinarian", async () => {
    const document = await draft();
    const updated = await store.updateDraft(document.id, { title: document.title, content: "Texte relu." }, "admin", document.updatedAt);
    await expect(store.finalize(document.id, "admin", pdf, true, document.updatedAt)).rejects.toThrow("vient d’être modifié");
    token = "assistant-session";
    await expect(store.finalize(updated.id, "assistant", pdf, true, updated.updatedAt)).rejects.toThrow("vétérinaire");
    token = "vet-session";
    const final = await store.finalize(updated.id, "vet", pdf, true, updated.updatedAt);
    expect(final.status).toBe("finalise");
    expect(final.pdfDataUrl).toBe(pdf);
    expect((await store.history(final.id)).at(-1)?.authorId).toBe("vet");
  });
  it("requires explicit final review and rejects a stale SOAP before finalization", async () => {
    const document = await draft();
    await expect(store.finalize(document.id, "admin", pdf, false, document.updatedAt)).rejects.toThrow("Relisez");
    db.exec("UPDATE consultation_soaps SET plan='Changé depuis la création' WHERE id='soap'");
    await expect(store.finalize(document.id, "admin", pdf, true, document.updatedAt)).rejects.toThrow("Validez la note");
    expect((await store.get(document.id)).status).toBe("brouillon");
  });
  it("locks finalized content and PDF in both the service and direct SQLite writes", async () => {
    const document = await draft();
    await store.finalize(document.id, "admin", pdf, true, document.updatedAt);
    await expect(store.updateDraft(document.id, { title: "Modifié", content: "Faux" }, "admin", document.updatedAt)).rejects.toThrow("verrouillé");
    expect(() => db.prepare("UPDATE documents SET contenu_genere='Faux' WHERE id=?").run(document.id)).toThrow("verrouillé");
    expect(() => db.prepare("UPDATE documents SET pdf_data_url='Faux' WHERE id=?").run(document.id)).toThrow("verrouillé");
    expect(() => db.prepare("DELETE FROM documents WHERE id=?").run(document.id)).toThrow("historique");
  });
  it("creates a corrected new document while retaining the finalized source snapshot", async () => {
    const document = await draft();
    const original = await store.finalize(document.id, "admin", pdf, true, document.updatedAt);
    db.exec("UPDATE consultation_soaps SET plan='Une nouvelle consultation ne réécrit pas une pièce signée' WHERE id='soap'");
    const correction = await store.newVersion(original.id, "admin");
    expect(correction.previousDocumentId).toBe(original.id);
    const changed = await store.updateDraft(correction.id, { title: correction.title, content: "Correction relue par le vétérinaire." }, "admin", correction.updatedAt);
    expect((await store.finalize(changed.id, "admin", pdf, true, changed.updatedAt)).status).toBe("finalise");
    expect((await store.get(original.id)).content).toBe(original.content);
    expect((await store.get(original.id)).pdfDataUrl).toBe(pdf);
  });
  it("requires and records a cancellation reason and retains immutable history", async () => {
    const document = await draft();
    await expect(store.cancel(document.id, " ", "admin")).rejects.toThrow("motif");
    await store.cancel(document.id, "Erreur de destinataire.", "admin");
    expect(await store.get(document.id)).toMatchObject({ status: "annule", cancellationReason: "Erreur de destinataire." });
    expect((await store.history(document.id)).at(-1)).toMatchObject({ action: "annulation", reason: "Erreur de destinataire.", authorName: "Dr Admin" });
    expect(() => db.exec("UPDATE document_events SET reason='Faux'")).toThrow("immuable");
    await expect(store.newVersion(document.id, "admin")).rejects.toThrow("finalisé");
  });
  it("allows cancelling a finalized document without changing its stored artifact", async () => {
    const document = await draft();
    await store.finalize(document.id, "admin", pdf, true, document.updatedAt);
    await store.cancel(document.id, "Document remplacé.", "admin");
    expect((await store.get(document.id)).pdfDataUrl).toBe(pdf);
    expect(() => db.prepare("UPDATE documents SET statut='finalise' WHERE id=?").run(document.id)).toThrow("verrouillé");
  });
});

describe("Pièces externes locales", () => {
  const attachment: DocumentAttachment = { name: "Laboratoire.pdf", mimeType: "application/pdf", dataUrl: pdf, size: 20, textState: "extractible", pages: [{ page: 1, text: "Créatinine : 1,8 mg/dL" }] };
  it("imports a shared patient PDF and stores its actual extracted text without requiring a consultation", async () => {
    const document = await store.importAttachment("luna", attachment, "admin");
    expect(document).toMatchObject({ patientId: "luna", status: "finalise", consultationId: null, templateId: null, content: "Créatinine : 1,8 mg/dL" });
    token = "vet-session";
    expect((await store.list("luna"))[0].attachment?.dataUrl).toBe(pdf);
    expect((await store.history(document.id))[0].action).toBe("import");
  });
  it("retains scans as files without inventing their text", async () => {
    const document = await store.importAttachment("rex", { ...attachment, textState: "scan", pages: [] }, "admin");
    expect(document.content).toBe("");
    expect(document.attachment?.textState).toBe("scan");
    expect(document.pdfDataUrl).toBe(pdf);
  });
  it("rejects unsupported files and nonexistent patients atomically", async () => {
    await expect(store.importAttachment("missing", attachment, "admin")).rejects.toThrow("patient n’existe plus");
    await expect(store.importAttachment("rex", { ...attachment, size: 20 * 1024 * 1024 }, "admin")).rejects.toThrow("12 Mo");
    expect(await store.list()).toEqual([]);
  });
});
