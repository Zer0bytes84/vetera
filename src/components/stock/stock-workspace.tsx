import { formatDisplayText, formatNumber } from "@/utils/display-format";
import { ListFilter, ListSearch } from "@/components/ui/list-controls";
import { SectionCards } from "@/components/section-cards";
import {
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  History,
  LayoutGrid,
  List,
  MoreHorizontal,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  WalletCards,
} from "@/lib/icons";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Product, StockMovement } from "@/types/db";
import { formatDZD } from "@/utils/currency";
import { StockInvoiceLink } from "@/modules/stock/components/stock-invoice-link";
import { StockLotsPanel } from "@/modules/stock/components/stock-lots-panel";
import { PurchasingPanel } from "@/modules/stock/components/purchasing-panel";
import { StockOperationsPanel } from "@/modules/stock/components/stock-operations-panel";
import { MovementAllocationDetails } from "@/modules/stock/components/movement-allocation-details";
import { restockNeed, stockAlert, stockExpiry } from "@/domain/stock-alerts";

type StockFilter = "all" | "healthy" | "low" | "out" | "expiring" | "expired";

interface StockWorkspaceProps {
  loading: boolean;
  movements: StockMovement[];
  onAdjust: (
    product: Product,
    quantity: number,
    reason: string
  ) => Promise<void>;
  onDelete: (product: Product) => void;
  onEdit: (product: Product) => void;
  onRestock: (product: Product) => void;
  products: Product[];
}

const PAGE_SIZE = 8;

