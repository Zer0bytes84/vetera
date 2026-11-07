import { describe, expect, it } from "vitest";
import { buildFinancialOverview, receivablesSummary } from "../../src/modules/dashboard/v2/financial-model";
import type { Invoice, Transaction } from "../../src/types/db";

const invoice = (id: string, over: Partial<Invoice> = {}) =>
  ({ id, documentStatus: "issued", issuedAt: "2026-10-01", createdAt: "2026-10-01", grossAmount: 10000, creditAmount: 0, balanceAmount: 10000, completedPaymentAmount: 0, settlementStatus: "unpaid", ...over }) as Invoice;
const entry = (id: string, over: Partial<Transaction> = {}) =>
  ({ id, type: "income", status: "pending", amount: 5000, date: "2026-10-05", ...over }) as Transaction;

/** The figure that has always been shown as « Reste à recouvrer ». */
const legacy = (invoices: Invoice[], transactions: Transaction[]) =>
  buildFinancialOverview(invoices, transactions, { from: "", to: "" }, "all").categories.reduce((n, c) => n + c.riskValue, 0);

describe("créances : reste à recouvrer, factures impayées et en retard", () => {
  it("additionne les soldes des factures impayées, en dinars, et les compte", () => {
    const s = receivablesSummary([invoice("a", { balanceAmount: 10000 }), invoice("b", { balanceAmount: 2500 })], []);
    expect(s).toMatchObject({ total: 125, unpaidInvoices: 2, overdueInvoices: 0 });
  });
  it("compte à part celles dont l'échéance est dépassée", () => {
    const s = receivablesSummary([invoice("a"), invoice("b", { settlementStatus: "overdue" }), invoice("c", { settlementStatus: "overdue" })], []);
    expect(s.unpaidInvoices).toBe(3);
    expect(s.overdueInvoices).toBe(2);
  });
  it("ignore une facture soldée, annulée, ou brouillon", () => {
    const s = receivablesSummary([
      invoice("paid", { balanceAmount: 0, settlementStatus: "paid" }),
      invoice("void", { documentStatus: "void" as Invoice["documentStatus"] }),
      invoice("draft", { documentStatus: "draft" as Invoice["documentStatus"] }),
      invoice("due"),
    ], []);
    expect(s).toMatchObject({ total: 100, unpaidInvoices: 1 });
  });
  it("le solde ne dépasse jamais le net après avoir décompté les avoirs", () => {
    // 100 DA facturés, 40 DA d'avoir : au plus 60 DA à recouvrer, même si le solde dit 100.
    expect(receivablesSummary([invoice("a", { creditAmount: 4000, balanceAmount: 10000 })], []).total).toBe(60);
    // Un avoir qui couvre tout : plus rien à recouvrer, plus de facture impayée.
    const s = receivablesSummary([invoice("a", { creditAmount: 10000, balanceAmount: 10000 })], []);
    expect(s).toMatchObject({ total: 0, unpaidInvoices: 0 });
  });
  it("un solde négatif ou nul n'est pas une créance", () => {
    expect(receivablesSummary([invoice("a", { balanceAmount: -500 }), invoice("b", { balanceAmount: 0 })], [])).toMatchObject({ total: 0, unpaidInvoices: 0 });
  });
  it("garde le chiffre historique : les écritures manuelles en attente comptent dans le montant, pas dans les factures", () => {
    const s = receivablesSummary([invoice("a")], [entry("m1"), entry("m2", { amount: 2500 }), entry("paid", { status: "paid" })]);
    expect(s.total).toBe(100 + 50 + 25);
    expect(s.unpaidInvoices).toBe(1);
    expect(s.pendingEntries).toBe(2);
  });
  it("le montant est toujours celui de l'ancien « Reste à recouvrer », sur tous les cas", () => {
    const cases: [Invoice[], Transaction[]][] = [
      [[], []],
      [[invoice("a")], []],
      [[invoice("a", { creditAmount: 4000 }), invoice("b", { settlementStatus: "overdue" })], [entry("m")]],
      [[invoice("a", { balanceAmount: -1 })], [entry("m", { amount: 0 })]],
    ];
    for (const [inv, tx] of cases) expect(receivablesSummary(inv, tx).total).toBeCloseTo(legacy(inv, tx), 6);
  });
  it("sans aucune facture : zéro partout, sans erreur", () => {
    expect(receivablesSummary([], [])).toEqual({ total: 0, unpaidInvoices: 0, overdueInvoices: 0, pendingEntries: 0 });
  });
});

