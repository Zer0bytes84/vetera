import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildInvoicePdf, invoiceFileKey, invoicePdfFileName, TEST_INVOICE_MARK, type InvoicePdfData } from "@/lib/invoice-pdf";
import { DEFAULT_INVOICE_SETTINGS } from "@/services/invoiceSettingsService";

const data: InvoicePdfData = { number: "INV-2026-000017", date: new Date("2026-10-27T17:34:05Z"), patientName: "Rifka", ownerName: "Propriétaire", items: [{ description: "Consultation", amount: 1_600_000 }], totalAmount: 1_600_000, paidAmount: 800_000, balanceAmount: 800_000 };

// The two INV-2026-000017 of 20 and 27 October: one number, two databases.
const real = invoiceFileKey("appointment-invoice-mvqwrp8aczmfrb93ygh", "2026-10-27 17:34:05");
const testCopy = invoiceFileKey("appointment-invoice-testflux-2", "2026-10-20 22:14:26");

describe("invoice PDF file names", () => {
  it("adds a short fingerprint of the invoice, stable across exports", () => {
    expect(real).toMatch(/^[0-9a-z]{7}$/);
    expect(invoiceFileKey("appointment-invoice-mvqwrp8aczmfrb93ygh", "2026-10-27 17:34:05")).toBe(real);
    expect(invoicePdfFileName({ ...data, fileKey: real })).toBe(`Facture-INV-2026-000017-${real}.pdf`);
  });

  it("never offers one name for two invoices sharing a number", () => {
    expect(invoicePdfFileName({ ...data, fileKey: testCopy })).not.toBe(invoicePdfFileName({ ...data, fileKey: real }));
    // Same visit billed in two copies of one database: same id, other issue time.
    const id = "appointment-invoice-mvqwrp8aczmfrb93ygh";
    expect(invoiceFileKey(id, "2026-10-27 17:34:05")).not.toBe(invoiceFileKey(id, "2026-10-27 17:34:06"));
  });

  it("marks test exports in the name and on every page, never otherwise", () => {
    expect(invoicePdfFileName({ ...data, fileKey: real }, { test: true })).toBe(`TEST-Facture-INV-2026-000017-${real}.pdf`);
    const marked = buildInvoicePdf(data, DEFAULT_INVOICE_SETTINGS, { test: true }).output();
    expect(marked).toContain("TEST - Facture INV-2026-000017");
    expect(marked).toContain(TEST_INVOICE_MARK.slice(0, 4));
    expect(buildInvoicePdf(data, DEFAULT_INVOICE_SETTINGS).output()).not.toContain("TEST");
  });

  it("names every invoice export through the same function", () => {
    expect(readFileSync("src/modules/invoices/components/invoice-pdf-preview.tsx", "utf8")).toContain("invoicePdfFileName(data, { test, sample })");
    expect(readFileSync("src/lib/invoice-document.ts", "utf8")).toContain("fileKey: invoiceFileKey(invoice.id");
  });
});
