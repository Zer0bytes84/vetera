import { useEffect, useState } from "react";
import { renderPdfPages } from "../lib/managed-document-pdf";

export function DocumentPaperPreview({ dataUrl }: { dataUrl: string | null }) {
  const [result, setResult] = useState<{ source: string; pages: string[]; error: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (dataUrl) void renderPdfPages(dataUrl, controller.signal).then((pages) => {
      if (!controller.signal.aborted) setResult({ source: dataUrl, pages, error: "" });
    }).catch((cause) => {
      if (!controller.signal.aborted) setResult({ source: dataUrl, pages: [], error: cause instanceof Error ? cause.message : "L’aperçu n’a pas pu être chargé." });
    });
    return () => controller.abort();
  }, [dataUrl]);
  const pages = result?.source === dataUrl ? result.pages : [];
  const error = result?.source === dataUrl ? result.error : "";
  return <div className="document-paper-preview" aria-label="Aperçu avant impression">
    {error ? <p role="alert" className="text-destructive">{error}</p> : pages.length
      ? pages.map((page, index) => <figure key={index}>
        <img src={page} alt={`Aperçu du document, page ${index + 1}`} />
        <figcaption>Page {index + 1} sur {pages.length}</figcaption>
      </figure>) : <p role="status" className="text-sm text-muted-foreground">Préparation de l’aperçu A4…</p>}
  </div>;
}
