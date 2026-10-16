import { jsPDF } from "jspdf";
import { savePdf } from "@/lib/save-pdf";

export async function exportClinicalDocument(
  title: string,
  text: string
): Promise<boolean> {
  const doc = new jsPDF();
  doc.setProperties({ title });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(28, 28, 28);
  const lines: string[] = doc.splitTextToSize(text, 174);
  let y = 22;
  for (const line of lines) {
    if (y > 271) {
      doc.addPage();
      y = 22;
    }
    doc.text(line, 18, y);
    y += 5.6;
  }
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Baitari · Document relu et validé", 18, 287);
    doc.text(`${page} / ${count}`, 192, 287, { align: "right" });
  }
  const filename =
    title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 90) || "Document";
  return savePdf(doc, filename + ".pdf");
}
