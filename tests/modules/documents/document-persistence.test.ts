import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSqliteMigrations } from "../../../src/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "../../../src/services/sqlite/migrations";
import {
  reviewedSoapContent,
  soapSourceKey,
} from "../../../src/modules/consultations/local-ai/soap-review";
import { DEFAULT_DOCUMENT_TEMPLATES } from "../../../src/modules/documents/lib/document-templates";

const fixture = vi.hoisted(() => ({
  db: null as DatabaseSync | null,
  nextId: 0,
}));
vi.mock("../../../src/services/browser-store", () => ({
  isTauriRuntime: () => true,
}));
vi.mock("../../../src/services/sqlite/database", () => ({
  generateId: () => "document-" + ++fixture.nextId,
  runDbTransaction: async (
    operation: (db: {
      select: (sql: string, params: unknown[]) => Promise<unknown>;
      execute: (sql: string, params: unknown[]) => Promise<unknown>;
    }) => unknown,
  ) => {
    const db = fixture.db!;
    db.exec("BEGIN");
    try {
      const result = await operation({
        select: async (sql, params) => db.prepare(sql).all(...params),
        execute: async (sql, params) => db.prepare(sql).run(...params),
      });
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  },
}));
import {
  saveReviewedDocument,
  type ReviewedDocumentInput,
} from "../../../src/modules/documents/lib/save-reviewed-document";
const fields = {
  subjective: "Toux depuis hier.",
  objective: "",
  assessment: "",
  plan: "Contrôle dans 7 jours.",
};
const input: ReviewedDocumentInput = {
  title: "Compte-rendu · Rex",
  text: "Patient Rex\nContrôle dans 7 jours.",
  patientId: "rex",
  appointmentId: "visit",
  userId: "vet",
  reviewed: true,
  source: {
    type: "soap",
    sourceKey: soapSourceKey(fields),
    template: DEFAULT_DOCUMENT_TEMPLATES[2],
  },
};
beforeEach(async () => {
  fixture.db = new DatabaseSync(":memory:");
  fixture.nextId = 0;
  const db = fixture.db;
  await runSqliteMigrations(
    {
      execute: async (sql, params = []) =>
        params.length ? db.prepare(sql).run(...params) : db.exec(sql),
      select: async <T>(sql: string, params: unknown[] = []) =>
        db.prepare(sql).all(...params) as T,
    },
    SQLITE_MIGRATIONS,
  );
  db.exec("PRAGMA foreign_keys = ON");
  db.prepare(
    "INSERT INTO users(id,email,password_hash,display_name,role) VALUES('vet','test@example.invalid','test','Dr Test','admin')",
  ).run();
  db.prepare(
    "INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Sarah','Martin','0')",
  ).run();
  db.prepare(
    "INSERT INTO patients(id,owner_id,name,species,sex) VALUES('rex','owner','Rex','Chien','M')",
  ).run();
  db.prepare(
    "INSERT INTO appointments(id,patient_id,owner_id,vet_id,title,start_time,end_time,status,type) VALUES('visit','rex','owner','vet','Consultation de Rex','2026-10-07 10:00:00','2026-10-07 10:30:00','in_progress','Consultation')",
  ).run();
  db.prepare(
    "INSERT INTO consultation_soaps(id,patient_id,appointment_id,subjective,objective,assessment,plan,content) VALUES('soap','rex','visit',?,?,?,?,?)",
  ).run(
    fields.subjective,
    fields.objective,
    fields.assessment,
    fields.plan,
    reviewedSoapContent(fields, "{}", "vet"),
  );
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => {
  fixture.db?.close();
  fixture.db = null;
  vi.unstubAllGlobals();
});
describe("Enregistrement local des documents sur SQLite réel isolé", () => {
  it("saves only after review, preserving patient and approved source trace", async () => {
    await expect(
      saveReviewedDocument({ ...input, reviewed: false }),
    ).rejects.toThrow("validez");
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS count FROM notes").get()?.count,
    ).toBe(0);
    await saveReviewedDocument(input);
    const row = fixture.db!.prepare("SELECT * FROM notes").get()!;
    expect(row.patient_id).toBe("rex");
    expect(row.user_id).toBe("vet");
    expect(String(row.content)).toContain("Contrôle dans 7 jours.");
    expect(JSON.parse(String(row.tags)).clinicalDocument.source.sourceKey).toBe(
      soapSourceKey(fields),
    );
  });
  it("rechecks the database inside the transaction when SOAP changes after preview", async () => {
    fixture
      .db!.prepare(
        "UPDATE consultation_soaps SET plan='Nouvelle observation' WHERE id='soap'",
      )
      .run();
    await expect(saveReviewedDocument(input)).rejects.toThrow("note a changé");
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS count FROM notes").get()?.count,
    ).toBe(0);
  });
  it("supports a reviewed reading without silently replacing the SOAP", async () => {
    await saveReviewedDocument({
      ...input,
      source: {
        type: "document",
        name: "Laboratoire.pdf",
        pages: [{ number: 1, method: "text", text: "Créatinine 1,8 mg/dL" }],
      },
    });
    expect(
      fixture.db!.prepare("SELECT COUNT(*) AS count FROM notes").get()?.count,
    ).toBe(1);
    expect(
      fixture.db!.prepare("SELECT objective FROM consultation_soaps").get()
        ?.objective,
    ).toBe("");
  });
});
