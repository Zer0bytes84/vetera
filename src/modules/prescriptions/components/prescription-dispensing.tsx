import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { StockError, parseStockQuantityInput, stockBalance, insufficientStockMessage } from "@/domain/stock";
import { generateId } from "@/services/sqlite/database";
import { isTauriRuntime } from "@/services/browser-store";
import { ProductStockFields } from "@/modules/stock/components/product-stock-fields";
import { StockInvoiceLink } from "@/modules/stock/components/stock-invoice-link";
import { StockLotSelect } from "@/modules/stock/components/stock-lot-select";
import { useStockInventory } from "@/modules/stock/hooks/use-stock-inventory";
import { stockDay } from "@/domain/stock-date";
import { clinicalStockService } from "@/modules/stock/services/clinical-stock-service";
import type { Dispensation, DispensingLineInput } from "@/modules/stock/services/clinical-stock-store";

export function PrescriptionDispensing({prescriptionId, status, items}: {prescriptionId: string; status: string; items: {id: string; medicationName: string}[]}) {
  const {currentUser} = useAuth();
  const products = useProductsRepository();
  const desktop = isTauriRuntime();
  const [open, setOpen] = useState(false);
  // Items may arrive after their prescription header. Key edits by the item,
  // so a late SQLite read never leaves the form with an empty draft array.
  const [lines, setLines] = useState<Record<string, {productId: string; quantity: string; lot?: string}>>({});
  const inventory = useStockInventory();
  const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Dispensation | null>(null);
  useEffect(() => {
    if (status !== "dispensed" || !desktop) return;
    let alive = true;
    void clinicalStockService.dispensation(prescriptionId).then(value => {if (alive) setSaved(value);}).catch(() => {if (alive) setError("La trace de dispensation n’a pas pu être chargée.");});
    return () => {alive = false;};
  }, [prescriptionId, status, desktop]);
  if (!desktop) return <p className="mt-3 text-[12px] text-muted-foreground">La dispensation et sa facturation sont disponibles dans l’application de bureau.</p>;
  const payload: DispensingLineInput[] = items.map(item => ({prescriptionItemId: item.id, productId: lines[item.id]?.productId ?? "", quantity: parseStockQuantityInput(lines[item.id]?.quantity ?? "1"),
    ...(lines[item.id]?.lot === "unassigned" ? {lotId: null} : lines[item.id]?.lot && lines[item.id]?.lot !== "fifo" ? {lotId: lines[item.id].lot} : {})}));
  const valid = payload.length > 0 && payload.every(line => {
    const product = products.data.find(p => p.id === line.productId);
    return product && !product.archivedAt && product.stockTracked !== false && !product.availabilityPending && !product.inventoryInvalid && line.quantity > 0;
  });
  const totals = new Map<string, number>();
  for (const line of payload) totals.set(line.productId, stockBalance((totals.get(line.productId) ?? 0) + (Number.isFinite(line.quantity) ? line.quantity : 0)));
  let shortage: string | null = null;
  for (const [id, total] of totals) {
    const product = products.data.find(p => p.id === id);
    const available = product?.availableQuantity ?? product?.quantity ?? 0;
    if (product && total > available) shortage = insufficientStockMessage(product.name, available, total, product.unit);
  }
  const selectedTotals = new Map<string, number>();
  for (const line of payload.filter(row => row.lotId !== undefined)) {
    const key = JSON.stringify([line.productId, line.lotId]); selectedTotals.set(key, stockBalance((selectedTotals.get(key) ?? 0) + (Number.isFinite(line.quantity) ? line.quantity : 0)));
  }
  for (const [key, total] of selectedTotals) {
    const [productId, lotId] = JSON.parse(key) as [string, string | null];
    const product = products.data.find(row => row.id === productId);
    const available = stockBalance(inventory.balances.filter(row => row.productId === productId && row.lotId === lotId && row.locationActive && row.quantity > 0 && (!row.expiryDate || row.expiryDate >= stockDay())).reduce((sum, row) => sum + row.quantity, 0));
    if (product && total > available) shortage = `Lot choisi : ${insufficientStockMessage(product.name, available, total, product.unit)}`;
  }
  if (saved || status === "dispensed") return <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[12px]">
    <span>Dispensation enregistrée, stock déduit.</span>{saved && <StockInvoiceLink invoiceId={saved.invoice_id} />}{error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
  if (status !== "signed") return <p className="mt-3 text-[12px] text-muted-foreground">Signez l’ordonnance pour accéder à la dispensation.</p>;
  if (!open) return <div className="mt-3 flex justify-end"><Button variant="outline" onClick={() => setOpen(true)}>Dispenser</Button></div>;
  return <form noValidate aria-label="Dispenser l’ordonnance" className="mt-4 space-y-4 border-t border-border pt-4" onSubmit={async event => {
    event.preventDefault(); if (!valid || shortage || !currentUser || busy) return;
    setBusy(true); setError(null);
    try {setSaved(await clinicalStockService.dispense({id: requestId, prescriptionId, authorId: currentUser.id, lines: payload})); setOpen(false);}
    catch (error) {setError(error instanceof StockError ? error.message : "La dispensation n’a pas pu être enregistrée. Aucun stock ni facture n’a été modifié. Réessayez.");}
    finally {setBusy(false);}
  }}>
    <p className="text-[12px] text-muted-foreground">Choisissez le produit remis et sa quantité physique. Les instructions de l’ordonnance restent inchangées.</p>
    {items.map(item => <div key={item.id} className="space-y-2">
      <h4 className="text-[13px] font-medium">{item.medicationName}</h4>
      <ProductStockFields products={products.data.filter(p => p.stockTracked !== false)} productId={lines[item.id]?.productId ?? ""} quantity={lines[item.id]?.quantity ?? "1"} disabled={busy}
        onProductChange={productId => {setLines(rows => ({...rows, [item.id]: {quantity: rows[item.id]?.quantity ?? "1", productId, lot: "fifo"}})); setRequestId(generateId());}}
        onQuantityChange={quantity => {setLines(rows => ({...rows, [item.id]: {...rows[item.id], productId: rows[item.id]?.productId ?? "", quantity}})); setRequestId(generateId());}} />
      <StockLotSelect productId={lines[item.id]?.productId ?? ""} unit={products.data.find(row => row.id === lines[item.id]?.productId)?.unit ?? "unité"} value={lines[item.id]?.lot ?? "fifo"} disabled={busy}
        onChange={lot => {setLines(rows => ({...rows, [item.id]: {...rows[item.id], productId: rows[item.id]?.productId ?? "", quantity: rows[item.id]?.quantity ?? "1", lot}})); setRequestId(generateId());}} />
    </div>)}
    {(shortage || error) && <p role="alert" className="text-[13px] text-destructive">{shortage || error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={busy || !valid || !!shortage || !currentUser}>{busy ? "Dispensation…" : "Confirmer la dispensation"}</Button></div>
  </form>;
}
