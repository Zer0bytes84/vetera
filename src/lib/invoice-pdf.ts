import { jsPDF } from "jspdf";
import { INVOICE_ACCENTS, type InvoiceSettings } from "@/services/invoiceSettingsService";
import { savePdf } from "./save-pdf";

/** All monetary fields use integer centimes, never display-unit amounts. */
export interface InvoicePdfData {
  number: string;
  date: Date;
  patientName: string;
  ownerName: string;
  ownerAddress?: string;
  items: { description: string; amount: number }[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  creditAmount?: number;
  refundAmount?: number;
}

export function invoiceMoney(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Montant de facture invalide.");
  return `${(amount / 100).toLocaleString("fr-FR", { minimumFractionDigits: amount % 100 ? 2 : 0, maximumFractionDigits: 2 }).replace(/[\u00a0\u202f]/g, " ")} DA`;
}

export function buildInvoicePdf(data: InvoicePdfData, settings: InvoiceSettings): jsPDF {
  [data.totalAmount, data.paidAmount, data.balanceAmount, data.creditAmount ?? 0, data.refundAmount ?? 0, ...data.items.map((item) => item.amount)].forEach(invoiceMoney);
  if (data.items.reduce((sum, item) => sum + item.amount, 0) !== data.totalAmount || data.balanceAmount !== Math.max(0, data.totalAmount - (data.creditAmount ?? 0) - data.paidAmount + (data.refundAmount ?? 0))) {
    throw new Error("Les montants de la facture ne sont pas cohérents.");
  }
  if (!Number.isFinite(data.date.getTime())) throw new Error("Date de facture invalide.");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `Facture ${data.number}`, author: settings.name, subject: "Facture vétérinaire" });
  const accent = INVOICE_ACCENTS[settings.accent].color;
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const footer: string[] = doc.splitTextToSize(settings.footer, 148);
  if (footer.length > 12) throw new Error("Le pied de page est trop long. Limitez-le à 12 lignes.");
  const footerTop = Math.min(271, 288 - footer.length * 3.5);
  const left = 18, right = 192, bottom = footerTop - 8;
  let y = 0;
  const text = (value: string, x: number, at: number, size = 10, bold = false, color = "#27272a", align: "left" | "right" = "left") => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(color);
    doc.text(value.replace(/[\u00a0\u202f]/g, " "), x, at, { align });
  };
  const header = (continued = false) => {
    let nameX = left;
    if (settings.logoDataUrl) {
      const image = doc.getImageProperties(settings.logoDataUrl);
      const ratio = Math.min(24 / image.width, 20 / image.height);
      doc.addImage(settings.logoDataUrl, left, 17, image.width * ratio, image.height * ratio);
      nameX += 29;
    }
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(settings.name, 105 - (nameX - left));
    nameLines.forEach((line: string, index: number) => text(line, nameX, 23 + index * 6, 15, true, accent));
    let infoY = 23 + nameLines.length * 6;
    const identity = [settings.address, [settings.phone, settings.email].filter(Boolean).join(" · "), settings.registrationNumber].filter(Boolean);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    identity.forEach((value) => {
      const lines: string[] = doc.splitTextToSize(value, 105 - (nameX - left));
      lines.forEach((line) => { text(line, nameX, infoY, 9, false, "#52525b"); infoY += 4.5; });
    });
    text("FACTURE", right, 23, 18, true, accent, "right");
    doc.setFontSize(9);
    const numberLines: string[] = doc.splitTextToSize(data.number, 55);
    numberLines.forEach((line, index) => text(line, right, 30 + index * 4, 9, false, "#52525b", "right"));
    text(data.date.toLocaleDateString("fr-FR"), right, 34 + numberLines.length * 4, 9, false, "#52525b", "right");
    if (continued) text("Suite", right, 40 + numberLines.length * 4, 9, false, "#52525b", "right");
    y = Math.max(50, infoY + 5, 47 + numberLines.length * 4);
    doc.setDrawColor("#d4d4d8"); doc.line(left, y, right, y); y += 9;
  };
  const tableHeader = () => {
    doc.setFillColor("#f4f4f5"); doc.rect(left, y - 5, right - left, 10, "F");
    text("PRESTATION", left + 4, y + 1, 9, true, "#52525b"); text("MONTANT", right - 4, y + 1, 9, true, "#52525b", "right"); y += 13;
  };
  const nextPage = (table = false) => { doc.addPage(); header(true); if (table) tableHeader(); };
  const ensure = (height: number, table = false) => { if (y + height > bottom) nextPage(table); };
  header();
  text("FACTURÉ À", left, y, 8, true, "#71717a"); y += 6;
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  const ownerLines: string[] = doc.splitTextToSize(data.ownerName || "Propriétaire", 170);
  ownerLines.forEach((line) => { ensure(6); text(line, left, y, 11, true); y += 6; });
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  const clientLines: string[] = doc.splitTextToSize([data.ownerAddress, `Patient : ${data.patientName}`].filter(Boolean).join("\n"), 170);
  clientLines.forEach((line) => { ensure(5); text(line, left, y, 9, false, "#52525b"); y += 5; });
  y += 10; ensure(20); tableHeader();
  data.items.forEach((item) => {
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const lines: string[] = doc.splitTextToSize(item.description || "Prestation", 125);
    ensure(Math.min(lines.length * 5 + 8, 160), true);
    lines.forEach((line, index) => {
      ensure(6, true); text(line, left + 4, y, 10);
      if (index === 0) text(invoiceMoney(item.amount), right - 4, y, 10, false, "#27272a", "right");
      y += 5;
    });
    y += 5; doc.setDrawColor("#e4e4e7"); doc.line(left, y - 2, right, y - 2); y += 3;
  });
  y += 8; ensure(72);
  text("Total de la facture", 110, y, 11, true); text(invoiceMoney(data.totalAmount), right, y, 13, true, accent, "right"); y += 10;
  if (data.creditAmount) { text("Avoirs émis", 110, y, 10, false, "#52525b"); text(invoiceMoney(data.creditAmount), right, y, 10, false, "#52525b", "right"); y += 8; }
  text("Montant réglé", 110, y, 10, false, "#52525b"); text(invoiceMoney(data.paidAmount), right, y, 10, false, "#52525b", "right"); y += 10;
  if (data.refundAmount) { text("Remboursé", 110, y, 10, false, "#52525b"); text(invoiceMoney(data.refundAmount), right, y, 10, false, "#52525b", "right"); y += 8; }
  doc.setDrawColor("#d4d4d8"); doc.line(110, y - 5, right, y - 5);
  text("Reste à payer", 110, y, 11, true); text(invoiceMoney(data.balanceAmount), right, y, 13, true, accent, "right"); y += 9;
  text(data.balanceAmount === 0 ? "Facture réglée" : data.paidAmount > 0 ? "Règlement partiel" : "En attente de règlement", right, y, 9, false, "#52525b", "right");
  const refundable = Math.max(0, data.paidAmount - (data.refundAmount ?? 0) + (data.creditAmount ?? 0) - data.totalAmount);
  if (refundable) { y += 7; text(`À rembourser : ${invoiceMoney(refundable)}`, right, y, 9, true, accent, "right"); }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor("#e4e4e7"); doc.line(left, footerTop, right, footerTop);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    footer.forEach((line, i) => text(line, left, footerTop + 6 + i * 3.5, 8, false, "#71717a"));
    text(`${page} / ${pages}`, right, footerTop + 6, 8, false, "#71717a", "right");
  }
  return doc;
}

export async function exportInvoicePdf(data: InvoicePdfData, settings: InvoiceSettings) {
  const safeNumber = data.number.replace(/[^\p{L}\p{N}_-]/gu, "_");
  return savePdf(buildInvoicePdf(data, settings), `Facture-${safeNumber}.pdf`);
}
