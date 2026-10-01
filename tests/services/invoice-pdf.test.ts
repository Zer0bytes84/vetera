import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { buildInvoicePdf, invoiceMoney, type InvoicePdfData } from "@/lib/invoice-pdf";
import { DEFAULT_INVOICE_SETTINGS, normalizeInvoiceSettings } from "@/services/invoiceSettingsService";

const settings = { ...DEFAULT_INVOICE_SETTINGS, name: "Cabinet vétérinaire des Jardins", address: "12 rue des Jardins\nAlger", phone: "0550 00 00 00", accent: "forest" as const };
const data: InvoicePdfData = { number: "2026-001", date: new Date("2026-09-29T12:00:00Z"), patientName: "Milo", ownerName: "Nadia Benali", items: [{ description: "Consultation et soins", amount: 700000 }], totalAmount: 700000, paidAmount: 400000, balanceAmount: 300000 };

describe("personalized invoice PDFs", () => {
  it("keeps centimes accurate, including fractional dinars", () => {
    expect(invoiceMoney(200000)).toBe("2 000 DA");
    expect(invoiceMoney(200050)).toBe("2 000,50 DA");
    expect(() => invoiceMoney(20.5)).toThrow();
  });
  it("refuses inconsistent totals or payment balances", () => {
    expect(() => buildInvoicePdf({ ...data, totalAmount: 200000 }, settings)).toThrow("cohérents");
    expect(() => buildInvoicePdf({ ...data, balanceAmount: 200000 }, settings)).toThrow("cohérents");
  });
  it("exports partial payments and adds pages for a long invoice", () => {
    const single = buildInvoicePdf(data, settings);
    expect(single.getNumberOfPages()).toBe(1);
    expect(single.output()).toContain("3 000 DA");
    const items = Array.from({ length: 75 }, (_, i) => ({ description: `Prestation ${i + 1} : consultation et soins complémentaires avec suivi`, amount: 10000 }));
    const many = buildInvoicePdf({ ...data, items, totalAmount: 750000, paidAmount: 400000, balanceAmount: 350000 }, settings);
    expect(many.getNumberOfPages()).toBeGreaterThan(2);
    expect(many.output()).toContain("Prestation 75");
    expect(many.output()).toContain("3 500 DA");
    writeFileSync("/tmp/baitari-invoice-sample.pdf", Buffer.from(single.output("arraybuffer")));
    writeFileSync("/tmp/baitari-invoice-multipage.pdf", Buffer.from(many.output("arraybuffer")));
  });
  it("accounts for credits and refunds without marking a balance as settled", () => {
    const doc = buildInvoicePdf({ ...data, paidAmount: 500000, creditAmount: 100000, refundAmount: 50000, balanceAmount: 150000 }, settings);
    expect(doc.output()).toContain("1 500 DA");
  });
  it("keeps the entire configured footer and rejects unusably long line breaks", () => {
    const footer = Array.from({ length: 7 }, (_, i) => `Mention ${i + 1}`).join("\n");
    expect(buildInvoicePdf(data, { ...settings, footer }).output()).toContain("Mention 7");
    expect(() => buildInvoicePdf(data, { ...settings, footer: "Texte\n".repeat(30) })).toThrow("12 lignes");
  });
  it("does not allow remote logos in stored branding", () => {
    expect(normalizeInvoiceSettings({ logoDataUrl: "https://example.com/logo.png" }).logoDataUrl).toBe("");
  });
});
