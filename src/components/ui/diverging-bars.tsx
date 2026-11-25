// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { ChartBarIcon } from "@heroicons/react/20/solid";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_OUT, enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari from TuffUI's Diverging Bars. The drawing is theirs: stacked rounded segments above a zero line, one series
 * hanging below it on its own scale, series chips that switch a series off, a tooltip beside the column, arrow keys, an
 * accessible table. What changes: colours are our tokens, never the TuffUI theme (accent blue, chart teal, violet; the hanging
 * series in the rose tone, as their `negative`); gridlines fall on whole numbers because these are counts; the columns have
 * longer names for the tooltip (`titles`) and today's label is drawn darker (`marker`); a footer slot; text is French and
 * never under 12 px; the table is in a section so the base stylesheet does not flatten the panel.
 */

export interface DivergingSeries {
  /** Any CSS color. Defaults to the palette by position, so a series keeps its color. */
  color?: string;
  id: string;
  label: string;
  /** One value per label. */
  values: number[];
}

export interface DivergingBarsProps {
  /** Right side of the headline row: a secondary stat. */
  aside?: React.ReactNode;
  /** Hangs below the zero line on its own, smaller scale, e.g. escalations. */
  below?: DivergingSeries;
  className?: string;
  /** Under the chart, in the panel. */
  footer?: ReactNode;
  /** Formats ticks and the tooltip. */
  format?: (value: number) => string;
  /** Big number above the chart, with a caption next to it. Rolls when it changes. */
  headline?: { value: string; caption?: string };
  /** One label per column, e.g. a date. Every few are drawn under the chart. */
  labels: string[];
  /** Index of the column marked as today. */
  marker?: number;
  /** Called when a column is hovered, clicked or reached with the arrow keys. */
  onSelect?: (index: number) => void;
  /** Stacked upward, first series at the bottom. */
  series: DivergingSeries[];
  subtitle?: ReactNode;
  title: string;
  /** Longer names of the columns, for the tooltip and screen readers. */
  titles?: string[];
}

// TuffUI's order (blue, teal, purple), as our tokens: the accent blue, the chart teal, the violet tone.
const palette = [
  "var(--tone-blue)",
  "var(--chart-teal)",
  "var(--tone-violet)",
  "var(--tone-amber)",
];
const PAD = { top: 10, right: 34, bottom: 22, left: 0 };
const UP_H = 150;
const DOWN_H = 40;
// Space between the zero line and the first segment on either side.
const ZERO_GAP = 3;

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${+(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1000
      ? `${+(n / 1000).toFixed(1)}k`
      : `${Math.round(n)}`;

/** A round upper bound so ticks land on readable numbers. */
function niceMax(value: number) {
  if (value <= 0) {
    return 2;
  }
  const step = 10 ** Math.floor(Math.log10(value));
  const top = Math.ceil(value / (step / 2)) * (step / 2);
  // Whole numbers at both gridlines: the half is a count too.
  return Math.max(2, top % 2 === 0 ? top : top + 1);
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  // null until measured: the chart draws once at its real width, so entrance
  // animations don't tween from a guessed size.
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width ?? 560, width !== null] as const;
}

const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);

/**
 * Daily stacked columns. Series stack upward as separate rounded segments; one
 * series hangs below the zero line on its own scale, so a small count you care
 * about (escalations, hand-offs) stays readable next to a big one.
 */
