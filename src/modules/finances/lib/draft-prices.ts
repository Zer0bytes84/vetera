import type { BillingLineInput, InvoiceDetail, InvoiceLine } from "@/types/db";

type PriceInvoice = Pick<InvoiceDetail, "documentStatus"> & {
  lines: readonly Pick<InvoiceLine, "id" | "description" | "productId" | "quantityMilli" | "unitAmount" | "discountBps" | "taxBps">[];
};

export function priceInput(amount: number): string {
  return `${Math.floor(amount / 100)},${String(amount % 100).padStart(2, "0")}`;
}

/** Prices only: preserve quantities, discounts, taxes and product provenance. */
export function draftPriceLines(invoice: PriceInvoice, values: Record<string, string>): BillingLineInput[] {
  if (invoice.documentStatus !== "draft") throw new Error("Seul un brouillon peut être modifié.");
  return invoice.lines.map((line) => {
    const value = (values[line.id] ?? "").trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
      throw new Error("Indiquez un prix positif ou nul, avec deux décimales maximum.");
    }
    const [whole, fraction = ""] = value.split(/[.,]/);
    const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Ce prix dépasse le montant autorisé.");
    return {
      id: line.id,
      description: line.description,
      productId: line.productId,
      quantityMilli: line.quantityMilli,
      unitAmount: Number(amount),
      discountBps: line.discountBps,
      taxBps: line.taxBps,
    };
  });
}
