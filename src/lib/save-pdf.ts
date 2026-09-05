import { isTauriRuntime } from "@/services/browser-store";

interface PdfDocument {
  output(type: "arraybuffer"): ArrayBuffer;
  save(filename: string): unknown;
}

/** WebKit desktop does not support browser-style PDF downloads reliably. */
export async function savePdf(
  doc: PdfDocument,
  filename: string
): Promise<boolean> {
  if (!isTauriRuntime()) {
    doc.save(filename);
    return true;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({
    title: "Enregistrer la facture PDF",
    defaultPath: filename,
    filters: [{ name: "Document PDF", extensions: ["pdf"] }],
  });
  if (!path) return false;
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(path, new Uint8Array(doc.output("arraybuffer")));
  return true;
}
