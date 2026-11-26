import { useCallback, useState } from "react";

/*
 * A list's skeleton holds the place of the rows the list showed last time: their number and their height, kept on this
 * computer per list. On the next launch the skeleton takes exactly the room the rows will take, so nothing moves when they
 * arrive. The very first launch has no memory and falls back on the list's default.
 */

export interface RememberedRows {
  /** A table's column widths, head cell by head cell. */
  columns?: number[];
  /** One row's height; with 0 rows, the height of what the list shows when empty. */
  rowHeight: number;
  rows: number;
}

const PREFIX = "vetera:skeleton-rows:";

export function readRememberedRows(
  key: string,
  fallback: RememberedRows
): RememberedRows {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PREFIX + key) ?? "null"
    ) as Partial<RememberedRows> | null;
    if (
      saved &&
      typeof saved.rows === "number" &&
      typeof saved.rowHeight === "number" &&
      Number.isFinite(saved.rows) &&
      Number.isFinite(saved.rowHeight) &&
      saved.rows >= 0 &&
      saved.rowHeight >= 0
    ) {
      const columns =
        Array.isArray(saved.columns) &&
        saved.columns.every((w) => Number.isFinite(w) && w >= 0)
          ? saved.columns
          : undefined;
      return {
        rows: Math.round(saved.rows),
        rowHeight: Math.round(saved.rowHeight * 100) / 100,
        columns,
      };
    }
  } catch {
    /* No storage, or a damaged entry: the default holds the place. */
  }
  return fallback;
}

/** Remember a list's place directly: for a list that is absent when it has nothing to show (0 rows). */
export function rememberRows(key: string, value: RememberedRows) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Storage refused: the next skeleton uses the default. */
  }
}

/**
 * The place a list's skeleton reserves (read once, when the list mounts), and a ref for the element whose children are the
 * rows once they are read (attach it to the rows only, never to the skeleton): each time its size changes, the number of
 * rows and their mean height are remembered. In a grid (`layout="grid"`), the height kept is one tile's; for a region
 * (`layout="block"`), the whole region's, as one row.
 */
export function useRememberedRows<T extends HTMLElement>(
  key: string,
  fallback: RememberedRows,
  layout: "stack" | "grid" | "block" = "stack"
) {
  const [reserved] = useState(() => readRememberedRows(key, fallback));
  const measure = useCallback(
    (node: T | null) => {
      if (!node || typeof ResizeObserver === "undefined") {
        return;
      }
      const record = () => {
        if (layout === "block") {
          // A region may be empty (hidden): its height, 0, is remembered as well.
          rememberRows(key, {
            rows: 1,
            rowHeight: node.getBoundingClientRect().height,
          });
          return;
        }
        const rows = node.children.length;
        // In a stack, the gap between rows is the skeleton's too: only the rows' own height is kept.
        const gap = Number.parseFloat(getComputedStyle(node).rowGap) || 0;
        const height =
          layout === "grid"
            ? (node.firstElementChild?.getBoundingClientRect().height ?? 0)
            : (node.getBoundingClientRect().height - gap * (rows - 1)) / rows;
        if (rows > 0 && height > 0) {
          rememberRows(key, { rows, rowHeight: height });
        }
      };
      const observer = new ResizeObserver(record);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [key, layout]
  );
  return { reserved, measure };
}
