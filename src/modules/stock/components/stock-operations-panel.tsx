import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import {
  StockError,
  parseStockQuantityInput,
  stockBalance,
  stockQuantityLabel,
} from "@/domain/stock";
import { stockDay, stockTimestamp } from "@/domain/stock-date";
import { generateId } from "@/services/sqlite/database";
import { isTauriRuntime } from "@/services/browser-store";
import { useStockOperations } from "../hooks/use-stock-operations";
import { useStockInventory } from "../hooks/use-stock-inventory";
import { stockOperationsService } from "../services/stock-operations-service";
import type { StockProduct } from "../services/stock-database";
import type { InventoryLocation } from "../services/lot-store";
import { StockDatePicker } from "./stock-date-picker";
import { StockLotSelect } from "./stock-lot-select";
import { guard, guardSync } from "@/lib/guard";

const failure = (error: unknown) =>
  error instanceof StockError
    ? error.message
    : "L’opération n’a pas pu être enregistrée. Réessayez.";

function BarcodeMappingForm({ onClose }: { onClose: () => void }) {
  const products = useProductsRepository();
  const [id] = useState(generateId);
  const [code, setCode] = useState("");
  const [product, setProduct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      aria-label="Associer un code-barres"
      className="space-y-4 border-border border-y bg-muted/10 p-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !code.trim() || !product) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await stockOperationsService.barcode({
              id,
              code,
              productId: product,
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
      <h3 className="font-medium text-base">Associer un code-barres</h3>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="barcode-map-code">
            Code-barres
          </label>
          <Input
            autoComplete="off"
            className="h-11 font-mono"
            id="barcode-map-code"
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            value={code}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="barcode-map-product">
            Produit
          </label>
          <SearchableSelect
            controlClassName="h-11 [&_input]:text-foreground"
            disabled={busy}
            id="barcode-map-product"
            label="Produit du code-barres"
            onValueChange={setProduct}
            options={products.data
              .filter((item) => !item.archivedAt && item.stockTracked !== false)
              .map((item) => ({ value: item.id, label: item.name }))}
            value={product}
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
        <Button disabled={busy || !code.trim() || !product} type="submit">
          {busy ? "Enregistrement…" : "Associer le code"}
        </Button>
      </div>
    </form>
  );
}

