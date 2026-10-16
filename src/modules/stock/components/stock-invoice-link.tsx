import { useFocus } from "@/contexts/focus-provider";

export function StockInvoiceLink({invoiceId}: {invoiceId: string | null}) {
  const {requestFocus} = useFocus();
  if (!invoiceId) return <span className="text-xs text-muted-foreground">Facture supprimée, mouvement conservé.</span>;
  return <a href="#/finances" onClick={() => requestFocus("invoice", invoiceId)}
    className="text-[12px] font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Voir la facture</a>;
}
