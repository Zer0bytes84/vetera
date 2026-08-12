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
    operation: (database: TestBillingDatabase) => Promise<unknown>
  ) => {
    if (!billingHarness.database) {
      throw new Error("Billing test database is not initialized");
    }
    return operation(billingHarness.database);
  },
  runDbTransaction: async (
    operation: (database: TestBillingDatabase) => Promise<unknown>
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
    return this.connection.prepare(query).run(...bindValues);
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    return this.connection.prepare(query).all(...bindValues) as T;
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
