import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PatientRecordPdf } from "./patient-record-types";

/** Render only the requested page, and never transfer the saved artifact buffer. */
export function PatientRecordPreview({ artifact, page }: { artifact: PatientRecordPdf; page: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void (async () => {
      setPdf(null); setRendering(true); setError("");
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const root = new URL(import.meta.env.BASE_URL + "local-ai-runtime/pdf/", window.location.href).href;
        const task = pdfjs.getDocument({
          data: Uint8Array.from(artifact.bytes),
          useSystemFonts: false,
          cMapUrl: root + "cmaps/", cMapPacked: true,
          standardFontDataUrl: root + "standard_fonts/", wasmUrl: root + "wasm/",
          disableAutoFetch: true, disableStream: true,
        });
        dispose = () => { void task.destroy(); };
        const loaded = await task.promise;
        if (!cancelled) setPdf(loaded);
      } catch {
        if (!cancelled) { setError("L’aperçu du dossier n’a pas pu être affiché. Réessayez ou enregistrez le PDF."); setRendering(false); }
      }
    })();
    return () => { cancelled = true; dispose?.(); };
  }, [artifact, retry]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let cancelRender: (() => void) | undefined;
    void (async () => {
      setRendering(true); setError("");
      try {
        const current = await pdf.getPage(page);
        try {
          const canvas = canvasRef.current;
          if (!canvas || cancelled) return;
          const original = current.getViewport({ scale: 1 });
          const viewport = current.getViewport({ scale: Math.min(1.5, Math.sqrt(8_000_000 / (original.width * original.height))) });
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          const task = current.render({ canvas, viewport });
          cancelRender = () => task.cancel();
          await task.promise;
          if (!cancelled) setRendering(false);
        } finally { current.cleanup(); }
      } catch {
        if (!cancelled) { setError("Cette page n’a pas pu être affichée. Réessayez l’aperçu."); setRendering(false); }
      }
    })();
    return () => { cancelled = true; cancelRender?.(); };
  }, [pdf, page]);

  return (
    <div className="patient-export-preview" aria-busy={rendering}>
      {rendering && <p className="patient-export-preview-status" role="status"><Spinner className="size-4" />Préparation de la page {page}…</p>}
      {error && <div className="patient-export-preview-error" role="alert"><p>{error}</p><Button onClick={() => setRetry(value => value + 1)} variant="outline">Réessayer l’aperçu</Button></div>}
      <canvas ref={canvasRef} className={rendering || error ? "invisible" : ""} role="img" aria-label={`Dossier de ${artifact.patientName}, page ${page} sur ${artifact.pageCount}`} />
    </div>
  );
}
