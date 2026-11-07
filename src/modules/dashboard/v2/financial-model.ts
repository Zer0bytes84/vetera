import type { Invoice, Transaction } from "@/types/db";

export type FinancialSource = "all" | "invoices" | "manual";
export interface FinancialCategory {
  id: string;
  label: string;
  totalValue: number;
  safeValue: number;
  riskValue: number;
  totalCount: number;
  riskCount: number;
}
export type RiskCategoryData = FinancialCategory;
export interface Receivable {
  id: string;
  label: string;
  detail: string;
  balance: number;
}

/** All source amounts are centimes; display aggregates are dinars. */
export function buildFinancialOverview(
  invoices: Invoice[],
  transactions: Transaction[],
  range: { from: string; to: string },
  source: FinancialSource
) {
  const within = (value: string) => {
    const date = value.slice(0, 10);
    return (
      Boolean(date) &&
      (!range.from || date >= range.from) &&
      (!range.to || date <= range.to)
    );
  };
  const issued = invoices.filter(
    (invoice) => invoice.documentStatus === "issued"
  );
  // Migration links identify manual rows already represented by an invoice.
  const migrated = new Set(
    issued.map((invoice) => invoice.legacySourceTransactionId).filter(Boolean)
  );
  const selectedInvoices =
    source === "manual"
      ? []
      : issued.filter((invoice) =>
          within(invoice.issuedAt ?? invoice.createdAt)
        );
  const manual =
    source === "invoices"
      ? []
      : transactions.filter(
          (row) =>
            row.type === "income" &&
            !row.sourceType &&
            !migrated.has(row.id) &&
            within(row.date)
        );
  const categories: FinancialCategory[] = [
    {
      id: "invoices",
      label: "Factures du cabinet",
      totalValue: 0,
      safeValue: 0,
      riskValue: 0,
      totalCount: selectedInvoices.length,
      riskCount: 0,
    },
    {
      id: "manual",
      label: "Recettes hors facture",
      totalValue: 0,
      safeValue: 0,
      riskValue: 0,
      totalCount: manual.length,
      riskCount: 0,
    },
  ];
  const receivables: Receivable[] = [];
  for (const invoice of selectedInvoices) {
    const net = Math.max(0, invoice.grossAmount - invoice.creditAmount) / 100;
    const balance = Math.min(net, Math.max(0, invoice.balanceAmount) / 100);
    categories[0].totalValue += net;
    categories[0].riskValue += balance;
    categories[0].safeValue += net - balance;
    if (balance > 0) {
      categories[0].riskCount++;
      receivables.push({
        id: invoice.id,
        label: invoice.number || "Facture",
        detail:
          invoice.settlementStatus === "overdue"
            ? "Échéance dépassée"
            : invoice.completedPaymentAmount > 0
              ? "Règlement partiel"
              : "À régler",
        balance,
      });
    }
  }
  for (const transaction of manual) {
    const value = Math.max(0, transaction.amount) / 100;
    categories[1].totalValue += value;
    if (transaction.status === "paid") categories[1].safeValue += value;
    else {
      categories[1].riskValue += value;
      if (value > 0) {
        categories[1].riskCount++;
        receivables.push({
          id: transaction.id,
          label: transaction.description || "Recette hors facture",
          detail: "Écriture en attente",
          balance: value,
        });
      }
    }
  }
  receivables.sort((a, b) => b.balance - a.balance || a.id.localeCompare(b.id));
  return {
    categories: categories.filter(
      (category) => source === "all" || category.id === source
    ),
    receivables,
  };
}

/**
 * What is still to collect, all periods together: the figure « Reste à recouvrer » has always shown
 * (invoice balances net of credit notes, plus the manual entries still pending), with the invoices
 * behind it: how many are unpaid, and how many of those are past their due date. The amount is in
 * dinars; the counts are invoices only, a manual entry is not an invoice.
 */
