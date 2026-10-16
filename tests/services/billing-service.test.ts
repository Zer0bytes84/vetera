import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runSqliteMigrations,
  type MigrationDatabase,
} from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";

interface TestBillingDatabase extends MigrationDatabase {
  connection: DatabaseSync;
}

const billingHarness = vi.hoisted(() => ({
  database: null as TestBillingDatabase | null,
  nextId: 0,
}));

vi.mock("@/services/sqlite/database", () => ({
  generateId: () => `billing-test-${++billingHarness.nextId}`,
  runDbRead: async (
    operation: (database: TestBillingDatabase) => Promise<unknown>,
  ) => {
    if (!billingHarness.database) {
      throw new Error("Billing test database is not initialized");
    }
    return operation(billingHarness.database);
  },
  runDbTransaction: async (
    operation: (database: TestBillingDatabase) => Promise<unknown>,
  ) => {
    const database = billingHarness.database;
    if (!database) {
      throw new Error("Billing test database is not initialized");
    }
    await database.execute("BEGIN IMMEDIATE TRANSACTION");
    try {
      const result = await operation(database);
      await database.execute("COMMIT");
      return result;
    } catch (error) {
      try {
        await database.execute("ROLLBACK");
      } catch {
        // Preserve the original billing failure.
      }
      throw error;
    }
  },
  toSQLiteTimestamp: (date: Date) => date.toISOString(),
}));

import {
  createInvoiceDraft,
  billCompletedCareTask,
  updateInvoiceDraft,
  getInvoice,
  issueCreditNote,
  issueInvoice,
  recordPayment,
  recordRefund,
  voidCreditNote,
  voidInvoice,
  voidPayment,
  voidRefund,
} from "@/services/billingService";

class TestDatabase implements TestBillingDatabase {
  readonly connection = new DatabaseSync(":memory:");

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    if (bindValues.length === 0) {
      this.connection.exec(query);
      return undefined;
    }
    const result = this.connection.prepare(query.replace(/\$\d+/g, "?")).run(...bindValues);
    return { rowsAffected: Number(result.changes) };
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    return this.connection.prepare(query.replace(/\$\d+/g, "?")).all(...bindValues) as T;
  }

  close(): void {
    this.connection.close();
  }
}

const CLINIC = { name: "Baitari" };

let database: TestDatabase;

function billingAuditCount(command: string): number {
  return database.connection
    .prepare("SELECT payload FROM audit_log WHERE entity = 'billing'")
    .all()
    .filter((row) => {
      const payload = JSON.parse(String(row.payload ?? "{}")) as {
        command?: string;
      };
      return payload.command === command;
    }).length;
}

async function createIssuedInvoice(invoiceId: string, amount = 10_000) {
  const draft = await createInvoiceDraft({
    id: invoiceId,
    ownerId: "owner-1",
    dueAt: "2026-08-31T00:00:00.000Z",
    lines: [
      {
        description: "Consultation",
        quantityMilli: 1000,
        unitAmount: amount,
        discountBps: 0,
        taxBps: 0,
      },
    ],
  });
  const issueInput = {
    invoiceId: draft.id,
    idempotencyKey: `issue-${invoiceId}`,
    clinicSnapshot: CLINIC,
    dueAt: "2026-08-31T00:00:00.000Z",
    issuedAt: "2026-08-01T10:00:00.000Z",
  };
  return { invoice: await issueInvoice(issueInput), issueInput };
}

