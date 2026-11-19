import { useId } from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Product } from "@/types/db";
import { parseStockQuantityInput, stockQuantityLabel } from "@/domain/stock";

/** Same physical-unit control in care, consultations and dispensing. */
export function ProductStockFields({
  products,
  productId,
  quantity,
  onProductChange,
  onQuantityChange,
  disabled,
  optional = false,
}: {
  products: Product[];
  productId: string;
  quantity: string;
  onProductChange: (id: string) => void;
  onQuantityChange: (quantity: string) => void;
  disabled?: boolean;
  optional?: boolean;
}) {
  const inputId = useId();
  const product = products.find((p) => p.id === productId);
  const requested = parseStockQuantityInput(quantity);
  const tracked = product?.stockTracked !== false;
  const available = product?.availableQuantity ?? product?.quantity ?? 0;
  const shortage =
    product && tracked && Number.isFinite(requested) && requested > available;
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="min-w-0 space-y-1.5">
          <label className="t-13" htmlFor={`${inputId}-product`}>
            {optional ? "Produit lié (facultatif)" : "Produit du stock"}
          </label>
          <SearchableSelect
            controlClassName="h-11 rounded-xl"
            disabled={disabled}
            id={`${inputId}-product`}
            label="Choisir un produit du stock"
            onValueChange={onProductChange}
            options={[
              ...(optional ? [{ value: "", label: "Aucun produit" }] : []),
              ...products
                .filter((p) => !p.archivedAt)
                .map((p) => ({
                  value: p.id,
                  label: p.name,
                  keywords: `${p.category} ${p.unit}`,
                })),
            ]}
            placeholder="Rechercher un produit…"
            value={productId}
          />
        </div>
        <div className="space-y-1.5">
          <label className="t-13" htmlFor={`${inputId}-quantity`}>
            Quantité{product ? ` (${product.unit})` : ""}
          </label>
          <Input
            aria-describedby={`${inputId}-availability`}
            className="h-11 rounded-xl tabular-nums"
            disabled={disabled || !product || !tracked}
            id={`${inputId}-quantity`}
            inputMode="decimal"
            onChange={(event) => onQuantityChange(event.target.value)}
            value={quantity}
          />
        </div>
      </div>
      <p
        aria-live="polite"
        className={`t-12 ${shortage ? "text-destructive" : "text-muted-foreground"}`}
        id={`${inputId}-availability`}
      >
        {product
          ? tracked
            ? product.availabilityPending
              ? "Vérification du stock utilisable…"
              : product.inventoryInvalid
                ? "Les données d’un lot sont à vérifier avant utilisation."
                : shortage
                  ? `Stock insuffisant : ${stockQuantityLabel(available, product.unit)} utilisables. Une réception ou une autre quantité est nécessaire avant utilisation.`
                  : `Disponible : ${stockQuantityLabel(available, product.unit)}. Les lots périmés sont exclus.`
            : "Prestation tarifée, sans sortie de stock."
          : "Sélectionnez le produit réellement utilisé, dans l’unité de son stock."}
      </p>
    </div>
  );
}