/** An issued invoice with something left to collect, net of its credit notes: what « Créances » counts. */
export function isOpenInvoice(invoice: Pick<Invoice, "documentStatus" | "issuedAt" | "createdAt" | "grossAmount" | "creditAmount" | "balanceAmount">) {
  if (invoice.documentStatus !== "issued" || !(invoice.issuedAt ?? invoice.createdAt)) return false;
  const net = Math.max(0, invoice.grossAmount - invoice.creditAmount) / 100;
  return Math.min(net, Math.max(0, invoice.balanceAmount) / 100) > 0;
}

export function receivablesSummary(invoices: Invoice[], transactions: Transaction[]) {
  const overview = buildFinancialOverview(invoices, transactions, { from: "", to: "" }, "all");
  const total = overview.categories.reduce((sum, category) => sum + category.riskValue, 0);
  const open = invoices.filter(isOpenInvoice);
  return {
    total,
    unpaidInvoices: open.length,
    overdueInvoices: open.filter((invoice) => invoice.settlementStatus === "overdue").length,
    pendingEntries: overview.categories.find((category) => category.id === "manual")?.riskCount ?? 0,
  };
}

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * How what is still to collect moved over time: the amount owed at the end of each of `ends`, in
 * dinars, read back from today's figure so the last point is exactly what `receivablesSummary` says.
 * Going back in time, an invoice issued after a date was not owed yet, and a payment received after
 * it was still outstanding; a manual entry is owed from its date. Days are compared by calendar day.
 */
export function receivablesTrend(invoices: Invoice[], transactions: Transaction[], ends: Date[]): number[] {
  const issued = invoices.filter((invoice) => invoice.documentStatus === "issued" && (invoice.issuedAt ?? invoice.createdAt));
  const migrated = new Set(issued.map((invoice) => invoice.legacySourceTransactionId).filter(Boolean));
  const open = issued.map((invoice) => {
    const net = Math.max(0, invoice.grossAmount - invoice.creditAmount) / 100;
    const balance = Math.min(net, Math.max(0, invoice.balanceAmount) / 100);
    const payments = transactions
      .filter((row) => row.type === "income" && row.status === "paid" && row.sourceType === "billing_payment" && row.referenceId === invoice.id)
      .map((row) => ({ day: row.date.slice(0, 10), amount: Math.max(0, row.amount) / 100 }));
    return { day: (invoice.issuedAt ?? invoice.createdAt).slice(0, 10), net, balance, payments };
  });
  const entries = transactions
    .filter((row) => row.type === "income" && !row.sourceType && !migrated.has(row.id) && row.status !== "paid" && row.amount > 0)
    .map((row) => ({ day: row.date.slice(0, 10), amount: row.amount / 100 }));
  return ends.map((end) => {
    const at = localDay(end);
    let owed = 0;
    for (const invoice of open) {
      if (invoice.day > at) continue;
      // Paid after that day: still outstanding then. Never more than the invoice's net.
      const later = invoice.payments.filter((payment) => payment.day > at).reduce((sum, payment) => sum + payment.amount, 0);
      owed += Math.min(invoice.net, invoice.balance + later);
    }
    for (const entry of entries) if (entry.day <= at) owed += entry.amount;
    return Math.round(owed * 100) / 100;
  });
}

/**
 * Share of the invoiced amount already settled, over every issued invoice:
 * net of credit notes, against what remains to collect (the same net and
 * balance as "Reste à recouvrer"). Null without any invoiced amount; never
 * 100 % while a balance remains.
 */
export function settlementRate(invoices: Invoice[]): number | null {
  const [category] = buildFinancialOverview(invoices, [], { from: "", to: "" }, "invoices").categories;
  if (!category || category.totalValue <= 0) return null;
  const rate = Math.round((category.safeValue / category.totalValue) * 1000) / 10;
  return category.riskValue > 0 ? Math.min(rate, 99.9) : rate;
}

/** Never show a full goal meter while any balance remains outstanding. */
export function collectionProgress(total: number, collected: number, segments = 40) {
  if (total <= 0) return { percentage: null, filledSegments: 0 };
  const fraction = Math.max(0, Math.min(1, collected / total));
  const incomplete = collected < total;
  return {
    percentage: Math.min(incomplete ? 99 : 100, Math.round(fraction * 100)),
    filledSegments: incomplete ? Math.min(segments - 1, Math.floor(fraction * segments)) : segments,
  };
}
