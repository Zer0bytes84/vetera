import type { InvoiceDetail } from "@/types/db";
import { DEFAULT_INVOICE_SETTINGS, normalizeInvoiceSettings } from "@/services/invoiceSettingsService";
import type { InvoicePdfData } from "./invoice-pdf";

/** Re-exports use the identity frozen at issue time, not today's settings. */
export function invoiceDocument(invoice: InvoiceDetail, patientName: string) {
  if (invoice.documentStatus !== "issued") throw new Error("Seules les factures émises peuvent être exportées.");
  const owner = invoice.ownerSnapshot;
  const data: InvoicePdfData = {
    number: invoice.number || invoice.id,
    date: new Date(invoice.issuedAt || invoice.createdAt),
    patientName,
    ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Propriétaire",
    ownerAddress: owner?.address || undefined,
    items: invoice.lines.map((line) => ({
      description: [line.description, `${line.quantityMilli / 1000} × ${(line.unitAmount / 100).toLocaleString("fr-FR")} DA`, line.discountBps ? `Remise ${line.discountBps / 100} %` : "", line.taxBps ? `Taxe ${line.taxBps / 100} %` : ""].filter(Boolean).join(" · "),
      amount: line.grossAmount,
    })),
    totalAmount: invoice.grossAmount,
    paidAmount: invoice.completedPaymentAmount,
    balanceAmount: invoice.balanceAmount,
    creditAmount: invoice.creditAmount,
    refundAmount: invoice.completedRefundAmount,
  };
  const settings = normalizeInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS, ...invoice.clinicSnapshot, name: invoice.clinicSnapshot?.name || "Cabinet vétérinaire", address: invoice.clinicSnapshot?.address || "", phone: invoice.clinicSnapshot?.phone || "", email: invoice.clinicSnapshot?.email || "", registrationNumber: invoice.clinicSnapshot?.registrationNumber || "", logoDataUrl: invoice.clinicSnapshot?.logoDataUrl || "", footer: invoice.clinicSnapshot?.footer ?? DEFAULT_INVOICE_SETTINGS.footer });
  return { data, settings };
}
