import type { DocumentAttachment, PatientDocument } from "../document-domain";
import {
  assertReadableFile,
  MAX_DOCUMENT_CHARACTERS,
  MAX_DOCUMENT_PAGES,
  needsPageOcr,
  type ReadDocument,
  type ReadingProgress,
} from "./document-reading";
import { readLocalDocument } from "./read-local-document";

const IMPORT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const SCANNED_DOCUMENT_MESSAGE =
  "Ce PDF contient une page numérisée sans texte extractible. L’assistant ne peut pas la lire automatiquement. Le fichier reste consultable et téléchargeable.";

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Lecture annulée.", "AbortError");
}

export function fileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Le fichier local n’a pas pu être chargé."));
    reader.onerror = () => reject(new Error("Le fichier local n’a pas pu être chargé."));
    reader.readAsDataURL(file);
  });
}

export function attachmentFile(attachment: DocumentAttachment): File {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(attachment.dataUrl);
  if (!match || match[1] !== attachment.mimeType)
    throw new Error("Le fichier local est invalide.");
  const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
  return new File([bytes], attachment.name, { type: attachment.mimeType });
}

/** Import extracts the existing PDF text layer only. OCR is never started silently. */
export async function preparePatientAttachment(
  file: File,
  signal?: AbortSignal,
  onProgress: (progress: ReadingProgress) => void = () => {},
): Promise<DocumentAttachment> {
  assertReadableFile(file);
  if (!IMPORT_TYPES.includes(file.type as typeof IMPORT_TYPES[number]))
    throw new Error("Choisissez un fichier PDF, JPG ou PNG.");
  checkAbort(signal);
  const dataUrl = await fileAsDataUrl(file);
  checkAbort(signal);
  if (file.type !== "application/pdf") {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width * bitmap.height > 20_000_000)
        throw new Error("L’image est trop grande. Réduisez ses dimensions avant de l’importer.");
    } finally { bitmap.close(); }
    checkAbort(signal);
    return { name: file.name, mimeType: file.type as "image/jpeg" | "image/png", dataUrl, size: file.size, textState: "image", pages: [] };
  }
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const root = new URL(import.meta.env.BASE_URL + "local-ai-runtime/pdf/", window.location.href).href;
  const loading = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useSystemFonts: true, cMapUrl: root + "cmaps/", cMapPacked: true,
    wasmUrl: root + "wasm/", standardFontDataUrl: root + "standard_fonts/",
    disableAutoFetch: true, disableStream: true,
  });
  const cancel = () => { void loading.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > MAX_DOCUMENT_PAGES)
      throw new Error("Le PDF dépasse 20 pages. Séparez-le en documents plus courts ; aucune page n’a été ignorée.");
    const pages: DocumentAttachment["pages"] = [];
    let scanned = false;
    let characters = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      checkAbort(signal);
      onProgress({ message: `Lecture de la page ${number} sur ${pdf.numPages}…`, page: number });
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("").trim();
        const operations = text.length < 200 ? await page.getOperatorList() : null;
        const imageOperators = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject]);
        const containsImage = operations?.fnArray.some(operator => imageOperators.has(operator)) ?? false;
        scanned ||= !text.trim() || (containsImage && needsPageOcr(text, true));
        characters += text.length;
        if (characters > MAX_DOCUMENT_CHARACTERS)
          throw new Error("Le texte dépasse la capacité de lecture. Séparez le document ; le résultat n’a pas été tronqué.");
        pages.push({ page: number, text });
      } finally { page.cleanup(); }
    }
    checkAbort(signal);
    return { name: file.name, mimeType: "application/pdf", size: file.size, dataUrl, textState: scanned ? "scan" : "extractible", pages };
  } catch (error) {
    checkAbort(signal);
    if (error instanceof Error && /dépasse|capacité|tronqué|ignorée/.test(error.message)) throw error;
    throw new Error("Le PDF n’a pas pu être importé. Vérifiez qu’il n’est ni protégé par un mot de passe, ni endommagé.");
  } finally {
    signal?.removeEventListener("abort", cancel);
    await loading.destroy().catch(() => undefined);
  }
}

/** Read-only adapter: it never alters the document, its SOAP source or a prescription. */
export async function readPatientDocument(
  document: PatientDocument,
  options: { patientId?: string; allowImageOcr?: boolean; signal?: AbortSignal; onProgress?: (progress: ReadingProgress) => void } = {},
): Promise<ReadDocument> {
  if (options.patientId && document.patientId !== options.patientId)
    throw new Error("Le document n’appartient pas à ce patient.");
  if (document.status !== "finalise")
    throw new Error(document.status === "annule" ? "Ce document est annulé et ne peut pas être utilisé par l’assistant." : "Finalisez le document avant de le lire avec l’assistant.");
  checkAbort(options.signal);
  let source: ReadDocument;
  if (!document.attachment) {
    source = { name: document.title, sourceId: document.id, pages: [{ number: 1, text: document.content, method: "text" }] };
  } else if (document.attachment.textState === "scan") {
    throw new Error(SCANNED_DOCUMENT_MESSAGE);
  } else if (document.attachment.textState === "image") {
    if (!options.allowImageOcr)
      throw new Error("Cette pièce est une image. Lancez explicitement la reconnaissance locale du texte pour la lire.");
    source = await readLocalDocument(attachmentFile(document.attachment), options.signal ?? new AbortController().signal, options.onProgress ?? (() => {}));
    source.sourceId = document.id;
  } else {
    source = { name: document.title, sourceId: document.id, pages: document.attachment.pages.map(page => ({ number: page.page, text: page.text, method: "text" as const })) };
  }
  if (!source.pages.some(page => page.text.trim())) throw new Error("Ce document ne contient pas de texte lisible.");
  if (source.pages.length > MAX_DOCUMENT_PAGES || source.pages.reduce((sum, page) => sum + page.text.length, 0) > MAX_DOCUMENT_CHARACTERS)
    throw new Error("Ce document dépasse la capacité de lecture. Séparez-le en documents plus courts.");
  return source;
}
