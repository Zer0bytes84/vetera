import { jsPDF } from "jspdf";
import { degrees, PDFArray, PDFDict, PDFDocument, PDFName, type PDFPage } from "pdf-lib";
import regularFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf?url";
import boldFontUrl from "pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf?url";
import { openPatientRecordRasterSource } from "./patient-record-pdf-source";
import type {
  PatientRecordBlock, PatientRecordGenerationOptions, PatientRecordPdf,
  PatientRecordProgress, PatientRecordSection, PatientRecordSnapshot, PatientRecordSource,
} from "./patient-record-types";

const WIDTH = 210, HEIGHT = 297, LEFT = 18, RIGHT = 192, BODY_WIDTH = RIGHT - LEFT;
const POINTS_PER_MM = 72 / 25.4;
const FONT = "BaitariPatientRecord";
const INK = "#27272a", MUTED = "#63636b", RULE = "#dddddf";
const SECTION_ORDER = ["identity", "consultations", "documents", "reminders", "notes", "attachments"];
let fontPromise: Promise<[string, string]> | undefined;

function cancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(binary);
}

function localAsset(url: string): void {
  if (url.startsWith("//")) throw new Error("Une ressource distante est interdite dans cet export local.");
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    if (typeof window === "undefined" || new URL(url).origin !== window.location.origin)
      throw new Error("Une ressource distante est interdite dans cet export local.");
  }
}

async function fonts(): Promise<[string, string]> {
  fontPromise ??= Promise.all([regularFontUrl, boldFontUrl].map(async (url) => {
    localAsset(url);
    const response = await fetch(url);
    if (!response.ok) throw new Error("La police locale du dossier n’a pas pu être chargée.");
    return encodeBase64(new Uint8Array(await response.arrayBuffer()));
  })) as Promise<[string, string]>;
  try { return await fontPromise; }
  catch (error) { fontPromise = undefined; throw error; }
}

function document(fontData: [string, string]): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true, putOnlyUsedFonts: true });
  for (const [index, weight] of ["normal", "bold"].entries()) {
    const filename = `${FONT}-${weight}.ttf`;
    doc.addFileToVFS(filename, fontData[index]);
    doc.addFont(filename, FONT, weight);
  }
  return doc;
}

function style(doc: jsPDF, size = 10, bold = false, color = INK): void {
  doc.setFont(FONT, bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(color);
}

function lines(doc: jsPDF, text: string, width = BODY_WIDTH): string[] {
  return doc.splitTextToSize(String(text).replace(/\r\n?/g, "\n"), width) as string[];
}

function civilDate(value?: string): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || "";
}

