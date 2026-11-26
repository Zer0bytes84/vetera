import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import { ErrorState } from "@/design-system/patterns/error-state";
import {
  parseStockQuantityInput,
  StockError,
  stockBalance,
  stockQuantityLabel,
} from "@/domain/stock";
import { restockNeed } from "@/domain/stock-alerts";
import { stockDay } from "@/domain/stock-date";
import { guard } from "@/lib/guard";
import { ArrowLeft, Plus } from "@/lib/icons";
import { TIME_HH_MM } from "@/lib/patterns";
import { CareTimePicker } from "@/modules/care-tasks/care-time-picker";
import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { formatDZD, toCentimes } from "@/utils/currency";
import { formatPhone } from "@/utils/display-format";
import { usePurchasing } from "../hooks/use-purchasing";
import { useStockInventory } from "../hooks/use-stock-inventory";
import { exportPurchaseOrder } from "../services/purchase-order-pdf";
import { purchasingService } from "../services/purchasing-service";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  StockSupplier,
} from "../services/purchasing-store";
import { StockDatePicker } from "./stock-date-picker";

const COST_TEXT = /^\d+(?:[,.]\d{1,2})?$/;

const labels: Record<PurchaseOrder["status"], string> = {
  draft: "Brouillon",
  ordered: "Commandée",
  partial: "Réception partielle",
  received: "Reçue",
  cancelled: "Annulée",
};
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR");
const failure = (error: unknown) =>
  error instanceof StockError
    ? error.message
    : "L’opération n’a pas pu être enregistrée. Réessayez.";
