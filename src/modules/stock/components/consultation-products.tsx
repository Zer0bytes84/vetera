import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { Package } from "@/lib/icons";
import "./consultation-products.css";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import {
  parseStockQuantityInput,
  StockError,
  stockQuantityLabel,
} from "@/domain/stock";
import { guard } from "@/lib/guard";
import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { clinicalStockService } from "../services/clinical-stock-service";
import type { ClinicalStockUse } from "../services/clinical-stock-store";
import { ProductStockFields } from "./product-stock-fields";
import { StockInvoiceLink } from "./stock-invoice-link";

export function ConsultationProducts({
  appointmentId,
  patientId,
}: {
  appointmentId: string;
  patientId: string;
}) {
  const { currentUser } = useAuth();
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision n'est pas lu : Réessayer et chaque ajout l'incrémentent pour relire les produits utilisés.
  useEffect(() => {
    if (!desktop) {
      return;
    }
    let alive = true;
    void clinicalStockService
      .uses(appointmentId)
      .then((rows) => {
        if (alive) {
          setUses(rows);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (alive) {
          setLoadError(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [appointmentId, revision, desktop]);
  const requested = parseStockQuantityInput(quantity);
  const product = products.data.find((p) => p.id === productId);
  const valid =
    !!product &&
    requested > 0 &&
    !product.archivedAt &&
    (product.stockTracked === false ||
      (!(product.availabilityPending || product.inventoryInvalid) &&
        (product.availableQuantity ?? product.quantity) >= requested));
  if (!desktop) {
    return (
      <p className="t-13 text-muted-foreground">
        L’utilisation des produits et sa facturation sont disponibles dans
        l’application de bureau.
      </p>
    );
  }
  return (
    <Shell
      aria-label="Produits utilisés en consultation"
      className="consultation-products"
      role="region"
    >
      <ShellHeader
        icon={Package}
        subtitle="Quantité réellement utilisée : stock et facture brouillon mis à jour ensemble"
        title="Produits utilisés"
      />
      <Panel className="consultation-products-card space-y-4 p-4 sm:p-5">
        {uses.length > 0 && (
          <ul className="t-13 divide-y divide-border">
            {uses.map((use) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 py-2"
                key={use.id}
              >
                <div className="min-w-0">
                  <span className="font-medium">{use.product_name}</span>
                  <span className="ml-2 text-muted-foreground tabular-nums">
                    {stockQuantityLabel(use.quantity, use.unit)}
                  </span>
                </div>
                <StockInvoiceLink invoiceId={use.invoice_id} />
              </li>
            ))}
          </ul>
        )}
        {loadError && (
          <p className="text-destructive text-xs" role="alert">
            Les utilisations précédentes n’ont pas pu être chargées.{" "}
            <button
              className="underline underline-offset-4"
              onClick={() => setRevision((value) => value + 1)}
            >
              Réessayer
            </button>
          </p>
        )}
        <form
          className="space-y-3"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !valid || !currentUser) {
              return;
            }
            setBusy(true);
            setError(null);
            await guard(
              async () => {
                await clinicalStockService.useProduct({
                  id: requestId,
                  appointmentId,
                  patientId,
                  productId,
                  quantity: product?.stockTracked === false ? 1 : requested,
                  authorId: currentUser.id,
                });
                setProductId("");
                setQuantity("1");
                setRequestId(generateId());
                setRevision((value) => value + 1);
              },
              {
                recover: (error) => {
                  setError(
                    error instanceof StockError
                      ? error.message
                      : "L’utilisation n’a pas pu être enregistrée. Le stock reste inchangé. Réessayez."
                  );
                },
                cleanup: () => {
                  setBusy(false);
                },
              }
            );
          }}
        >
          <ProductStockFields
            disabled={busy}
            onProductChange={(id) => {
              setProductId(id);
              setQuantity("1");
              setRequestId(generateId());
            }}
            onQuantityChange={(value) => {
              setQuantity(value);
              setRequestId(generateId());
            }}
            productId={productId}
            products={products.data}
            quantity={quantity}
          />
          {error && (
            <p className="t-13 text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              className="rounded-full px-4"
              disabled={busy || !valid || !currentUser}
              size="sm"
              type="submit"
            >
              {busy ? "Enregistrement…" : "Valider l’utilisation"}
            </Button>
          </div>
        </form>
      </Panel>
    </Shell>
  );
}
