import { useEffect, useState } from "react";
import { renderPdfPages } from "../lib/managed-document-pdf";

export function DocumentPaperPreview({ dataUrl }: { dataUrl: string | null }) {
  const [result, setResult] = useState<{
    source: string;
    pages: string[];
    error: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (dataUrl) {
      void renderPdfPages(dataUrl, controller.signal)
        .then((pages) => {
          if (!controller.signal.aborted) {
            setResult({ source: dataUrl, pages, error: "" });
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setResult({
              source: dataUrl,
              pages: [],
              error:
                cause instanceof Error
                  ? cause.message
                  : "L’aperçu n’a pas pu être chargé.",
            });
          }
        });
    }
    return () => controller.abort();
  }, [dataUrl]);
  const pages = result?.source === dataUrl ? result.pages : [];
  const error = result?.source === dataUrl ? result.error : "";
  return (
    <div
      aria-label="Aperçu avant impression"
      className="document-paper-preview"
    >
      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : pages.length ? (
        pages.map((page, index) => (
          <figure key={index}>
            <img alt={`Aperçu du document, page ${index + 1}`} src={page} />
            <figcaption>
              Page {index + 1} sur {pages.length}
            </figcaption>
          </figure>
        ))
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          Préparation de l’aperçu A4…
        </p>
      )}
    </div>
  );
}