function dataBytes(value: string, mimeType: string): Uint8Array {
  // No URL, object URL, file URL or external resource is dereferenced here.
  const match = value.match(/^data:([^;,]+)(?:;[a-z\d_-]+=[^;,\r\n]*)*;base64,([a-z\d+/]*={0,2})$/i);
  if (!match || match[1].toLowerCase() !== mimeType || !match[2] || match[2].length % 4 !== 0)
    throw new Error("Le contenu local du fichier est illisible ou non pris en charge.");
  const binary = atob(match[2]);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function hasContent(block: PatientRecordBlock): boolean {
  return block.kind === "source" || (block.kind === "text" ? Boolean(block.text.trim() || block.title?.trim() || block.meta?.trim()) : block.rows.length > 0);
}

interface Margins {
  top: number;
  bottom: number;
  headerBottom: number;
  footerTop: number;
  patient: string[];
  clinic: string[];
  legal: string[];
}

function measureMargins(doc: jsPDF, snapshot: PatientRecordSnapshot): Margins {
  style(doc, 9, true);
  const patient = lines(doc, snapshot.patientName, 105);
  style(doc, 8.5);
  const clinic = lines(doc, snapshot.clinic.name || "Baitari", 62);
  const headerBottom = Math.max(25, 16 + patient.length * 4.1, 12 + clinic.length * 4 + 7);
  style(doc, 7.5, false, MUTED);
  const legal = snapshot.clinic.footer.trim() ? lines(doc, snapshot.clinic.footer, BODY_WIDTH) : [];
  const footerTop = HEIGHT - 19 - (legal.length ? legal.length * 3.5 + 3 : 0);
  const result = { top: headerBottom + 9, bottom: footerTop - 8, headerBottom, footerTop, patient, clinic, legal };
  if (result.bottom - result.top < 80)
    throw new Error("L’identité du cabinet ou les mentions de pied de page sont trop longues pour une page A4.");
  return result;
}

class Progress {
  constructor(readonly options: PatientRecordGenerationOptions) {}

  async report(stage: PatientRecordProgress["stage"], pages: number, label: string, current = pages, total?: number) {
    cancelled(this.options.signal);
    this.options.onProgress?.({ stage, pages, label, current, total });
    // A Promise.resolve does not let a pending click/AbortSignal run. Use a real
    // event-loop turn on every page, including dossiers with more than 20 pages.
    await (this.options.yieldToMain?.() ?? new Promise<void>((resolve) => setTimeout(resolve, 0)));
    cancelled(this.options.signal);
  }
}

/** Measured, flowing jsPDF content. Source pages are inserted only after flush. */
class Layout {
  doc: jsPDF | undefined;
  y: number;
  sectionTitle = "";
  private pageHasContent = false;

  constructor(
    readonly output: PDFDocument,
    readonly fontData: [string, string],
    readonly margins: Margins,
    readonly progress: Progress,
  ) { this.y = margins.top; }

  get pages(): number { return this.output.getPageCount() + (this.doc?.getNumberOfPages() ?? 0); }

  private current(): jsPDF {
    return this.doc ??= document(this.fontData);
  }

  async page(continuation = false): Promise<void> {
    if (this.doc && this.pageHasContent) this.doc.addPage();
    this.current();
    this.y = this.margins.top;
    this.pageHasContent = false;
    if (this.sectionTitle) this.heading(continuation ? `${this.sectionTitle} (suite)` : this.sectionTitle);
    await this.progress.report("content", this.pages, `Mise en page du dossier, page ${this.pages}`);
  }

  heading(title: string): void {
    const doc = this.current();
    style(doc, 17, true);
    for (const line of lines(doc, title)) { doc.text(line, LEFT, this.y + 6); this.y += 7; }
    this.y += 2;
    doc.setDrawColor(RULE); doc.setLineWidth(0.22); doc.line(LEFT, this.y, RIGHT, this.y);
    this.y += 8;
    this.pageHasContent = true;
  }

  async space(height: number): Promise<void> {
    if (!this.doc) await this.page(Boolean(this.sectionTitle));
    if (this.y + height > this.margins.bottom) await this.page(true);
  }

  async paragraph(text: string, size = 10, bold = false, color = INK, gap = 4): Promise<void> {
    const doc = this.current();
    style(doc, size, bold, color);
    const wrapped = lines(doc, text);
    const step = size * 0.352778 * 1.35;
    for (const [index, line] of wrapped.entries()) {
      await this.space(step);
      style(doc, size, bold, color);
      doc.text(line, LEFT, this.y + step * 0.78);
      this.y += step;
      this.pageHasContent = true;
      if (index > 0 && index % 36 === 0)
        await this.progress.report("content", this.pages, `Mise en page du dossier, page ${this.pages}`);
    }
    this.y += gap;
  }

  async text(block: Extract<PatientRecordBlock, { kind: "text" }>): Promise<void> {
    await this.space(16);
    if (block.title) await this.paragraph(block.title, 11, true, INK, 2);
    if (block.meta) await this.paragraph(block.meta, 8.5, false, MUTED, 3);
    if (block.text.trim()) await this.paragraph(block.text, 10, false, INK, 7);
    else this.y += 4;
  }

  async table(block: Extract<PatientRecordBlock, { kind: "table" }>): Promise<void> {
    if (!block.columns.length || !block.rows.length) return;
    const doc = this.current();
    const weights = block.widths?.length === block.columns.length && block.widths.every((width) => Number.isFinite(width) && width > 0)
      ? block.widths : block.columns.map(() => 1);
    const total = weights.reduce((sum, value) => sum + value, 0);
    const widths = weights.map((value) => BODY_WIDTH * value / total);
    const padding = 2.2, lineHeight = 4.4;
    if (widths.some((width) => width <= padding * 2 + 1))
      throw new Error("Les colonnes du tableau sont trop étroites pour une page A4.");
    const wrapCells = (row: string[]) => row.map((cell, index) => lines(doc, cell, widths[index] - padding * 2));
    style(doc, 8.5, true);
    const headings = wrapCells(block.columns);
    const headingHeight = Math.max(...headings.map((cell) => cell.length)) * lineHeight + padding * 2;
    if (headingHeight + lineHeight + padding * 2 > this.margins.bottom - this.margins.top - 17)
      throw new Error("Les en-têtes du tableau sont trop longs pour une page A4.");
    const drawCells = (cells: string[][], height: number, bold: boolean, shaded: boolean) => {
      let x = LEFT;
      if (shaded) { doc.setFillColor(bold ? "#f0f0f1" : "#fafafa"); doc.rect(LEFT, this.y, BODY_WIDTH, height, "F"); }
      style(doc, bold ? 8.5 : 9, bold);
      cells.forEach((cell, index) => {
        cell.forEach((line, offset) => doc.text(line, x + padding, this.y + padding + lineHeight * 0.78 + offset * lineHeight));
        x += widths[index];
      });
      doc.setDrawColor(RULE); doc.setLineWidth(0.16); doc.line(LEFT, this.y + height, RIGHT, this.y + height);
      this.y += height;
      this.pageHasContent = true;
    };
    const header = async () => {
      await this.space(headingHeight + lineHeight + padding * 2);
      drawCells(headings, headingHeight, true, true);
    };
    await header();
    for (const [rowIndex, row] of block.rows.entries()) {
      style(doc, 9);
      const cells = wrapCells(block.columns.map((_, index) => String(row[index] ?? "")));
      const rowLines = Math.max(1, ...cells.map((cell) => cell.length));
      let offset = 0;
      while (offset < rowLines) {
        const remainingLines = rowLines - offset;
        let capacity = Math.floor((this.margins.bottom - this.y - padding * 2) / lineHeight);
        // Move intact rows to the next page when they fit there. A row taller
        // than a full page is split by complete text lines across every cell.
        const fullCapacity = Math.floor((this.margins.bottom - this.margins.top - 17 - headingHeight - padding * 2) / lineHeight);
        if (capacity < 1 || (offset === 0 && remainingLines > capacity && remainingLines <= fullCapacity)) {
          await this.page(true); await header();
          capacity = Math.floor((this.margins.bottom - this.y - padding * 2) / lineHeight);
        }
        const count = Math.min(remainingLines, capacity);
        if (count < 1) throw new Error("Le tableau ne peut pas être mis en page dans les marges du dossier.");
        drawCells(cells.map((cell) => cell.slice(offset, offset + count)), count * lineHeight + padding * 2, false, rowIndex % 2 === 0);
        offset += count;
        if (offset < rowLines) { await this.page(true); await header(); }
      }
      if (rowIndex > 0 && rowIndex % 20 === 0)
        await this.progress.report("content", this.pages, `Mise en page du tableau, page ${this.pages}`);
    }
    this.y += 7;
  }

  async flush(): Promise<void> {
    if (!this.doc) return;
    const pending = await PDFDocument.load(this.doc.output("arraybuffer"), { updateMetadata: false });
    const pages = await this.output.copyPages(pending, pending.getPageIndices());
    for (const page of pages) this.output.addPage(page);
    this.doc = undefined;
    this.pageHasContent = false;
    this.y = this.margins.top;
    cancelled(this.progress.options.signal);
  }
}

async function cover(layout: Layout, snapshot: PatientRecordSnapshot, sections: PatientRecordSection[]): Promise<void> {
  await layout.page();
  const doc = layout.doc!;
  layout.y += 9;
  let logoBottom = layout.y;
  if (snapshot.clinic.logoDataUrl) {
    const logoType = snapshot.clinic.logoDataUrl.match(/^data:(image\/(?:png|jpeg));base64,/i)?.[1]?.toLowerCase();
    if (!logoType) throw new Error("Le logo du cabinet doit être une image PNG ou JPEG locale.");
    dataBytes(snapshot.clinic.logoDataUrl, logoType);
    try {
      const image = doc.getImageProperties(snapshot.clinic.logoDataUrl);
      const ratio = Math.min(34 / image.width, 27 / image.height);
      doc.addImage(snapshot.clinic.logoDataUrl, RIGHT - image.width * ratio, layout.y, image.width * ratio, image.height * ratio);
      logoBottom += image.height * ratio + 6;
    } catch { throw new Error("Le logo local du cabinet est illisible."); }
  }
  await layout.paragraph("DOSSIER PATIENT", 9, true, MUTED, 12);
  layout.y = Math.max(layout.y, logoBottom);
  await layout.paragraph(snapshot.patientName, 30, true, INK, 5);
  const profile = [snapshot.cover.species, snapshot.cover.breed].filter(Boolean).join(" · ");
  if (profile) await layout.paragraph(profile, 12, false, MUTED, 4);
  if (snapshot.cover.ownerName) await layout.paragraph(`Propriétaire : ${snapshot.cover.ownerName}`, 11, false, INK, 12);
  layout.y += 4;
  await layout.paragraph(`Export du ${civilDate(snapshot.exportDay)}`, 10, true, INK, 3);
  await layout.paragraph(snapshot.options.period
    ? `Période : du ${civilDate(snapshot.options.period.from)} au ${civilDate(snapshot.options.period.to)} inclus`
    : "Période : tout l’historique", 10, false, MUTED, 12);
  await layout.paragraph(snapshot.clinic.name || "Baitari", 13, true, INK, 3);
  for (const item of [snapshot.clinic.address, [snapshot.clinic.phone, snapshot.clinic.email].filter(Boolean).join(" · "), snapshot.clinic.registrationNumber].filter(Boolean))
    await layout.paragraph(item, 9, false, MUTED, 2);
  layout.y += 10;
  await layout.paragraph("Contenu du dossier", 10, true, INK, 4);
  for (const [index, section] of sections.entries())
    await layout.paragraph(`${String(index + 1).padStart(2, "0")}   ${section.title}`, 9.5, false, MUTED, 2);
}

function sourceCaption(
  fontData: [string, string], margins: Margins, section: PatientRecordSection,
  source: PatientRecordSource, pageNumber: number, total: number,
): { bytes: ArrayBuffer; bottom: number } {
  const doc = document(fontData);
  let y = margins.top;
  style(doc, 8, true, MUTED);
  doc.text(section.title, LEFT, y + 3); y += 8;
  style(doc, 11, true);
  for (const line of lines(doc, source.title || source.fileName)) { doc.text(line, LEFT, y + 4); y += 5; }
  style(doc, 8, false, MUTED);
  const meta = [source.fileName, source.createdAt ? civilDate(source.createdAt) : "", `Pièce originale, page ${pageNumber} / ${total}`].filter(Boolean).join(" · ");
  for (const line of lines(doc, meta)) { doc.text(line, LEFT, y + 3); y += 3.8; }
  y += 5;
  if (margins.bottom - y < 30) throw new Error("Le titre ou le nom de la pièce est trop long pour une page A4.");
  return { bytes: doc.output("arraybuffer"), bottom: y };
}

function dimensions(width: number, height: number, top: number, bottom: number) {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0))
    throw new Error("Les dimensions de la page source sont illisibles.");
  const ratio = Math.min(BODY_WIDTH * POINTS_PER_MM / width, (bottom - top) * POINTS_PER_MM / height);
  const fittedWidth = width * ratio, fittedHeight = height * ratio;
  return {
    x: LEFT * POINTS_PER_MM + (BODY_WIDTH * POINTS_PER_MM - fittedWidth) / 2,
    y: (HEIGHT - bottom) * POINTS_PER_MM + ((bottom - top) * POINTS_PER_MM - fittedHeight) / 2,
    width: fittedWidth, height: fittedHeight, ratio,
  };
}