beforeEach(async () => {
  // These fixtures exercise settlement before their August 31 due date.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-01T17:00:00.000Z"));
  database = new TestDatabase();
  billingHarness.database = database;
  billingHarness.nextId = 0;
  await runSqliteMigrations(database, SQLITE_MIGRATIONS);
  await database.execute("PRAGMA foreign_keys = ON");
  await database.execute(
    `INSERT INTO owners (id, first_name, last_name, phone)
     VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
  );
});

afterEach(() => {
  billingHarness.database = null;
  database.close();
  vi.useRealTimers();
});

describe("billing service idempotency", () => {
  it("replays matching commands without audits and rejects target or payload conflicts", async () => {
    const { invoice, issueInput } = await createIssuedInvoice("invoice-a");

    const issuedReplay = await issueInvoice({
      ...issueInput,
      clinicSnapshot: { name: " Baitari " },
    });
    expect(issuedReplay.id).toBe(invoice.id);
    expect(billingAuditCount("issue-invoice")).toBe(1);
    await expect(
      issueInvoice({ ...issueInput, dueAt: "2026-09-01T00:00:00.000Z" })
    ).rejects.toMatchObject({
      name: "BillingDomainError",
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });
    const secondDraft = await createInvoiceDraft({
      id: "invoice-b",
      ownerId: "owner-1",
      lines: [
        {
          description: "Vaccin",
          quantityMilli: 1000,
          unitAmount: 1_000,
        },
      ],
    });
    await expect(
      issueInvoice({ ...issueInput, invoiceId: secondDraft.id })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const paymentInput = {
      invoiceId: invoice.id,
      idempotencyKey: "payment-a",
      amount: 5_000,
      method: "card" as const,
      reference: " Receipt 42 ",
      paidAt: "2026-08-01T11:00:00.000Z",
    };
    const payment = await recordPayment(paymentInput);
    expect(
      (await recordPayment({ ...paymentInput, reference: "Receipt 42" })).id
    ).toBe(payment.id);
    expect(billingAuditCount("record-payment")).toBe(1);
    await expect(recordPayment({ ...paymentInput, amount: 4_999 })).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });

    const creditInput = {
      invoiceId: invoice.id,
      idempotencyKey: "credit-a",
      issuedAt: "2026-08-01T12:00:00.000Z",
      reason: " Goodwill adjustment ",
      lines: [
        {
          invoiceLineId: invoice.lines[0].id,
          productId: "catalogue-product-a",
          description: "Goodwill adjustment",
          quantityMilli: 1000,
          unitAmount: 1_000,
          discountBps: 0,
          taxBps: 0,
        },
      ],
    };
    const credit = await issueCreditNote(creditInput);
    expect(
      database.connection
        .prepare("SELECT product_id FROM credit_note_lines WHERE credit_note_id = ?")
        .get(credit.id)
    ).toEqual({ product_id: "catalogue-product-a" });
    expect(
      (
        await issueCreditNote({
          ...creditInput,
          reason: "Goodwill adjustment",
          lines: [{ ...creditInput.lines[0], description: " Goodwill adjustment " }],
        })
      ).id
    ).toBe(credit.id);
    expect(billingAuditCount("issue-credit-note")).toBe(1);
    await expect(
      issueCreditNote({ ...creditInput, reason: "Different reason" })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    await expect(
      issueCreditNote({
        ...creditInput,
        lines: [{ ...creditInput.lines[0], productId: "catalogue-product-b" }],
      })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const refundInput = {
      paymentId: payment.id,
      idempotencyKey: "refund-a",
      amount: 1_000,
      reason: " Customer request ",
      refundedAt: "2026-08-01T13:00:00.000Z",
    };
    const refund = await recordRefund(refundInput);
    expect(
      (await recordRefund({ ...refundInput, reason: "Customer request" })).id
    ).toBe(refund.id);
    expect(billingAuditCount("record-refund")).toBe(1);
    await expect(recordRefund({ ...refundInput, amount: 999 })).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });
    await expect(
      recordRefund({ ...refundInput, idempotencyKey: paymentInput.idempotencyKey })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE entity = 'billing'")
        .get()
    ).toEqual({ count: 6 });
  });
});

describe("billing void replay", () => {
  it("returns prior voids without appending duplicate audits", async () => {
    const { invoice: paymentInvoice } = await createIssuedInvoice("invoice-payment");
    const payment = await recordPayment({
      invoiceId: paymentInvoice.id,
      idempotencyKey: "payment-to-void",
      amount: 5_000,
      method: "card",
      paidAt: "2026-08-01T11:00:00.000Z",
    });
    const voidPaymentInput = {
      paymentId: payment.id,
      reason: "Payment correction",
      voidedAt: "2026-08-01T12:00:00.000Z",
    };
    const voidedPayment = await voidPayment(voidPaymentInput);
    const paymentAuditsBeforeReplay = billingAuditCount("void-payment");
    const replayedPayment = await voidPayment(voidPaymentInput);
    expect(replayedPayment).toMatchObject({ id: voidedPayment.id, status: "void" });
    expect(billingAuditCount("void-payment")).toBe(paymentAuditsBeforeReplay);

    const { invoice: refundInvoice } = await createIssuedInvoice("invoice-refund");
    const refundablePayment = await recordPayment({
      invoiceId: refundInvoice.id,
      idempotencyKey: "payment-to-refund",
      amount: 5_000,
      method: "cash",
      paidAt: "2026-08-01T13:00:00.000Z",
    });
    const refund = await recordRefund({
      paymentId: refundablePayment.id,
      idempotencyKey: "refund-to-void",
      amount: 1_000,
      refundedAt: "2026-08-01T14:00:00.000Z",
    });
    const voidRefundInput = {
      refundId: refund.id,
      reason: "Refund correction",
      voidedAt: "2026-08-01T15:00:00.000Z",
    };
    const voidedRefund = await voidRefund(voidRefundInput);
    const refundAuditsBeforeReplay = billingAuditCount("void-refund");
    const replayedRefund = await voidRefund(voidRefundInput);
    expect(replayedRefund).toMatchObject({ id: voidedRefund.id, status: "void" });
    expect(billingAuditCount("void-refund")).toBe(refundAuditsBeforeReplay);

    const { invoice: voidableInvoice } = await createIssuedInvoice("invoice-to-void");
    const voidInvoiceInput = {
      invoiceId: voidableInvoice.id,
      reason: "Invoice correction",
      voidedAt: "2026-08-01T16:00:00.000Z",
    };
    const voidedInvoice = await voidInvoice(voidInvoiceInput);
    const invoiceAuditsBeforeReplay = billingAuditCount("void-invoice");
    const replayedInvoice = await voidInvoice(voidInvoiceInput);
    expect(replayedInvoice).toMatchObject({
      id: voidedInvoice.id,
      documentStatus: "void",
    });
    expect(billingAuditCount("void-invoice")).toBe(invoiceAuditsBeforeReplay);
  });
});

describe("credit-note voiding", () => {
  it("voids only issued credit notes, restores derived settlement, and rejects foreign invoice lines", async () => {
    const { invoice: invoiceA } = await createIssuedInvoice("invoice-a");
    const { invoice: invoiceB } = await createIssuedInvoice("invoice-b", 2_000);

    await expect(
      issueCreditNote({
        invoiceId: invoiceA.id,
        idempotencyKey: "credit-cross-invoice",
        lines: [
          {
            invoiceLineId: invoiceB.lines[0].id,
            description: "Invalid cross-invoice line",
            quantityMilli: 1000,
            unitAmount: 500,
          },
        ],
      })
    ).rejects.toThrow("Chaque ligne d'avoir référencée doit appartenir à la facture concernée.");
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM credit_notes WHERE idempotency_key = ?")
        .get("credit-cross-invoice")
    ).toEqual({ count: 0 });

    const credit = await issueCreditNote({
      invoiceId: invoiceA.id,
      idempotencyKey: "credit-voidable",
      issuedAt: "2026-08-01T12:00:00.000Z",
      reason: "Pricing correction",
      lines: [
        {
          invoiceLineId: invoiceA.lines[0].id,
          description: "Pricing correction",
          quantityMilli: 1000,
          unitAmount: 2_000,
        },
      ],
    });
    const beforeVoid = await getInvoice(invoiceA.id);
    expect(beforeVoid).toMatchObject({
      creditAmount: 2_000,
      balanceAmount: 8_000,
      settlementStatus: "partial",
    });
    await expect(
      voidCreditNote({ creditNoteId: credit.id, reason: "   " })
    ).rejects.toThrow("Un motif est obligatoire");

    const voided = await voidCreditNote({
      creditNoteId: credit.id,
      reason: " Duplicate charge correction ",
      voidedAt: "2026-08-01T14:00:00.000Z",
    });
    expect(voided).toMatchObject({
      id: credit.id,
      documentStatus: "void",
      number: credit.number,
      grossAmount: credit.grossAmount,
      reason: credit.reason,
      voidReason: "Duplicate charge correction",
    });
    const afterVoid = await getInvoice(invoiceA.id);
    expect(afterVoid).toMatchObject({
      creditAmount: 0,
      balanceAmount: 10_000,
      settlementStatus: "open",
    });
    expect(billingAuditCount("void-credit-note")).toBe(1);
    await expect(
      voidCreditNote({ creditNoteId: credit.id, reason: "Second attempt" })
    ).rejects.toMatchObject({ code: "INVOICE_NOT_ISSUED" });
  });
});

describe("invoice branding snapshot", () => {
  it("preserves logo, footer and accent on the issued invoice and PDF mapping", async () => {
    const draft = await createInvoiceDraft({ id: "brand-1", ownerId: "owner-1", lines: [{ description: "Consultation", quantityMilli: 1000, unitAmount: 200000, discountBps: 0, taxBps: 0 }] });
    const clinicSnapshot = { name: "Cabinet Jardin", address: "Alger", logoDataUrl: "data:image/png;base64,aGVsbG8=", footer: "Merci", accent: "forest" as const };
    await issueInvoice({ invoiceId: draft.id, idempotencyKey: "brand-issue", clinicSnapshot });
    await recordPayment({ invoiceId: draft.id, idempotencyKey: "brand-pay", amount: 50000, method: "cash" });
    const persisted = await getInvoice(draft.id);
    expect(persisted?.clinicSnapshot).toMatchObject(clinicSnapshot);
    const { invoiceDocument } = await import("@/lib/invoice-document");
    const document = invoiceDocument(persisted!, "Milo");
    expect(document.settings.name).toBe("Cabinet Jardin");
    expect(document.settings.logoDataUrl).toBe(clinicSnapshot.logoDataUrl);
    expect(document.data).toMatchObject({ totalAmount: 200000, paidAmount: 50000, balanceAmount: 150000 });
  });
  it("rejects a remote logo before issuing an invoice", async () => {
    const draft = await createInvoiceDraft({ id: "brand-invalid", ownerId: "owner-1", lines: [{ description: "Consultation", quantityMilli: 1000, unitAmount: 200000, discountBps: 0, taxBps: 0 }] });
    await expect(issueInvoice({ invoiceId: draft.id, idempotencyKey: "invalid-brand", clinicSnapshot: { name: "Cabinet", logoDataUrl: "https://example.com/logo.png" } })).rejects.toMatchObject({ code: "CLINIC_SNAPSHOT_INVALID" });
    expect((await getInvoice(draft.id))?.documentStatus).toBe("draft");
  });
});

it("séjour sorti vers contrôle et brouillon de journées utilise les tables existantes sans double facture", async () => {
  const { createStayStore } =
    await import("@/modules/hospitalizations/stays/store");
  const { prepareStayInvoice, stayInvoiceInput } =
    await import("@/modules/hospitalizations/stays/billing");
  await database.execute(
    "INSERT INTO patients(id,owner_id,name,species) VALUES('stay-patient','owner-1','Patient test','chien')",
  );
  const adapter = {
    select: <T>(query: string, args: unknown[] = []) =>
      database.select<T>(query.replace(/\$\d+/g, "?"), args),
    execute: async (query: string, args: unknown[] = []) => ({
      rowsAffected: Number(
        database.connection.prepare(query.replace(/\$\d+/g, "?")).run(...args)
          .changes,
      ),
    }),
  };
  const store = createStayStore(
    {
      read: (fn) => fn(adapter),
      transaction: async (fn) => {
        database.connection.exec("BEGIN IMMEDIATE");
        try {
          const result = await fn(adapter);
          database.connection.exec("COMMIT");
          return result;
        } catch (error) {
          database.connection.exec("ROLLBACK");
          throw error;
        }
      },
    },
    () => `stay-test-${++billingHarness.nextId}`,
    () => new Date("2026-08-03T12:00:00Z"),
  );
  const stay = await store.admit(
    {
      patientId: "stay-patient",
      admittedAt: new Date(2026, 7, 1, 10).toISOString(),
      reason: "Observation",
    },
    "vet",
  );
  await store.transition(stay.id, "en_cours", "vet");
  await store.transition(stay.id, "sortie_prevue", "vet", {
    plannedAt: new Date(2026, 7, 3, 0).toISOString(),
  });
  const discharged = await store.transition(stay.id, "sorti", "vet", {
    dischargedAt: new Date(2026, 7, 3, 0).toISOString(),
    summary: "Contrôle de l’appétit",
  });
  await store.scheduleFollowUp(stay.id, "2026-08-05", "vet");
  const input = stayInvoiceInput(
    discharged,
    { id: "stay-patient", ownerId: "owner-1" },
    {
      id: "tariff",
      name: "Hospitalisation",
      category: "Service",
      createdAt: "",
      quantity: 0,
      minStock: 0,
      salePriceAmount: 10000,
      purchasePriceAmount: 0,
      unit: "jour",
    },
    "vet",
  );
  const first = await prepareStayInvoice(input, {
    getInvoice,
    createInvoiceDraft,
  });
  const second = await prepareStayInvoice(input, {
    getInvoice,
    createInvoiceDraft,
  });
  expect(second.id).toBe(first.id);
  expect(first.documentStatus).toBe("draft");
  expect(first.lines).toHaveLength(1);
  expect(first.lines[0].quantityMilli).toBe(2000);
  expect(first.grossAmount).toBe(20000);
  expect(billingAuditCount("create-invoice-draft")).toBe(1);
  expect(
    database.connection
      .prepare("SELECT patient_id FROM tasks WHERE id=?")
      .get(`stay-follow-up:${stay.id}`),
  ).toEqual({ patient_id: "stay-patient" });
  expect(
    database.connection.prepare("SELECT count(*) AS n FROM payments").get(),
  ).toEqual({ n: 0 });
});

async function seedCompletedCare(
  id = "care-1",
  productId: string | null = "care-product",
) {
  await database.execute(
    "INSERT OR IGNORE INTO patients(id,owner_id,name,species) VALUES('care-patient','owner-1','Patient test','chien')",
  );
  await database.execute(
    "INSERT OR IGNORE INTO products(id,name,category,unit,purchase_price_amount,sale_price_amount,quantity,created_at) VALUES('care-product','Soin','Service','acte',0,4500,9,'2026-01-01 00:00:00')",
  );
  await database.execute(
    `INSERT INTO care_tasks(id,patient_id,label,type,heure_prevue,statut,execute_par,produit_id,completed_at,created_at,updated_at)
    VALUES(?,'care-patient','Injection','medicament','2026-08-01T10:00:00Z','fait','vet',?,'2026-08-01T10:05:00Z','2026-08-01','2026-08-01')`,
    [id, productId],
  );
}

describe("facturation automatique des soins", () => {
  it("crée une ligne au tarif réel, conserve patient et exécutant, sans émission ni stock", async () => {
    await seedCompletedCare();
    const invoice = await billCompletedCareTask("care-1");
    expect(invoice).toMatchObject({
      id: "care-invoice:care-1",
      patientId: "care-patient",
      ownerId: "owner-1",
      documentStatus: "draft",
      grossAmount: 4500,
    });
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.lines[0]).toMatchObject({
      description: "Injection",
      quantityMilli: 1000,
      unitAmount: 4500,
    });
    expect(invoice.notes).toContain("vet");
    expect(
      database.connection
        .prepare("SELECT quantity FROM products WHERE id='care-product'")
        .get()?.quantity,
    ).toBe(9);
    await database.execute(
      "UPDATE products SET sale_price_amount=9000 WHERE id='care-product'",
    );
    expect((await billCompletedCareTask("care-1")).grossAmount).toBe(4500);
    expect(billingAuditCount("create-invoice-draft")).toBe(1);
  });
  it("distingue deux soins identiques et signale explicitement un tarif absent", async () => {
    await seedCompletedCare();
    await seedCompletedCare("care-2", null);
    await billCompletedCareTask("care-1");
    const invoice = await billCompletedCareTask("care-2");
    expect(invoice.notes).toContain("Tarif à compléter avant émission");
    expect(invoice.lines).toHaveLength(1);
    expect(invoice.grossAmount).toBe(0);
    expect(
      database.connection.prepare("SELECT COUNT(*) AS n FROM invoices").get()
        ?.n,
    ).toBe(2);
  });
  it("refuse un soin non effectué et reprend après rollback d’une erreur de ligne", async () => {
    await seedCompletedCare();
    await database.execute(
      "UPDATE care_tasks SET statut='a_faire' WHERE id='care-1'",
    );
    await expect(billCompletedCareTask("care-1")).rejects.toThrow(
      "Seul un soin effectué",
    );
    await database.execute(
      "UPDATE care_tasks SET statut='fait' WHERE id='care-1'",
    );
    await database.execute(
      "CREATE TRIGGER fail_care_line BEFORE INSERT ON invoice_lines BEGIN SELECT RAISE(ABORT, 'line failure'); END",
    );
    await expect(billCompletedCareTask("care-1")).rejects.toThrow(
      "line failure",
    );
    expect(await getInvoice("care-invoice:care-1")).toBeNull();
    await database.execute("DROP TRIGGER fail_care_line");
    expect((await billCompletedCareTask("care-1")).lines).toHaveLength(1);
  });
});


it("consomme l’événement réel après commit et reprend un soin non facturé au rechargement", async () => {
  const { careTasksService } = await import("@/modules/care-tasks/service");
  await seedCompletedCare();
  await database.execute("UPDATE care_tasks SET statut='a_faire', completed_at=NULL, execute_par=NULL WHERE id='care-1'");
  await careTasksService.transition("care-1", "fait", "vet");
  expect((await getInvoice("care-invoice:care-1"))?.lines).toHaveLength(1);
  await seedCompletedCare("care-retry");
  await careTasksService.list(new Date("2026-08-01"), new Date("2026-08-02"));
  expect((await getInvoice("care-invoice:care-retry"))?.grossAmount).toBe(4500);
});


it("modifie le tarif d’un brouillon de soin à zéro, persiste son total puis le fige à l’émission", async () => {
  const { draftPriceLines } = await import("@/modules/finances/lib/draft-prices");
  await seedCompletedCare("care-zero", null);
  const draft = await billCompletedCareTask("care-zero");
  const lines = draftPriceLines(draft, { [draft.lines[0].id]: "1750,50" });
  const saved = await updateInvoiceDraft({ invoiceId: draft.id, lines, actor: { userId: "vet" } });
  expect(saved.grossAmount).toBe(175050);
  expect(saved.lines[0]).toMatchObject({ quantityMilli: 1000, unitAmount: 175050, description: "Injection" });
  expect((await getInvoice(draft.id))?.grossAmount).toBe(175050);
  expect((await billCompletedCareTask("care-zero")).grossAmount).toBe(175050);
  await issueInvoice({ invoiceId: draft.id, clinicSnapshot: CLINIC, idempotencyKey: "issue-care-edited" });
  await expect(updateInvoiceDraft({ invoiceId: draft.id, lines })).rejects.toMatchObject({ code: "INVOICE_NOT_DRAFT" });
});

it("reprend après minuit la facturation d’un soin de la veille sans le déplacer dans la journée courante", async () => {
  const { careTasksService } = await import("@/modules/care-tasks/service");
  await seedCompletedCare("care-yesterday");
  await database.execute(`CREATE TRIGGER fail_yesterday_billing BEFORE INSERT ON invoice_lines
    BEGIN SELECT RAISE(ABORT, 'billing interrupted'); END;`);
  await expect(billCompletedCareTask("care-yesterday")).rejects.toThrow("billing interrupted");
  expect(await getInvoice("care-invoice:care-yesterday")).toBeNull();
  await database.execute("DROP TRIGGER fail_yesterday_billing");
  vi.setSystemTime(new Date("2026-08-02T00:01:00.000Z"));
  const start = new Date("2026-08-02T00:00:00.000Z");
  const end = new Date("2026-08-03T00:00:00.000Z");
  expect(await careTasksService.list(start, end)).toEqual([]);
  expect((await getInvoice("care-invoice:care-yesterday"))?.grossAmount).toBe(4500);
  await careTasksService.list(start, end);
  expect(database.connection.prepare("SELECT count(*) AS n FROM invoices WHERE id=?")
    .get("care-invoice:care-yesterday")).toEqual({ n: 1 });
});

it("reprend la facturation de la nouvelle validation sans réutiliser la facture annulée", async () => {
  const {careTasksService} = await import("@/modules/care-tasks/service");
  await seedCompletedCare("care-revalidated");
  const previous = await billCompletedCareTask("care-revalidated");
  await voidInvoice({invoiceId: previous.id, reason: "Validation annulée"});
  await database.execute("UPDATE care_tasks SET completion_revision=1 WHERE id='care-revalidated'");
  await careTasksService.list(new Date("2026-08-01"), new Date("2026-08-02"));
  expect((await getInvoice("care-invoice:care-revalidated:validation:1"))?.documentStatus).toBe("draft");
  expect((await getInvoice(previous.id))?.documentStatus).toBe("void");
  await careTasksService.list(new Date("2026-08-01"), new Date("2026-08-02"));
  expect(database.connection.prepare("SELECT COUNT(*) AS n FROM invoices WHERE document_status='draft'").get()?.n).toBe(1);
});
