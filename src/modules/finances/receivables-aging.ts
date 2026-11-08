import { isOpenInvoice } from "@/modules/dashboard/v2/financial-model";
import type { Invoice, Transaction } from "@/types/db";

/**
 * How old what is still to collect is. A read of the same records « Créances » already counts (open issued invoices, net of
 * credit notes, and the manual income entries still pending); nothing here changes those figures, it only sorts them by age.
 * Age is counted from the day the invoice was issued (the entry's date for a manual entry). Amounts are dinars.
 */
export const AGING_BUCKETS = [
  { id: "recent", label: "Moins de 30 jours", from: 0, to: 30 },
  { id: "month", label: "30 à 60 jours", from: 30, to: 60 },
  { id: "quarter", label: "60 à 90 jours", from: 60, to: 90 },
  { id: "old", label: "Plus de 90 jours", from: 90, to: Infinity },
] as const;

export type AgingBucket = {
  id: (typeof AGING_BUCKETS)[number]["id"];
  label: string;
  /** Dinars still to collect in this age band. */
  amount: number;
  /** Open invoices and pending entries in it. */
  count: number;
};

const DAY = 86_400_000;

function bucketOf(ageDays: number) {
  return AGING_BUCKETS.find((bucket) => ageDays >= bucket.from && ageDays < bucket.to) ?? AGING_BUCKETS[AGING_BUCKETS.length - 1];
}

export function receivablesAging(invoices: Invoice[], transactions: Transaction[], now: Date): AgingBucket[] {
  const rows: AgingBucket[] = AGING_BUCKETS.map(({ id, label }) => ({ id, label, amount: 0, count: 0 }));
  const place = (since: string, amount: number) => {
    const issued = new Date(since).getTime();
    if (!Number.isFinite(issued) || amount <= 0) return;
    const bucket = bucketOf(Math.max(0, Math.floor((now.getTime() - issued) / DAY)));
    const row = rows.find((candidate) => candidate.id === bucket.id)!;
    row.amount += amount;
    row.count += 1;
  };
  for (const invoice of invoices) {
    if (!isOpenInvoice(invoice)) continue;
    const net = Math.max(0, invoice.grossAmount - invoice.creditAmount) / 100;
    place((invoice.issuedAt ?? invoice.createdAt)!, Math.min(net, Math.max(0, invoice.balanceAmount) / 100));
  }
  // The manual entries still pending, as « Créances » counts them: income not tied to an invoice, not yet paid.
  const migrated = new Set(
    invoices.filter((invoice) => invoice.documentStatus === "issued").map((invoice) => invoice.legacySourceTransactionId).filter(Boolean),
  );
  for (const entry of transactions) {
    if (entry.type !== "income" || entry.sourceType || migrated.has(entry.id) || entry.status === "paid") continue;
    place(entry.date, Math.max(0, entry.amount) / 100);
  }
  return rows;
}
