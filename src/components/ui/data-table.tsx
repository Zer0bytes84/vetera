// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  SearchX,
  Table2,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { SkeletonShape } from "@/components/ui/loading-skeleton";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import {
  EmptyState,
  IconButton,
  QuietButton,
  SearchField,
  TuffCheckbox,
} from "@/components/ui/tuff-controls";
import {
  type RememberedRows,
  rememberRows,
  useRememberedRows,
} from "@/hooks/useRememberedRows";
import { enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import "./data-table.css";

/*
 * Adapted for Baitari from TuffUI's Data Table, which is drawn as theirs is: a shell with its header (icon, title, row count,
 * the CSV button), a panel with the filter field, the selection bar that slides in, a table of rounded, zebra rows with
 * sortable headers (descending, ascending, then none) and a footer with the range and the page arrows. What changes:
 *  - text is French and never under 12 px; sorting is French-collated; colours are our tokens, never the TuffUI theme;
 *  - export: their « copy as CSV » stays, and a second round button downloads the file (`exportName`); CSV always carries
 *    every filtered row, sorted as shown, not just the page;
 *  - a `filters` slot beside the filter field (the selects a page already has) and `onRowClick` for rows that open a record;
 *  - the filtered count is announced, and the row count in the header rolls like the other widgets' figures.
 */

export type DataRow = { id: string } & Record<string, string | number | null>;

export type DataColumn<R extends DataRow = DataRow> = {
  key: keyof R & string;
  label: string;
  align?: "left" | "right";
  /** Display text for a cell. Sorting, filtering and CSV use the raw value. */
  format?: (value: R[keyof R], row: R) => ReactNode;
  sortable?: boolean;
  /** What the column sorts by, when its raw value does not sort itself (a date in mixed formats sorts by its time). */
  sortValue?: (value: R[keyof R], row: R) => number | string;
  width?: string;
  /** Left out of the CSV (an actions column). */
  noExport?: boolean;
  /** The header is read by assistive tech only (an actions column). */
  hideLabel?: boolean;
  /** Which columns survive a narrow table: 1 always, 2 hides below a 28rem-wide table, 3 below 36rem. */
  priority?: 1 | 2 | 3;
};

const hideBelow = {
  1: "",
  2: "hidden @md:table-cell",
  3: "hidden @xl:table-cell",
} as const;
const priorityOf = (c: { priority?: 1 | 2 | 3 }, i: number) =>
  hideBelow[c.priority ?? (i < 2 ? 1 : i < 4 ? 2 : 3)];

export type DataTableProps<R extends DataRow = DataRow> = {
  data: R[];
  columns: DataColumn<R>[];
  title: string;
  subtitle?: ReactNode;
  /** Words for the rows: « dossier », « produit ». */
  noun?: [one: string, many: string];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Beside the filter field. */
  filters?: ReactNode;
  /** In the header band, on the right, before the CSV buttons: a page's view switch. */
  toolbar?: ReactNode;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Bulk actions shown when rows are selected. */
  actions?: (ids: string[]) => ReactNode;
  onRowClick?: (row: R) => void;
  /** Name of the downloaded file, without extension. */
  exportName?: string;
  /** What the empty table says when there is no data at all. */
  emptyTitle?: string;
  emptyDescription?: string;
  icon?: typeof Table2;
  /** On the right of the empty state: an action such as « Réinitialiser les filtres ». */
  emptyAction?: ReactNode;
  /** The element that holds the rows, for a list cursor. */
  containerRef?: React.Ref<HTMLDivElement>;
  /** Attributes of a row (keyboard access, data attributes). */
  rowProps?: (row: R) => React.HTMLAttributes<HTMLTableRowElement>;
  className?: string;
  /**
   * The rows are still being read (first read only): the table keeps its frame, head and controls, and its body holds the
   * place of the rows shown last time (`skeletonKey`), in the Loading Skeleton's sheen. No count, no empty state, until the
   * rows are known.
   */
  loading?: boolean;
  /** While loading, the placeholders stay invisible until this turns true (useDelayedSkeleton): no flash on a fast read. */
  loadingRevealed?: boolean;
  loadingLabel?: string;
  /** Where this table remembers how many rows it showed, and how tall: the place its next skeleton reserves. */
  skeletonKey?: string;
  /** The place reserved before anything is remembered. */
  skeletonFallback?: RememberedRows;
};

export type Sort = { key: string; dir: "asc" | "desc" } | null;

const compare = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a ?? "").localeCompare(String(b ?? ""), "fr", { numeric: true });

