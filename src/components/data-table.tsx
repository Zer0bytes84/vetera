"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Columns2,
  EllipsisVertical,
  GripVertical,
  Loader,
  Plus,
  TrendingUp,
} from "lucide-react";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Data types ──────────────────────────────────────────────────────────

export type AppointmentTableRow = {
  id: number;
  patient: string;
  owner: string;
  species: string;
  type: string;
  appointmentAt: string;
  status: string;
  veterinarian: string;
  tab: "planning" | "aujourdhui" | "attention" | "termine";
  summary?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
};

const TABS: { value: AppointmentTableRow["tab"]; label: string }[] = [
  { value: "planning", label: "Planification" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "attention", label: "Attention" },
  { value: "termine", label: "Terminé" },
];

// ─── Drag handle ─────────────────────────────────────────────────────────

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Button
      {...attributes}
      {...listeners}
      className="size-7 cursor-move text-muted-foreground hover:bg-transparent"
      size="icon"
      variant="ghost"
    >
      <GripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Réorganiser</span>
    </Button>
  );
}

// ─── Status helpers ──────────────────────────────────────────────────────

function getStatusIcon(status: string) {
  if (status === "completed" || status === "Terminé") {
    return <CircleCheckBig className="text-green-500 dark:text-green-400" />;
  }
  return <Loader />;
}

function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Planifié",
    in_progress: "En cours",
    completed: "Terminé",
    cancelled: "Annulé",
    no_show: "Absent",
  };
  return map[status] ?? status;
}

// ─── Columns ─────────────────────────────────────────────────────────────