async function sourcePage(layout: Layout, section: PatientRecordSection, source: PatientRecordSource, number: number, total: number) {
  const caption = sourceCaption(layout.fontData, layout.margins, section, source, number, total);
  const page = layout.output.addPage([WIDTH * POINTS_PER_MM, HEIGHT * POINTS_PER_MM]);
  const [embedded] = await layout.output.embedPdf(caption.bytes);
  page.drawPage(embedded, { x: 0, y: 0 });
  return { page, top: caption.bottom };
}

function hasAnnotations(page: PDFPage): boolean {
  return (page.node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size() ?? 0) > 0;
}

async function appendSource(layout: Layout, section: PatientRecordSection, source: PatientRecordSource): Promise<void> {
  const signal = layout.progress.options.signal;
  try {
    cancelled(signal);
    const bytes = dataBytes(source.dataUrl, source.mimeType);
    if (source.mimeType !== "application/pdf") {
      const image = source.mimeType === "image/png" ? await layout.output.embedPng(bytes) : await layout.output.embedJpg(bytes);
      const { page, top } = await sourcePage(layout, section, source, 1, 1);
      page.drawImage(image, dimensions(image.width, image.height, top, layout.margins.bottom));
      await layout.progress.report("attachments", layout.pages, `${source.fileName}, page 1 / 1 (dossier : ${layout.pages} pages)`);
      return;
    }
    const original = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
    if (!original.getPageCount()) throw new Error("Le PDF ne contient aucune page.");
    const form = original.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (form?.has(PDFName.of("XFA"))) throw new Error("Les formulaires XFA ne sont pas pris en charge.");
    const hasForm = (form?.lookupMaybe(PDFName.of("Fields"), PDFArray)?.size() ?? 0) > 0;
    let raster: Awaited<ReturnType<typeof openPatientRecordRasterSource>> | undefined;
    try {
      const originals = original.getPages();
      const annotationCounts = originals.map((page) => page.node.lookupMaybe(PDFName.of("Annots"), PDFArray)?.size() ?? 0);
      let rasterBytes: Uint8Array | undefined;
      const vectorPages = originals.filter((page) => !hasForm && !hasAnnotations(page) && page.node.Contents());
      const embeddedPages = await layout.output.embedPages(vectorPages, vectorPages.map((page) => {
        const box = page.getMediaBox();
        return { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height };
      }));
      const vectors = new Map(vectorPages.map((page, index) => [page, embeddedPages[index]]));
      for (const [index, originalPage] of originals.entries()) {
        cancelled(signal);
        const { page, top } = await sourcePage(layout, section, source, index + 1, originals.length);
        if (hasForm || hasAnnotations(originalPage)) {
          if (!raster) {
            const expandsCrop = originals.some((sourcePage) => {
              const media = sourcePage.getMediaBox(), crop = sourcePage.getCropBox();
              return media.x !== crop.x || media.y !== crop.y || media.width !== crop.width || media.height !== crop.height;
            });
            if (expandsCrop) {
              // Keep the same whole-MediaBox policy as vector source pages.
              // This is an in-memory copy; the stored original never changes.
              originals.forEach((sourcePage) => {
                const box = sourcePage.getMediaBox();
                sourcePage.setCropBox(box.x, box.y, box.width, box.height);
              });
              rasterBytes = await original.save({ updateFieldAppearances: false, objectsPerTick: 20 });
            }
            raster = await openPatientRecordRasterSource(rasterBytes ?? bytes, signal, annotationCounts);
          }
          const rendered = await raster.render(index + 1);
          const image = await layout.output.embedPng(rendered.data);
          page.drawImage(image, dimensions(rendered.width, rendered.height, top, layout.margins.bottom));
        } else if (originalPage.node.Contents()) {
          // Give the embedder the actual source origin, including a nonzero
          // MediaBox. Its default origin would crop such pages incorrectly.
          const box = originalPage.getMediaBox();
          const embedded = vectors.get(originalPage)!;
          // Embedding is otherwise deferred until output.save(), where an
          // unsupported stream could no longer be attributed to its file.
          await embedded.embed();
          const angle = ((originalPage.getRotation().angle % 360) + 360) % 360;
          if (![0, 90, 180, 270].includes(angle)) throw new Error("La rotation de la page source n’est pas prise en charge.");
          const rotated = angle === 90 || angle === 270;
          const fitted = dimensions(rotated ? box.height : box.width, rotated ? box.width : box.height, top, layout.margins.bottom);
          const width = box.width * fitted.ratio, height = box.height * fitted.ratio;
          const x = fitted.x + (angle === 180 ? width : angle === 270 ? height : 0);
          const y = fitted.y + (angle === 90 ? width : angle === 180 ? height : 0);
          page.drawPage(embedded, { x, y, width, height, rotate: degrees(-angle) });
        }
        await layout.progress.report("attachments", layout.pages, `${source.fileName}, page ${index + 1} / ${originals.length} (dossier : ${layout.pages} pages)`);
      }
    } finally { await raster?.destroy(); }
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError"))
      throw new DOMException("Génération annulée", "AbortError");
    const message = error instanceof Error ? error.message : "";
    const detail = /encrypt|password/i.test(message) ? "Le PDF est protégé par un mot de passe."
      : /^(Le |La |Les |L’|Une |Les |L’apparence)/.test(message) ? message
      : "Le fichier est corrompu ou utilise un format non pris en charge.";
    throw new Error(`La pièce « ${source.fileName || source.title} » n’a pas pu être intégrée : ${detail}`, { cause: error });
  }
}

