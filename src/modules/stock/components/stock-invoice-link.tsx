import { useFocus } from "@/contexts/focus-provider";

export function StockInvoiceLink({ invoiceId }: { invoiceId: string | null }) {
  const { requestFocus } = useFocus();
  if (!invoiceId) {
    return (
      <span className="text-muted-foreground text-xs">
        Facture supprimée, mouvement conservé.
      </span>
    );
  }
  return (
    <a
      className="t-12 font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
      href="#/finances"
      onClick={() => requestFocus("invoice", invoiceId)}
    >
      Voir la facture
    </a>
  );
}
