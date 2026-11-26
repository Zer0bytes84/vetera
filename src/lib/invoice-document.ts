import {
  DEFAULT_INVOICE_SETTINGS,
  normalizeInvoiceSettings,
} from "@/services/invoiceSettingsService";
import type { InvoiceDetail, TransactionPaymentMethod } from "@/types/db";
import { type InvoicePdfData, invoiceFileKey } from "./invoice-pdf";
import { ISO_DATE } from "./patterns";

/** The words of the invoice's detail in Finances, for each payment method. */
export const INVOICE_PAYMENT_METHOD_LABELS: Record<
  TransactionPaymentMethod,
  string
> = {
  cash: "Espèces",
  card: "Carte",
  bank_transfer: "Virement",
  check: "Chèque",
  other: "Autre",
};

/** A day alone (YYYY-MM-DD) is that local day; a timestamp is read as such. */
function paymentDate(value: string): Date {
  if (ISO_DATE.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

/** Re-exports use the identity frozen at issue time, not today's settings. */
export function invoiceDocument(invoice: InvoiceDetail, patientName: string) {
  if (invoice.documentStatus !== "issued") {
    throw new Error("Seules les factures émises peuvent être exportées.");
  }
  const owner = invoice.ownerSnapshot;
  const data: InvoicePdfData = {
    number: invoice.number || invoice.id,
    date: new Date(invoice.issuedAt || invoice.createdAt),
    patientName,
    ownerName: owner
      ? `${owner.firstName} ${owner.lastName}`.trim()
      : "Propriétaire",
    ownerAddress: owner?.address || undefined,
    items: invoice.lines.map((line) => ({
      description: [
        line.description,
        `${line.quantityMilli / 1000} × ${(line.unitAmount / 100).toLocaleString("fr-FR")} DA`,
        line.discountBps ? `Remise ${line.discountBps / 100} %` : "",
        line.taxBps ? `Taxe ${line.taxBps / 100} %` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      amount: line.grossAmount,
    })),
    totalAmount: invoice.grossAmount,
    paidAmount: invoice.completedPaymentAmount,
    // Cancelled payments are left out, as they are of the amount paid.
    payments: invoice.payments
      .filter((payment) => payment.status === "completed")
      .map((payment) => ({
        amount: payment.amount,
        date: paymentDate(payment.paidAt),
        method: INVOICE_PAYMENT_METHOD_LABELS[payment.method] ?? "Autre",
      })),
    balanceAmount: invoice.balanceAmount,
    creditAmount: invoice.creditAmount,
    refundAmount: invoice.completedRefundAmount,
    fileKey: invoiceFileKey(invoice.id, invoice.issuedAt || invoice.createdAt),
  };
  const settings = normalizeInvoiceSettings({
    ...DEFAULT_INVOICE_SETTINGS,
    ...invoice.clinicSnapshot,
    name: invoice.clinicSnapshot?.name || "Cabinet vétérinaire",
    address: invoice.clinicSnapshot?.address || "",
    phone: invoice.clinicSnapshot?.phone || "",
    email: invoice.clinicSnapshot?.email || "",
    registrationNumber: invoice.clinicSnapshot?.registrationNumber || "",
    logoDataUrl: invoice.clinicSnapshot?.logoDataUrl || "",
    footer: invoice.clinicSnapshot?.footer ?? DEFAULT_INVOICE_SETTINGS.footer,
  });
  return { data, settings };
}
