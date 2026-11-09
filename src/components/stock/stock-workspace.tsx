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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DataTable,
  type DataColumn,
  type DataRow,
} from "@/components/ui/data-table";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { QuietButton } from "@/components/ui/tuff-controls";
import { Package } from "lucide-react";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import {
  expiryWords,
  restockNeed,
  stockAlert,
  stockExpiry,
  stockWords,
  unitCount,
} from "@/domain/stock-alerts";
import { useListCursor } from "@/hooks/useListCursor";
import { EmptyMascot } from "@/components/mascot/empty-mascot";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type StockFilter = "all" | "healthy" | "low" | "out" | "expiring" | "expired";

interface StockWorkspaceProps {
  /** The page's main action, in the figures band's header. */
  actions?: React.ReactNode;
  loading: boolean;
  movements: StockMovement[];
  onAdjust: (
    product: Product,
    quantity: number,
    reason: string,
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
        status.className,
      )}
    >
      {status.label}
    </Badge>
  );
}

interface StockRow extends DataRow {
  name: string;
  state: string;
  qty: number;
  min: number;
  buy: number;
  sell: number;
  expiry: string;
  actions: string;
}

const STATUS_TONE: Record<Exclude<StockFilter, "all">, StatusTone> = {
  healthy: "positive",
  low: "warning",
  out: "negative",
  expiring: "warning",
  expired: "negative",
};

