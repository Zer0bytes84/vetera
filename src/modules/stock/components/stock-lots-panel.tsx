import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { COMPACT_CALENDAR_CLASS } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useAuth } from "@/contexts/AuthContext";
import { useProductsRepository } from "@/data/repositories";
import {
  parseStockQuantityInput,
  StockError,
  stockQuantityLabel,
} from "@/domain/stock";
import { stockDay } from "@/domain/stock-date";
import { guard } from "@/lib/guard";
import { CalendarDays, Plus } from "@/lib/icons";
import { TIME_HH_MM } from "@/lib/patterns";
import { CareTimePicker } from "@/modules/care-tasks/care-time-picker";
import { isTauriRuntime } from "@/services/browser-store";
import { generateId } from "@/services/sqlite/database";
import { useStockInventory } from "../hooks/use-stock-inventory";
import { inventoryService } from "../services/inventory-service";
import type { StockInventoryBalance } from "../services/inventory-store";

const dateLabel = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(
        value.length === 10 ? `${value}T12:00:00` : value
      ).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Non renseignée";
function LotDate({
  id,
  value,
  onChange,
  label,
  clearable,
}: {
  id?: string;
  value?: Date;
  onChange: (value?: Date) => void;
  label: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-w-0 gap-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          aria-label={label}
          id={id}
          render={
            <Button
              className="h-11 min-w-0 flex-1 justify-start rounded-xl px-3"
              type="button"
              variant="outline"
            />
          }
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate tabular-nums">
            {value ? value.toLocaleDateString("fr-FR") : "Choisir la date"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            className={COMPACT_CALENDAR_CLASS}
            locale={fr}
            mode="single"
            onSelect={(date) => {
              onChange(date);
              if (date) {
                setOpen(false);
              }
            }}
            selected={value}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button
          className="h-11"
          onClick={() => onChange(undefined)}
          type="button"
          variant="ghost"
        >
          Effacer
        </Button>
      )}
    </div>
  );
}

