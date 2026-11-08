import { describe, expect, it } from "vitest";
import { receivablesAging } from "@/modules/finances/receivables-aging";
import { receivablesSummary } from "@/modules/dashboard/v2/financial-model";
import type { Invoice, Transaction } from "@/types/db";

const now = new Date("2026-11-08T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const invoice = (id: string, issued: string, gross: number, balance: number, extra: Partial<Invoice> = {}): Invoice =>
  ({ id, documentStatus: "issued", issuedAt: issued, createdAt: issued, grossAmount: gross, creditAmount: 0, balanceAmount: balance,
    completedPaymentAmount: gross - balance, settlementStatus: null, ...extra }) as Invoice;
const entry = (id: string, date: string, amount: number, status: string, extra: Partial<Transaction> = {}): Transaction =>
  ({ id, type: "income", date, amount, status, ...extra }) as Transaction;

describe("ancienneté des créances", () => {
  it("range le solde de chaque facture ouverte dans sa tranche d'âge, en dinars", () => {
    const rows = receivablesAging(
      [invoice("a", daysAgo(5), 500000, 500000), invoice("b", daysAgo(45), 300000, 100000), invoice("c", daysAgo(75), 200000, 200000), invoice("d", daysAgo(200), 100000, 100000)],
      [], now,
    );
    expect(rows.map((row) => [row.id, row.amount, row.count])).toEqual([["recent", 5000, 1], ["month", 1000, 1], ["quarter", 2000, 1], ["old", 1000, 1]]);
  });

  it("ignore ce qui est soldé, annulé ou non émis, comme « Créances »", () => {
    const rows = receivablesAging(
      [invoice("paid", daysAgo(10), 100000, 0), invoice("draft", daysAgo(10), 100000, 100000, { documentStatus: "draft" })],
      [], now,
    );
    expect(rows.every((row) => row.amount === 0 && row.count === 0)).toBe(true);
  });

  it("déduit les avoirs du solde, jamais plus que le net", () => {
    const [recent] = receivablesAging([invoice("a", daysAgo(3), 100000, 100000, { creditAmount: 40000 })], [], now);
    expect(recent.amount).toBe(600);
  });

  it("compte les écritures manuelles en attente, pas celles réglées ni liées à une facture", () => {
    const rows = receivablesAging([], [entry("m1", daysAgo(10), 50000, "pending"), entry("m2", daysAgo(10), 50000, "paid"), entry("m3", daysAgo(10), 50000, "pending", { sourceType: "invoice" })], now);
    expect(rows[0].amount).toBe(500);
    expect(rows[0].count).toBe(1);
  });

  it("la somme des tranches est le total de « Reste à recouvrer » : aucun écart avec le chiffre existant", () => {
    const invoices = [invoice("a", daysAgo(5), 500000, 500000), invoice("b", daysAgo(120), 300000, 100000)];
    const entries = [entry("m1", daysAgo(40), 70000, "pending")];
    const sum = receivablesAging(invoices, entries, now).reduce((total, row) => total + row.amount, 0);
    expect(sum).toBeCloseTo(receivablesSummary(invoices, entries).total, 5);
  });
});
