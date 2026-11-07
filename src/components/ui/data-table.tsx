// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  Copy,
  Download,
  SearchX,
  Table2,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import {
  EmptyState,
  IconButton,
  QuietButton,
  SearchField,
  TuffCheckbox,
} from "@/components/ui/tuff-controls";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
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
  sort: Sort,
): R[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? data.filter((row) =>
        columns.some((c) =>
          String(row[c.key] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      )
    : data;
  if (!sort) return filtered;
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => sign * compare(a[sort.key], b[sort.key]));
}

/** A header's clicks: descending, then ascending, then back to the order of the data. */
export function nextSort(sort: Sort, key: string): Sort {
  return sort?.key !== key
    ? { key, dir: "desc" }
    : sort.dir === "desc"
      ? { key, dir: "asc" }
      : null;
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
}: DataTableProps<R>) {
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
    [data, columns, query, sort],
  );

  const pages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * pageSize, (current + 1) * pageSize);
  const allOnPage =
    visible.length > 0 && visible.every((r) => selected.includes(r.id));
  const someOnPage = visible.some((r) => selected.includes(r.id));

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key !== key
        ? { key, dir: "desc" }
        : s.dir === "desc"
          ? { key, dir: "asc" }
          : null,
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
      <Shell className={cn("w-full", className)}>
        <ShellHeader
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
          as="h2"
          icon={HeaderIcon}
          subtitle={
            subtitle ?? (
              <>
                <RollingNumber value={rows.length} /> {word}
              </>
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
                <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl bg-brand/10 py-1.5 pr-1.5 pl-3 text-[0.8125rem]">
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
            <table className="tuff-table w-full border-separate border-spacing-0 text-[0.8125rem]">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr className="text-muted-foreground">
                  {selectable && (
                    <th className="w-9 px-2 py-2" scope="col">
                      <TuffCheckbox
                        aria-label="Sélectionner toutes les lignes de la page"
                        checked={
                          allOnPage ? true : someOnPage ? "mixed" : false
                        }
                        onCheckedChange={() =>
                          setSelected(
                            allOnPage
                              ? selected.filter(
                                  (id) => !visible.some((r) => r.id === id),
                                )
                              : [
                                  ...new Set([
                                    ...selected,
                                    ...visible.map((r) => r.id),
                                  ]),
                                ],
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
                          priorityOf(c, ci),
                        )}
                        key={c.key}
                        scope="col"
                        style={{ width: c.width }}
                      >
                        {c.sortable ? (
                          <button
                            className={cn(
                              "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-[background-color,color,scale] duration-150 ease-out hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.97]",
                              dir && "text-foreground",
                              c.align === "right" && "flex-row-reverse",
                            )}
                            onClick={() => toggleSort(c.key)}
                            type="button"
                          >
                            {c.label}
                            <SortIcon
                              aria-hidden="true"
                              className={cn(
                                "size-3 transition-opacity",
                                dir ? "opacity-100" : "opacity-30",
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
                                  : selected.filter((id) => id !== row.id),
                              )
                            }
                          />
                        </td>
                      )}
                      {columns.map((c, ci) => (
                        <td
                          className={cn(
                            "px-2 py-2.5 whitespace-nowrap",
                            priorityOf(c, ci),
                            c.align === "right" &&
                              "text-right font-mono text-xs tabular-nums",
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
            </table>
            {rows.length === 0 && (
              <EmptyState
                compact
                description={
                  data.length
                    ? `Rien ne correspond à « ${query} ».`
                    : emptyDescription
                }
                action={emptyAction}
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

        <footer className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-3.5 text-xs text-muted-foreground">
          <span>
            {rows.length ? current * pageSize + 1 : 0}–
            {Math.min((current + 1) * pageSize, rows.length)} sur {rows.length}
          </span>
          <span className="flex items-center gap-1">
            <IconButton
              disabled={current === 0}
              icon={ChevronLeft}
              label="Page précédente"
              onClick={() => setPage(current - 1)}
              strokeWidth={3}
            />
            <span className="w-14 text-center tabular-nums">
              {current + 1} / {pages}
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
          {copied
            ? "Copié en CSV"
            : `${rows.length} ${word}${sort ? `, triés par ${sort.key} ${sort.dir === "asc" ? "croissant" : "décroissant"}` : ""}`}
        </p>
      </Shell>
    </MotionConfig>
  );
}
