import { jsPDF } from "jspdf";
import regularFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf?url";
import boldFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf?url";
import { savePdf } from "@/lib/save-pdf";
import type { InvoiceSettings } from "@/services/invoiceSettingsService";
import { documentLocalDay, DOCUMENT_TYPES, type PatientDocument } from "../document-domain";

let fonts: Promise<[string, string]> | undefined;
function base64(bytes: Uint8Array): string {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    value += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(value);
}
export function pdfBytes(dataUrl: string): Uint8Array {
  if (!/^data:application\/pdf(?:;[^,]*)?;base64,/.test(dataUrl))
    throw new Error("Le fichier PDF enregistré est illisible.");
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function installFonts(doc: jsPDF) {
  fonts ??= Promise.all([regularFontUrl, boldFontUrl].map(async (url) => {
    // These font files are bundled with the app, never fetched from a CDN.
    const response = await fetch(url);
    if (!response.ok) throw new Error("La police locale du document n’a pas pu être chargée.");
    return base64(new Uint8Array(await response.arrayBuffer()));
  })) as Promise<[string, string]>;
  try {
    const [regular, bold] = await fonts;
    doc.addFileToVFS("BaitariDocument-Regular.ttf", regular);
    doc.addFileToVFS("BaitariDocument-Bold.ttf", bold);
    doc.addFont("BaitariDocument-Regular.ttf", "BaitariDocument", "normal");
    doc.addFont("BaitariDocument-Bold.ttf", "BaitariDocument", "bold");
  } catch (error) { fonts = undefined; throw error; }
}

export interface DocumentPdfContent {
  title: string; content: string; clinic: InvoiceSettings;
  /** « ID-0011 », printed at the top of every page. */
  patientReference?: string;
}

/** One PDF is used for the preview, the final snapshot, export and printing. */
export async function buildManagedDocumentPdf(source: DocumentPdfContent): Promise<jsPDF> {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  await installFonts(doc);
  doc.setProperties({ title: source.title, author: source.clinic.name, subject: "Document clinique" });
  const left = 20, right = 190, width = right - left;
  const normal = (size: number, bold = false, color = "#292929") => {
    doc.setFont("BaitariDocument", bold ? "bold" : "normal");
    doc.setFontSize(size); doc.setTextColor(color);
  };
  normal(8);
  const footer: string[] = doc.splitTextToSize(source.clinic.footer || "", width - 20);
  const footerTop = 283 - Math.max(1, footer.length) * 3.8;
  const bottom = footerTop - 9;
  let y = 0;
  const header = (continuation = false) => {
    let x = left;
    if (source.clinic.logoDataUrl) {
      const image = doc.getImageProperties(source.clinic.logoDataUrl);
      const ratio = Math.min(22 / image.width, 22 / image.height);
      doc.addImage(source.clinic.logoDataUrl, left, 18, image.width * ratio, image.height * ratio);
      x += 28;
    }
    normal(15, true);
    const names: string[] = doc.splitTextToSize(source.clinic.name || "[à compléter]", width - (x - left));
    let infoY = 24;
    names.forEach((line) => { doc.text(line, x, infoY); infoY += 6; });
    normal(9, false, "#5d5d5d");
    const identity = [source.clinic.address,
      [source.clinic.phone, source.clinic.email].filter(Boolean).join(" · "),
      source.clinic.registrationNumber].filter(Boolean);
    identity.forEach((value) => {
      const lines: string[] = doc.splitTextToSize(value, width - (x - left));
      lines.forEach((line) => { doc.text(line, x, infoY); infoY += 4.5; });
    });
    y = Math.max(49, infoY + 4);
    if (source.patientReference) {
      normal(9, true, "#292929");
      doc.text(`Réf. patient ${source.patientReference}`, right, y - 3, { align: "right" });
    }
    doc.setDrawColor("#d4d4d4"); doc.setLineWidth(0.2); doc.line(left, y, right, y);
    y += 10;
    if (!continuation) {
      normal(16, true);
      const titles: string[] = doc.splitTextToSize(source.title, width);
      titles.forEach((line) => { doc.text(line, left, y); y += 7; });
      y += 4;
    } else { normal(9, false, "#7f7f7f"); doc.text("Suite du document", left, y); y += 8; }
  };
  header();
  normal(10.5);
  const lines: string[] = doc.splitTextToSize(source.content.replace(/\r\n/g, "\n"), width);
  for (const line of lines) {
    if (y + 5.5 > bottom) { doc.addPage(); header(true); normal(10.5); }
    if (doc.getNumberOfPages() > 60) throw new Error("Le document dépasse 60 pages. Réduisez son contenu.");
    doc.text(line, left, y); y += 5.5;
  }
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page); doc.setDrawColor("#dedede"); doc.line(left, footerTop, right, footerTop);
    normal(8, false, "#5d5d5d");
    footer.forEach((line, index) => doc.text(line, left, footerTop + 6 + index * 3.8));
    doc.text(`${page} / ${count}`, right, footerTop + 6, { align: "right" });
  }
  return doc;
}

