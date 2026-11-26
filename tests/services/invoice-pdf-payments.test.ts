import { describe, expect, it } from "vitest";
import {
  INVOICE_PAYMENT_METHOD_LABELS,
  invoiceDocument,
} from "@/lib/invoice-document";
import {
  buildInvoicePdf,
  type InvoicePdfData,
  invoicePaymentDate,
} from "@/lib/invoice-pdf";
import { PAYMENT_METHOD_LABELS } from "@/modules/finances/components/finances-shared";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";
import type { InvoiceDetail, InvoicePayment } from "@/types/db";

/** "19 nov. 2026", whatever space the locale puts between the parts. */
const PAYMENT_DAY = /^19\snov\.\s2026$/;

// INV-2026-000021 : 6 000 DA, 5 500 DA le jour de la consultation, 500 DA une semaine plus tard.
const data: InvoicePdfData = {
  number: "INV-2026-000021",
  date: new Date(2026, 10, 19, 10),
  patientName: "Maya",
  ownerName: "Houri Hamid",
  items: [{ description: "Consultation", amount: 600_000 }],
  totalAmount: 600_000,
  paidAmount: 600_000,
  balanceAmount: 0,
  payments: [
    { amount: 550_000, date: new Date(2026, 10, 19, 10), method: "Espèces" },
    { amount: 50_000, date: new Date(2026, 10, 26, 9), method: "Espèces" },
  ],
};

describe("facture PDF : le détail des règlements", () => {
  it("écrit chaque règlement avec son moyen, sa date et son montant, dans l'ordre, et garde les totaux", () => {
    const pdf = buildInvoicePdf(data, DEFAULT_INVOICE_SETTINGS).output();
    const first = pdf.indexOf("19 nov. 2026");
    const second = pdf.indexOf("26 nov. 2026");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(pdf).toContain("5 500 DA");
    expect(pdf).toContain("(500 DA)");
    expect(pdf).toContain("GLEMENTS");
    expect(pdf).toContain("Total de la facture");
    expect(pdf).toContain("Montant r");
    expect(pdf).toContain("Reste ");
  });

  it("date un règlement comme le détail de la facture dans l'app", () => {
    expect(invoicePaymentDate(new Date(2026, 10, 19, 10))).toMatch(PAYMENT_DAY);
  });

  it("refuse des règlements dont la somme n'est pas le montant réglé", () => {
    expect(() =>
      buildInvoicePdf(
        {
          ...data,
          payments: [
            {
              amount: 550_000,
              date: new Date(2026, 10, 19),
              method: "Espèces",
            },
          ],
        },
        DEFAULT_INVOICE_SETTINGS
      )
    ).toThrow("cohérents");
  });

  it("passe à la page suivante quand les règlements sont nombreux", () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      amount: 15_000,
      date: new Date(2026, 9, 1 + index),
      method: "Espèces",
    }));
    const doc = buildInvoicePdf(
      { ...data, payments: many },
      DEFAULT_INVOICE_SETTINGS
    );
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output()).toContain("09 nov. 2026");
  });

  it("sans règlement, n'écrit pas de bloc Règlements", () => {
    const pdf = buildInvoicePdf(
      { ...data, paidAmount: 0, balanceAmount: 600_000, payments: [] },
      DEFAULT_INVOICE_SETTINGS
    ).output();
    expect(pdf).not.toContain("GLEMENTS");
    expect(pdf).not.toContain("nov. 2026");
  });
});

describe("facture émise vers PDF : les règlements", () => {
  const payment = (
    id: string,
    amount: number,
    paidAt: string,
    patch: Partial<InvoicePayment> = {}
  ): InvoicePayment => ({
    id,
    invoiceId: "inv-21",
    amount,
    method: "cash",
    status: "completed",
    paidAt,
    createdAt: paidAt,
    updatedAt: paidAt,
    journalTransactionId: `tx-${id}`,
    ...patch,
  });
  const invoice = {
    id: "inv-21",
    number: "INV-2026-000021",
    documentStatus: "issued",
    issuedAt: "2026-11-19T10:00:00.000Z",
    createdAt: "2026-11-19T10:00:00.000Z",
    ownerSnapshot: null,
    clinicSnapshot: null,
    lines: [
      {
        description: "Consultation",
        quantityMilli: 1000,
        unitAmount: 600_000,
        discountBps: 0,
        taxBps: 0,
        grossAmount: 600_000,
      },
    ],
    grossAmount: 600_000,
    completedPaymentAmount: 600_000,
    balanceAmount: 0,
    creditAmount: 0,
    completedRefundAmount: 0,
    payments: [
      payment("p1", 550_000, "2026-11-19T10:00:00.000Z"),
      payment("p0", 20_000, "2026-11-20T10:00:00.000Z", {
        status: "void",
        method: "card",
      }),
      payment("p2", 50_000, "2026-11-26", { reference: "mwm4wvpyngffvycy5" }),
    ],
  } as unknown as InvoiceDetail;

  it("garde les règlements effectués, dans leur ordre, sans les annulés ni leur référence", () => {
    const { data: built } = invoiceDocument(invoice, "Maya");
    expect(built.payments).toEqual([
      {
        amount: 550_000,
        date: new Date("2026-11-19T10:00:00.000Z"),
        method: "Espèces",
      },
      { amount: 50_000, date: new Date(2026, 10, 26), method: "Espèces" },
    ]);
    expect(() =>
      buildInvoicePdf(built, DEFAULT_INVOICE_SETTINGS)
    ).not.toThrow();
  });

  it("nomme les moyens de paiement avec les mots de Finances", () => {
    expect(INVOICE_PAYMENT_METHOD_LABELS).toEqual(PAYMENT_METHOD_LABELS);
  });
});