import { receivablesTrend } from "../../src/modules/dashboard/v2/financial-model";

describe("évolution du reste à recouvrer sur la période", () => {
  const day = (offset: number) => { const d = new Date(2026, 10, 7 + offset, 12); return d; };
  const iso = (offset: number) => `${day(offset).getFullYear()}-${String(day(offset).getMonth() + 1).padStart(2, "0")}-${String(day(offset).getDate()).padStart(2, "0")}`;
  const inv = (id: string, issued: number, over: Partial<Invoice> = {}) => invoice(id, { issuedAt: iso(issued), createdAt: iso(issued), ...over });
  const pay = (id: string, invoiceId: string, at: number, amount: number): Transaction => ({ id, type: "income", status: "paid", amount, date: iso(at), sourceType: "billing_payment", referenceId: invoiceId } as Transaction);
  const ends = (...offsets: number[]) => offsets.map(day);

  it("un paiement reçu plus tard laisse la facture due avant lui, puis la solde", () => {
    // 100 DA facturés il y a 10 jours, 40 DA reçus il y a 5 jours : il reste 60 DA.
    const i = [inv("a", -10, { balanceAmount: 6000 })];
    const t = [pay("p", "a", -5, 4000)];
    expect(receivablesTrend(i, t, ends(-12, -8, -5, -3, 0))).toEqual([0, 100, 60, 60, 60]);
  });
  it("le dernier point est exactement le chiffre de la carte", () => {
    const i = [inv("a", -10, { balanceAmount: 6000 }), inv("b", -2, { balanceAmount: 2500 }), inv("c", -20, { balanceAmount: 0, settlementStatus: "paid" })];
    const t = [pay("p", "a", -5, 4000), pay("q", "c", -15, 10000)];
    const trend = receivablesTrend(i, t, ends(-9, -4, -1, 0));
    expect(trend.at(-1)).toBeCloseTo(receivablesSummary(i, t).total, 6);
  });
  it("une facture émise après une date n'est pas encore due à cette date", () => {
    const i = [inv("late", -2, { balanceAmount: 10000 })];
    expect(receivablesTrend(i, [], ends(-5, -3, -2, 0))).toEqual([0, 0, 100, 100]);
  });
  it("une écriture manuelle en attente est due à partir de sa date", () => {
    const e = { id: "m", type: "income", status: "pending", amount: 5000, date: iso(-4) } as Transaction;
    expect(receivablesTrend([], [e], ends(-6, -4, 0))).toEqual([0, 50, 50]);
    expect(receivablesTrend([inv("a", -10, { balanceAmount: 10000 })], [e], ends(0)).at(-1)).toBeCloseTo(receivablesSummary([inv("a", -10, { balanceAmount: 10000 })], [e]).total, 6);
  });
  it("les paiements d'une autre facture, ou non payés, ne comptent pas", () => {
    const i = [inv("a", -10, { balanceAmount: 6000 })];
    const t = [pay("x", "autre", -5, 9999), { ...pay("y", "a", -5, 4000), status: "pending" } as Transaction];
    expect(receivablesTrend(i, t, ends(-8, 0))).toEqual([60, 60]);
  });
  it("jamais plus que le net de la facture, même si les paiements dépassent", () => {
    const i = [inv("a", -10, { balanceAmount: 0, settlementStatus: "paid" })];
    const t = [pay("p1", "a", -1, 8000), pay("p2", "a", -1, 8000)];
    // 100 DA de net, 160 DA de paiements tardifs : plafonné à 100 DA avant eux.
    expect(receivablesTrend(i, t, ends(-5))).toEqual([100]);
  });
  it("sans facture ni écriture : une ligne à zéro, sans erreur", () => {
    expect(receivablesTrend([], [], ends(-3, -2, -1, 0))).toEqual([0, 0, 0, 0]);
    expect(receivablesTrend([], [], [])).toEqual([]);
  });
  it("ignore les brouillons, les factures annulées et celles sans date", () => {
    const i = [inv("d", -5, { documentStatus: "draft" as Invoice["documentStatus"] }), inv("v", -5, { documentStatus: "void" as Invoice["documentStatus"] }), { ...inv("n", -5), issuedAt: undefined, createdAt: "" } as unknown as Invoice];
    expect(receivablesTrend(i, [], ends(0))).toEqual([0]);
  });
});