export function documentPdfFilename(document: Pick<PatientDocument, "kind" | "patientName" | "createdAt">): string {
  const type = document.kind === "import" ? "Document" : DOCUMENT_TYPES[document.kind];
  const clean = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 70);
  return `${clean(type)}_${clean(document.patientName) || "Patient"}_${documentLocalDay(document.createdAt) || "date_inconnue"}.pdf`;
}

export async function patientDocumentPdf(document: PatientDocument): Promise<string> {
  if (document.pdfDataUrl) return document.pdfDataUrl;
  if (document.attachment?.mimeType === "application/pdf") return document.attachment.dataUrl;
  if (document.attachment) {
    const pdf = new jsPDF({ format: "a4", unit: "mm" });
    const image = pdf.getImageProperties(document.attachment.dataUrl);
    const ratio = Math.min(190 / image.width, 277 / image.height);
    const width = image.width * ratio, height = image.height * ratio;
    pdf.addImage(document.attachment.dataUrl, (210 - width) / 2, 10, width, height);
    pdf.setProperties({ title: document.title });
    return pdf.output("datauristring");
  }
  return (await buildManagedDocumentPdf({ ...document, patientReference: document.values["patient.reference"] || undefined })).output("datauristring");
}

export async function exportManagedDocument(document: PatientDocument): Promise<boolean> {
  if (document.status !== "finalise")
    throw new Error("Finalisez le document avant de l’exporter.");
  const data = pdfBytes(await patientDocumentPdf(document));
  return savePdf({
    output: () => data.buffer as ArrayBuffer,
    save: (name) => {
      const url = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: "application/pdf" }));
      const link = window.document.createElement("a"); link.href = url; link.download = name;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    },
  }, documentPdfFilename(document));
}

export async function renderPdfPages(dataUrl: string, signal?: AbortSignal): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const root = new URL(import.meta.env.BASE_URL + "local-ai-runtime/pdf/", window.location.href).href;
  const loading = pdfjs.getDocument({ data: pdfBytes(dataUrl), useSystemFonts: false,
    cMapUrl: root + "cmaps/", cMapPacked: true, standardFontDataUrl: root + "standard_fonts/",
    wasmUrl: root + "wasm/", disableAutoFetch: true, disableStream: true });
  const cancel = () => { void loading.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await loading.promise;
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      if (signal?.aborted) throw new DOMException("Lecture annulée", "AbortError");
      const page = await pdf.getPage(index), original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(1.5, Math.sqrt(12_000_000 / (original.width * original.height))) });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      try { await page.render({ canvas, viewport }).promise; pages.push(canvas.toDataURL("image/png")); }
      finally { canvas.width = 0; canvas.height = 0; page.cleanup(); }
    }
    return pages;
  } finally { signal?.removeEventListener("abort", cancel); await loading.destroy(); }
}

export async function printManagedDocument(document: PatientDocument): Promise<void> {
  if (document.status !== "finalise")
    throw new Error("Seul un document finalisé peut être imprimé.");
  const pages = await renderPdfPages(await patientDocumentPdf(document));
  const frame = window.document.createElement("iframe");
  frame.title = "Impression du document";
  frame.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
  window.document.body.appendChild(frame);
  const target = frame.contentDocument;
  if (!target || !frame.contentWindow) { frame.remove(); throw new Error("L’impression n’a pas pu être ouverte."); }
  target.open();
  target.write("<!doctype html><html lang='fr'><head><title>Document clinique</title><style>@page{size:A4;margin:0}body{margin:0}img{display:block;width:210mm;height:297mm;break-after:page}img:last-child{break-after:auto}</style></head><body></body></html>");
  target.close();
  await Promise.all(pages.map((source) => new Promise<void>((resolve, reject) => {
    const image = target.createElement("img"); image.alt = "Page du document";
    image.onload = () => resolve(); image.onerror = () => reject(new Error("La page n’a pas pu être préparée."));
    image.src = source; target.body.appendChild(image);
  })));
  frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
  frame.contentWindow.focus(); frame.contentWindow.print();
  setTimeout(() => frame.remove(), 300000);
}
