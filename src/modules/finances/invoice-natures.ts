import type { IssuedInvoiceLine } from "@/services/billingService";

export type InvoiceNature = "consultations" | "chirurgie" | "produits" | "hospitalisation";

export const INVOICE_NATURES: { key: InvoiceNature; label: string }[] = [
  { key: "consultations", label: "Consultations" },
  { key: "chirurgie", label: "Chirurgie" },
  { key: "produits", label: "Produits" },
  { key: "hospitalisation", label: "Hospitalisation" },
];

type Range = { from: Date; to: Date };

export interface NatureRow {
  key: InvoiceNature;
  label: string;
  /** Invoiced over the current period, in centimes. */
  value: number;
  previous: number;
  /** Percentage change; null when the previous period had nothing to compare. */
  change: number | null;
}

/**
 * What an invoiced line is, from facts the invoice carries: a stay invoice is
 * hospitalisation, a line tied to a catalogue product is a product, the acts
 * of a surgery appointment are surgery, every other act is a consultation
 * (consultations, vaccinations, check-ups and emergencies).
 */
export function lineNature(line: Pick<IssuedInvoiceLine, "invoiceId" | "productId" | "appointmentType">): InvoiceNature {
  if (line.invoiceId.startsWith("stay-invoice:")) return "hospitalisation";
  if (line.productId) return "produits";
  if (line.appointmentType === "Chirurgie") return "chirurgie";
  return "consultations";
}

/** SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC; ISO strings pass through. */
function issuedDate(value: string) {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

function within(value: string, range: Range) {
  const date = issuedDate(value);
  return date >= range.from && date <= range.to;
}

/** Invoiced amount per nature over the current period, against the previous one. */
export function invoicedByNature(lines: IssuedInvoiceLine[], ranges: { current: Range; previous: Range }): NatureRow[] {
  return INVOICE_NATURES.map(({ key, label }) => {
    const sum = (range: Range) => lines
      .filter((line) => lineNature(line) === key && within(line.issuedAt, range))
      .reduce((total, line) => total + line.amount, 0);
    const value = sum(ranges.current);
    const previous = sum(ranges.previous);
    const change = previous === 0 ? (value === 0 ? 0 : null) : ((value - previous) / previous) * 100;
    return { key, label, value, previous, change };
  });
}
