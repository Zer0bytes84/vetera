// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { CalendarIcon } from "@heroicons/react/20/solid";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_OUT, enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari from TuffUI's Hex Density. The drawing is theirs: a pointy-top hexagon grid, odd rows half a cell to
 * the right, a deeper fill for a fuller cell, columns that fade in from left to right, a tooltip above the cell, arrow keys
 * to walk the grid. What changes:
 *  - the cells are given, not binned: Baitari's views need one hexagon per hour or per day, so each cell carries its own
 *    grid position, count, level, label and tooltip text (`cells`) instead of a cloud of points to bin;
 *  - the fill follows our four levels (`level` 0 to 4: one step per appointment up to four) and our tokens, never the TuffUI
 *    theme: `tone` is any of our colours, the empty cell is the ink at a few percent;
 *  - cells after now are drawn with a dashed outline (booked, not happened), today's cell with the ink outline;
 *  - text is French and never under 12 px; the legend reads « Moins » to « Plus »;
 *  - the header's right side takes a toolbar (the views), and a slot under the grid holds the figures.
 */

export type HexCell = {
  id: string;
  /** Grid position. Odd rows sit half a cell to the right. */
  col: number;
  row: number;
  count: number;
  /** 0 for an empty cell, then 1 to 4. */
  level: number;
  /** Written inside the hexagon. */
  label?: string;
  /** Tooltip title and body. */
  title: string;
  detail: string;
  /** After now: booked, not happened. */
  future?: boolean;
  today?: boolean;
};

export type HexCaption = { at: number; text: string };

export type HexDensityProps = {
  cells: HexCell[];
  cols: number;
  rows: number;
  /** Above the grid, at a column. */
  columnCaptions?: HexCaption[];
  /** Left of the grid, at a row. */
  rowCaptions?: HexCaption[];
  /** Colour of a filled cell. */
  tone?: string;
  /** Height of the grid's area in px: hexagons shrink to fit it, and every view takes the same space. */
  areaHeight?: number;
  /** Largest hexagon radius in px. It shrinks so every column fits. */
  radius?: number;
  title: string;
  subtitle?: ReactNode;
  /** Right of the header: the views. */
  toolbar?: ReactNode;
  /** Read by screen readers instead of the grid. */
  summary: string;
  /** Under the grid, in the panel: the figures and the footer. */
  children?: ReactNode;
  /** What one count is called, plural, and what one cell is called, plural. */
  unit?: string;
  binUnit?: string;
  /** Written on the fullest cell. */
  densestLabel?: string;
  className?: string;
};

const SQRT3 = Math.sqrt(3);
const TIP_W = 200;
/** TuffUI's own five steps of fill, on a square-root scale of the fullest cell. */
const STEPS = [0.2, 0.36, 0.54, 0.76, 1];

const round = (n: number) => Math.round(n * 100) / 100;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  // null until measured: the grid draws once at its real width, so entrances don't tween from a guessed size.
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width ?? 520, width !== null] as const;
}

function hexPath(r: number) {
  return (
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 3) * k - Math.PI / 2;
      return `${k ? "L" : "M"}${round(r * Math.cos(a))} ${round(r * Math.sin(a))}`;
    }).join("") + "Z"
  );
}

