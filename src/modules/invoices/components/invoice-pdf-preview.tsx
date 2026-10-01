import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";
import { savePdf } from "@/lib/save-pdf";
import type { InvoiceSettings } from "@/services/invoiceSettingsService";

export function InvoicePdfPreview({ data, settings, onClose, sample = false }: {
  data: InvoicePdfData; settings: InvoiceSettings; onClose: () => void; sample?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState(1);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState("");
  const [saving, setSaving] = useState(false);
  const result = useMemo(() => {
    try { return { doc: buildInvoicePdf(data, settings), error: "" }; }
    catch (error) { return { doc: null, error: error instanceof Error ? error.message : "Impossible de générer la facture." }; }
  }, [data, settings]);
  useEffect(() => {
    if (!result.doc) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let cancelRender: (() => void) | undefined;
    setRendering(true); setRenderError("");
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ data: new Uint8Array(result.doc!.output("arraybuffer")), useSystemFonts: true });
        dispose = () => { void task.destroy(); };
        const pdf = await task.promise;
        if (cancelled) return;
        const current = await pdf.getPage(page);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const viewport = current.getViewport({ scale: 1.8 });
        canvas.width = viewport.width; canvas.height = viewport.height;
        const render = current.render({ canvas, viewport });
        cancelRender = () => render.cancel();
        await render.promise;
        if (!cancelled) setRendering(false);
      } catch (error) {
        if (!cancelled) { setRenderError(error instanceof Error ? error.message : "Impossible d’afficher l’aperçu. Le PDF reste disponible à l’export."); setRendering(false); }
      }
    })();
    return () => { cancelled = true; cancelRender?.(); dispose?.(); };
  }, [result, page]);
  const download = async () => {
    if (!result.doc) return;
    setSaving(true);
    try {
      const name = data.number.replace(/[^\p{L}\p{N}_-]/gu, "_");
      if (await savePdf(result.doc, `${sample ? "Exemple-" : ""}Facture-${name}.pdf`)) toast.success("PDF enregistré.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le PDF."); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex h-[min(90dvh,900px)] max-w-[calc(100%-2rem)] flex-col sm:max-w-4xl" showCloseButton>
        <DialogHeader className="pr-8">
          <DialogTitle>{sample ? "Aperçu de votre modèle" : `Facture ${data.number}`}</DialogTitle>
          <DialogDescription>{sample ? "Données fictives. Cet aperçu ne crée aucune facture et utilise les réglages en cours." : "Le document affiché est celui qui sera enregistré en PDF."}</DialogDescription>
        </DialogHeader>
        {result.error ? <p className="text-destructive" role="alert">{result.error}</p> : <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted p-3 sm:p-6" aria-busy={rendering}>
          {rendering && <p role="status" className="mb-3 text-sm text-muted-foreground">Préparation de l’aperçu…</p>}
          {renderError && <p role="alert" className="text-destructive">{renderError}</p>}
          <canvas ref={canvasRef} role="img" aria-label={`Facture ${data.number}, page ${page} sur ${result.doc?.getNumberOfPages() ?? 1}`} className="mx-auto h-auto w-full max-w-[700px] bg-white" />
        </div>}
        {result.doc && result.doc.getNumberOfPages() > 1 && <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</Button><span className="text-sm tabular-nums">{page} / {result.doc.getNumberOfPages()}</span><Button variant="outline" size="sm" disabled={page === result.doc.getNumberOfPages()} onClick={() => setPage(page + 1)}>Suivante</Button>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">A4 · Texte sélectionnable · Génération locale</p>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">Fermer</Button>
            <Button disabled={!result.doc || saving} onClick={() => void download()}>{saving ? "Enregistrement…" : sample ? "Exporter l’exemple" : "Enregistrer le PDF"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