function LotForm({
  productId: initialProduct,
  onCancel,
  onSaved,
}: {
  productId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const products = useProductsRepository();
  const { currentUser } = useAuth();
  const inventory = useStockInventory();
  const [productId, setProductId] = useState(initialProduct);
  const [mode, setMode] = useState<"identify" | "receive">("identify");
  const [number, setNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiry, setExpiry] = useState<Date>();
  const [received, setReceived] = useState<Date>(new Date());
  const [time, setTime] = useState(
    () =>
      `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
  );
  const [location, setLocation] = useState("stock-main");
  const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const product = products.data.find((row) => row.id === productId);
  const requested = parseStockQuantityInput(quantity);
  const changed = (operation: () => void) => {
    operation();
    setRequestId(generateId());
    setError(null);
  };
  const unassigned = inventory.balances
    .filter(
      (row) =>
        row.productId === productId &&
        row.locationId === location &&
        row.lotId === null
    )
    .reduce((sum, row) => sum + Math.max(0, row.quantity), 0);
  return (
    <form
      aria-label="Enregistrer un lot"
      className="space-y-4 border-border border-y bg-muted/10 p-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          busy ||
          !currentUser ||
          !product ||
          !number.trim() ||
          !(requested > 0)
        ) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            const receivedAt = new Date(`${stockDay(received)}T${time}:00`);
            if (
              mode === "receive" &&
              (!(
                TIME_HH_MM.test(time) && Number.isFinite(receivedAt.getTime())
              ) ||
                stockDay(receivedAt) !== stockDay(received) ||
                `${String(receivedAt.getHours()).padStart(2, "0")}:${String(receivedAt.getMinutes()).padStart(2, "0")}` !==
                  time)
            ) {
              throw new StockError(
                "SOURCE_CONFLICT",
                "Choisissez une date et une heure de réception valides."
              );
            }
            await inventoryService.registerLot({
              id: requestId,
              productId,
              lotNumber: number,
              quantity: requested,
              mode,
              locationId: location,
              expiryDate: expiry ? stockDay(expiry) : null,
              receivedAt:
                mode === "receive" ? receivedAt.toISOString() : undefined,
              authorId: currentUser.id,
            });
            onSaved();
          },
          {
            recover: (failure) => {
              setError(
                failure instanceof StockError
                  ? failure.message
                  : "Le lot n’a pas pu être enregistré. Vérifiez les informations et réessayez."
              );
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium text-base">Enregistrer un lot</h3>
        <Tabs
          onValueChange={(value) =>
            changed(() => setMode(value as typeof mode))
          }
          value={mode}
        >
          <TabsList aria-label="Origine du stock">
            <TabsTrigger disabled={busy} value="identify">
              Stock existant
            </TabsTrigger>
            <TabsTrigger disabled={busy} value="receive">
              Réception
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="text-muted-foreground text-sm">
        {mode === "identify"
          ? "Attribuez un numéro au stock déjà présent. Le total reste inchangé."
          : "Enregistrez une livraison réellement reçue. Cette quantité s’ajoute au stock."}
      </p>
      <fieldset className="grid min-w-0 gap-4 md:grid-cols-2" disabled={busy}>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm" htmlFor="lot-product">
            Produit
          </label>
          <SearchableSelect
            controlClassName="h-11 rounded-xl"
            disabled={busy}
            id="lot-product"
            label="Produit du lot"
            onValueChange={(value) => changed(() => setProductId(value))}
            options={products.data
              .filter((row) => !row.archivedAt && row.stockTracked !== false)
              .map((row) => ({
                value: row.id,
                label: row.name,
                keywords: row.category,
              }))}
            placeholder="Rechercher un produit…"
            value={productId}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="lot-number">
            Numéro de lot
          </label>
          <Input
            className="h-11 rounded-xl"
            id="lot-number"
            maxLength={120}
            onChange={(event) => changed(() => setNumber(event.target.value))}
            placeholder="Numéro indiqué sur l’emballage"
            value={number}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="lot-quantity">
            Quantité{product ? ` (${product.unit})` : ""}
          </label>
          <Input
            className="h-11 rounded-xl tabular-nums"
            id="lot-quantity"
            inputMode="decimal"
            onChange={(event) => changed(() => setQuantity(event.target.value))}
            value={quantity}
          />
          {mode === "identify" && product && (
            <p className="text-muted-foreground text-xs">
              Sans lot dans cet emplacement :{" "}
              {stockQuantityLabel(unassigned, product.unit)}.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="lot-expiry">
            Péremption
          </label>
          <LotDate
            clearable
            id="lot-expiry"
            label="Choisir la péremption du lot"
            onChange={(value) => changed(() => setExpiry(value))}
            value={expiry}
          />
          <p className="text-muted-foreground text-xs">
            Facultative si le produit n’a pas de péremption indiquée.
          </p>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-sm" htmlFor="lot-location">
            Emplacement
          </label>
          <SearchableSelect
            controlClassName="h-11 rounded-xl"
            disabled={busy}
            id="lot-location"
            label="Emplacement du lot"
            onValueChange={(value) => changed(() => setLocation(value))}
            options={inventory.locations
              .filter((row) => row.active)
              .map((row) => ({ value: row.id, label: row.name }))}
            value={location}
          />
        </div>
        {mode === "receive" && (
          <div className="min-w-0 space-y-1.5">
            <label className="text-sm" htmlFor="lot-received">
              Réception
            </label>
            <div className="flex min-w-0 gap-2">
              <LotDate
                id="lot-received"
                label="Choisir la date de réception"
                onChange={(value) => {
                  if (value) {
                    changed(() => setReceived(value));
                  }
                }}
                value={received}
              />
              <CareTimePicker
                label="Heure de réception"
                onChange={(value) => changed(() => setTime(value))}
                value={time}
              />
            </div>
          </div>
        )}
      </fieldset>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="h-11"
          disabled={busy}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          className="h-11"
          disabled={
            busy ||
            !currentUser ||
            !product ||
            !(requested > 0) ||
            !number.trim() ||
            !inventory.ready
          }
          type="submit"
        >
          {busy
            ? "Enregistrement…"
            : mode === "identify"
              ? "Identifier ce stock"
              : "Confirmer la réception"}
        </Button>
      </div>
    </form>
  );
}

function CountForm({
  row,
  onClose,
}: {
  row: StockInventoryBalance;
  onClose: () => void;
}) {
  const { currentUser } = useAuth();
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState(generateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = parseStockQuantityInput(quantity);
  return (
    <form
      aria-label="Comptage du lot"
      className="space-y-3 border-border border-y bg-muted/10 p-5"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !currentUser || !reason.trim() || !(count >= 0)) {
          return;
        }
        setBusy(true);
        setError(null);
        await guard(
          async () => {
            await inventoryService.count({
              id: requestId,
              balanceId: row.id,
              quantity: count,
              reason,
              authorId: currentUser.id,
            });
            onClose();
          },
          {
            recover: (failure) => {
              setError(
                failure instanceof StockError
                  ? failure.message
                  : "Le comptage n’a pas pu être enregistré. Réessayez."
              );
            },
            cleanup: () => {
              setBusy(false);
            },
          }
        );
      }}
    >
      <h3 className="font-medium text-base">
        Compter{" "}
        {row.lotNumber ? `le lot ${row.lotNumber}` : "le stock sans lot"}
      </h3>
      <p className="text-muted-foreground text-sm">
        {row.productName} · {row.locationName} · Réception du{" "}
        {dateLabel(row.receivedAt)}. L’écart sera journalisé.
      </p>
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="lot-count-quantity">
            Quantité ({row.unit})
          </label>
          <Input
            className="h-11 rounded-xl"
            disabled={busy}
            id="lot-count-quantity"
            inputMode="decimal"
            onChange={(event) => {
              setQuantity(event.target.value);
              setRequestId(generateId());
            }}
            value={quantity}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm" htmlFor="lot-count-reason">
            Motif
          </label>
          <Input
            className="h-11 rounded-xl"
            disabled={busy}
            id="lot-count-reason"
            onChange={(event) => {
              setReason(event.target.value);
              setRequestId(generateId());
            }}
            value={reason}
          />
        </div>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          className="h-11"
          disabled={busy}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          className="h-11"
          disabled={busy || !currentUser || !(count >= 0) || !reason.trim()}
          type="submit"
        >
          {busy ? "Enregistrement…" : "Confirmer le comptage"}
        </Button>
      </div>
    </form>
  );
}

export function StockLotsPanel() {
  const inventory = useStockInventory();
  const products = useProductsRepository();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [counting, setCounting] = useState<StockInventoryBalance | null>(null);
  const today = stockDay();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const rows = useMemo(
    () =>
      inventory.balances.filter(
        (row) => !row.productArchived && (!filter || row.productId === filter)
      ),
    [inventory.balances, filter]
  );
  const alerts = rows.filter(
    (row) =>
      row.quantity > 0 && row.expiryDate && row.expiryDate <= stockDay(horizon)
  );
  const uniqueAlerts = new Set(
    alerts.map((row) => row.lotId ?? `unassigned-${row.productId}`)
  ).size;
  if (!isTauriRuntime()) {
    return (
      <p className="p-5 text-muted-foreground text-sm">
        Les lots et leur traçabilité sont disponibles dans l’application de
        bureau. Le catalogue web reste utilisable.
      </p>
    );
  }
  return (
    <section aria-label="Lots et réceptions" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b p-4">
        <div className="w-full min-w-0 sm:w-72">
          <SearchableSelect
            controlClassName="[&_input]:text-foreground"
            label="Filtrer les lots par produit"
            onValueChange={setFilter}
            options={[
              { value: "", label: "Tous les produits" },
              ...products.data
                .filter((row) => !row.archivedAt && row.stockTracked !== false)
                .map((row) => ({ value: row.id, label: row.name })),
            ]}
            value={filter}
          />
        </div>
        <Button
          disabled={!(inventory.ready && inventory.supported)}
          onClick={() => {
            setCounting(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Enregistrer un lot
        </Button>
      </div>
      {inventory.error && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-4 text-destructive text-sm"
          role="alert"
        >
          {inventory.error}
          <Button onClick={inventory.refresh} variant="outline">
            Actualiser
          </Button>
        </div>
      )}
      {!(inventory.ready || inventory.error) && (
        <p className="p-4 text-muted-foreground text-sm" role="status">
          Vérification des lots…
        </p>
      )}
      {uniqueAlerts > 0 && (
        <p
          className="border-border border-b p-4 text-destructive text-sm"
          role="status"
        >
          {uniqueAlerts}{" "}
          {uniqueAlerts === 1
            ? "lot ou stock à surveiller"
            : "lots ou stocks à surveiller"}{" "}
          : péremption dépassée ou dans les 90 prochains jours. Les stocks
          périmés ne peuvent pas être dispensés.
        </p>
      )}
      {open && (
        <LotForm
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
          productId={filter}
        />
      )}
      {counting && (
        <CountForm
          key={counting.id}
          onClose={() =>
            setCounting((current) =>
              current?.id === counting.id ? null : current
            )
          }
          row={counting}
        />
      )}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]">Produit</TableHead>
            <TableHead className="w-[19%]">Lot</TableHead>
            <TableHead className="w-[15%] text-right">Quantité</TableHead>
            <TableHead className="w-[27%]">Dates</TableHead>
            <TableHead className="w-[15%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="h-32 whitespace-normal text-center text-muted-foreground"
                colSpan={5}
              >
                {inventory.ready
                  ? "Aucun stock pour ce filtre. Enregistrez une réception ou identifiez le stock déjà présent."
                  : "Chargement…"}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const expired = !!row.expiryDate && row.expiryDate < today;
              const near =
                !!row.expiryDate && row.expiryDate <= stockDay(horizon);
              const empty = row.quantity <= 0;
              return (
                <TableRow
                  className={empty ? "text-muted-foreground" : undefined}
                  key={row.id}
                >
                  <TableCell className="whitespace-normal break-words align-top">
                    <span className="font-medium">{row.productName}</span>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {row.locationName}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-normal break-words align-top">
                    <span>{row.lotNumber || "Sans lot"}</span>
                    <div className="mt-1">
                      <Badge
                        className={
                          expired && !empty
                            ? "text-destructive"
                            : near && !empty
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-muted-foreground"
                        }
                        variant="outline"
                      >
                        {empty
                          ? "Épuisé"
                          : expired
                            ? "Périmé"
                            : near
                              ? "À surveiller"
                              : "Utilisable"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal text-right align-top tabular-nums">
                    {stockQuantityLabel(row.quantity, row.unit)}
                  </TableCell>
                  <TableCell className="whitespace-normal align-top text-muted-foreground text-xs">
                    <span className="block">
                      Réception : {dateLabel(row.receivedAt)}
                    </span>
                    <span className="mt-1 block">
                      Péremption : {dateLabel(row.expiryDate)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Button
                      className="max-w-full px-2"
                      disabled={!inventory.ready}
                      onClick={() => {
                        setOpen(false);
                        setCounting(row);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Compter
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <p className="border-border border-t px-4 py-3 text-muted-foreground text-xs">
        Chaque réception conserve sa date pour le FIFO. Le stock ancien reste «
        sans lot » jusqu’à son identification.
      </p>
    </section>
  );
}
