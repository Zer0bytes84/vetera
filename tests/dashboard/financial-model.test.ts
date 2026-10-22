import { describe, expect, it } from "vitest";
import { buildFinancialOverview, collectionProgress, settlementRate } from "../../src/modules/dashboard/v2/financial-model";
import type { Invoice, Transaction } from "../../src/types/db";
const range = { from: "2026-01-01", to: "2026-12-31" };
const invoice = (id: string, overrides: Partial<Invoice> = {}) =>
  ({
    id,
    documentStatus: "issued",
    issuedAt: "2026-09-15",
    grossAmount: 10000,
    creditAmount: 2000,
    balanceAmount: 3000,
    completedPaymentAmount: 5000,
    ...overrides,
  }) as Invoice;
const transaction = (id: string, overrides: Partial<Transaction> = {}) =>
  ({
    id,
    type: "income",
    status: "paid",
    amount: 10000,
    date: "2026-09-15",
    ...overrides,
  }) as Transaction;
describe("financial overview", () => {
  it("uses invoice balances and credit notes without counting projected payments twice", () => {
    const result = buildFinancialOverview(
      [invoice("invoice")],
      [
        transaction("payment", {
          sourceType: "billing_payment",
          referenceId: "invoice",
        }),
      ],
      range,
      "all"
    );
    expect(result.categories[0]).toMatchObject({
      totalValue: 80,
      safeValue: 50,
      riskValue: 30,
    });
    expect(result.categories[1].totalValue).toBe(0);
    expect(result.receivables[0]).toMatchObject({
      balance: 30,
      detail: "Règlement partiel",
    });
  });
  it("applies the same period and source to totals and debts", () => {
    const result = buildFinancialOverview(
      [invoice("old", { issuedAt: "2025-09-15" }), invoice("new")],
      [transaction("pending", { status: "pending" })],
      range,
      "manual"
    );
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]).toMatchObject({
      id: "manual",
      safeValue: 0,
      riskValue: 100,
    });
    expect(result.receivables.map((row) => row.id)).toEqual(["pending"]);
    expect(
      buildFinancialOverview(
        [invoice("new")],
        [transaction("pending", { status: "pending" })],
        range,
        "invoices"
      ).receivables.map((row) => row.id)
    ).toEqual(["new"]);
  });
  it("excludes void/draft documents, migrated journal rows and expenses", () => {
    const result = buildFinancialOverview(
      [
        invoice("valid", { legacySourceTransactionId: "legacy" }),
        invoice("void", { documentStatus: "void" }),
        invoice("draft", { documentStatus: "draft" }),
      ],
      [transaction("legacy"), transaction("expense", { type: "expense" })],
      range,
      "all"
    );
    expect(result.categories[0].totalCount).toBe(1);
    expect(result.categories[1].totalValue).toBe(0);
  });
  it("keeps zero states finite and orders invoice and manual debts by balance", () => {
    const result = buildFinancialOverview(
      [invoice("small")],
      [transaction("large", { status: "pending" })],
      { from: "", to: "" },
      "all"
    );
    expect(result.receivables.map((row) => row.id)).toEqual(["large", "small"]);
    expect(
      buildFinancialOverview([], [], range, "all").categories.every(
        (row) => row.totalValue === 0
      )
    ).toBe(true);
  });
});

describe("collection goal meter", () => {
  it("keeps a visible unfilled segment even for a very small overdue balance", () => {
    const overview = buildFinancialOverview([invoice("late", { settlementStatus: "overdue", grossAmount: 10000000, creditAmount: 0, balanceAmount: 100, completedPaymentAmount: 9999900 })], [], range, "all");
    const category = overview.categories[0];
    expect(overview.receivables[0].detail).toBe("Échéance dépassée");
    expect(collectionProgress(category.totalValue, category.safeValue)).toEqual({ percentage: 99, filledSegments: 39 });
  });
  it("fills every segment only when fully paid", () => {
    expect(collectionProgress(100, 100)).toEqual({ percentage: 100, filledSegments: 40 });
    expect(collectionProgress(100, 70)).toEqual({ percentage: 70, filledSegments: 28 });
  });
  it("does not show progress for empty or completely unpaid receipts", () => {
    expect(collectionProgress(0, 0)).toEqual({ percentage: null, filledSegments: 0 });
    expect(collectionProgress(100, 0)).toEqual({ percentage: 0, filledSegments: 0 });
  });
});

describe("taux de règlement", () => {
  it("rapporte le montant réglé au montant facturé net d'avoirs, sur toutes les factures émises", () => {
    // 80 facturés nets (100 − 20 d'avoir), 30 restent dus : 50 réglés, soit 62,5 %.
    expect(settlementRate([invoice("a")])).toBe(62.5);
    // Le statut de paiement est le règlement, jamais le statut du document.
    expect(settlementRate([invoice("b", { creditAmount: 0, balanceAmount: 0, settlementStatus: "paid" })])).toBe(100);
  });

  it("n'affiche jamais 100 % tant qu'un solde reste dû, et rien sans facture", () => {
    expect(settlementRate([invoice("c", { grossAmount: 1_000_000, creditAmount: 0, balanceAmount: 100 })])).toBe(99.9);
    expect(settlementRate([])).toBeNull();
    expect(settlementRate([invoice("d", { documentStatus: "void" })])).toBeNull();
  });

  it("retrouve le recalcul indépendant de la base du 22 octobre : 496 000 DA facturés, 3 000 DA dus", () => {
    const paid = Array.from({ length: 40 }, (_, i) => invoice(`p${i}`, { grossAmount: 1_222_500, creditAmount: 0, balanceAmount: 0 }));
    const open = invoice("INV-2026-000013", { grossAmount: 700_000, creditAmount: 0, balanceAmount: 300_000 });
    expect(settlementRate([...paid, open])).toBe(99.4);
  });
});