async function stamp(layout: Layout, snapshot: PatientRecordSnapshot): Promise<void> {
  const total = layout.output.getPageCount();
  // One overlay document shares its two embedded Unicode fonts across pages.
  const overlay = document(layout.fontData);
  for (let index = 0; index < total; index++) {
    if (index) overlay.addPage();
    const margins = layout.margins;
    style(overlay, 7.5, false, MUTED); overlay.text("DOSSIER PATIENT", LEFT, 11.5);
    style(overlay, 9, true);
    margins.patient.forEach((line, row) => overlay.text(line, LEFT, 17 + row * 4.1));
    style(overlay, 8.5, false, MUTED);
    margins.clinic.forEach((line, row) => overlay.text(line, RIGHT, 12 + row * 4, { align: "right" }));
    overlay.text(`Page ${index + 1} / ${total}`, RIGHT, 17 + margins.clinic.length * 4, { align: "right" });
    overlay.setDrawColor(RULE); overlay.setLineWidth(0.2); overlay.line(LEFT, margins.headerBottom, RIGHT, margins.headerBottom);
    overlay.line(LEFT, margins.footerTop, RIGHT, margins.footerTop);
    style(overlay, 7.5, false, MUTED);
    margins.legal.forEach((line, row) => overlay.text(line, LEFT, margins.footerTop + 5 + row * 3.5));
    overlay.text(`Généré le ${civilDate(snapshot.exportDay)}`, LEFT, HEIGHT - 11);
    overlay.text("Document généré par Baitari", RIGHT, HEIGHT - 11, { align: "right" });
    await layout.progress.report("finalizing", total, `En-têtes et pieds de page : ${index + 1} / ${total}`, index + 1, total);
  }
  const overlayPdf = await PDFDocument.load(overlay.output("arraybuffer"), { updateMetadata: false });
  const embeddedPages = await layout.output.embedPages(overlayPdf.getPages());
  for (let index = 0; index < total; index++) {
    layout.output.getPage(index).drawPage(embeddedPages[index], { x: 0, y: 0 });
    await layout.progress.report("finalizing", total, `Assemblage final : ${index + 1} / ${total}`, index + 1, total);
  }
}

