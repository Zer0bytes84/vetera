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