function createColumns(
  activeTab: AppointmentTableRow["tab"]
): ColumnDef<AppointmentTableRow>[] {
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Tout sélectionner"
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={() =>
              table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected())
            }
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Sélectionner la ligne"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "patient",
      header: "Patient",
      cell: ({ row }) => <TableCellViewer item={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="w-32">
          <Badge className="px-1.5 text-muted-foreground" variant="outline">
            {row.original.type}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const status = row.original.status;
        const label = formatStatusLabel(status);
        return (
          <Badge className="px-1.5 text-muted-foreground" variant="outline">
            {getStatusIcon(status)}
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "appointmentAt",
      header: () => <div className="w-full">Horaire</div>,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.appointmentAt}
        </div>
      ),
    },
    {
      accessorKey: "veterinarian",
      header: "Vétérinaire",
      cell: ({ row }) => {
        const vet = row.original.veterinarian;
        return <div className="text-muted-foreground text-sm">{vet}</div>;
      },
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted data-[state=open]:bg-muted">
            <EllipsisVertical />
            <span className="sr-only">Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>Modifier</DropdownMenuItem>
            <DropdownMenuItem>Dupliquer</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Supprimer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

// ─── Draggable row ───────────────────────────────────────────────────────

function DraggableRow({ row }: { row: Row<AppointmentTableRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      data-dragging={isDragging}
      data-state={row.getIsSelected() && "selected"}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Detail drawer chart data ────────────────────────────────────────────

const miniChartData = [
  { month: "Janvier", desktop: 186, mobile: 80 },
  { month: "Février", desktop: 305, mobile: 200 },
  { month: "Mars", desktop: 237, mobile: 120 },
  { month: "Avril", desktop: 73, mobile: 190 },
  { month: "Mai", desktop: 209, mobile: 130 },
  { month: "Juin", desktop: 214, mobile: 140 },
];

const miniChartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

// ─── Table cell viewer (drawer trigger) ──────────────────────────────────

function TableCellViewer({ item }: { item: AppointmentTableRow }) {
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger className="w-fit cursor-pointer px-0 text-left text-foreground hover:underline">
        {item.patient}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.patient}</DrawerTitle>
          <DrawerDescription>
            {item.type} · {item.appointmentAt} · {item.veterinarian}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={miniChartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={miniChartData}
                  margin={{ left: 0, right: 10 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="month"
                    tickFormatter={(value) => (value as string).slice(0, 3)}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                    cursor={false}
                  />
                  <Area
                    dataKey="mobile"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stackId="a"
                    stroke="var(--color-mobile)"
                    type="natural"
                  />
                  <Area
                    dataKey="desktop"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stackId="a"
                    stroke="var(--color-desktop)"
                    type="natural"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="flex gap-2 font-medium leading-none">
                Progression ce mois <TrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Aperçu de l&apos;activité sur les 6 derniers mois.
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="patient">Patient</Label>
              <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                {item.patient}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="owner">Propriétaire</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.owner}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="species">Espèce</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.species}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Type</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.type}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Statut</Label>
                <div className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-muted-foreground">
                  {getStatusIcon(item.status)}
                  {formatStatusLabel(item.status)}
                </div>
              </div>
            </div>
            {item.diagnosis && (
              <div className="flex flex-col gap-3">
                <Label htmlFor="diagnosis">Diagnostic</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.diagnosis}
                </div>
              </div>
            )}
            {item.treatment && (
              <div className="flex flex-col gap-3">
                <Label htmlFor="treatment">Traitement</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.treatment}
                </div>
              </div>
            )}
            {item.notes && (
              <div className="flex flex-col gap-3">
                <Label htmlFor="notes">Notes</Label>
                <div className="rounded-lg border px-3 py-2 text-muted-foreground">
                  {item.notes}
                </div>
              </div>
            )}
          </form>
        </div>
        <DrawerFooter>
          <Button className="cursor-pointer">Soumettre</Button>
          <DrawerClose className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-4 py-2 font-medium text-sm transition-colors hover:bg-muted">
            Fermer
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Table content component (shared across tabs) ────────────────────────

function TableContent({
  currentTable,
  currentDataIds,
  handleCurrentDragEnd,
  columnCount,
  sensors,
}: {
  currentTable: ReturnType<typeof useReactTable<AppointmentTableRow>>;
  currentDataIds: UniqueIdentifier[];
  handleCurrentDragEnd: (event: DragEndEvent) => void;
  columnCount: number;
  sensors: ReturnType<typeof useSensors>;
}) {
  return (
    <>
      <div className="dashboard-table-frame overflow-hidden rounded-[22px] border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleCurrentDragEnd}
          sensors={sensors}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {currentTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead colSpan={header.colSpan} key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {currentTable.getRowModel().rows?.length ? (
                <SortableContext
                  items={currentDataIds}
                  strategy={verticalListSortingStrategy}
                >
                  {currentTable.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={columnCount}>
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          {currentTable.getFilteredSelectedRowModel().rows.length} sur{" "}
          {currentTable.getFilteredRowModel().rows.length} ligne(s)
          sélectionnée(s).
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label className="font-medium text-sm" htmlFor="rows-per-page">
              Lignes/page
            </Label>
            <Select
              onValueChange={(value) => {
                currentTable.setPageSize(Number(value));
              }}
              value={`${currentTable.getState().pagination.pageSize}`}
            >
              <SelectTrigger
                className="w-20 cursor-pointer"
                id="rows-per-page"
                size="sm"
              >
                <SelectValue
                  placeholder={currentTable.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {currentTable.getState().pagination.pageIndex + 1} sur{" "}
            {currentTable.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              className="hidden h-8 w-8 cursor-pointer p-0 lg:flex"
              disabled={!currentTable.getCanPreviousPage()}
              onClick={() => currentTable.setPageIndex(0)}
              variant="outline"
            >
              <span className="sr-only">Première page</span>
              <ChevronsLeft />
            </Button>
            <Button
              className="size-8 cursor-pointer"
              disabled={!currentTable.getCanPreviousPage()}
              onClick={() => currentTable.previousPage()}
              size="icon"
              variant="outline"
            >
              <span className="sr-only">Page précédente</span>
              <ChevronLeft />
            </Button>
            <Button
              className="size-8 cursor-pointer"
              disabled={!currentTable.getCanNextPage()}
              onClick={() => currentTable.nextPage()}
              size="icon"
              variant="outline"
            >
              <span className="sr-only">Page suivante</span>
              <ChevronRight />
            </Button>
            <Button
              className="hidden size-8 cursor-pointer lg:flex"
              disabled={!currentTable.getCanNextPage()}
              onClick={() =>
                currentTable.setPageIndex(currentTable.getPageCount() - 1)
              }
              size="icon"
              variant="outline"
            >
              <span className="sr-only">Dernière page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main DataTable ──────────────────────────────────────────────────────

export function DataTable({ data }: { data: AppointmentTableRow[] }) {
  const [activeTab, setActiveTab] =
    React.useState<AppointmentTableRow["tab"]>("planning");
  const [tabData, setTabData] = React.useState<
    Record<string, AppointmentTableRow[]>
  >(() => {
    const grouped: Record<string, AppointmentTableRow[]> = {};
    for (const tab of TABS) {
      grouped[tab.value] = data.filter((row) => row.tab === tab.value);
    }
    return grouped;
  });

  React.useEffect(() => {
    const grouped: Record<string, AppointmentTableRow[]> = {};
    for (const tab of TABS) {
      grouped[tab.value] = data.filter((row) => row.tab === tab.value);
    }
    setTabData(grouped);
  }, [data]);

  const currentData = React.useMemo(
    () => tabData[activeTab] ?? [],
    [tabData, activeTab]
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => currentData.map((row) => row.id),
    [currentData]
  );

  // Shared table state
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo(() => createColumns(activeTab), [activeTab]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const table = useReactTable({
    data: currentData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setTabData((prev) => {
        const current = [...(prev[activeTab] ?? [])];
        const oldIndex = current.findIndex((row) => row.id === active.id);
        const newIndex = current.findIndex((row) => row.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          return prev;
        }
        return {
          ...prev,
          [activeTab]: arrayMove(current, oldIndex, newIndex),
        };
      });
    }
  }

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      counts[tab.value] = data.filter((row) => row.tab === tab.value).length;
    }
    return counts;
  }, [data]);

  return (
    <Tabs
      className="dashboard-table-card w-full flex-col justify-start gap-6"
      onValueChange={(value) => {
        setActiveTab(value as AppointmentTableRow["tab"]);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }}
      value={activeTab}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 lg:px-6">
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 sm:flex">
          {TABS.map((tab) => (
            <TabsTrigger
              className="cursor-pointer"
              key={tab.value}
              value={tab.value}
            >
              {tab.label}
              <Badge variant="secondary">{tabCounts[tab.value] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-sm transition-colors hover:bg-muted">
              <Columns2 />
              <span className="hidden lg:inline">Colonnes</span>
              <span className="lg:hidden">Colonnes</span>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={column.getIsVisible()}
                    className="capitalize"
                    key={column.id}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "appointmentAt"
                      ? "Horaire"
                      : column.id === "veterinarian"
                        ? "Vétérinaire"
                        : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="cursor-pointer" size="sm" variant="outline">
            <Plus />
            <span className="hidden lg:inline">Nouveau RDV</span>
          </Button>
        </div>
      </div>
      {TABS.map((tab) => (
        <TabsContent
          className="relative flex flex-col gap-4 overflow-auto px-5 pb-5 lg:px-6"
          key={tab.value}
          value={tab.value}
        >
          <TableContent
            columnCount={columns.length}
            currentDataIds={dataIds}
            currentTable={table}
            handleCurrentDragEnd={handleDragEnd}
            sensors={sensors}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
