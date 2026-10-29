// Duplicate invoice number reproduction: issues real invoices, one after the
// other, through the same service the billing screen uses, in the database of
// this instance. query = "<count>|<owner id>|<patient id>|<id prefix>": with an
// id prefix, invoice n gets the id "<prefix>-n", as a visit billed in two copies
// of one database would. Each result keeps the official number, the file name
// the PDF export offers, and that PDF, written next to the signal file.
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession } from "./capture-dictee";
import { createInvoiceDraft, getInvoice, issueInvoice } from "@/services/billingService";
import { invoiceDocument } from "@/lib/invoice-document";
import { buildInvoicePdf, invoicePdfFileName } from "@/lib/invoice-pdf";
import { isTestDataFolder } from "@/lib/test-data-folder";

export async function captureFactures(signal: string, query: string) {
  const [count, ownerId, patientId, idPrefix] = query.split("|");
  await ensureSession();
  const test = await isTestDataFolder();
  const issued: Record<string, unknown>[] = [];
  for (let i = 0; i < Number(count); i++) {
    const draft = await createInvoiceDraft({
      id: idPrefix ? `${idPrefix}-${i + 1}` : undefined,
      ownerId,
      patientId,
      lines: [{ description: `Reproduction ${i + 1}`, quantityMilli: 1000, unitAmount: 100_000 }],
    });
    const invoice = await issueInvoice({
      invoiceId: draft.id,
      idempotencyKey: `repro-${draft.id}`,
      clinicSnapshot: { name: "Reproduction" },
    });
    // The export path of Finances and of the billing screen.
    const { data, settings } = invoiceDocument((await getInvoice(invoice.id))!, "Mocha");
    const pdfName = invoicePdfFileName(data, { test });
    await writeFile(`${signal}.${pdfName}`, new Uint8Array(buildInvoicePdf(data, settings, { test }).output("arraybuffer")));
    issued.push({ id: invoice.id, number: invoice.number, issuedAt: invoice.issuedAt, testFolder: test, pdfName });
    await writeTextFile(`${signal}.results.json`, JSON.stringify(issued, null, 2));
  }
  await writeTextFile(signal, "restored");
}
