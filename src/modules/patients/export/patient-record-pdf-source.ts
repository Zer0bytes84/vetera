/**
 * Canvas fallback for source pages whose annotations would be lost by a PDF
 * Form XObject. This uses only the bundled PDF.js worker and local resources.
 * Core page rendering does not instantiate PDF.js' viewer scripting manager.
 */
export async function openPatientRecordRasterSource(bytes: Uint8Array, signal?: AbortSignal, annotationCounts?: number[]) {
  if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const root = new URL(import.meta.env.BASE_URL + "local-ai-runtime/pdf/", window.location.href);
  if (root.origin !== window.location.origin)
    throw new Error("Les ressources PDF doivent être locales à l’application.");
  const loading = pdfjs.getDocument({
    // PDF.js may transfer the input buffer to its worker. Never give it the
    // snapshot's bytes, nor the buffer used by the vector assembly.
    data: bytes.slice(),
    cMapUrl: new URL("cmaps/", root).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("standard_fonts/", root).href,
    wasmUrl: new URL("wasm/", root).href,
    useSystemFonts: false,
    stopAtErrors: true,
    enableXfa: false,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
  });
  const cancel = () => { void loading.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await loading.promise;
    if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
    if (pdf.isPureXfa) throw new Error("Les formulaires XFA ne sont pas pris en charge.");
    return {
      pageCount: pdf.numPages,
      async render(pageNumber: number): Promise<{ data: Uint8Array; width: number; height: number }> {
        if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
        const page = await pdf.getPage(pageNumber);
        const allAnnotations = await page.getAnnotations({ intent: "any" });
        if (annotationCounts && allAnnotations.length !== annotationCounts[pageNumber - 1]) {
          page.cleanup();
          throw new Error("Une annotation de la page source est corrompue ou non prise en charge.");
        }
        const annotations = await page.getAnnotations({ intent: "display" });
        const synthesized = new Set(["Line", "Square", "Circle", "PolyLine", "Polygon", "Ink", "Highlight", "Underline", "Squiggly", "StrikeOut"]);
        const expectedAppearanceIds: string[] = [];
        for (const annotation of annotations) {
          // Some icons/popups exist only in PDF.js' HTML annotation layer.
          // FreeText synthesis also depends on worker OffscreenCanvas support.
          // Refuse these cases rather than quietly lose a clinical annotation.
          const popup = annotation.subtype === "Popup";
          const link = annotation.subtype === "Link";
          const visibleHtml = (popup && annotation.open && annotation.contentsObj?.str) || (link && annotation.borderStyle?.width > 0 && annotation.borderColor);
          if (visibleHtml || (!annotation.hasAppearance && !synthesized.has(annotation.subtype) && !popup && !link)) {
            page.cleanup();
            throw new Error(`L’apparence visible d’une annotation « ${annotation.subtype || "inconnue"} » ne peut pas être conservée localement.`);
          }
          const rect = annotation.rect;
          if (popup || (annotation.annotationFlags & (2 | 32)) || !rect || rect[2] <= rect[0] || rect[3] <= rect[1]) continue;
          if (!link || annotation.hasAppearance) expectedAppearanceIds.push(annotation.id);
        }
        // PDF.js can warn and skip a broken appearance stream even with
        // stopAtErrors. Verify that every visible drawable annotation reached
        // the canvas operator list, rather than returning a partial dossier.
        const operators = await page.getOperatorList({ annotationMode: pdfjs.AnnotationMode.ENABLE, intent: "display" });
        const renderedIds = new Set(operators.fnArray.flatMap((operation, index) => operation === pdfjs.OPS.beginAnnotation ? [operators.argsArray[index][0]] : []));
        if (expectedAppearanceIds.some((id) => !renderedIds.has(id))) {
          page.cleanup();
          throw new Error("Une annotation visible n’a pas pu être rendue intégralement sur la page source.");
        }
        const original = page.getViewport({ scale: 1 });
        // One page at a time, at approximately 144 dpi. The pixel budget bounds
        // working memory for unusually large engineering or scanned pages.
        const scale = Math.min(2, Math.sqrt(16_000_000 / (original.width * original.height)));
        const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const render = page.render({ canvas, viewport, annotationMode: pdfjs.AnnotationMode.ENABLE, intent: "display" });
        const cancelRender = () => render.cancel();
        signal?.addEventListener("abort", cancelRender, { once: true });
        try {
          await render.promise;
          if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
          const image = canvas.toDataURL("image/png");
          const binary = atob(image.slice(image.indexOf(",") + 1));
          return { data: Uint8Array.from(binary, (char) => char.charCodeAt(0)), width: viewport.width, height: viewport.height };
        } finally {
          signal?.removeEventListener("abort", cancelRender);
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      },
      async destroy() {
        signal?.removeEventListener("abort", cancel);
        await loading.destroy();
      },
    };
  } catch (error) {
    signal?.removeEventListener("abort", cancel);
    await loading.destroy();
    if (signal?.aborted) throw new DOMException("Génération annulée", "AbortError");
    throw error;
  }
}