const formatDate = (value?: string) => {
  if (!value) return "Non renseignée";
  return new Intl.DateTimeFormat("fr-DZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
};

const productStatus = (product: Product): Exclude<StockFilter, "all"> => {
  return stockAlert(product);
};

const statusCopy: Record<
  Exclude<StockFilter, "all">,
  { label: string; className: string }
> = {
  healthy: {
    label: "Disponible",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300",
  },
  low: {
    label: "Stock bas",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300",
  },
  out: {
    label: "Rupture",
    className:
      "bg-rose-50 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300",
  },
  expiring: {
    label: "À surveiller",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300",
  },
  expired: {
    label: "Expiré",
    className: "bg-red-50 text-red-700 dark:bg-red-500/12 dark:text-red-300",
  },
};

function StatusBadge({ product }: { product: Product }) {
  const status = statusCopy[productStatus(product)];
  return (
    <Badge
      className={cn(
        "rounded-full border-0 px-2.5 font-medium",
        status.className
      )}
    >
      {status.label}
    </Badge>
  );
}

function ProductDetail({
  onEdit,
  onOpenChange,
  onRestock,
  product,
}: {
  onEdit: (product: Product) => void;
  onOpenChange: (open: boolean) => void;
  onRestock: (product: Product) => void;
  product: Product | null;
}) {
  if (!product) return null;
  const margin = product.salePriceAmount - product.purchasePriceAmount;
  const target = Math.max(product.minStock * 3, 1);

  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(product)}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton
      >
        <div className="relative overflow-hidden border-b bg-[#f6f3e9] px-6 pb-6 pt-7 dark:bg-[#1f251f]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#f6f3e9] via-[#f6f3e9]/95 to-transparent dark:from-[#1f251f] dark:via-[#1f251f]/95" />
          <DialogHeader className="relative max-w-[75%]">
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge product={product} />
              <span className="text-muted-foreground text-xs">
                {product.category}
              </span>
            </div>
            <DialogTitle className="font-semibold text-2xl tracking-[-0.04em]">
              {formatDisplayText(product.name)}
            </DialogTitle>
            <DialogDescription>
              {product.subCategory || "Référence du catalogue"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-5 p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-muted-foreground text-xs">Disponible</p>
              <p className="mt-1 font-semibold text-lg tabular-nums">
                {product.quantity}{" "}
                <span className="font-normal text-xs">{product.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-muted-foreground text-xs">Seuil</p>
              <p className="mt-1 font-semibold text-lg tabular-nums">
                {product.minStock}{" "}
                <span className="font-normal text-xs">{product.unit}</span>
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-muted-foreground text-xs">Marge unitaire</p>
              <p className="mt-1 whitespace-nowrap font-semibold text-lg tabular-nums">
                {formatDZD(margin)}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-muted-foreground">
                Niveau par rapport au stock cible
              </span>
              <span className="font-medium tabular-nums">
                {Math.min(100, Math.round((product.quantity / target) * 100))}%
              </span>
            </div>
            <Progress
              value={Math.min(100, (product.quantity / target) * 100)}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y py-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Prix d’achat</p>
              <p className="mt-1 whitespace-nowrap font-medium">
                {formatDZD(product.purchasePriceAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Prix de vente</p>
              <p className="mt-1 whitespace-nowrap font-medium">
                {formatDZD(product.salePriceAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                Prochaine péremption
              </p>
              <p className="mt-1 font-medium">
                {formatDate(stockExpiry(product))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valeur disponible</p>
              <p className="mt-1 whitespace-nowrap font-medium">
                {formatDZD(product.quantity * product.purchasePriceAmount)}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(product);
              }}
              variant="outline"
            >
              <Edit3 /> Modifier
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onRestock(product);
              }}
            >
              <RefreshCw /> Réceptionner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StockWorkspace({
  loading,
  movements,
  onAdjust,
  onDelete,
  onEdit,
  onRestock,
  products,
}: StockWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("catalogue");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryProductId, setInventoryProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [inventoryReason, setInventoryReason] = useState("Comptage physique");
  const [inventorySaving, setInventorySaving] = useState(false);

  const categories = useMemo(
    () =>
      [
        ...new Set(products.map((product) => product.category).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, "fr")),
    [products]
  );
  const stockValue = products.reduce(
    (sum, product) => sum + (product.stockTracked === false ? 0 : product.quantity * product.purchasePriceAmount),
    0
  );
  const reorder = products.filter(
    (product) => restockNeed(product) > 0
  );
  const expiries = products.filter(
    (product) => ["expired", "expiring"].includes(stockAlert(product))
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return products.filter((product) => {
      const matchesQuery =
        !needle ||
        [product.name, product.category, product.subCategory, product.unit]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(needle);
      return (
        matchesQuery &&
        (category === "all" || product.category === category) &&
        (status === "all" || productStatus(product) === status || (status === "expiring" && productStatus(product) === "expired"))
      );
    });
  }, [category, products, query, status]);

  useEffect(() => setPage(1), [query, category, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleProducts = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      <SectionCards
        items={[
          {
            title: "Valeur du stock",
            icon: WalletCards,
            value: formatDZD(stockValue),
            badge: "Actif valorisé",
            tone: "positive",
            trend: "up",
            detailRow: `${formatNumber(products.length)} références · ${formatNumber(categories.length)} catégories actives`,
            onClick: () => { setStatus("all"); setCategory("all"); setWorkspaceTab("catalogue"); },
            actionLabel: "Voir tout le catalogue",
          },
          {
            title: "À réapprovisionner",
            icon: PackageOpen,
            value: formatNumber(reorder.length),
            change: reorder.length > 0 ? reorder.length : 0,
            changeLabel: reorder.length > 0 ? "sous le seuil" : "stock suffisant",
            inverse: true,
            tone: reorder.length ? "watch" : "positive",
            trend: reorder.length ? "down" : "neutral",
            detailRow: reorder.length > 0
              ? (reorder[0]?.name ? `Priorité : ${reorder[0].name}` : `${reorder.length} commande${reorder.length > 1 ? "s" : ""} à passer`)
              : "Aucune rupture imminente · Stocks au-dessus du seuil",
            onClick: () => { setStatus("low"); setWorkspaceTab("catalogue"); },
            actionLabel: "Voir les produits concernés",
          },
          {
            title: "Péremptions à surveiller",
            icon: CalendarClock,
            value: formatNumber(expiries.length),
            change: expiries.length > 0 ? expiries.length : 0,
            changeLabel: expiries.length > 0 ? "lots à risque" : "lots conformes",
            inverse: true,
            tone: expiries.length ? "watch" : "positive",
            trend: expiries.length ? "down" : "neutral",
            detailRow: expiries.length > 0
              ? (expiries[0]?.name ? `Proche échéance : ${expiries[0].name}` : "Rotation FIFO requise sous 90 j")
              : "Aucune date critique dans les 90 prochains jours",
            onClick: () => { setStatus("expiring"); setWorkspaceTab("catalogue"); },
            actionLabel: "Voir les échéances",
          },
          {
            title: "Catalogue actif",
            icon: PackageCheck,
            value: formatNumber(products.length),
            badge: `${formatNumber(movements.length)} mouvements`,
            tone: "quiet",
            trend: "neutral",
            detailRow: `${formatNumber(products.filter((p) => p.stockTracked !== false).length)} sous suivi physique · Traçabilité active`,
            onClick: () => { setStatus("all"); setWorkspaceTab("mouvements"); },
            actionLabel: "Voir l'historique des mouvements",
          },
        ]}
      />

      <Card className="overflow-hidden border-border/70 shadow-none">
        <Tabs value={workspaceTab} onValueChange={setWorkspaceTab}>
          <div className="flex flex-col gap-3 border-b px-5 py-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <div>
              <h2 className="font-display font-medium text-xl tracking-[-0.035em]">
                Catalogue & inventaire
              </h2>
            </div>
            <TabsList className="h-auto flex-wrap gap-1" variant="line">
              <TabsTrigger value="catalogue">
                <PackageCheck /> Catalogue
              </TabsTrigger>
              <TabsTrigger value="mouvements">
                <History /> Mouvements
              </TabsTrigger>
              <TabsTrigger value="inventaire">
                <ClipboardCheck /> Inventaire
              </TabsTrigger>
              <TabsTrigger value="lots"><PackageOpen /> Lots</TabsTrigger>
              <TabsTrigger value="purchasing">Approvisionnements</TabsTrigger>
              <TabsTrigger value="operations">Opérations</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="catalogue">
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
              <ListSearch className="w-full sm:w-64" label="Rechercher les produits" placeholder="Nom, catégorie, usage…" value={query} onValueChange={setQuery} />
              <ListFilter label="Catégorie" value={category} onValueChange={setCategory} options={[{ value: "all", label: "Toutes" }, ...categories.map(value => ({ value, label: value }))]} />
              <ListFilter label="État" value={status} onValueChange={value => setStatus(value as StockFilter)} options={[
                { value: "all", label: "Tous" }, { value: "healthy", label: "Disponibles" }, { value: "low", label: "Stock bas" }, { value: "out", label: "Ruptures" }, { value: "expiring", label: "À surveiller" }, { value: "expired", label: "Expirés" },
              ]} />
              <div className="ml-auto flex h-[30px] items-center rounded-full border bg-background p-0.5">
                <Button
                  aria-label="Vue tableau"
                  className="size-6"
                  onClick={() => setView("table")}
                  size="icon-sm"
                  variant={view === "table" ? "secondary" : "ghost"}
                >
                  <List />
                </Button>
                <Button
                  aria-label="Vue cartes"
                  className="size-6"
                  onClick={() => setView("cards")}
                  size="icon-sm"
                  variant={view === "cards" ? "secondary" : "ghost"}
                >
                  <LayoutGrid />
                </Button>
              </div>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-muted-foreground">
                  Chargement du catalogue…
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <PackageOpen className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">
                    Aucun produit dans cette sélection
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Modifiez la recherche ou les filtres.
                  </p>
                </div>
              ) : view === "table" ? (
                <Table>
                  <TableHeader className="bg-[#edf3ef] dark:bg-[#25332d]">
                    <TableRow className="border-[#dce7df] hover:bg-transparent dark:border-[#35473d]">
                      <TableHead className="text-[#456152] dark:text-[#c0d4c7]">
                        Produit
                      </TableHead>
                      <TableHead>État</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Seuil</TableHead>
                      <TableHead className="text-right">Achat</TableHead>
                      <TableHead className="text-right">Vente</TableHead>
                      <TableHead>Péremption</TableHead>
                      <TableHead className="w-14">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleProducts.map((product) => (
                      <TableRow
                        className="cursor-pointer"
                        data-row-id={product.id}
                        key={product.id}
                        onClick={() => setSelected(product)}
                        tabIndex={0}
                      >
                        <TableCell>
                          <div className="max-w-[280px]">
                            <p className="truncate font-semibold">
                              {formatDisplayText(product.name)}
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                              {product.category}
                              {product.subCategory
                                ? ` · ${product.subCategory}`
                                : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge product={product} />
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {product.quantity}{" "}
                          <span className="font-normal text-muted-foreground text-xs">
                            {product.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.minStock}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatDZD(product.purchasePriceAmount)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium">
                          {formatDZD(product.salePriceAmount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(stockExpiry(product))}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  aria-label={`Actions pour ${formatDisplayText(product.name)}`}
                                  size="icon-sm"
                                  variant="ghost"
                                />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onRestock(product)}
                              >
                                <RefreshCw /> Réceptionner
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(product)}>
                                <Edit3 /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(product)}
                                variant="destructive"
                              >
                                <Archive /> Archiver
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <button
                      className="rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      data-row-id={product.id}
                      key={product.id}
                      onClick={() => setSelected(product)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {formatDisplayText(product.name)}
                          </p>
                          <p className="truncate text-muted-foreground text-xs">
                            {product.category}
                          </p>
                        </div>
                        <StatusBadge product={product} />
                      </div>
                      <div className="mt-5 flex items-end justify-between">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Disponible
                          </p>
                          <p className="mt-1 font-semibold text-2xl tabular-nums">
                            {product.quantity}{" "}
                            <span className="font-normal text-sm">
                              {product.unit}
                            </span>
                          </p>
                        </div>
                        <p className="whitespace-nowrap font-medium">
                          {formatDZD(product.salePriceAmount)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                  {filtered.length} référence{filtered.length > 1 ? "s" : ""} ·
                  page {page} sur {pages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label="Page précédente"
                    disabled={page === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    size="icon-sm"
                    variant="outline"
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="min-w-10 text-center font-medium text-sm">
                    {page}
                  </span>
                  <Button
                    aria-label="Page suivante"
                    disabled={page === pages}
                    onClick={() =>
                      setPage((value) => Math.min(pages, value + 1))
                    }
                    size="icon-sm"
                    variant="outline"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="mouvements">
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-medium">
                    Le journal démarre maintenant
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
                    Les prochaines réceptions et corrections apparaîtront ici
                    avec leur quantité et leur origine.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-[#edf3ef] dark:bg-[#25332d]">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Opération</TableHead>
                      <TableHead className="text-right">Variation</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                      <TableHead>Motif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...movements]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 20)
                      .map((movement) => {
                        const product = products.find(
                          (item) => item.id === movement.productId
                        );
                        const positive = movement.quantityDelta > 0;
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              {formatDate(movement.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.productNameSnapshot || product?.name || "Produit archivé"}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5">
                                {movement.quantityDelta === 0 ? (
                                  <RefreshCw className="size-4 text-muted-foreground" />
                                ) : positive ? (
                                  <ArrowUpRight className="size-4 text-emerald-600" />
                                ) : (
                                  <ArrowDownRight className="size-4 text-rose-600" />
                                )}
                                {movement.sourceType === "transfer"
                                  ? "Transfert"
                                  : movement.type === "restock"
                                  ? "Réception"
                                  : movement.type === "adjustment"
                                    ? "Ajustement"
                                    : movement.type === "usage"
                                      ? "Utilisation"
                                      : "Mouvement"}
                              </span>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-right font-semibold tabular-nums",
                                movement.quantityDelta === 0
                                  ? "text-muted-foreground"
                                  : positive
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-rose-700 dark:text-rose-300"
                              )}
                            >
                              {positive ? "+" : ""}
                              {movement.quantityDelta.toLocaleString("fr-FR", {maximumFractionDigits: 6})}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">{movement.unitSnapshot || product?.unit || "unité non renseignée"}</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {movement.quantityAfter.toLocaleString("fr-FR", {maximumFractionDigits: 6})}
                              <span className="ml-1 text-xs text-muted-foreground">{movement.unitSnapshot || product?.unit || "unité non renseignée"}</span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="block">{movement.sourceType === "care" ? "Soin" : movement.sourceType === "prescription" ? "Ordonnance" : movement.sourceType === "consultation" ? "Consultation" : movement.sourceType === "transfer" ? "Transfert" : movement.sourceType === "receipt" ? "Réception" : "Stock"} · {movement.sourceLabel || movement.reason || "Non renseigné"}</span>
                              {movement.invoiceId && <StockInvoiceLink invoiceId={movement.invoiceId} />}
                              <MovementAllocationDetails movementId={movement.id} unit={movement.unitSnapshot || product?.unit || "unité"} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="lots"><StockLotsPanel /></TabsContent>
          <TabsContent value="purchasing"><PurchasingPanel /></TabsContent>
          <TabsContent value="operations"><StockOperationsPanel onOpenMovements={() => setWorkspaceTab("mouvements")} /></TabsContent>
          <TabsContent value="inventaire">
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-2xl border bg-muted/15 p-5">
                <PackageCheck className="size-5 text-emerald-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Valeur d’acquisition
                </p>
                <p className="mt-1 whitespace-nowrap font-semibold text-2xl tracking-tight">
                  {formatDZD(stockValue)}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/15 p-5">
                <AlertTriangle className="size-5 text-amber-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Sous le seuil
                </p>
                <p className="mt-1 font-semibold text-2xl tracking-tight">
                  {reorder.length} références
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/15 p-5">
                <WalletCards className="size-5 text-sky-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Valeur de vente théorique
                </p>
                <p className="mt-1 whitespace-nowrap font-semibold text-2xl tracking-tight">
                  {formatDZD(
                    products.reduce(
                      (sum, product) =>
                        sum + product.quantity * product.salePriceAmount,
                      0
                    )
                  )}
                </p>
              </div>
              <div className="md:col-span-3 flex flex-col gap-4 rounded-2xl border border-dashed p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ClipboardCheck className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">Contrôle d’inventaire</p>
                    <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
                      Saisissez la quantité réellement comptée. L’écart et son
                      motif seront conservés dans le journal.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const first = products[0];
                    setInventoryProductId(first?.id || "");
                    setCountedQuantity(first?.quantity || 0);
                    setInventoryOpen(true);
                  }}
                >
                  <ClipboardCheck /> Démarrer un comptage
                </Button>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      <ProductDetail
        onEdit={onEdit}
        onOpenChange={(open) => !open && setSelected(null)}
        onRestock={onRestock}
        product={selected}
      />

      <Dialog onOpenChange={setInventoryOpen} open={inventoryOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Contrôle d’inventaire</DialogTitle>
            <DialogDescription>
              La correction sera datée et ajoutée au journal des mouvements.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Produit</span>
              <NativeSelect
                className="w-full"
                onChange={(event) => {
                  const next = products.find(
                    (product) => product.id === event.target.value
                  );
                  setInventoryProductId(event.target.value);
                  setCountedQuantity(next?.quantity || 0);
                }}
                value={inventoryProductId}
              >
                {products.map((product) => (
                  <NativeSelectOption key={product.id} value={product.id}>
                    {formatDisplayText(product.name)} · {product.quantity} {product.unit}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Quantité réellement comptée</span>
              <Input
                min="0"
                onChange={(event) =>
                  setCountedQuantity(Number(event.target.value))
                }
                type="number"
                value={countedQuantity}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Motif de l’écart</span>
              <Input
                onChange={(event) => setInventoryReason(event.target.value)}
                placeholder="Comptage physique, casse, perte…"
                value={inventoryReason}
              />
            </label>
            {inventoryProductId && (
              <div className="rounded-xl bg-muted/35 p-3 text-sm">
                <span className="text-muted-foreground">Écart calculé : </span>
                <strong className="tabular-nums">
                  {countedQuantity -
                    (products.find(
                      (product) => product.id === inventoryProductId
                    )?.quantity || 0)}
                </strong>
              </div>
            )}
          </div>
          <DialogFooter className="mx-0 mb-0 px-0 pb-0">
            <Button onClick={() => setInventoryOpen(false)} variant="outline">
              Annuler
            </Button>
            <Button
              disabled={
                !inventoryProductId ||
                !inventoryReason.trim() ||
                countedQuantity < 0 ||
                inventorySaving
              }
              onClick={async () => {
                const product = products.find(
                  (item) => item.id === inventoryProductId
                );
                if (!product) return;
                setInventorySaving(true);
                try {
                  await onAdjust(product, countedQuantity, inventoryReason);
                  setInventoryOpen(false);
                } finally {
                  setInventorySaving(false);
                }
              }}
            >
              {inventorySaving ? "Enregistrement…" : "Valider le comptage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
