import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { StockError, parseStockQuantityInput, stockQuantityLabel } from "@/domain/stock";
import { generateId } from "@/services/sqlite/database";
import { isTauriRuntime } from "@/services/browser-store";
import { clinicalStockService } from "../services/clinical-stock-service";
import type { ClinicalStockUse } from "../services/clinical-stock-store";
import { ProductStockFields } from "./product-stock-fields";
import { StockInvoiceLink } from "./stock-invoice-link";

export function ConsultationProducts({appointmentId, patientId}: {appointmentId: string; patientId: string}) {
  const {currentUser} = useAuth();
  const products = useProductsRepository();
  const desktop = isTauriRuntime();
  const [uses, setUses] = useState<ClinicalStockUse[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!desktop) return;
    let alive = true;
    void clinicalStockService.uses(appointmentId).then(rows => {if (alive) {setUses(rows); setLoadError(false);}}).catch(() => {if (alive) setLoadError(true);});
    return () => {alive = false;};
  }, [appointmentId, revision, desktop]);
  const requested = parseStockQuantityInput(quantity);
  const product = products.data.find(p => p.id === productId);
  const valid = !!product && requested > 0 && !product.archivedAt && (product.stockTracked === false || (!product.availabilityPending && !product.inventoryInvalid && (product.availableQuantity ?? product.quantity) >= requested));
  if (!desktop) return <p className="text-[13px] text-muted-foreground">L’utilisation des produits et sa facturation sont disponibles dans l’application de bureau.</p>;
  return <section aria-label="Produits utilisés en consultation" className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
    <div><h3 className="text-base font-semibold">Produits utilisés</h3><p className="mt-1 text-[12px] text-muted-foreground">Validez la quantité réellement utilisée. Le stock et la facture brouillon sont mis à jour ensemble.</p></div>
    {uses.length > 0 && <ul className="divide-y divide-border text-[13px]">
      {uses.map(use => <li key={use.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="min-w-0"><span className="font-medium">{use.product_name}</span><span className="ml-2 tabular-nums text-muted-foreground">{stockQuantityLabel(use.quantity, use.unit)}</span></div>
        <StockInvoiceLink invoiceId={use.invoice_id} />
      </li>)}
    </ul>}
    {loadError && <p role="alert" className="text-xs text-destructive">Les utilisations précédentes n’ont pas pu être chargées. <button className="underline underline-offset-4" onClick={() => setRevision(value => value + 1)}>Réessayer</button></p>}
    <form noValidate className="space-y-3 border-t border-border pt-4" onSubmit={async event => {
      event.preventDefault(); if (busy || !valid || !currentUser) return;
      setBusy(true); setError(null);
      try {
        await clinicalStockService.useProduct({id: requestId, appointmentId, patientId, productId, quantity: product?.stockTracked === false ? 1 : requested, authorId: currentUser.id});
        setProductId(""); setQuantity("1"); setRequestId(generateId()); setRevision(value => value + 1);
      } catch (error) {setError(error instanceof StockError ? error.message : "L’utilisation n’a pas pu être enregistrée. Le stock reste inchangé. Réessayez.");}
      finally {setBusy(false);}
    }}>
      <ProductStockFields products={products.data} productId={productId} quantity={quantity} disabled={busy}
        onProductChange={id => {setProductId(id); setQuantity("1"); setRequestId(generateId());}} onQuantityChange={value => {setQuantity(value); setRequestId(generateId());}} />
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={busy || !valid || !currentUser}>{busy ? "Enregistrement…" : "Valider l’utilisation"}</Button></div>
    </form>
  </section>;
}
