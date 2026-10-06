import { describe, expect, it } from "vitest";
import type { Invoice, Transaction } from "../../src/types/db";
import { buildFinancialOverview } from "../../src/modules/dashboard/v2/financial-model";
import { buildReceiptsSeries } from "../../src/modules/dashboard/v2/receipts-series";

const invoice = (id: string, overrides: Partial<Invoice> = {}) => ({ id, documentStatus: "issued", issuedAt: "2026-09-15", grossAmount: 10000, creditAmount: 2000, balanceAmount: 3000, completedPaymentAmount: 5000, ...overrides }) as Invoice;
const transaction = (id: string, overrides: Partial<Transaction> = {}) => ({ id, type: "income", status: "paid", amount: 10000, date: "2026-09-15", ...overrides }) as Transaction;
const range = { from: "2026-01-01", to: "2026-12-31" };
const sum = (rows: ReturnType<typeof buildReceiptsSeries>, key: "invoices" | "manual" | "pending") => rows.reduce((total, row) => total + row[key], 0);

describe("receipt chart series", () => {
  it("partitions the net amount into three disjoint series without double counting payments or migrated rows", () => {
    const invoices = [invoice("issued", { legacySourceTransactionId: "migrated" }), invoice("draft", { documentStatus: "draft" })];
    const transactions = [transaction("paid"), transaction("pending", { status: "pending", amount: 2500 }), transaction("migrated"), transaction("projected", { sourceType: "billing_payment" }), transaction("expense", { type: "expense" })];
    const data = buildReceiptsSeries(invoices, transactions, range, "all");
    expect(data).toHaveLength(12);
    expect(sum(data, "invoices")).toBe(50);
    expect(sum(data, "manual")).toBe(100);
    expect(sum(data, "pending")).toBe(55);
    const overview = buildFinancialOverview(invoices, transactions, range, "all");
    expect(sum(data, "invoices") + sum(data, "manual") + sum(data, "pending")).toBe(overview.categories.reduce((total, row) => total + row.totalValue, 0));
  });
  it("preserves source filtering and inclusive custom date bounds across a month change", () => {
    const invoices = [invoice("jan", { issuedAt: "2026-01-31" }), invoice("feb", { issuedAt: "2026-02-01" }), invoice("before", { issuedAt: "2026-01-29" }), invoice("after", { issuedAt: "2026-02-05" })];
    const selected = { from: "2026-01-30", to: "2026-02-04" };
    const data = buildReceiptsSeries(invoices, [transaction("manual", { date: "2026-02-02" })], selected, "invoices");
    expect(sum(data, "invoices")).toBe(100);
    expect(sum(data, "pending")).toBe(60);
    expect(sum(data, "manual")).toBe(0);
    expect(data.at(-1)?.key).toBe("2026-02-04");
  });
  it("uses weekly or monthly groups without losing records for long and partial periods", () => {
    const transactions = [transaction("first", { date: "2026-01-17" }), transaction("last", { date: "2027-03-09", status: "pending" })];
    const selected = { from: "2026-01-17", to: "2027-03-09" };
    const data = buildReceiptsSeries([], transactions, selected, "manual");
    expect(data.length).toBeLessThanOrEqual(12);
    expect(sum(data, "manual")).toBe(100);
    expect(sum(data, "pending")).toBe(100);
    expect(sum(data, "invoices")).toBe(0);
  });
  it("handles empty and invalid periods without nonfinite data or artificial revenue", () => {
    expect(buildReceiptsSeries([], [], range, "all").every(row => row.invoices === 0 && row.manual === 0 && row.pending === 0)).toBe(true);
    expect(buildReceiptsSeries([], [], { from: "invalid", to: "2026-10-01" }, "all")).toEqual([]);
    expect(buildReceiptsSeries([], [], { from: "2026-10-06", to: "2026-10-01" }, "all")).toEqual([]);
  });
});
