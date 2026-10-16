import { jsPDF } from "jspdf";
import { savePdf } from "@/lib/save-pdf";
import { formatDZD } from "@/utils/currency";
import { stockQuantityLabel } from "@/domain/stock";
import type { PurchaseOrder, PurchaseOrderLine, StockSupplier } from "./purchasing-store";

export async function exportPurchaseOrder(order: PurchaseOrder, supplier: StockSupplier, lines: PurchaseOrderLine[]) {
  const doc = new jsPDF();
  const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");
  let y = 20;
  const write = (value: string, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(plain(value), 174) as string[];
    for (const line of wrapped) {if (y > 276) {doc.addPage(); y = 20;} doc.text(line, 18, y); y += size * 0.45 + 2;}
  };
  write("Bon de commande", 20, true);
  write(order.reference, 12, true);
  const labels = {draft: "Brouillon", ordered: "Commandée", partial: "Partiellement reçue", received: "Reçue", cancelled: "Annulée"};
  write(`${labels[order.status]} · ${new Date(order.created_at).toLocaleDateString("fr-FR")}`);
  y += 5; write(supplier.name, 13, true);
  for (const value of [supplier.address, supplier.phone, supplier.email]) if (value) write(value);
  y += 8;
  for (const line of lines) {
    if (y > 248) {doc.addPage(); y = 20;}
    doc.setDrawColor(225); doc.line(18, y - 3, 192, y - 3);
    write(line.product_name, 11, true);
    write(`${stockQuantityLabel(line.quantity, line.unit)} × ${formatDZD(line.unit_cost_amount)} = ${formatDZD(Math.round(line.quantity * line.unit_cost_amount))}`);
    y += 4;
  }
  y += 3; write(`Total de la commande : ${formatDZD(order.total_amount)}`, 13, true);
  return savePdf(doc, `${order.reference.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`);
}