/** The returned bytes are the single artifact used for preview, save and print. */
export async function buildPatientRecordPdf(
  snapshot: PatientRecordSnapshot,
  options: PatientRecordGenerationOptions = {},
): Promise<PatientRecordPdf> {
  const progress = new Progress(options);
  await progress.report("preparing", 0, "Préparation du dossier patient", 0);
  const sections = snapshot.sections
    .map((section) => ({ ...section, blocks: section.blocks.filter(hasContent) }))
    .filter((section) => section.blocks.length)
    .sort((a, b) => SECTION_ORDER.indexOf(a.id) - SECTION_ORDER.indexOf(b.id));
  if (!sections.length) throw new Error("Le périmètre choisi ne contient aucune donnée exportable.");
  for (const section of sections) for (const block of section.blocks) if (block.kind === "source") {
    if (block.source.patientId !== snapshot.patientId) throw new Error("Une pièce sélectionnée n’appartient pas au patient de ce dossier.");
    if ((block.source.origin === "generated" && section.id !== "documents") || (block.source.origin === "import" && section.id !== "attachments"))
      throw new Error("Une pièce n’est pas classée dans la bonne section du dossier.");
  }
  const fontData = await fonts();
  cancelled(options.signal);
  const output = await PDFDocument.create();
  output.setTitle(`Dossier patient - ${snapshot.patientName}`);
  output.setAuthor(snapshot.clinic.name || "Baitari");
  output.setSubject("Dossier patient");
  output.setCreator("Baitari");
  const generatedAt = new Date(snapshot.generatedAt);
  if (Number.isFinite(generatedAt.getTime())) { output.setCreationDate(generatedAt); output.setModificationDate(generatedAt); }
  const layout = new Layout(output, fontData, measureMargins(document(fontData), snapshot), progress);
  await cover(layout, snapshot, sections);
  for (const section of sections) {
    layout.sectionTitle = section.title;
    await layout.page();
    const sources: PatientRecordSource[] = [];
    for (const block of section.blocks) {
      if (block.kind === "text") await layout.text(block);
      else if (block.kind === "table") await layout.table(block);
      else sources.push(block.source);
    }
    if (sources.length) {
      const annexes = section.id === "attachments";
      await layout.table({
        kind: "table",
        columns: annexes ? ["Pièce", "Date d’import", "Format"] : ["Document", "Date", "Fichier"],
        widths: annexes ? [58, 24, 18] : [42, 18, 40],
        rows: sources.map((source) => annexes
          ? [source.fileName, civilDate(source.createdAt), source.mimeType === "application/pdf" ? "PDF" : source.mimeType === "image/png" ? "PNG" : "JPEG"]
          : [source.title, civilDate(source.createdAt), source.fileName]),
      });
      await layout.flush();
      for (const source of sources) await appendSource(layout, section, source);
    }
  }
  await layout.flush();
  await stamp(layout, snapshot);
  await progress.report("finalizing", output.getPageCount(), `Enregistrement du PDF : ${output.getPageCount()} pages`, output.getPageCount(), output.getPageCount());
  const bytes = await output.save({ objectsPerTick: 20 });
  cancelled(options.signal);
  return {
    bytes, pageCount: output.getPageCount(), filename: snapshot.filename,
    patientId: snapshot.patientId, patientName: snapshot.patientName,
    requestedBy: snapshot.requestedBy, generatedAt: snapshot.generatedAt,
  };
}
