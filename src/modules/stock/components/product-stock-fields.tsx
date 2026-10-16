import { useId } from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Product } from "@/types/db";
import { parseStockQuantityInput, stockQuantityLabel } from "@/domain/stock";

/** Same physical-unit control in care, consultations and dispensing. */
export function ProductStockFields({products, productId, quantity, onProductChange, onQuantityChange, disabled, optional = false}: {
  products: Product[]; productId: string; quantity: string;
  onProductChange: (id: string) => void; onQuantityChange: (quantity: string) => void;
  disabled?: boolean; optional?: boolean;
}) {
  const inputId = useId();
  const product = products.find(p => p.id === productId);
  const requested = parseStockQuantityInput(quantity);
  const tracked = product?.stockTracked !== false;
  const available = product?.availableQuantity ?? product?.quantity ?? 0;
  const shortage = product && tracked && Number.isFinite(requested) && requested > available;
  return <div className="space-y-2">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <div className="min-w-0 space-y-1.5">
        <label htmlFor={`${inputId}-product`} className="text-[13px]">{optional ? "Produit lié (facultatif)" : "Produit du stock"}</label>
        <SearchableSelect id={`${inputId}-product`} label="Choisir un produit du stock" disabled={disabled} controlClassName="h-11 rounded-xl"
          options={[...(optional ? [{value: "", label: "Aucun produit"}] : []), ...products.filter(p => !p.archivedAt).map(p => ({value: p.id, label: p.name, keywords: `${p.category} ${p.unit}`}))]}
          value={productId} onValueChange={onProductChange} placeholder="Rechercher un produit…" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${inputId}-quantity`} className="text-[13px]">Quantité{product ? ` (${product.unit})` : ""}</label>
        <Input id={`${inputId}-quantity`} inputMode="decimal" className="h-11 rounded-xl tabular-nums" value={quantity}
          disabled={disabled || !product || !tracked} aria-describedby={`${inputId}-availability`}
          onChange={event => onQuantityChange(event.target.value)} />
      </div>
    </div>
    <p id={`${inputId}-availability`} className={`text-[12px] ${shortage ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
      {!product ? "Sélectionnez le produit réellement utilisé, dans l’unité de son stock."
        : !tracked ? "Prestation tarifée, sans sortie de stock."
        : product.availabilityPending ? "Vérification du stock utilisable…"
        : product.inventoryInvalid ? "Les données d’un lot sont à vérifier avant utilisation."
        : shortage ? `Stock insuffisant : ${stockQuantityLabel(available, product.unit)} utilisables. Une réception ou une autre quantité est nécessaire avant utilisation.`
        : `Disponible : ${stockQuantityLabel(available, product.unit)}. Les lots périmés sont exclus.`}
    </p>
  </div>;
}