export function DivergingBars({
  labels,
  titles,
  marker,
  series: input,
  below: belowInput,
  headline,
  aside,
  title,
  subtitle,
  footer,
  format = compact,
  onSelect,
  className,
}: DivergingBarsProps) {
  const reduce = useReducedMotion();
  const [ref, width, measured] = useWidth();
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = useState(false);

  const series = input.map((s, i) => ({
    ...s,
    color: s.color ?? palette[i % palette.length],
  }));
  const below = belowInput && {
    ...belowInput,
    color: belowInput.color ?? "var(--tone-rose)",
  };
  const visible = series.filter((s) => !hidden.includes(s.id));
  const belowOn = !!below && !hidden.includes(below.id);
  const count = labels.length;
  const activeIndex = active !== null && active < count ? active : null;

  const toggle = (id: string, on: boolean) =>
    setHidden((h) =>
      on
        ? // Keep at least one stacked series on.
          id === below?.id || visible.length > 1
          ? [...h, id]
          : h
        : h.filter((x) => x !== id)
    );

  const select = (index: number | null, keyboard: boolean) => {
    setFromKeyboard(keyboard);
    setActive(index);
    if (index !== null) {
      onSelect?.(index);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!count) {
      return;
    }
    const keys: Record<string, number> = {
      ArrowRight: (activeIndex ?? -1) + 1,
      ArrowLeft: (activeIndex ?? count) - 1,
      Home: 0,
      End: count - 1,
    };
    if (event.key === "Escape") {
      return select(null, true);
    }
    if (!(event.key in keys)) {
      return;
    }
    event.preventDefault();
    select((keys[event.key] + count) % count, true);
  };

  const totals = labels.map((_, i) =>
    sum(visible.map((s) => s.values[i] ?? 0))
  );
  const upMax = niceMax(Math.max(0, ...totals));
  const downMax = below
    ? Math.max(1, Math.ceil(Math.max(0, ...below.values)))
    : 1;
  const downH = below ? DOWN_H : 0;
  const zero = PAD.top + UP_H;
  const H = zero + (below ? ZERO_GAP + downH : 0) + PAD.bottom + 4;
  const up = (v: number) => (v / upMax) * (UP_H - ZERO_GAP);
  const down = (v: number) => (v / downMax) * downH;

  const innerW = Math.max(width - PAD.left - PAD.right, 40);
  const band = innerW / Math.max(count, 1);
  const barW = Math.min(band * 0.64, 22);
  const gap = barW < 8 ? 1.5 : 2;
  const rx = Math.min(3, barW / 3);
  const x = (i: number) => PAD.left + band * (i + 0.5);
  const labelEvery = Math.ceil(count / Math.max(Math.floor(innerW / 64), 1));

  const rows = (i: number) =>
    [...visible, ...(belowOn && below ? [below] : [])]
      .map((s) => ({
        id: s.id,
        color: s.color,
        label: s.label,
        value: s.values[i] ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
  // The total is the stack; the series below is usually a subset of it (escalated alerts).
  const total = (i: number) => totals[i];

  const allTotal = sum(labels.map((_, i) => total(i)));
  const summary = `Colonnes par jour : ${visible.map((s) => s.label).join(", ")}${belowOn && below ? `, et ${below.label.toLowerCase()} sous la ligne` : ""}, du ${titles?.[0] ?? labels[0]} au ${titles?.at(-1) ?? labels.at(-1)}, ${format(allTotal)} au total`;

  const tipRight = activeIndex !== null && x(activeIndex) > width - 190;
  const stagger = reduce ? 0 : Math.min(0.02, 0.6 / Math.max(count, 1));

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("flex h-full flex-col", className)}>
        <ShellHeader
          as="h2"
          icon={ChartBarIcon}
          subtitle={subtitle}
          title={title}
        />
        <Panel className="flex flex-1 flex-col p-4">
          {(headline || aside) && (
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {headline && (
                <p className="flex flex-wrap items-center gap-x-2">
                  <RollingNumber
                    className="font-medium text-[1.5rem] leading-none tracking-tight"
                    value={headline.value}
                  />
                  {headline.caption && (
                    <span className="text-muted-foreground text-sm">
                      {headline.caption}
                    </span>
                  )}
                </p>
              )}
              {aside && (
                <div className="text-muted-foreground text-sm">{aside}</div>
              )}
            </div>
          )}

          <div
            aria-label="Séries"
            className="mb-3 flex flex-wrap gap-1.5"
            role="group"
          >
            {[...series, ...(below ? [below] : [])].map((s) => {
              const on = !hidden.includes(s.id);
              return (
                <button
                  aria-pressed={on}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.97]",
                    on
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground opacity-60 hover:opacity-100"
                  )}
                  key={s.id}
                  onClick={() => toggle(s.id, on)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-[3px]"
                    style={{
                      background: on ? s.color : "transparent",
                      boxShadow: on
                        ? undefined
                        : `inset 0 0 0 1.5px ${s.color}`,
                    }}
                  />
                  {s.label}
                </button>
              );
            })}
          </div>

          <div
            aria-label={`${title}. Les flèches du clavier lisent chaque colonne.`}
            className="relative rounded-xl outline-offset-4"
            onBlur={() => fromKeyboard && setActive(null)}
            onKeyDown={onKeyDown}
            ref={ref}
            role="group"
            tabIndex={0}
          >
            <svg
              aria-label={summary}
              className="block overflow-visible"
              height={H}
              key={measured ? "measured" : "guess"}
              onPointerLeave={() => select(null, false)}
              role="img"
              visibility={measured ? undefined : "hidden"}
              width={width}
            >
              {/* Gridlines and the right axis: the upper scale, zero, the lower scale. */}
              <g className="text-muted-foreground" fontSize="12">
                {[0.5, 1].map((t) => (
                  <g key={t}>
                    <line
                      stroke="currentColor"
                      strokeDasharray="2 4"
                      strokeOpacity={0.1}
                      x1={PAD.left}
                      x2={PAD.left + innerW}
                      y1={zero - up(upMax * t)}
                      y2={zero - up(upMax * t)}
                    />
                    <text
                      dy="0.32em"
                      fill="currentColor"
                      textAnchor="end"
                      x={width - 4}
                      y={zero - up(upMax * t)}
                    >
                      {format(upMax * t)}
                    </text>
                  </g>
                ))}
                <line
                  stroke="currentColor"
                  strokeOpacity={0.22}
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={zero}
                  y2={zero}
                />
                <text
                  dy="0.32em"
                  fill="currentColor"
                  textAnchor="end"
                  x={width - 4}
                  y={zero}
                >
                  {format(0)}
                </text>
                {below && (
                  <text
                    dy="0.32em"
                    style={{ fill: below.color }}
                    textAnchor="end"
                    x={width - 4}
                    y={zero + ZERO_GAP + downH}
                  >
                    {format(downMax)}
                  </text>
                )}
              </g>

              {activeIndex !== null && (
                <rect
                  className="fill-foreground/[0.06]"
                  height={UP_H + (below ? ZERO_GAP + downH : 0) + 12}
                  rx={Math.min(8, barW / 2 + 4)}
                  width={Math.min(band, barW + 8)}
                  x={x(activeIndex) - Math.min(band, barW + 8) / 2}
                  y={PAD.top - 6}
                />
              )}

              {labels.map((label, i) => {
                let top = zero - ZERO_GAP;
                const dim = activeIndex !== null && activeIndex !== i;
                const transition = {
                  duration: 0.45,
                  ease: EASE_OUT,
                  delay: i * stagger,
                };
                return (
                  <g
                    className={cn(
                      "transition-opacity duration-150 ease-out",
                      dim && "opacity-40",
                      fromKeyboard && "duration-0"
                    )}
                    key={`${label}-${i}`}
                  >
                    {visible.map((s) => {
                      const h = up(s.values[i] ?? 0);
                      if (h <= 0) {
                        return null;
                      }
                      top -= h;
                      // Every segment gives up the gap at its top; tiny ones keep 1px.
                      const segH = Math.max(h - gap, 1);
                      return (
                        <motion.rect
                          animate={{ y: top + (h - segH), height: segH }}
                          fill={s.color}
                          initial={{ y: zero - ZERO_GAP, height: 0 }}
                          key={s.id}
                          rx={rx}
                          transition={transition}
                          width={barW}
                          x={x(i) - barW / 2}
                        />
                      );
                    })}
                    {belowOn && below && (below.values[i] ?? 0) > 0 && (
                      <motion.rect
                        animate={{
                          height: Math.max(down(below.values[i] ?? 0), 1),
                        }}
                        fill={below.color}
                        initial={{ height: 0 }}
                        rx={rx}
                        transition={transition}
                        width={barW}
                        x={x(i) - barW / 2}
                        y={zero + ZERO_GAP}
                      />
                    )}
                  </g>
                );
              })}

              {labels.map((label, i) =>
                i % labelEvery === 0 ? (
                  <text
                    className={cn(
                      activeIndex === i || marker === i
                        ? "fill-foreground"
                        : "fill-muted-foreground"
                    )}
                    dx={i === 0 ? -barW / 2 : 0}
                    fontSize="12"
                    key={`${label}-${i}`}
                    textAnchor={i === 0 ? "start" : "middle"}
                    x={x(i)}
                    y={H - 6}
                  >
                    {label}
                  </text>
                ) : null
              )}

              {/* Hit areas: the whole band, both sides of the line. */}
              {labels.map((label, i) => (
                <rect
                  fill="transparent"
                  height={UP_H + (below ? ZERO_GAP + downH : 0) + 12}
                  key={`${label}-${i}`}
                  onClick={() => select(i, false)}
                  onPointerEnter={() => select(i, false)}
                  width={band}
                  x={x(i) - band / 2}
                  y={PAD.top - 6}
                />
              ))}
            </svg>

            <AnimatePresence>
              {activeIndex !== null && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, transition: enter }}
                  className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl bg-[var(--card-raised)] px-3 py-2 text-xs shadow-sm"
                  exit={{ opacity: 0, transition: exit }}
                  initial={fromKeyboard ? false : { opacity: 0, scale: 0.97 }}
                  key="tip"
                  style={
                    tipRight
                      ? {
                          right: Math.max(
                            width - x(activeIndex) + band / 2 + 6,
                            0
                          ),
                          transformOrigin: "top right",
                        }
                      : {
                          left: Math.max(x(activeIndex) + band / 2 + 6, 0),
                          transformOrigin: "top left",
                        }
                  }
                >
                  <p className="mb-1 flex justify-between gap-4 font-medium">
                    <span>{titles?.[activeIndex] ?? labels[activeIndex]}</span>
                    <span className="font-mono tabular-nums">
                      {format(total(activeIndex))}
                    </span>
                  </p>
                  {rows(activeIndex).map((row) => (
                    <p
                      className="flex items-center gap-2 text-muted-foreground"
                      key={row.id}
                    >
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-[2px]"
                        style={{ background: row.color }}
                      />
                      <span className="flex-1">{row.label}</span>
                      <span className="font-mono text-foreground tabular-nums">
                        {format(row.value)}
                      </span>
                    </p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <section className="sr-only">
            <table>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Jour</th>
                  {visible.map((s) => (
                    <th key={s.id} scope="col">
                      {s.label}
                    </th>
                  ))}
                  {belowOn && below && <th scope="col">{below.label}</th>}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label, i) => (
                  <tr key={`${label}-${i}`}>
                    <th scope="row">{label}</th>
                    {visible.map((s) => (
                      <td key={s.id}>{format(s.values[i] ?? 0)}</td>
                    ))}
                    {belowOn && below && (
                      <td>{format(below.values[i] ?? 0)}</td>
                    )}
                    <td>{format(total(i))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <p aria-live="polite" className="sr-only" role="status">
            {fromKeyboard && activeIndex !== null
              ? `${titles?.[activeIndex] ?? labels[activeIndex]} : total ${format(total(activeIndex))}, ${rows(
                  activeIndex
                )
                  .map((r) => `${r.label} ${format(r.value)}`)
                  .join(", ")}`
              : ""}
          </p>
          {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
