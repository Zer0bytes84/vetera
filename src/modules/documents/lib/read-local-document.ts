import { PackagedOcr } from "./packaged-ocr";
import { abortError } from "@/modules/consultations/local-ai/inference-client";
import { reserveClinicalModel } from "@/modules/consultations/local-ai/model-lease";
import {
  assertReadableFile,
  needsPageOcr,
  MAX_DOCUMENT_CHARACTERS,
  MAX_DOCUMENT_PAGES,
  type ReadDocument,
  type ReadingProgress,
} from "./document-reading";

export type { ReadingProgress };
const checkAbort = (signal: AbortSignal) => {
  if (signal.aborted) throw abortError();
};

export async function readLocalDocument(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: ReadingProgress) => void
): Promise<ReadDocument> {
  assertReadableFile(file);
  checkAbort(signal);
  const release = reserveClinicalModel();
  let ocr: PackagedOcr | null = null;
  let pdf: import("pdfjs-dist").PDFDocumentProxy | null = null;
  let loading: import("pdfjs-dist").PDFDocumentLoadingTask | null = null;
  const root = new URL(
    import.meta.env.BASE_URL + "local-ai-runtime/",
    window.location.href
  ).href;
  const cancel = () => {
    ocr?.close();
    void loading?.destroy();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    checkAbort(signal);
    const recognize = async (image: File | HTMLCanvasElement, page: number) => {
      checkAbort(signal);
      if (!ocr) {
        ocr = new PackagedOcr(root + "ocr/", signal, (event) => {
          if (!signal.aborted) onProgress(event);
        });
        await ocr.initialize();
      }
      checkAbort(signal);
      const blob =
        image instanceof File
          ? image
          : await new Promise<Blob>((resolve, reject) =>
              image.toBlob(
                (value) =>
                  value
                    ? resolve(value)
                    : reject(new Error("L’image n’a pas pu être lue.")),
                "image/png"
              )
            );
      const result = await ocr.recognize(
        new Uint8Array(await blob.arrayBuffer()),
        page
      );
      checkAbort(signal);
      return {
        number: page,
        text: result.text.trim(),
        method: "ocr" as const,
        confidence: result.confidence,
      };
    };
    const result: ReadDocument = { name: file.name, pages: [] };
    if (file.type === "application/pdf") {
      onProgress({ message: "Ouverture du PDF…" });
      const pdfjs = await import("pdfjs-dist");
      const { default: workerSrc } = await import(
        "pdfjs-dist/build/pdf.worker.min.mjs?url"
      );
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      loading = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        useSystemFonts: true,
        cMapUrl: root + "pdf/cmaps/",
        cMapPacked: true,
        wasmUrl: root + "pdf/wasm/",
        standardFontDataUrl: root + "pdf/standard_fonts/",
        disableAutoFetch: true,
        disableStream: true,
      });
      pdf = await loading.promise;
      if (pdf.numPages > MAX_DOCUMENT_PAGES)
        throw new Error(
          "Le PDF dépasse 20 pages. Séparez-le en documents plus courts ; aucune page n’a été ignorée."
        );
      for (let index = 1; index <= pdf.numPages; index++) {
        checkAbort(signal);
        onProgress({
          message: `Lecture de la page ${index} sur ${pdf.numPages}…`,
          page: index,
        });
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        const text = content.items
          .filter((item) => "str" in item)
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""
          )
          .join("")
          .trim();
        const operations = text.length < 200 ? await page.getOperatorList() : null;
        const imageOperators = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject]);
        const containsImage = operations?.fnArray.some(operator => imageOperators.has(operator)) ?? false;
        if (!needsPageOcr(text, containsImage))
          result.pages.push({ number: index, text, method: "text" });
        else {
          const viewport = page.getViewport({ scale: 2 });
          if (viewport.width * viewport.height > 20000000)
            throw new Error(
              "Une page du PDF est trop grande pour être lue en sécurité."
            );
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          try {
            await page.render({ canvas, viewport }).promise;
            const recognized = await recognize(canvas, index);
            // Keep the existing digital header if recognition did not reproduce it.
            if (text && !recognized.text.includes(text)) recognized.text = `${text}\n${recognized.text}`;
            result.pages.push(recognized);
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
        page.cleanup();
        if (
          result.pages.reduce((sum, entry) => sum + entry.text.length, 0) >
          MAX_DOCUMENT_CHARACTERS
        )
          throw new Error(
            "Le texte dépasse la capacité de lecture. Séparez le document ; le résultat n’a pas été tronqué."
          );
      }
    } else {
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > 20000000)
          throw new Error(
            "L’image est trop grande. Réduisez ses dimensions avant de la lire."
          );
      } finally {
        bitmap.close();
      }
      result.pages.push(await recognize(file, 1));
    }
    if (
      result.pages.reduce((sum, page) => sum + page.text.length, 0) >
      MAX_DOCUMENT_CHARACTERS
    )
      throw new Error(
        "Le texte dépasse la capacité de lecture. Séparez le document ; le résultat n’a pas été tronqué."
      );
    if (!result.pages.some((page) => page.text.trim()))
      throw new Error(
        "Aucun texte n’a été reconnu. Essayez une image plus nette ou saisissez les observations."
      );
    checkAbort(signal);
    return result;
  } catch (error) {
    if (signal.aborted) throw abortError();
    const known = error instanceof Error ? error.message : "";
    if (
      /20 pages|trop grand|dépasse|Aucun texte|autre modèle|n’a pas répondu/.test(
        known
      )
    )
      throw error;
    throw new Error(
      file.type === "application/pdf"
        ? "Le PDF n’a pas pu être lu. Vérifiez qu’il n’est ni protégé par un mot de passe, ni endommagé."
        : "Le texte de l’image n’a pas pu être reconnu. Vérifiez le fichier et l’installation locale de Baitari."
    );
  } finally {
    signal.removeEventListener("abort", cancel);
    (ocr as PackagedOcr | null)?.close();
    await loading?.destroy().catch(() => undefined);
    release();
  }
}