const csvCell = (v: unknown) => {
  const text = String(v ?? "");
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The CSV of rows: header line, then one line per row, in the columns' order. */
export function toCsv<R extends DataRow>(all: DataColumn<R>[], rows: R[]) {
  const columns = all.filter((c) => !c.noExport);
  return [
    columns.map((c) => csvCell(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(",")),
  ].join("\n");
}

/** The rows that pass the filter (any column contains it, case ignored), then sorted. */
export function selectRows<R extends DataRow>(
  data: R[],
  columns: DataColumn<R>[],
  query: string,
  sort: Sort
): R[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? data.filter((row) =>
        columns.some((c) =>
          String(row[c.key] ?? "")
            .toLowerCase()
            .includes(q)
        )
      )
    : data;
  if (!sort) {
    return filtered;
  }
  const sign = sort.dir === "asc" ? 1 : -1;
  const column = columns.find((c) => c.key === sort.key);
  const by = (row: R) =>
    column?.sortValue
      ? column.sortValue(row[sort.key as keyof R], row)
      : row[sort.key];
  return [...filtered].sort((a, b) => sign * compare(by(a), by(b)));
}

/** A header's clicks: descending, then ascending, then back to the order of the data. */
export function nextSort(sort: Sort, key: string): Sort {
  return sort?.key === key
    ? sort.dir === "desc"
      ? { key, dir: "asc" }
      : null
    : { key, dir: "desc" };
}

export function DataTable<R extends DataRow>({
  data,
  columns,
  title,
  subtitle,
  noun = ["ligne", "lignes"],
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Filtrer les lignes",
  filters,
  toolbar,
  selectable = false,
  selected: selectedProp,
  onSelectedChange,
  actions,
  onRowClick,
  exportName = "export",
  emptyTitle,
  emptyDescription,
  icon: HeaderIcon = Table2,
  emptyAction,
  containerRef,
  rowProps,
  className,
  loading = false,
  loadingRevealed = true,
  loadingLabel,
  skeletonKey,
  skeletonFallback,
}: DataTableProps<R>) {
  const memoryKey = skeletonKey ?? `table:${title}`;
  const { reserved } = useRememberedRows<HTMLTableElement>(
    memoryKey,
    skeletonFallback ?? { rows: Math.min(pageSize, 5), rowHeight: 44 }
  );
  // Once the rows are shown, the table remembers them for its next skeleton: their number, one row's height (or, empty,
  // the height of the empty state) and each column's width, so the head does not move either when the rows arrive.
  const measureTable = useCallback(
    (table: HTMLTableElement | null) => {
      if (!table || typeof ResizeObserver === "undefined") {
        return;
      }
      const record = () => {
        const body = table.tBodies[0];
        const head = table.tHead?.rows[0];
        if (!(body && head)) {
          return;
        }
        const rows = body.rows.length;
        const empty = table.nextElementSibling;
        const rowHeight = rows
          ? body.getBoundingClientRect().height / rows
          : (empty?.getBoundingClientRect().height ?? 0);
        const columns = [...head.cells].map(
          (cell) => Math.round(cell.getBoundingClientRect().width * 100) / 100
        );
        if (rowHeight > 0) {
          rememberRows(memoryKey, { rows, rowHeight, columns });
        }
      };
      const observer = new ResizeObserver(record);
      observer.observe(table);
      if (table.nextElementSibling) {
        observer.observe(table.nextElementSibling);
      }
      return () => observer.disconnect();
    },
    [memoryKey]
  );
  const columnWidth = (index: number, fallback?: string) =>
    loading &&
    reserved.columns?.length === columns.length + (selectable ? 1 : 0)
      ? reserved.columns[index]
      : fallback;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(0);
  const [ownSelected, setOwnSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const selected = selectedProp ?? ownSelected;
  const setSelected = (ids: string[]) => {
    setOwnSelected(ids);
    onSelectedChange?.(ids);
  };

  const rows = useMemo(
    () => selectRows(data, columns, query, sort),
    [data, columns, query, sort]
  );

  const pages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * pageSize, (current + 1) * pageSize);
  const allOnPage =
    visible.length > 0 && visible.every((r) => selected.includes(r.id));
  const someOnPage = visible.some((r) => selected.includes(r.id));

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key
        ? s.dir === "desc"
          ? { key, dir: "asc" }
          : null
        : { key, dir: "desc" }
    );
    setPage(0);
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(toCsv(columns, rows));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* The clipboard may be refused: the download still works. */
    }
  };

  const downloadCsv = () => {
    // A byte-order mark so a spreadsheet reads the accents as UTF-8.
    const blob = new Blob(["﻿", toCsv(columns, rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const word = rows.length === 1 ? noun[0] : noun[1];

  return (
    <MotionConfig reducedMotion="user">
      <Shell
        aria-busy={loading || undefined}
        className={cn("w-full", loading && "loading-skeleton", className)}
        data-skeleton-region={memoryKey}
      >
        <ShellHeader
          as="h2"
          aside={
            <>
              {toolbar}
              <IconButton
                icon={copied ? Check : Copy}
                label={copied ? "Copié en CSV" : "Copier en CSV"}
                onClick={copyCsv}
                strokeWidth={copied ? 3 : 2}
              />
              <IconButton
                icon={Download}
                label="Télécharger en CSV"
                onClick={downloadCsv}
              />
            </>
          }
          icon={HeaderIcon}
          subtitle={
            loading ? (
              <SkeletonShape
                className={cn(
                  "loading-skeleton-inline",
                  !loadingRevealed && "invisible"
                )}
              />
            ) : (
              (subtitle ?? (
                <>
                  <RollingNumber value={rows.length} /> {word}
                </>
              ))
            )
          }
          title={title}
        />
        <Panel className="p-2">
          {(searchable || filters) && (
            <div className="flex flex-wrap items-center gap-2 p-1 pb-2">
              {searchable && (
                <SearchField
                  className="min-w-48 flex-1"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  onClear={() => setQuery("")}
                  placeholder={searchPlaceholder}
                  value={query}
                />
              )}
              {filters}
            </div>
          )}

          <AnimatePresence initial={false}>
            {selectable && selected.length > 0 && (
              <motion.div
                animate={{ height: "auto", opacity: 1, transition: enter }}
                className="overflow-hidden"
                exit={{ height: 0, opacity: 0, transition: exit }}
                initial={{ height: 0, opacity: 0 }}
              >
                <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl bg-brand/10 py-1.5 pr-1.5 pl-3 text-sm/6">
                  <span className="text-brand">
                    <RollingNumber value={selected.length} />{" "}
                    {selected.length === 1 ? "sélectionné" : "sélectionnés"}
                  </span>
                  <QuietButton onClick={() => setSelected([])}>
                    Effacer
                  </QuietButton>
                  <span className="ml-auto flex gap-1.5">
                    {actions?.(selected)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-hidden" ref={containerRef}>
            <table
              className="tuff-table w-full border-separate border-spacing-0 text-sm/6"
              ref={loading ? undefined : measureTable}
            >
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="text-muted-foreground">
                  {selectable && (
                    <th
                      className="w-9 px-2 py-2"
                      scope="col"
                      style={{ width: columnWidth(0) }}
                    >
                      <TuffCheckbox
                        aria-label="Sélectionner toutes les lignes de la page"
                        checked={
                          allOnPage ? true : someOnPage ? "mixed" : false
                        }
                        onCheckedChange={() =>
                          setSelected(
                            allOnPage
                              ? selected.filter(
                                  (id) => !visible.some((r) => r.id === id)
                                )
                              : [
                                  ...new Set([
                                    ...selected,
                                    ...visible.map((r) => r.id),
                                  ]),
                                ]
                          )
                        }
                      />
                    </th>
                  )}
                  {columns.map((c, ci) => {
                    const dir = sort?.key === c.key ? sort.dir : null;
                    const SortIcon = dir === "asc" ? ChevronUp : ChevronDown;
                    return (
                      <th
                        aria-sort={
                          dir
                            ? dir === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                        className={cn(
                          "px-2 py-2 font-medium",
                          c.align === "right" ? "text-right" : "text-left",
                          priorityOf(c, ci)
                        )}
                        key={c.key}
                        scope="col"
                        style={{
                          width: columnWidth(
                            ci + (selectable ? 1 : 0),
                            c.width
                          ),
                        }}
                      >
                        {c.sortable ? (
                          <button
                            className={cn(
                              "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-[background-color,color,scale] duration-150 ease-out hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.97]",
                              dir && "text-foreground",
                              c.align === "right" && "flex-row-reverse"
                            )}
                            onClick={() => toggleSort(c.key)}
                            type="button"
                          >
                            {c.label}
                            <SortIcon
                              aria-hidden="true"
                              className={cn(
                                "size-3 transition-opacity",
                                dir ? "opacity-100" : "opacity-30"
                              )}
                              strokeWidth={3}
                            />
                          </button>
                        ) : c.hideLabel ? (
                          <span className="sr-only">{c.label}</span>
                        ) : (
                          c.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              {loading ? (
                <tbody className={cn(!loadingRevealed && "invisible")}>
                  {reserved.rows === 0 ? (
                    // Empty last time: the place of the empty state, without its words.
                    <tr
                      aria-hidden="true"
                      style={{ height: reserved.rowHeight }}
                    >
                      <td colSpan={columns.length + (selectable ? 1 : 0)} />
                    </tr>
                  ) : null}
                  {Array.from({ length: reserved.rows }, (_, i) => (
                    <tr
                      aria-hidden="true"
                      data-zebra={i % 2 === 1 ? "odd" : undefined}
                      key={i}
                      style={{ height: reserved.rowHeight }}
                    >
                      {selectable && <td className="w-9 px-2" />}
                      {columns.map((c, ci) => (
                        <td
                          className={cn(
                            "px-2",
                            priorityOf(c, ci),
                            c.align === "right" && "text-right"
                          )}
                          key={c.key}
                        >
                          <SkeletonShape
                            className={cn(
                              "loading-skeleton-cell",
                              ci === 0
                                ? "loading-skeleton-cell-lead"
                                : c.align === "right"
                                  ? "loading-skeleton-cell-short"
                                  : undefined
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ) : (
                <tbody>
                  {visible.map((row, i) => {
                    const isSelected = selected.includes(row.id);
                    return (
                      <tr
                        className={cn(onRowClick && "cursor-pointer")}
                        data-selected={isSelected || undefined}
                        data-zebra={i % 2 === 1 ? "odd" : undefined}
                        key={row.id}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        {...rowProps?.(row)}
                      >
                        {selectable && (
                          <td
                            className="px-2 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <TuffCheckbox
                              aria-label={`Sélectionner ${String(row[columns[0].key])}`}
                              checked={isSelected}
                              onCheckedChange={(on) =>
                                setSelected(
                                  on
                                    ? [...selected, row.id]
                                    : selected.filter((id) => id !== row.id)
                                )
                              }
                            />
                          </td>
                        )}
                        {columns.map((c, ci) => (
                          <td
                            className={cn(
                              "whitespace-nowrap px-2 py-2.5",
                              priorityOf(c, ci),
                              c.align === "right" &&
                                "text-right font-mono text-xs tabular-nums"
                            )}
                            key={c.key}
                          >
                            {c.format
                              ? c.format(row[c.key], row)
                              : String(row[c.key] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
            {!loading && rows.length === 0 && (
              <EmptyState
                action={emptyAction}
                compact
                description={
                  data.length
                    ? `Rien ne correspond à « ${query} ».`
                    : emptyDescription
                }
                icon={SearchX}
                title={
                  data.length
                    ? "Aucun résultat"
                    : (emptyTitle ?? "Rien à afficher")
                }
              />
            )}
          </div>
        </Panel>

        <footer className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-3.5 text-muted-foreground text-xs">
          {loading ? (
            <SkeletonShape
              className={cn(
                "loading-skeleton-inline",
                !loadingRevealed && "invisible"
              )}
            />
          ) : (
            <span>
              {rows.length ? current * pageSize + 1 : 0}–
              {Math.min((current + 1) * pageSize, rows.length)} sur{" "}
              {rows.length}
            </span>
          )}
          <span className="flex items-center gap-1">
            <IconButton
              disabled={current === 0}
              icon={ChevronLeft}
              label="Page précédente"
              onClick={() => setPage(current - 1)}
              strokeWidth={3}
            />
            <span className="w-14 text-center tabular-nums">
              {loading ? (
                <SkeletonShape
                  className={cn(
                    "loading-skeleton-inline loading-skeleton-inline-short",
                    !loadingRevealed && "invisible"
                  )}
                />
              ) : (
                <>
                  {current + 1} / {pages}
                </>
              )}
            </span>
            <IconButton
              disabled={current >= pages - 1}
              icon={ChevronRight}
              label="Page suivante"
              onClick={() => setPage(current + 1)}
              strokeWidth={3}
            />
          </span>
        </footer>
        <p aria-live="polite" className="sr-only" role="status">
          {loading
            ? (loadingLabel ?? `Chargement : ${title}`)
            : copied
              ? "Copié en CSV"
              : `${rows.length} ${word}${sort ? `, triés par ${columns.find((c) => c.key === sort.key)?.label ?? sort.key} ${sort.dir === "asc" ? "croissant" : "décroissant"}` : ""}`}
        </p>
      </Shell>
    </MotionConfig>
  );
}