export function HexDensity({
  cells,
  cols,
  rows,
  columnCaptions = [],
  rowCaptions = [],
  tone = "var(--tone-blue)",
  unit = "rendez-vous",
  binUnit = "jours",
  densestLabel = "Jour le plus chargé",
  radius = 36,
  areaHeight = 300,
  title,
  subtitle,
  toolbar,
  summary,
  children,
  className,
}: HexDensityProps) {
  const reduce = useReducedMotion();
  const [ref, width, measured] = useWidth();
  const [active, setActive] = useState<string | null>(null);
  const [fromKeyboard, setFromKeyboard] = useState(false);

  const gutter = rowCaptions.length ? 48 : 0;
  const top = columnCaptions.length ? 26 : 4;
  const plotW = Math.max(width - gutter, 40);
  const fitH = (areaHeight - top - 4) / (1.5 * (rows - 1) + 2);
  const r = round(
    Math.max(5, Math.min(radius, plotW / ((cols + 0.5) * SQRT3), fitH)),
  );
  const dx = SQRT3 * r;
  const dy = 1.5 * r;
  // The grid sits in the middle of what the captions leave.
  const left = gutter + Math.max(0, (plotW - (cols + 0.5) * dx) / 2);
  const centre = (cell: { col: number; row: number }) => ({
    cx: round(left + dx / 2 + (cell.col + (cell.row & 1) / 2) * dx),
    cy: round(top + r + cell.row * dy),
  });
  const height = Math.ceil(top + 2 * r + (rows - 1) * dy + 4);
  const path = hexPath(r * 0.92);

  const placed = cells.map((cell) => ({ ...cell, ...centre(cell) }));
  const byId = new Map(placed.map((cell) => [cell.id, cell]));
  const columns = new Map<number, typeof placed>();
  for (const cell of placed)
    columns.set(cell.col, [...(columns.get(cell.col) ?? []), cell]);
  const lastCol = Math.max(1, ...columns.keys());
  const activeCell = active === null ? undefined : byId.get(active);
  const filledCells = placed.filter((cell) => cell.count > 0);
  const peak = Math.max(1, ...placed.map((cell) => cell.count));
  const densest = filledCells.reduce<(typeof placed)[number] | undefined>(
    (best, cell) => (!best || cell.count > best.count ? cell : best),
    undefined,
  );
  // Runners-up get the same outline, so a cluster reads as a cluster.
  const marked = new Set(
    [...filledCells]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .filter((cell) => cell.count >= peak * 0.85)
      .map((cell) => cell.id),
  );
  const markColor = tone.includes("--tone-blue")
    ? "var(--foreground)"
    : "var(--tone-blue)";
  const level = (count: number) =>
    STEPS[
      Math.min(
        STEPS.length - 1,
        Math.ceil(Math.sqrt(count / peak) * STEPS.length) - 1,
      )
    ];
  const callout = densest && !activeCell;

  const select = (id: string | null, keyboard: boolean) => {
    setFromKeyboard(keyboard);
    setActive(id);
  };

  /** The hexagon under a pointer: the nearest centre within one radius. */
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    let best: string | null = null;
    let bestD = r * r * 0.9;
    for (const cell of placed) {
      const d = (cell.cx - px) ** 2 + (cell.cy - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = cell.id;
      }
    }
    if (best !== active) select(best, false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!placed.length) return;
    if (event.key === "Escape") return select(null, true);
    const from = activeCell ?? placed.find((cell) => cell.today) ?? placed[0];
    const dirs: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    };
    let next: string | undefined;
    if (event.key === "Home") next = placed[0].id;
    else if (event.key === "End") next = placed.at(-1)!.id;
    else if (event.key in dirs) {
      if (!activeCell) next = from.id;
      else {
        // Nearest cell in that direction, preferring the same row or column.
        const [ux, uy] = dirs[event.key];
        let best = Infinity;
        for (const cell of placed) {
          const along = (cell.cx - from.cx) * ux + (cell.cy - from.cy) * uy;
          if (along <= 1) continue;
          const across = Math.abs(
            (cell.cx - from.cx) * uy - (cell.cy - from.cy) * ux,
          );
          const score = along + across * 3;
          if (score < best) {
            best = score;
            next = cell.id;
          }
        }
        next ??= from.id;
      }
    } else return;
    event.preventDefault();
    select(next, true);
  };

  const tipBelow = activeCell ? activeCell.cy < 80 : false;

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("flex h-full flex-col", className)}>
        <ShellHeader
          aside={toolbar}
          icon={CalendarIcon}
          subtitle={subtitle}
          title={title}
          as="h2"
        />
        <Panel className="flex flex-1 flex-col p-4">
          <div className="flex items-center" style={{ minHeight: areaHeight }}>
            <div
              aria-label={`${title}. Les flèches du clavier passent d’un hexagone à l’autre.`}
              className="relative w-full rounded-xl outline-offset-4"
              onBlur={() => fromKeyboard && setActive(null)}
              onKeyDown={onKeyDown}
              ref={ref}
              role="group"
              tabIndex={0}
            >
              <svg
                aria-label={summary}
                className="block overflow-visible"
                height={height}
                key={measured ? "measured" : "guess"}
                onPointerLeave={() => !fromKeyboard && select(null, false)}
                onPointerMove={onPointerMove}
                role="img"
                visibility={measured ? undefined : "hidden"}
                width={width}
              >
                <g className="fill-muted-foreground" fontSize="12">
                  {columnCaptions.map((caption) => (
                    <text
                      key={`c${caption.at}`}
                      textAnchor={
                        columnCaptions.length <= 7 ? "middle" : "start"
                      }
                      x={
                        left +
                        dx / 2 +
                        caption.at * dx +
                        (columnCaptions.length <= 7 ? 0 : -dx / 2)
                      }
                      y={14}
                    >
                      {caption.text}
                    </text>
                  ))}
                  {rowCaptions.map((caption) => (
                    <text
                      dominantBaseline="central"
                      key={`r${caption.at}`}
                      textAnchor="end"
                      x={left - 10}
                      y={top + r + caption.at * dy}
                    >
                      {caption.text}
                    </text>
                  ))}
                </g>

                {[...columns].map(([col, group]) => (
                  <motion.g
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    key={col}
                    transition={{
                      duration: 0.28,
                      ease: EASE_OUT,
                      delay: reduce ? 0 : (col / lastCol) * 0.3,
                    }}
                  >
                    {group.map((cell) => {
                      const isActive = cell.id === active;
                      const filled = cell.count > 0;
                      const fill = filled ? level(cell.count) : 0;
                      return (
                        <g
                          key={cell.id}
                          transform={`translate(${cell.cx} ${cell.cy})`}
                        >
                          <path
                            className={cn(
                              "text-foreground transition-[opacity,fill-opacity] duration-200 ease-out",
                              active !== null && !isActive && "opacity-55",
                              fromKeyboard && "duration-0",
                            )}
                            d={path}
                            data-future={cell.future || undefined}
                            data-level={cell.count}
                            data-today={cell.today || undefined}
                            style={{
                              fill: filled ? tone : "currentColor",
                              fillOpacity: filled ? fill : 0.07,
                            }}
                            stroke={
                              isActive || cell.today
                                ? "var(--foreground)"
                                : marked.has(cell.id)
                                  ? markColor
                                  : cell.future
                                    ? "var(--muted-foreground)"
                                    : "none"
                            }
                            strokeDasharray={
                              !isActive &&
                              !cell.today &&
                              !marked.has(cell.id) &&
                              cell.future
                                ? "2.5 2.5"
                                : undefined
                            }
                            strokeLinejoin="round"
                            strokeOpacity={
                              !isActive &&
                              !cell.today &&
                              !marked.has(cell.id) &&
                              cell.future
                                ? 0.5
                                : 1
                            }
                            strokeWidth={isActive || cell.today ? 2 : 1}
                          />
                          {cell.label ? (
                            <text
                              className="pointer-events-none tabular-nums"
                              dominantBaseline="central"
                              fill={
                                fill >= 0.76
                                  ? "var(--card-inset)"
                                  : "var(--foreground)"
                              }
                              fontSize="12"
                              textAnchor="middle"
                            >
                              {cell.label}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </motion.g>
                ))}
              </svg>

              <AnimatePresence>
                {callout && (
                  <motion.span
                    animate={{
                      opacity: 1,
                      transition: { ...enter, delay: reduce ? 0 : 0.35 },
                    }}
                    className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-full bg-[var(--card-raised)] px-2.5 py-1 text-xs whitespace-nowrap text-muted-foreground"
                    exit={{ opacity: 0, transition: exit }}
                    initial={{ opacity: 0 }}
                    key="callout"
                    style={{
                      top: top + r,
                      left,
                    }}
                  >
                    {densestLabel} ·{" "}
                    <span className="text-foreground tabular-nums">
                      {densest.count.toLocaleString("fr-FR")} {unit}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {activeCell && (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, transition: enter }}
                    className="pointer-events-none absolute z-20 rounded-xl bg-[var(--card-raised)] px-3 py-2 text-xs shadow-sm"
                    exit={{ opacity: 0, transition: exit }}
                    initial={fromKeyboard ? false : { opacity: 0, scale: 0.97 }}
                    key="tip"
                    style={{
                      width: Math.min(TIP_W, width),
                      left: Math.min(
                        Math.max(activeCell.cx - TIP_W / 2, 0),
                        Math.max(width - TIP_W, 0),
                      ),
                      top: activeCell.cy + (tipBelow ? r + 6 : -r - 6),
                      y: tipBelow ? 0 : "-100%",
                      transformOrigin: tipBelow
                        ? "top center"
                        : "bottom center",
                    }}
                  >
                    <p className="font-medium text-foreground tabular-nums">
                      {activeCell.detail}
                    </p>
                    <p className="text-muted-foreground first-letter:uppercase">
                      {activeCell.title}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p aria-live="polite" className="sr-only" role="status">
            {fromKeyboard && activeCell
              ? `${activeCell.title} : ${activeCell.detail}`
              : ""}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {filledCells.length} {binUnit} · pic{" "}
              <span className="text-foreground tabular-nums">
                {filledCells.length ? peak : 0}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="ml-auto flex items-center gap-1"
            >
              Moins
              {STEPS.map((step) => (
                <svg height="10" key={step} viewBox="-5 -5.5 10 11" width="9">
                  <path d={hexPath(5)} fill={tone} fillOpacity={step} />
                </svg>
              ))}
              Plus
            </span>
          </div>

          {children}
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