function Scanner({ onOpenMovements }: { onOpenMovements?: () => void }) {
  const { currentUser } = useAuth();
  const products = useProductsRepository();
  const inventory = useStockInventory();
  const field = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [matched, setMatched] = useState<StockProduct | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("stock-main");
  const [lot, setLot] = useState("fifo");
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState<Date>();
  const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (saved && !busy && !matched) {
      field.current?.focus();
    }
  }, [saved, busy, matched]);
  const changed = (operation: () => void) => {
    operation();
    setRequestId(generateId());
    setError(null);
  };
  const current = products.data.find((item) => item.id === matched?.id);
  const qty = parseStockQuantityInput(quantity);
  const available = stockBalance(
    inventory.balances
      .filter((row) =>
        guardSync(
          () =>
            row.productId === matched?.id &&
            row.locationId === location &&
            row.locationActive &&
            row.quantity > 0 &&
            (!row.expiryDate || row.expiryDate >= stockDay()) &&
            stockDay(new Date(stockTimestamp(row.receivedAt))) <= stockDay() &&
            (lot === "fifo" ||
              row.lotId === (lot === "unassigned" ? null : lot)),
          {
            recover: () => false,
          }
        )
      )
      .reduce((sum, row) => sum + row.quantity, 0)
  );
  const valid =
    !!matched &&
    !!current &&
    !current.archivedAt &&
    !current.availabilityPending &&
    !current.inventoryInvalid &&
    qty > 0 &&
    (direction === "in" || qty <= available);
  const insufficient =
    inventory.ready && direction === "out" && qty > available;
  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="font-medium text-base">Entrée ou sortie rapide</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Scannez avec votre lecteur ou saisissez le code. Vérifiez le produit
          et la quantité avant confirmation.
        </p>
      </div>
      <form
        aria-label="Identifier un code-barres"
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !code.trim()) {
            return;
          }
          setBusy(true);
          setError(null);
          setSaved(null);
          await guard(
            async () => {
              const product = await stockOperationsService.lookup(code);
              setMatched(product);
              setQuantity("1");
              setLot("fifo");
              setLotNumber("");
              setExpiry(undefined);
              setRequestId(generateId());
            },
            {
              recover: (error) => {
                setMatched(null);
                setError(failure(error));
              },
              cleanup: () => {
                setBusy(false);
              },
            }
          );
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-sm" htmlFor="stock-scan-code">
            Code-barres à identifier
          </label>
          <Input
            autoComplete="off"
            className="h-11 font-mono"
            disabled={busy}
            id="stock-scan-code"
            onChange={(event) => {
              setCode(event.target.value);
              setMatched(null);
              setError(null);
            }}
            placeholder="Scanner ou saisir…"
            ref={field}
            spellCheck={false}
            value={code}
          />
        </div>
        <Button
          className="h-11"
          disabled={busy || !code.trim()}
          type="submit"
          variant="outline"
        >
          Identifier
        </Button>
      </form>
      {matched && (
        <form
          aria-label="Mouvement par code-barres"
          className="space-y-4 border-border border-t pt-5"
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
                const result = await stockOperationsService.scan({
                  id: requestId,
                  code,
                  direction,
                  quantity: qty,
                  locationId: location,
                  authorId: currentUser.id,
                  ...(direction === "out"
                    ? lot === "unassigned"
                      ? { lotId: null }
                      : lot === "fifo"
                        ? {}
                        : { lotId: lot }
                    : {
                        lotNumber,
                        expiryDate: expiry ? stockDay(expiry) : null,
                      }),
                });
                setSaved(
                  `${direction === "in" ? "Entrée" : "Sortie"} de ${stockQuantityLabel(qty, matched.unit)} enregistrée pour ${matched.name}. Solde après opération : ${stockQuantityLabel(result.quantityAfter, matched.unit)}.`
                );
                setMatched(null);
                setCode("");
                field.current?.focus();
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-medium">{matched.name}</h4>
            <Tabs
              onValueChange={(value) =>
                changed(() => {
                  setDirection(value as typeof direction);
                  setLot("fifo");
                  setLotNumber("");
                  setExpiry(undefined);
                })
              }
              value={direction}
            >
              <TabsList aria-label="Sens du mouvement">
                <TabsTrigger disabled={busy} value="in">
                  Entrée
                </TabsTrigger>
                <TabsTrigger disabled={busy} value="out">
                  Sortie
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
            <div className="space-y-1.5">
              <label className="text-sm" htmlFor="scan-quantity">
                Quantité ({matched.unit})
              </label>
              <Input
                aria-describedby={
                  direction === "out" ? "scan-stock-availability" : undefined
                }
                aria-invalid={insufficient || undefined}
                className="h-11 tabular-nums"
                id="scan-quantity"
                inputMode="decimal"
                onChange={(event) =>
                  changed(() => setQuantity(event.target.value))
                }
                value={quantity}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label className="text-sm" htmlFor="scan-location">
                Emplacement
              </label>
              <SearchableSelect
                controlClassName="h-11 [&_input]:text-foreground"
                disabled={busy}
                id="scan-location"
                label="Emplacement du mouvement"
                onValueChange={(value) =>
                  changed(() => {
                    setLocation(value);
                    setLot("fifo");
                  })
                }
                options={inventory.locations
                  .filter((row) => row.active)
                  .map((row) => ({ value: row.id, label: row.name }))}
                value={location}
              />
            </div>
          </fieldset>
          {direction === "out" ? (
            <>
              <StockLotSelect
                disabled={busy}
                label="Lot à sortir"
                locationId={location}
                onChange={(value) => changed(() => setLot(value))}
                productId={matched.id}
                unit={matched.unit}
                value={lot}
              />
              <p
                aria-atomic="true"
                aria-live="polite"
                className={`text-xs tabular-nums ${insufficient ? "text-destructive" : "text-muted-foreground"}`}
                id="scan-stock-availability"
                role="status"
              >
                {insufficient
                  ? `Stock insuffisant : ${stockQuantityLabel(qty, matched.unit)} demandés, ${stockQuantityLabel(available, matched.unit)} disponibles. Réduisez la quantité ou changez de lot ou d’emplacement.`
                  : `Stock utilisable dans cet emplacement : ${stockQuantityLabel(available, matched.unit)}.`}
              </p>
            </>
          ) : (
            <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
              <div className="space-y-1.5">
                <label className="text-sm" htmlFor="scan-lot-number">
                  Numéro de lot (facultatif)
                </label>
                <Input
                  className="h-11"
                  id="scan-lot-number"
                  onChange={(event) =>
                    changed(() => setLotNumber(event.target.value))
                  }
                  value={lotNumber}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm">Péremption du lot</label>
                <StockDatePicker
                  clearable
                  disabled={busy}
                  label="Péremption du lot scanné"
                  onChange={(value) => changed(() => setExpiry(value))}
                  value={expiry}
                />
              </div>
            </fieldset>
          )}
          <div className="flex justify-end">
            <Button
              disabled={busy || !valid || !inventory.ready || !currentUser}
              type="submit"
            >
              {busy
                ? "Enregistrement…"
                : direction === "in"
                  ? "Confirmer l’entrée"
                  : "Confirmer la sortie"}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-border border-t pt-4 text-sm"
          role="status"
        >
          <p>{saved}</p>
          {onOpenMovements && (
            <Button
              className="dark:text-blue-300 dark:hover:text-blue-200"
              onClick={onOpenMovements}
              variant="link"
            >
              Voir les mouvements
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function LocationForm({
  location,
  onClose,
}: {
  location?: InventoryLocation;
  onClose: () => void;
}) {
  const [id] = useState(() => location?.id ?? generateId());
  const [name, setName] = useState(location?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      aria-label="Emplacement de stock"
      className="space-y-4 border-border border-y bg-muted/10 p-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !name.trim()) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await stockOperationsService.location({ id, name });
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
        {location ? "Modifier l’emplacement" : "Nouvel emplacement de stock"}
      </h3>
      <div className="max-w-lg space-y-1.5">
        <label className="text-sm" htmlFor="stock-location-name">
          Nom de l’emplacement
        </label>
        <Input
          className="h-11"
          disabled={busy}
          id="stock-location-name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
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
        <Button disabled={busy || !name.trim()} type="submit">
          {busy ? "Enregistrement…" : "Enregistrer l’emplacement"}
        </Button>
      </div>
    </form>
  );
}

function TransferForm({ onClose }: { onClose: () => void }) {
  const { currentUser } = useAuth();
  const products = useProductsRepository();
  const inventory = useStockInventory();
  const [requestId, setRequestId] = useState(generateId);
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("stock-main");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lot, setLot] = useState("fifo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const product = products.data.find((row) => row.id === productId);
  const qty = parseStockQuantityInput(quantity);
  const changed = (operation: () => void) => {
    operation();
    setRequestId(generateId());
    setError(null);
  };
  const buckets = inventory.balances.filter(
    (row) =>
      row.productId === productId && row.locationId === from && row.quantity > 0
  );
  const groups = new Map<string, { name: string; quantity: number }>();
  for (const row of buckets) {
    const key = row.lotId ?? "unassigned";
    const group = groups.get(key) ?? {
      name: row.lotNumber || "Sans lot",
      quantity: 0,
    };
    group.quantity = stockBalance(group.quantity + row.quantity);
    groups.set(key, group);
  }
  const available = stockBalance(
    buckets
      .filter(
        (row) =>
          lot === "fifo" || row.lotId === (lot === "unassigned" ? null : lot)
      )
      .reduce((sum, row) => sum + row.quantity, 0)
  );
  const valid =
    product &&
    !product.archivedAt &&
    qty > 0 &&
    qty <= available &&
    from &&
    to &&
    from !== to;
  const insufficient = inventory.ready && !!product && qty > available;
  return (
    <form
      aria-label="Transfert de stock"
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
            await stockOperationsService.transfer({
              id: requestId,
              productId,
              fromLocationId: from,
              toLocationId: to,
              quantity: qty,
              authorId: currentUser.id,
              ...(lot === "unassigned"
                ? { lotId: null }
                : lot === "fifo"
                  ? {}
                  : { lotId: lot }),
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
        <h3 className="font-medium text-base">Transférer du stock</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Le total du produit reste inchangé. Les lots gardent leur péremption
          et leur date de réception.
        </p>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={busy}>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm" htmlFor="transfer-product">
            Produit
          </label>
          <SearchableSelect
            controlClassName="h-11 [&_input]:text-foreground"
            disabled={busy}
            id="transfer-product"
            label="Produit à transférer"
            onValueChange={(value) =>
              changed(() => {
                setProductId(value);
                setLot("fifo");
              })
            }
            options={products.data
              .filter((row) => !row.archivedAt && row.stockTracked !== false)
              .map((row) => ({ value: row.id, label: row.name }))}
            value={productId}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="transfer-quantity">
            Quantité{product ? ` (${product.unit})` : ""}
          </label>
          <Input
            aria-describedby="transfer-stock-availability"
            aria-invalid={insufficient || undefined}
            className="h-11 tabular-nums"
            id="transfer-quantity"
            inputMode="decimal"
            onChange={(event) => changed(() => setQuantity(event.target.value))}
            value={quantity}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm">Depuis</label>
          <SearchableSelect
            controlClassName="h-11 [&_input]:text-foreground"
            disabled={busy}
            label="Emplacement de départ"
            onValueChange={(value) =>
              changed(() => {
                setFrom(value);
                setLot("fifo");
                if (to === value) {
                  setTo("");
                }
              })
            }
            options={inventory.locations
              .filter((row) => row.active)
              .map((row) => ({ value: row.id, label: row.name }))}
            value={from}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm">Vers</label>
          <SearchableSelect
            controlClassName="h-11 [&_input]:text-foreground"
            disabled={busy}
            label="Emplacement d’arrivée"
            onValueChange={(value) => changed(() => setTo(value))}
            options={inventory.locations
              .filter((row) => row.active && row.id !== from)
              .map((row) => ({ value: row.id, label: row.name }))}
            value={to}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm">Lot</label>
          <SearchableSelect
            controlClassName="h-11 [&_input]:text-foreground"
            disabled={busy || !productId}
            label="Lot à transférer"
            onValueChange={(value) => changed(() => setLot(value))}
            options={[
              { value: "fifo", label: "Tous les lots, par réception" },
              ...[...groups].map(([value, row]) => ({
                value,
                label: `${row.name} · ${stockQuantityLabel(row.quantity, product?.unit || "unité")}`,
              })),
            ]}
            value={lot}
          />
        </div>
        <p
          aria-atomic="true"
          aria-live="polite"
          className={`self-center text-sm tabular-nums ${insufficient ? "text-destructive" : "text-muted-foreground"}`}
          id="transfer-stock-availability"
          role="status"
        >
          {insufficient
            ? `Stock insuffisant : ${stockQuantityLabel(qty, product?.unit || "unité")} demandés, ${stockQuantityLabel(available, product?.unit || "unité")} disponibles. Réduisez la quantité ou changez de lot ou d’emplacement.`
            : `Disponible au départ : ${stockQuantityLabel(available, product?.unit || "unité")}`}
        </p>
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
        <Button
          disabled={busy || !valid || !inventory.ready || !currentUser}
          type="submit"
        >
          {busy ? "Transfert…" : "Confirmer le transfert"}
        </Button>
      </div>
    </form>
  );
}

export function StockOperationsPanel({
  onOpenMovements,
}: {
  onOpenMovements?: () => void;
}) {
  const operations = useStockOperations();
  const inventory = useStockInventory();
  const { currentUser } = useAuth();
  const [view, setView] = useState("codes");
  const [mapping, setMapping] = useState(false);
  const [locationEdit, setLocationEdit] = useState<
    InventoryLocation | "new" | null
  >(null);
  const [transfer, setTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    await guard(
      async () => {
        await action();
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
        Les codes-barres, transferts et analyses de consommation sont
        disponibles dans l’application de bureau.
      </p>
    );
  }
  return (
    <section aria-label="Opérations de stock" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b p-4">
        <Tabs
          onValueChange={(value) => {
            setView(value);
            setMapping(false);
            setLocationEdit(null);
            setTransfer(false);
          }}
          value={view}
        >
          <TabsList aria-label="Vue des opérations">
            <TabsTrigger value="codes">Codes-barres</TabsTrigger>
            <TabsTrigger value="consumption">Consommation</TabsTrigger>
            <TabsTrigger value="locations">Emplacements</TabsTrigger>
          </TabsList>
        </Tabs>
        {view === "codes" && (
          <Button
            disabled={!operations.ready}
            onClick={() => setMapping(true)}
            variant="outline"
          >
            Associer un code
          </Button>
        )}
        {view === "locations" && (
          <div className="flex gap-2">
            <Button
              disabled={!inventory.ready}
              onClick={() => {
                setLocationEdit("new");
                setTransfer(false);
              }}
              variant="outline"
            >
              Nouvel emplacement
            </Button>
            <Button
              disabled={
                !inventory.ready ||
                inventory.locations.filter((row) => row.active).length < 2
              }
              onClick={() => {
                setTransfer(true);
                setLocationEdit(null);
              }}
            >
              Transférer
            </Button>
          </div>
        )}
      </div>
      {(operations.error || inventory.error || error) && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-4 text-destructive text-sm"
          role="alert"
        >
          {operations.error || inventory.error || error}
          <Button
            onClick={() => {
              operations.refresh();
              inventory.refresh();
            }}
            variant="outline"
          >
            Actualiser
          </Button>
        </div>
      )}
      {!(operations.ready || operations.error) && (
        <p className="p-4 text-muted-foreground text-sm" role="status">
          Chargement des opérations…
        </p>
      )}
      {view === "codes" ? (
        <>
          {mapping && <BarcodeMappingForm onClose={() => setMapping(false)} />}
          <Scanner onOpenMovements={onOpenMovements} />
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Code-barres</TableHead>
                <TableHead className="w-[45%]">Produit</TableHead>
                <TableHead className="w-[20%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.barcodes.length ? (
                operations.barcodes.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-normal break-all font-mono text-xs">
                      {row.code}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      {row.product_name}
                      {row.archived_at && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          Archivé
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={busy || !currentUser}
                        onClick={() =>
                          void run(() =>
                            stockOperationsService.removeBarcode(row.id)
                          )
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Retirer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="h-24 whitespace-normal text-center text-muted-foreground"
                    colSpan={3}
                  >
                    Aucun code associé. Associez le code présent sur l’emballage
                    à son produit.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      ) : view === "consumption" ? (
        <>
          <div className="space-y-1 p-5">
            <h3 className="font-medium">Consommation sur 30 jours</h3>
            <p className="text-muted-foreground text-sm">
              Sorties cliniques et sorties rapides réellement enregistrées. Le
              seuil proposé couvre 14 jours au même rythme ; il reste à votre
              choix.
            </p>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Produit</TableHead>
                <TableHead className="w-[20%] text-right">Utilisé</TableHead>
                <TableHead className="w-[20%] text-right">
                  Seuil actuel
                </TableHead>
                <TableHead className="w-[30%] text-right">
                  Proposition
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operations.consumption.length ? (
                operations.consumption.map((row) => (
                  <TableRow key={row.product_id}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {row.product_name}
                    </TableCell>
                    <TableCell className="whitespace-normal text-right tabular-nums">
                      {stockQuantityLabel(row.quantity, row.unit)}
                    </TableCell>
                    <TableCell className="whitespace-normal text-right tabular-nums">
                      {stockQuantityLabel(row.min_stock, row.unit)}
                    </TableCell>
                    <TableCell className="whitespace-normal text-right">
                      <span className="block tabular-nums">
                        {stockQuantityLabel(row.suggested_minimum, row.unit)}
                      </span>
                      <Button
                        className="dark:text-blue-300 dark:hover:text-blue-200"
                        disabled={
                          busy ||
                          !operations.ready ||
                          !currentUser ||
                          row.min_stock === row.suggested_minimum
                        }
                        onClick={() =>
                          void run(() =>
                            stockOperationsService.applyThreshold(
                              row.product_id,
                              row.suggested_minimum
                            )
                          )
                        }
                        size="sm"
                        variant="link"
                      >
                        {row.min_stock === row.suggested_minimum
                          ? "Appliqué"
                          : "Appliquer ce seuil"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="h-28 whitespace-normal text-center text-muted-foreground"
                    colSpan={4}
                  >
                    Aucune sortie enregistrée sur cette période.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          {locationEdit && (
            <LocationForm
              key={locationEdit === "new" ? "new" : locationEdit.id}
              location={locationEdit === "new" ? undefined : locationEdit}
              onClose={() => setLocationEdit(null)}
            />
          )}
          {transfer && <TransferForm onClose={() => setTransfer(false)} />}
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Emplacement</TableHead>
                <TableHead className="w-[30%]">Contenu</TableHead>
                <TableHead className="w-[35%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.locations.map((row) => {
                const count = new Set(
                  inventory.balances
                    .filter(
                      (item) =>
                        item.locationId === row.id && item.quantity !== 0
                    )
                    .map((item) => item.productId)
                ).size;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-normal break-words font-medium">
                      {row.name}
                      <Badge className="ml-2" variant="outline">
                        {row.active ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {count} produit{count > 1 ? "s" : ""} en stock
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          onClick={() => {
                            setLocationEdit(row);
                            setTransfer(false);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          Modifier
                        </Button>
                        <Button
                          disabled={
                            busy ||
                            row.id === "stock-main" ||
                            (row.active === 1 && count > 0)
                          }
                          onClick={() =>
                            void run(() =>
                              stockOperationsService.location({
                                id: row.id,
                                name: row.name,
                                active: !row.active,
                              })
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          {row.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="px-5 py-3 text-muted-foreground text-xs">
            Un emplacement contenant du stock doit être vidé avant
            désactivation.
          </p>
          <div className="space-y-3 border-border border-t p-5">
            <h3 className="font-medium">Historique des transferts</h3>
            {operations.transfers.length ? (
              operations.transfers.map((row) => (
                <div
                  className="flex flex-wrap justify-between gap-3 border-border border-t pt-3 text-sm"
                  key={row.id}
                >
                  <div>
                    <p className="font-medium">
                      {row.product_name} ·{" "}
                      {stockQuantityLabel(row.quantity, row.unit)}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {row.source_name} vers {row.target_name}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(row.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Aucun transfert enregistré.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