const parseCost = (value: string) =>
  COST_TEXT.test(value.trim())
    ? toCentimes(Number(value.replace(",", ".")))
    : Number.NaN;

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: StockSupplier;
  onClose: () => void;
}) {
  const [id] = useState(() => supplier?.id ?? generateId());
  const [draft, setDraft] = useState({
    name: supplier?.name ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    address: supplier?.address ?? "",
    notes: supplier?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      aria-label="Fiche fournisseur"
      className="space-y-4 border-border border-y bg-muted/10 p-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !draft.name.trim()) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await purchasingService.supplier({ id, ...draft });
            onClose();
          },
          {
            recover: (error) => {
              setError(failure(error));
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <h3 className="font-medium text-base">
        {supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
      </h3>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
        {(
          [
            ["name", "Nom"],
            ["phone", "Téléphone"],
            ["email", "E-mail"],
            ["address", "Adresse"],
          ] as const
        ).map(([key, label]) => (
          <div className="space-y-1.5" key={key}>
            <label className="text-sm" htmlFor={`supplier-${key}`}>
              {label}
            </label>
            <Input
              className="h-11"
              id={`supplier-${key}`}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
              type={
                key === "email" ? "email" : key === "phone" ? "tel" : "text"
              }
              value={draft[key]}
            />
          </div>
        ))}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm" htmlFor="supplier-notes">
            Notes
          </label>
          <Textarea
            id="supplier-notes"
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
            value={draft.notes}
          />
        </div>
      </fieldset>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          disabled={busy}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button disabled={busy || !draft.name.trim()} type="submit">
          {busy ? "Enregistrement…" : "Enregistrer le fournisseur"}
        </Button>
      </div>
    </form>
  );
}

function OrderForm({
  order,
  initialLines,
  fromAlerts,
  productId,
  onClose,
  onSaved,
}: {
  order?: PurchaseOrder;
  initialLines: PurchaseOrderLine[];
  fromAlerts: boolean;
  productId?: string;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { currentUser } = useAuth();
  const purchasing = usePurchasing();
  const products = useProductsRepository();
  const [orderId] = useState(() => order?.id ?? generateId());
  const [supplier, setSupplier] = useState(order?.supplier_id ?? "");
  const ordered = productId
    ? products.data.find((product) => product.id === productId)
    : undefined;
  const [rows, setRows] = useState(() =>
    initialLines.length
      ? initialLines.map((line) => ({
          key: generateId(),
          productId: line.product_id,
          quantity: String(line.quantity),
          cost: String(line.unit_cost_amount / 100),
        }))
      : // One product ordered from its row: the missing quantity, at least one.
        ordered
        ? [
            {
              key: generateId(),
              productId: ordered.id,
              quantity: String(Math.max(1, restockNeed(ordered))),
              cost: String(ordered.purchasePriceAmount / 100),
            },
          ]
        : fromAlerts
          ? products.data
              .filter(
                (product) => !product.archivedAt && restockNeed(product) > 0
              )
              .map((product) => ({
                key: generateId(),
                productId: product.id,
                quantity: String(restockNeed(product)),
                cost: String(product.purchasePriceAmount / 100),
              }))
          : [{ key: generateId(), productId: "", quantity: "1", cost: "0" }]
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = rows.map((row) => ({
    productId: row.productId,
    quantity: parseStockQuantityInput(row.quantity),
    unitCostAmount: parseCost(row.cost),
  }));
  const valid =
    !!supplier &&
    payload.length > 0 &&
    payload.every(
      (line) =>
        line.productId &&
        line.quantity > 0 &&
        Number.isSafeInteger(line.unitCostAmount)
    );
  const total = payload.reduce(
    (sum, line) => sum + Math.round(line.quantity * line.unitCostAmount),
    0
  );
  const update = (key: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((items) =>
      items.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  return (
    <form
      aria-label="Bon de commande"
      className="space-y-4 border-border border-y bg-muted/10 p-5"
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
            await purchasingService.saveOrder({
              id: orderId,
              create: !order,
              supplierId: supplier,
              lines: payload,
              authorId: currentUser.id,
              expectedFingerprint: order?.fingerprint,
            });
            onSaved(orderId);
          },
          {
            recover: (error) => {
              setError(failure(error));
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div>
        <h3 className="font-medium text-base">
          {order ? "Modifier le brouillon" : "Préparer une commande"}
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          {fromAlerts
            ? "Les quantités proposées correspondent au manque par rapport aux seuils actuels. Vérifiez-les avant confirmation."
            : "Choisissez les produits, leurs quantités physiques et le coût d’achat convenu."}
        </p>
      </div>
      <div className="max-w-lg space-y-1.5">
        <label className="text-sm" htmlFor="order-supplier">
          Fournisseur
        </label>
        <SearchableSelect
          controlClassName="h-11 [&_input]:text-foreground"
          disabled={busy}
          id="order-supplier"
          label="Fournisseur de la commande"
          onValueChange={setSupplier}
          options={purchasing.suppliers
            .filter((row) => !row.archived_at)
            .map((row) => ({ value: row.id, label: row.name }))}
          value={supplier}
        />
      </div>
      {rows.map((row, index) => {
        const product = products.data.find((item) => item.id === row.productId);
        return (
          <fieldset
            className="grid gap-3 border-border border-t pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_9rem_10rem_auto]"
            disabled={busy}
            key={row.key}
          >
            <div className="min-w-0 space-y-1.5">
              <label className="text-sm" htmlFor={`order-product-${row.key}`}>
                Produit {index + 1}
              </label>
              <SearchableSelect
                controlClassName="h-11 [&_input]:text-foreground"
                disabled={busy}
                id={`order-product-${row.key}`}
                label={`Produit à commander ${index + 1}`}
                onValueChange={(productId) =>
                  update(row.key, {
                    productId,
                    cost: String(
                      (products.data.find((item) => item.id === productId)
                        ?.purchasePriceAmount ?? 0) / 100
                    ),
                  })
                }
                options={products.data
                  .filter(
                    (item) => !item.archivedAt && item.stockTracked !== false
                  )
                  .map((item) => ({ value: item.id, label: item.name }))}
                value={row.productId}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm" htmlFor={`order-qty-${row.key}`}>
                Quantité{product ? ` (${product.unit})` : ""}
              </label>
              <Input
                aria-label={`Quantité à commander ${index + 1}`}
                className="h-11 tabular-nums"
                id={`order-qty-${row.key}`}
                inputMode="decimal"
                onChange={(event) =>
                  update(row.key, { quantity: event.target.value })
                }
                value={row.quantity}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm" htmlFor={`order-cost-${row.key}`}>
                Coût unitaire (DA)
              </label>
              <Input
                aria-label={`Coût unitaire ${index + 1}`}
                className="h-11 tabular-nums"
                id={`order-cost-${row.key}`}
                inputMode="decimal"
                onChange={(event) =>
                  update(row.key, { cost: event.target.value })
                }
                value={row.cost}
              />
            </div>
            <Button
              aria-label={`Retirer le produit ${index + 1}`}
              className="h-11 self-end"
              onClick={() =>
                setRows((items) => items.filter((item) => item.key !== row.key))
              }
              type="button"
              variant="ghost"
            >
              Retirer
            </Button>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          disabled={busy}
          onClick={() =>
            setRows((items) => [
              ...items,
              { key: generateId(), productId: "", quantity: "1", cost: "0" },
            ])
          }
          type="button"
          variant="outline"
        >
          <Plus className="size-4" />
          Ajouter un produit
        </Button>
        <p className="text-sm tabular-nums">
          Total : <strong>{valid ? formatDZD(total) : "À compléter"}</strong>
        </p>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          disabled={busy}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button disabled={busy || !valid || !currentUser} type="submit">
          {busy ? "Enregistrement…" : "Enregistrer le brouillon"}
        </Button>
      </div>
    </form>
  );
}

function ReceiptForm({
  order,
  lines,
  onClose,
}: {
  order: PurchaseOrder;
  lines: PurchaseOrderLine[];
  onClose: () => void;
}) {
  const { currentUser } = useAuth();
  const inventory = useStockInventory();
  const [requestId] = useState(generateId);
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(
    () =>
      `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
  );
  const [rows, setRows] = useState(() =>
    lines
      .filter((line) => line.quantity > line.received_quantity)
      .map((line) => ({
        ...line,
        received: String(stockBalance(line.quantity - line.received_quantity)),
        lot: "",
        expiry: undefined as Date | undefined,
        location: "stock-main",
      }))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quantities = rows.map((row) => parseStockQuantityInput(row.received));
  const valid =
    quantities.some((qty) => qty > 0) &&
    quantities.every(
      (qty, index) =>
        qty >= 0 &&
        qty <=
          stockBalance(rows[index].quantity - rows[index].received_quantity)
    );
  const update = (lineId: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((items) =>
      items.map((row) => (row.id === lineId ? { ...row, ...patch } : row))
    );
  return (
    <form
      aria-label="Réception de commande"
      className="space-y-5 border-border border-y bg-muted/10 p-5"
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
            const receivedAt = new Date(`${stockDay(date)}T${time}:00`);
            if (
              !(
                TIME_HH_MM.test(time) && Number.isFinite(receivedAt.getTime())
              ) ||
              stockDay(receivedAt) !== stockDay(date) ||
              `${String(receivedAt.getHours()).padStart(2, "0")}:${String(receivedAt.getMinutes()).padStart(2, "0")}` !==
                time
            ) {
              throw new StockError(
                "SOURCE_CONFLICT",
                "Choisissez une date et une heure de réception valides."
              );
            }
            await purchasingService.receive({
              id: requestId,
              orderId: order.id,
              reference,
              receivedAt: receivedAt.toISOString(),
              authorId: currentUser.id,
              lines: rows
                .filter((_, index) => quantities[index] > 0)
                .map((row) => ({
                  orderLineId: row.id,
                  quantity: parseStockQuantityInput(row.received),
                  lotNumber: row.lot,
                  expiryDate: row.expiry ? stockDay(row.expiry) : null,
                  locationId: row.location,
                })),
            });
            onClose();
          },
          {
            recover: (error) => {
              setError(failure(error));
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div>
        <h3 className="font-medium text-base">
          Réceptionner {order.reference}
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Vérifiez les quantités réellement reçues. Laissez 0 pour un produit
          non livré.
        </p>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="receipt-reference">
            Référence du bon de livraison
          </label>
          <Input
            className="h-11"
            id="receipt-reference"
            onChange={(event) => setReference(event.target.value)}
            value={reference}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm">Date et heure de réception</label>
          <div className="flex gap-2">
            <StockDatePicker
              disabled={busy}
              label="Date de réception de commande"
              onChange={(value) => {
                if (value) {
                  setDate(value);
                }
              }}
              value={date}
            />
            <CareTimePicker
              label="Heure de réception"
              onChange={setTime}
              value={time}
            />
          </div>
        </div>
      </fieldset>
      {rows.map((row, index) => (
        <fieldset
          className="space-y-3 border-border border-t pt-4"
          disabled={busy}
          key={row.id}
        >
          <div className="flex flex-wrap justify-between gap-2">
            <h4 className="font-medium text-sm">{row.product_name}</h4>
            <span className="text-muted-foreground text-xs tabular-nums">
              Reste à recevoir :{" "}
              {stockQuantityLabel(
                stockBalance(row.quantity - row.received_quantity),
                row.unit
              )}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-sm" htmlFor={`receive-qty-${row.id}`}>
                Quantité ({row.unit})
              </label>
              <Input
                aria-label={`Quantité reçue ${index + 1}`}
                className="h-11 tabular-nums"
                id={`receive-qty-${row.id}`}
                inputMode="decimal"
                onChange={(event) =>
                  update(row.id, { received: event.target.value })
                }
                value={row.received}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm" htmlFor={`receive-lot-${row.id}`}>
                Numéro de lot
              </label>
              <Input
                aria-label={`Lot reçu ${index + 1}`}
                className="h-11"
                id={`receive-lot-${row.id}`}
                onChange={(event) =>
                  update(row.id, { lot: event.target.value })
                }
                placeholder="Facultatif"
                value={row.lot}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm">Péremption</label>
              <StockDatePicker
                clearable
                disabled={busy}
                label={`Péremption reçue ${index + 1}`}
                onChange={(expiry) => update(row.id, { expiry })}
                value={row.expiry}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label className="text-sm">Emplacement</label>
              <SearchableSelect
                controlClassName="h-11 [&_input]:text-foreground"
                disabled={busy}
                label={`Emplacement reçu ${index + 1}`}
                onValueChange={(location) => update(row.id, { location })}
                options={inventory.locations
                  .filter((item) => item.active)
                  .map((item) => ({ value: item.id, label: item.name }))}
                value={row.location}
              />
            </div>
          </div>
        </fieldset>
      ))}
      {!valid && (
        <p className="text-muted-foreground text-sm">
          Saisissez au moins une quantité positive, sans dépasser le restant
          commandé.
        </p>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          disabled={busy}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          disabled={busy || !valid || !inventory.ready || !currentUser}
          type="submit"
        >
          {busy ? "Réception…" : "Confirmer la réception"}
        </Button>
      </div>
    </form>
  );
}

/** `orderFor`: a product to order on its own, from its catalogue row. */
export function PurchasingPanel({
  orderFor,
  onOrderOpened,
}: {
  orderFor?: string | null;
  onOrderOpened?: () => void;
} = {}) {
  const purchasing = usePurchasing();
  const products = useProductsRepository();
  const { currentUser } = useAuth();
  const [view, setView] = useState("orders");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [supplierEdit, setSupplierEdit] = useState<
    StockSupplier | "new" | null
  >(null);
  const [orderEdit, setOrderEdit] = useState<{
    order?: PurchaseOrder;
    fromAlerts: boolean;
    productId?: string;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeSuppliers = purchasing.suppliers.filter(
    (item) => !item.archived_at
  );
  const needs = products.data.filter(
    (item) => !item.archivedAt && restockNeed(item) > 0
  );
  const order = purchasing.orders.find((item) => item.id === selected);
  const lines = purchasing.lines.filter((line) => line.order_id === selected);
  const supplier = purchasing.suppliers.find(
    (item) => item.id === order?.supplier_id
  );
  // Without an active supplier no order can be saved: say so instead of
  // opening a form that cannot be confirmed.
  const [missingSupplierFor, setMissingSupplierFor] = useState<string | null>(
    null
  );
  // Une commande demandée depuis une alerte de stock : l'écran s'ouvre dès le rendu où les données sont prêtes (corrigé au rendu, sans effet) ;
  // l'effet ne fait qu'avertir le parent que la demande est prise en compte.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (orderFor && purchasing.ready && openedFor !== orderFor) {
    setOpenedFor(orderFor);
    setView("orders");
    setSelected(null);
    if (purchasing.suppliers.some((item) => !item.archived_at)) {
      setOrderEdit({ fromAlerts: false, productId: orderFor });
      setMissingSupplierFor(null);
    } else {
      setOrderEdit(null);
      setMissingSupplierFor(orderFor);
    }
  } else if (!orderFor && openedFor !== null) {
    setOpenedFor(null);
  }
  useEffect(() => {
    if (orderFor && openedFor === orderFor) {
      onOrderOpened?.();
    }
  }, [orderFor, openedFor, onOrderOpened]);
  const missingSupplierProduct = missingSupplierFor
    ? products.data.find((item) => item.id === missingSupplierFor)
    : undefined;
  const run = async (operation: () => Promise<unknown>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    await guard(
      async () => {
        await operation();
      },
      {
        recover: (error) => {
          setError(failure(error));
        },
        cleanup: () => {
          setBusy(false);
        },
      }
    );
  };
  if (!isTauriRuntime()) {
    return (
      <p className="p-5 text-muted-foreground text-sm">
        Les fournisseurs, commandes et réceptions sont disponibles dans
        l’application de bureau.
      </p>
    );
  }
  return (
    <section aria-label="Approvisionnements" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b p-4">
        <Tabs
          onValueChange={(value) => {
            setView(value);
            setSelected(null);
            setOrderEdit(null);
            setReceiving(false);
          }}
          value={view}
        >
          <TabsList aria-label="Vue des approvisionnements">
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          {view === "orders" ? (
            <>
              <Button
                disabled={
                  !(
                    purchasing.ready &&
                    activeSuppliers.length &&
                    needs.length
                  ) || products.data.some((item) => item.availabilityPending)
                }
                onClick={() => {
                  setOrderEdit({ fromAlerts: true });
                  setSelected(null);
                }}
                variant="outline"
              >
                Depuis les alertes ({needs.length})
              </Button>
              <Button
                disabled={!(purchasing.ready && activeSuppliers.length)}
                onClick={() => {
                  setOrderEdit({ fromAlerts: false });
                  setSelected(null);
                }}
              >
                <Plus className="size-4" />
                Nouvelle commande
              </Button>
            </>
          ) : (
            <Button
              disabled={!purchasing.ready}
              onClick={() => setSupplierEdit("new")}
            >
              <Plus className="size-4" />
              Nouveau fournisseur
            </Button>
          )}
        </div>
      </div>
      {missingSupplierFor && !activeSuppliers.length && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-amber-50/60 px-4 py-3 text-sm dark:bg-amber-500/[0.06]"
          role="status"
        >
          <span>
            Aucun fournisseur actif : ajoutez-en un pour commander{" "}
            {missingSupplierProduct?.name ?? "ce produit"}.
          </span>
          <Button
            onClick={() => {
              setView("suppliers");
              setSupplierEdit("new");
              setMissingSupplierFor(null);
            }}
            size="sm"
          >
            <Plus className="size-4" />
            Ajouter un fournisseur
          </Button>
        </div>
      )}
      {purchasing.error ? (
        <ErrorState
          className="p-4"
          message={purchasing.error}
          onRetry={() => void purchasing.refresh()}
        />
      ) : (
        error && (
          <p className="p-4 text-destructive text-sm" role="alert">
            {error}
          </p>
        )
      )}
      {!(purchasing.ready || purchasing.error) && (
        <p className="p-4 text-muted-foreground text-sm" role="status">
          Chargement des approvisionnements…
        </p>
      )}
      {view === "suppliers" ? (
        <>
          {supplierEdit && (
            <SupplierForm
              key={supplierEdit === "new" ? "new" : supplierEdit.id}
              onClose={() => setSupplierEdit(null)}
              supplier={supplierEdit === "new" ? undefined : supplierEdit}
            />
          )}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Fournisseur</TableHead>
                <TableHead className="w-[35%]">Contact</TableHead>
                <TableHead className="w-[35%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasing.suppliers.length ? (
                purchasing.suppliers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-normal break-words align-top">
                      <span className="font-medium">{item.name}</span>
                      {item.archived_at && (
                        <Badge className="ml-2" variant="outline">
                          Archivé
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words align-top">
                      <span className="block">{formatPhone(item.phone)}</span>
                      <span className="block text-muted-foreground text-xs">
                        {item.email || item.address || "Contact non renseigné"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-normal align-top">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          onClick={() => {
                            setView("orders");
                            setSupplierFilter(item.id);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          Historique
                        </Button>
                        <Button
                          onClick={() => setSupplierEdit(item)}
                          size="sm"
                          variant="ghost"
                        >
                          Modifier
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              purchasingService.supplier({
                                id: item.id,
                                name: item.name,
                                phone: item.phone,
                                email: item.email,
                                address: item.address,
                                notes: item.notes,
                                archivedAt: item.archived_at
                                  ? null
                                  : new Date().toISOString(),
                              })
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          {item.archived_at ? "Restaurer" : "Archiver"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="h-32 whitespace-normal text-center text-muted-foreground"
                    colSpan={3}
                  >
                    Ajoutez un fournisseur pour préparer votre première
                    commande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          {!activeSuppliers.length && purchasing.ready && (
            <p className="p-4 text-muted-foreground text-sm">
              Ajoutez un fournisseur dans l’onglet Fournisseurs pour préparer
              une commande.
            </p>
          )}
          {orderEdit ? (
            <OrderForm
              fromAlerts={orderEdit.fromAlerts}
              initialLines={purchasing.lines.filter(
                (line) => line.order_id === orderEdit.order?.id
              )}
              key={orderEdit.order?.id ?? orderEdit.productId ?? "new"}
              onClose={() => setOrderEdit(null)}
              onSaved={(id) => {
                setOrderEdit(null);
                setSelected(id);
              }}
              order={orderEdit.order}
              productId={orderEdit.productId}
            />
          ) : order ? (
            <>
              <div className="space-y-4 p-5">
                <Button
                  onClick={() => {
                    setSelected(null);
                    setReceiving(false);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <ArrowLeft className="size-4" />
                  Toutes les commandes
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-lg">{order.reference}</h3>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {order.supplier_name} · {dateLabel(order.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{labels[order.status]}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status === "draft" && (
                    <>
                      <Button
                        disabled={busy || !purchasing.ready || !currentUser}
                        onClick={() =>
                          void run(() =>
                            purchasingService.transition(
                              order.id,
                              "order",
                              currentUser!.id
                            )
                          )
                        }
                      >
                        Confirmer la commande
                      </Button>
                      <Button
                        onClick={() =>
                          setOrderEdit({ order, fromAlerts: false })
                        }
                        variant="outline"
                      >
                        Modifier le brouillon
                      </Button>
                    </>
                  )}
                  {["ordered", "partial"].includes(order.status) && (
                    <Button
                      disabled={busy || !purchasing.ready}
                      onClick={() => setReceiving(true)}
                    >
                      Réceptionner
                    </Button>
                  )}
                  <Button
                    disabled={busy || !supplier}
                    onClick={() =>
                      void run(() =>
                        exportPurchaseOrder(order, supplier!, lines)
                      )
                    }
                    variant="outline"
                  >
                    Exporter le bon
                  </Button>
                  {["draft", "ordered", "partial"].includes(order.status) && (
                    <Button
                      disabled={busy || !currentUser}
                      onClick={() => {
                        setError(null);
                        setCancelling(order);
                      }}
                      variant="ghost"
                    >
                      {order.status === "partial"
                        ? "Annuler le reliquat"
                        : "Annuler la commande"}
                    </Button>
                  )}
                </div>
              </div>
              {receiving && (
                <ReceiptForm
                  key={order.id}
                  lines={lines}
                  onClose={() => setReceiving(false)}
                  order={order}
                />
              )}
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Produit</TableHead>
                    <TableHead className="w-[20%] text-right">
                      Commandé
                    </TableHead>
                    <TableHead className="w-[20%] text-right">Reçu</TableHead>
                    <TableHead className="w-[20%] text-right">
                      Coût unitaire
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="whitespace-normal break-words font-medium">
                        {line.product_name}
                      </TableCell>
                      <TableCell className="whitespace-normal text-right tabular-nums">
                        {stockQuantityLabel(line.quantity, line.unit)}
                      </TableCell>
                      <TableCell className="whitespace-normal text-right tabular-nums">
                        {stockQuantityLabel(line.received_quantity, line.unit)}
                      </TableCell>
                      <TableCell className="whitespace-normal text-right tabular-nums">
                        {formatDZD(line.unit_cost_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="border-border border-y p-4 text-right text-sm tabular-nums">
                Total de la commande :{" "}
                <strong>{formatDZD(order.total_amount)}</strong>
              </p>
              <div className="space-y-3 p-5">
                <h4 className="font-medium">Réceptions</h4>
                {purchasing.receipts.some(
                  (item) => item.order_id === order.id
                ) ? (
                  purchasing.receipts
                    .filter((item) => item.order_id === order.id)
                    .map((item) => (
                      <div
                        className="border-border border-t pt-3"
                        key={item.id}
                      >
                        <p className="font-medium text-sm">
                          {item.reference || "Livraison sans référence"} ·{" "}
                          {dateLabel(item.received_at)}
                        </p>
                        <ul className="mt-2 space-y-1 text-muted-foreground text-xs">
                          {purchasing.receiptLines
                            .filter((line) => line.receipt_id === item.id)
                            .map((line) => {
                              const source = lines.find(
                                (item) => item.id === line.order_line_id
                              );
                              return (
                                <li key={line.id}>
                                  {source?.product_name} ·{" "}
                                  {stockQuantityLabel(
                                    line.quantity,
                                    source?.unit || "unité"
                                  )}{" "}
                                  ·{" "}
                                  {line.lot_number
                                    ? `Lot ${line.lot_number}`
                                    : "Sans lot"}{" "}
                                  · Mouvement enregistré
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aucune réception enregistrée.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="max-w-sm p-4">
                <SearchableSelect
                  controlClassName="[&_input]:text-foreground"
                  label="Historique du fournisseur"
                  onValueChange={setSupplierFilter}
                  options={[
                    { value: "", label: "Tous les fournisseurs" },
                    ...purchasing.suppliers.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  ]}
                  value={supplierFilter}
                />
              </div>
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Commande</TableHead>
                    <TableHead className="w-[30%]">Fournisseur</TableHead>
                    <TableHead className="w-[23%]">État</TableHead>
                    <TableHead className="w-[17%] text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchasing.orders.some(
                    (item) =>
                      !supplierFilter || item.supplier_id === supplierFilter
                  ) ? (
                    purchasing.orders
                      .filter(
                        (item) =>
                          !supplierFilter || item.supplier_id === supplierFilter
                      )
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-normal break-words">
                            <Button
                              className="h-auto whitespace-normal p-0 text-left dark:text-blue-300 dark:hover:text-blue-200"
                              onClick={() => {
                                setSelected(item.id);
                                setReceiving(false);
                              }}
                              variant="link"
                            >
                              {item.reference}
                            </Button>
                            <span className="mt-1 block text-muted-foreground text-xs">
                              {dateLabel(item.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words">
                            {item.supplier_name}
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            <Badge variant="outline">
                              {labels[item.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal text-right tabular-nums">
                            {formatDZD(item.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className="h-32 whitespace-normal text-center text-muted-foreground"
                        colSpan={4}
                      >
                        Aucune commande pour ce filtre.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}
      <AlertDialog
        onOpenChange={(open) => {
          if (!(open || busy)) {
            setCancelling(null);
          }
        }}
        open={!!cancelling}
      >
        <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelling?.status === "partial"
                ? "Annuler le reliquat de"
                : "Annuler la commande"}{" "}
              {cancelling?.reference} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.status === "partial"
                ? "Seules les quantités restant à recevoir seront annulées. Les réceptions déjà enregistrées et leurs mouvements sont conservés."
                : "Cette commande ne pourra plus être réceptionnée. Aucun stock ne sera modifié."}{" "}
              Cette annulation est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter className="sm:flex-wrap">
            <AlertDialogCancel disabled={busy}>
              Conserver la commande
            </AlertDialogCancel>
            <Button
              className="text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
              disabled={busy || !cancelling || !currentUser}
              onClick={() =>
                void run(async () => {
                  await purchasingService.transition(
                    cancelling!.id,
                    "cancel",
                    currentUser!.id
                  );
                  setCancelling(null);
                  setReceiving(false);
                })
              }
              variant="destructive"
            >
              {busy
                ? "Annulation…"
                : cancelling?.status === "partial"
                  ? "Confirmer l’annulation du reliquat"
                  : "Confirmer l’annulation"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