/** The catalogue as TuffUI's Data Table: sortable columns, the filter field, pages, a selection, a CSV export, the state as a pill. */
function CatalogueTable({
  products,
  filters,
  toolbar,
  onOpen,
  onOrder,
  onRestock,
  onEdit,
  onDelete,
  listRef,
}: {
  products: Product[];
  filters: React.ReactNode;
  toolbar?: React.ReactNode;
  onOpen: (product: Product) => void;
  onOrder: (product: Product) => void;
  onRestock: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  listRef: React.Ref<HTMLDivElement>;
}) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const rows: StockRow[] = products.map((product) => ({
    id: product.id,
    name: formatDisplayText(product.name),
    state: statusCopy[productStatus(product)].label,
    qty: product.quantity,
    min: product.minStock,
    buy: product.purchasePriceAmount,
    sell: product.salePriceAmount,
    expiry: stockExpiry(product)?.slice(0, 10) ?? "",
    actions: "",
  }));
  const columns: DataColumn<StockRow>[] = [
    {
      key: "name",
      label: "Produit",
      sortable: true,
      format: (_, row) => {
        const product = byId.get(row.id)!;
        return (
          <span className="block max-w-64 min-w-0">
            <span className="block truncate text-sm font-medium">
              {row.name}
            </span>
            <span className="block truncate text-[0.8125rem] text-muted-foreground">
              {product.category}
              {product.subCategory ? ` · ${product.subCategory}` : ""}
            </span>
          </span>
        );
      },
    },
    {
      key: "state",
      label: "État",
      sortable: true,
      format: (_, row) => {
        const product = byId.get(row.id)!;
        return (
          <span className="block">
            <StatusPill tone={STATUS_TONE[productStatus(product)]}>
              {statusCopy[productStatus(product)].label}
            </StatusPill>
            {stockWords(product) && (
              <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                {stockWords(product)}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "qty",
      label: "Disponible",
      align: "right",
      sortable: true,
      format: (_, row) => (
        <span className="font-sans text-sm font-medium">
          {row.qty}{" "}
          <span className="font-normal text-muted-foreground text-xs">
            {byId.get(row.id)!.unit}
          </span>
        </span>
      ),
    },
    { key: "min", label: "Seuil", align: "right", sortable: true, priority: 3 },
    {
      key: "buy",
      label: "Achat",
      align: "right",
      sortable: true,
      priority: 3,
      format: (value) => (
        <span className="font-sans text-[0.8125rem]">
          {formatDZD(Number(value))}
        </span>
      ),
    },
    {
      key: "sell",
      label: "Vente",
      align: "right",
      sortable: true,
      priority: 2,
      format: (value) => (
        <span className="font-sans text-[0.8125rem] font-medium">
          {formatDZD(Number(value))}
        </span>
      ),
    },
    {
      key: "expiry",
      label: "Péremption",
      sortable: true,
      priority: 2,
      format: (value) => (
        <span className="text-muted-foreground">
          {formatDate(String(value) || undefined)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      hideLabel: true,
      noExport: true,
      priority: 1,
      format: (_, row) => {
        const product = byId.get(row.id)!;
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            {restockNeed(product) > 0 && (
              <QuietButton onClick={() => onOrder(product)}>
                Commander
              </QuietButton>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={`Actions pour ${formatDisplayText(product.name)}`}
                    className="rounded-full"
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRestock(product)}>
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
          </div>
        );
      },
    },
  ];
  return (
    <DataTable
      columns={columns}
      containerRef={listRef}
      data={rows}
      emptyDescription="Modifiez la recherche ou les filtres."
      emptyTitle="Aucun produit dans cette sélection"
      exportName="produits"
      filters={filters}
      toolbar={toolbar}
      icon={Package}
      noun={["référence", "références"]}
      onRowClick={(row) => onOpen(byId.get(row.id)!)}
      pageSize={PAGE_SIZE}
      rowProps={(row) => ({
        tabIndex: 0,
        ...({ "data-list-row": "", "data-row-id": row.id } as object),
      })}
      searchPlaceholder="Nom, catégorie, usage"
      title="Catalogue"
    />
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
            <DialogTitle>{formatDisplayText(product.name)}</DialogTitle>
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

/** One container for a section of the page: the band carries the title and the section buttons, the panel the content. */
function TabShell({
  title,
  toolbar,
  children,
}: {
  title: string;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <ShellHeader aside={toolbar} as="h2" icon={Package} title={title} />
      <Panel className="overflow-hidden">{children}</Panel>
    </Shell>
  );
}

function MaybeShell({
  shell,
  title,
  toolbar,
  children,
}: {
  shell: boolean;
  title: string;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return shell ? (
    <TabShell title={title} toolbar={toolbar}>
      {children}
    </TabShell>
  ) : (
    <>{children}</>
  );
}

export function StockWorkspace({
  actions,
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
  const listRef = useListCursor({ storageKey: "products" });
  // "Commander" on a row opens a supplier order for that product alone.
  const [orderFor, setOrderFor] = useState<string | null>(null);
  const clearOrderFor = useCallback(() => setOrderFor(null), []);
  const order = (product: Product) => {
    setOrderFor(product.id);
    setWorkspaceTab("purchasing");
  };
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
    [products],
  );
  const stockValue = products.reduce(
    (sum, product) =>
      sum +
      (product.stockTracked === false
        ? 0
        : product.quantity * product.purchasePriceAmount),
    0,
  );
  const reorder = products.filter((product) => restockNeed(product) > 0);
  const expiries = products
    .filter((product) => ["expired", "expiring"].includes(stockAlert(product)))
    .sort((left, right) =>
      (stockExpiry(left) ?? "9999").localeCompare(stockExpiry(right) ?? "9999"),
    );
  const reorderWords = reorder
    .slice()
    .sort(
      (left, right) =>
        restockNeed(right) / Math.max(1, right.minStock) -
        restockNeed(left) / Math.max(1, left.minStock),
    )
    .slice(0, 2)
    .map(
      (product) =>
        `${formatDisplayText(product.name)} : ${formatNumber(product.availableQuantity ?? product.quantity)} sur ${formatNumber(product.minStock)}`,
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
        (status === "all" ||
          productStatus(product) === status ||
          (status === "expiring" && productStatus(product) === "expired"))
      );
    });
  }, [category, products, query, status]);

  useEffect(() => setPage(1), [query, category, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleProducts = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const filterControls = (
    <>
      <ListFilter
        label="Catégorie"
        value={category}
        onValueChange={setCategory}
        options={[
          { value: "all", label: "Toutes" },
          ...categories.map((value) => ({ value, label: value })),
        ]}
      />
      <ListFilter
        label="État"
        value={status}
        onValueChange={(value) => setStatus(value as StockFilter)}
        options={[
          { value: "all", label: "Tous" },
          { value: "healthy", label: "Disponibles" },
          { value: "low", label: "Stock bas" },
          { value: "out", label: "Ruptures" },
          { value: "expiring", label: "À surveiller" },
          { value: "expired", label: "Expirés" },
        ]}
      />
      <div className="stock-view-toggle ml-auto flex h-[30px] items-center rounded-full border bg-background p-0.5">
        <Button
          aria-label="Vue tableau"
          aria-pressed={view === "table"}
          className="size-6"
          onClick={() => setView("table")}
          size="icon-sm"
          variant={view === "table" ? "secondary" : "ghost"}
        >
          <List />
        </Button>
        <Button
          aria-label="Vue cartes"
          aria-pressed={view === "cards"}
          className="size-6"
          onClick={() => setView("cards")}
          size="icon-sm"
          variant={view === "cards" ? "secondary" : "ghost"}
        >
          <LayoutGrid />
        </Button>
      </div>
    </>
  );

  // The page's sections, as buttons in the band of the table or card they switch: one title, the band's.
  const tabButtons = (
    <TabsList aria-label="Sections des produits" tabsStyle="segmented">
      <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
      <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
      <TabsTrigger value="inventaire">Inventaire</TabsTrigger>
      <TabsTrigger value="lots">Lots</TabsTrigger>
      <TabsTrigger value="purchasing">Approvisionnements</TabsTrigger>
      <TabsTrigger value="operations">Opérations</TabsTrigger>
    </TabsList>
  );
  const catalogueInShell = loading || view === "cards";

  return (
    <div className="space-y-4">
      <SectionCards
        actions={actions}
        icon={Package}
        subtitle="Stock, seuils et péremptions"
        items={[
          {
            title: "Valeur du stock",
            icon: WalletCards,
            value: formatDZD(stockValue),
            badge: "Au prix d’achat",
            tone: "quiet",
            trend: "neutral",
            detailRow: `${formatNumber(products.length)} références · ${formatNumber(categories.length)} catégories actives`,
            onClick: () => {
              setStatus("all");
              setCategory("all");
              setWorkspaceTab("catalogue");
            },
            actionLabel: "Voir tout le catalogue",
          },
          {
            title: "À réapprovisionner",
            icon: PackageOpen,
            value: formatNumber(reorder.length),
            badge:
              reorder.length > 0 ? "Sous le seuil" : "Au-dessus des seuils",
            tone: reorder.length ? "watch" : "positive",
            trend: reorder.length ? "down" : "neutral",
            detailRow:
              reorder.length > 0
                ? `${reorderWords.join(" · ")}${reorder.length > 2 ? ` · +${reorder.length - 2}` : ""}`
                : "Chaque produit suivi est au-dessus de son seuil",
            onClick: () => {
              setStatus("low");
              setWorkspaceTab("catalogue");
            },
            actionLabel: "Voir les produits concernés",
          },
          {
            title: "Péremptions à surveiller",
            icon: CalendarClock,
            value: formatNumber(expiries.length),
            badge:
              expiries.length > 0
                ? `${expiries.length} produit${expiries.length > 1 ? "s" : ""} sous 90 jours`
                : "Rien sous 90 jours",
            tone: expiries.length ? "watch" : "positive",
            trend: expiries.length ? "down" : "neutral",
            detailRow:
              expiries.length > 0
                ? `${formatDisplayText(expiries[0].name)} : ${expiryWords(expiries[0]).toLocaleLowerCase("fr")}`
                : "Aucune date de péremption dans les 90 prochains jours",
            onClick: () => {
              setStatus("expiring");
              setWorkspaceTab("catalogue");
            },
            actionLabel: "Voir les échéances",
          },
          {
            title: "Catalogue actif",
            icon: PackageCheck,
            value: formatNumber(products.length),
            badge: `${formatNumber(movements.length)} mouvement${movements.length > 1 ? "s" : ""} enregistré${movements.length > 1 ? "s" : ""}`,
            tone: "quiet",
            trend: "neutral",
            detailRow: (() => {
              const tracked = products.filter(
                (p) => p.stockTracked !== false,
              ).length;
              const untracked = products.length - tracked;
              return `${formatNumber(tracked)} avec stock suivi${untracked ? ` · ${formatNumber(untracked)} sans suivi de stock` : ""}`;
            })(),
            onClick: () => {
              setStatus("all");
              setWorkspaceTab("mouvements");
            },
            actionLabel: "Voir l'historique des mouvements",
          },
        ]}
      />

      <Tabs value={workspaceTab} onValueChange={setWorkspaceTab}>
        <TabsContent value="catalogue">
          <MaybeShell
            shell={catalogueInShell}
            title="Catalogue"
            toolbar={tabButtons}
          >
            {view === "cards" && (
              <div className="flex flex-wrap items-center gap-2 border-b p-4">
                <ListSearch
                  className="w-full sm:w-64"
                  label="Rechercher les produits"
                  placeholder="Nom, catégorie, usage…"
                  value={query}
                  onValueChange={setQuery}
                />
                {filterControls}
              </div>
            )}

            <CardContent className="p-0">
              {!loading &&
                expiries.length > 0 &&
                status !== "expiring" &&
                status !== "expired" && (
                  <ul
                    aria-label="Péremptions proches"
                    className="mb-3 divide-y overflow-hidden rounded-2xl bg-amber-50/60 text-sm dark:bg-amber-500/[0.06] [&>li]:flex [&>li]:items-center [&>li]:gap-3 [&>li]:px-5 [&>li]:py-2 [&>li]:text-amber-900 dark:[&>li]:text-amber-200 [&>li[data-expired]]:bg-rose-50/70 [&>li[data-expired]]:text-rose-800 dark:[&>li[data-expired]]:bg-rose-500/[0.08] dark:[&>li[data-expired]]:text-rose-200"
                  >
                    {expiries.slice(0, 3).map((product) => (
                      <li
                        data-expired={
                          stockAlert(product) === "expired" ? "" : undefined
                        }
                        key={product.id}
                      >
                        <CalendarClock
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <strong>{formatDisplayText(product.name)}</strong>
                          {" · "}
                          {expiryWords(product)}
                          {(() => {
                            const quantity =
                              stockAlert(product) === "expired"
                                ? (product.expiredQuantity ?? product.quantity)
                                : (product.expiringQuantity ??
                                  product.quantity);
                            return quantity > 0
                              ? ` · ${unitCount(quantity, product.unit)} à cette échéance`
                              : "";
                          })()}
                        </span>
                        <Button
                          onClick={() => setSelected(product)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Voir les lots
                        </Button>
                      </li>
                    ))}
                    {expiries.length > 3 && (
                      <li>
                        <span className="flex-1 text-muted-foreground">
                          {expiries.length - 3} autre
                          {expiries.length - 3 > 1 ? "s" : ""} produit
                          {expiries.length - 3 > 1 ? "s" : ""} à surveiller
                        </span>
                        <Button
                          onClick={() => setStatus("expiring")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Tout afficher
                        </Button>
                      </li>
                    )}
                  </ul>
                )}
              {loading ? (
                <div className="p-12 text-center text-muted-foreground">
                  Chargement du catalogue…
                </div>
              ) : view === "cards" && visibleProducts.length === 0 ? (
                <Empty className="min-h-56 border-0 bg-transparent py-10">
                  <EmptyHeader>
                    <EmptyMascot icon={<PackageOpen />} />
                    <EmptyTitle>Aucun produit dans cette sélection</EmptyTitle>
                    <EmptyDescription>
                      Modifiez la recherche ou les filtres.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : view === "table" ? (
                <div className="p-1">
                  <CatalogueTable
                    filters={filterControls}
                    toolbar={tabButtons}
                    listRef={listRef}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onOpen={setSelected}
                    onOrder={order}
                    onRestock={onRestock}
                    products={filtered}
                  />
                </div>
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
              {view === "cards" && (
                <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-xs">
                    {filtered.length} référence{filtered.length > 1 ? "s" : ""}{" "}
                    · page {page} sur {pages}
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
              )}
            </CardContent>
          </MaybeShell>
        </TabsContent>

        <TabsContent value="mouvements">
          <TabShell title="Mouvements" toolbar={tabButtons}>
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
                          (item) => item.id === movement.productId,
                        );
                        const positive = movement.quantityDelta > 0;
                        return (
                          <TableRow key={movement.id}>
                            <TableCell>
                              {formatDate(movement.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.productNameSnapshot ||
                                product?.name ||
                                "Produit archivé"}
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
                                    : "text-rose-700 dark:text-rose-300",
                              )}
                            >
                              {positive ? "+" : ""}
                              {movement.quantityDelta.toLocaleString("fr-FR", {
                                maximumFractionDigits: 6,
                              })}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {movement.unitSnapshot ||
                                  product?.unit ||
                                  "unité non renseignée"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {movement.quantityAfter.toLocaleString("fr-FR", {
                                maximumFractionDigits: 6,
                              })}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {movement.unitSnapshot ||
                                  product?.unit ||
                                  "unité non renseignée"}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="block">
                                {movement.sourceType === "care"
                                  ? "Soin"
                                  : movement.sourceType === "prescription"
                                    ? "Ordonnance"
                                    : movement.sourceType === "consultation"
                                      ? "Consultation"
                                      : movement.sourceType === "transfer"
                                        ? "Transfert"
                                        : movement.sourceType === "receipt"
                                          ? "Réception"
                                          : "Stock"}{" "}
                                ·{" "}
                                {movement.sourceLabel ||
                                  movement.reason ||
                                  "Non renseigné"}
                              </span>
                              {movement.invoiceId && (
                                <StockInvoiceLink
                                  invoiceId={movement.invoiceId}
                                />
                              )}
                              <MovementAllocationDetails
                                movementId={movement.id}
                                unit={
                                  movement.unitSnapshot ||
                                  product?.unit ||
                                  "unité"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </TabShell>
        </TabsContent>

        <TabsContent value="lots">
          <TabShell title="Lots" toolbar={tabButtons}>
            <StockLotsPanel />
          </TabShell>
        </TabsContent>
        <TabsContent value="purchasing">
          <TabShell title="Approvisionnements" toolbar={tabButtons}>
            <PurchasingPanel
              orderFor={orderFor}
              onOrderOpened={clearOrderFor}
            />
          </TabShell>
        </TabsContent>
        <TabsContent value="operations">
          <TabShell title="Opérations" toolbar={tabButtons}>
            <StockOperationsPanel
              onOpenMovements={() => setWorkspaceTab("mouvements")}
            />
          </TabShell>
        </TabsContent>
        <TabsContent value="inventaire">
          <TabShell title="Inventaire" toolbar={tabButtons}>
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-2xl bg-foreground/[0.04] p-5">
                <PackageCheck className="size-5 text-emerald-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Valeur d’acquisition
                </p>
                <p className="mt-1 whitespace-nowrap font-semibold text-2xl tracking-tight">
                  {formatDZD(stockValue)}
                </p>
              </div>
              <div className="rounded-2xl bg-foreground/[0.04] p-5">
                <AlertTriangle className="size-5 text-amber-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Sous le seuil
                </p>
                <p className="mt-1 font-semibold text-2xl tracking-tight">
                  {reorder.length} références
                </p>
              </div>
              <div className="rounded-2xl bg-foreground/[0.04] p-5">
                <WalletCards className="size-5 text-sky-600" />
                <p className="mt-5 text-muted-foreground text-xs">
                  Valeur de vente théorique
                </p>
                <p className="mt-1 whitespace-nowrap font-semibold text-2xl tracking-tight">
                  {formatDZD(
                    products.reduce(
                      (sum, product) =>
                        sum + product.quantity * product.salePriceAmount,
                      0,
                    ),
                  )}
                </p>
              </div>
              <div className="md:col-span-3 flex flex-col gap-4 rounded-2xl bg-foreground/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between">
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
          </TabShell>
        </TabsContent>
      </Tabs>

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
                    (product) => product.id === event.target.value,
                  );
                  setInventoryProductId(event.target.value);
                  setCountedQuantity(next?.quantity || 0);
                }}
                value={inventoryProductId}
              >
                {products.map((product) => (
                  <NativeSelectOption key={product.id} value={product.id}>
                    {formatDisplayText(product.name)} · {product.quantity}{" "}
                    {product.unit}
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
                      (product) => product.id === inventoryProductId,
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
                  (item) => item.id === inventoryProductId,
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
