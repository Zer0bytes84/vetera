// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { ChartArea, ChartColumn, ChartLine, ChartPie } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_IN_OUT, EASE_OUT, enter, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari. Same component as TuffUI's chart-card, with these changes:
 *  - lucide icons, the app's tone tokens for the default palette, French text, 12 px minimum text;
 *  - two scales: a series may be read on the `right` axis (receipts in dinars next to a count on the
 *    left), both sharing one grid of five equal steps;
 *  - optional extras, all off by default: `ChartSeries.markers/detail/valueFormat`, `tooltipTitles`,
 *    `tooltipNote`, `height`, `toolbar` (right of the legend), `footer` (under the chart, in the panel);
 *  - points are keyed by index, so two labels that read alike (« 12 oct. » a year apart) never collide.
 */

export type ChartType = "bar" | "line" | "area" | "donut";

export type ChartSeries = {
  id: string;
  label: string;
  /** One value per label. For a donut, a slice is the sum of its values. */
  values: number[];
  /** Any CSS color. Defaults to the palette by position, so a series keeps its color. */
  color?: string;
  /** Scale the series is read on. Two scales share one grid. Defaults to the left one. */
  axis?: "left" | "right";
  /** Formats this series' ticks; falls back to the card's `format`. */
  format?: (value: number) => string;
  /** Formats its values in the tooltip and the table; falls back to `format`. */
  valueFormat?: (value: number) => string;
  /** A hollow marker on each point of a line or area, while the points stay apart. */
  markers?: boolean;
  /** Text after the label in the legend, e.g. a total and its change. */
  detail?: string;
};

export type ChartCardProps = {
  data: { labels: string[]; series: ChartSeries[] };
  type?: ChartType;
  title: string;
  subtitle?: string;
  /** Headline in the header, e.g. a total. Rolls when it changes. */
  total?: string;
  /** Formats values in ticks and the tooltip. */
  format?: (value: number) => string;
  /** Stripe the last point (bars) — e.g. a period that isn't over yet. */
  partialLast?: boolean;
  onSelect?: (index: number) => void;
  /** The tooltip's title for each point, when the axis label is too short to name it. */
  tooltipTitles?: string[];
  /** A last line in the tooltip, e.g. the same point in the previous period. */
  tooltipNote?: (index: number) => string | undefined;
  /** Plot height in px. */
  height?: number;
  /** Beside the legend, on its right: a period or a view switch. */
  toolbar?: ReactNode;
  /** Under the chart, inside the panel: a forecast, a footer. */
  footer?: ReactNode;
  /** The donut's centre label when nothing is hovered. */
  donutLabel?: string;
  className?: string;
};

// The app's accent tones, in the order a series gets them: blue, green, violet, amber, rose.
const palette = [
  "var(--tone-blue)",
  "var(--tone-green)",
  "var(--tone-violet)",
  "var(--tone-amber)",
  "var(--tone-rose)",
];
const icons = { bar: ChartColumn, line: ChartLine, area: ChartArea, donut: ChartPie };
const PAD = { top: 8, bottom: 24, left: 40 };
const STEPS = 5;
const MAX_MARKERS = 31;

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${+(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1000
      ? `${+(n / 1000).toFixed(1)}k`
      : `${+n.toFixed(1)}`;

/**
 * Five equal steps up to a round top (never under 5), so two scales share one grid
 * and an empty chart still reads 0 to 5.
 */
export function fiveSteps(value: number) {
  const raw = Math.max(value, STEPS) / STEPS;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return { top: step * STEPS, ticks: Array.from({ length: STEPS + 1 }, (_, i) => Math.round(step * i * 100) / 100) };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  // null until measured: the chart draws once at its real width, so entrance
  // animations don't tween from a guessed size.
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width ?? 560, width !== null] as const;
}

const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);

export function ChartCard({
  data,
  type = "bar",
  title,
  subtitle,
  total,
  format = compact,
  partialLast = false,
  onSelect,
  tooltipTitles,
  tooltipNote,
  height = 200,
  toolbar,
  footer,
  donutLabel = "Total",
  className,
}: ChartCardProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [ref, width, measured] = useWidth();
  const [hidden, setHidden] = useState<string[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = useState(false);

  const series = data.series.map((s, i) => ({
    ...s,
    color: s.color ?? palette[i % palette.length],
  }));
  const visible = series.filter((s) => !hidden.includes(s.id));
  const donut = type === "donut";
  const count = donut ? visible.length : data.labels.length;
  const H = height;

  // A toggle can remove the point the selection pointed at.
  const activeIndex = active !== null && active < count ? active : null;

  const select = (index: number | null, keyboard: boolean) => {
    setFromKeyboard(keyboard);
    setActive(index);
    if (index !== null) onSelect?.(index);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!count) return;
    const keys: Record<string, number> = {
      ArrowRight: (activeIndex ?? -1) + 1,
      ArrowLeft: (activeIndex ?? count) - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in keys)) {
      if (event.key === "Escape") select(null, true);
      return;
    }
    event.preventDefault();
    select((keys[event.key] + count) % count, true);
  };

  // Two scales when a visible series is read on the right one.
  const onRight = visible.some((s) => s.axis === "right");
  const onLeft = visible.some((s) => (s.axis ?? "left") === "left");
  const bothAxes = onRight && onLeft;
  const padRight = onRight ? 48 : 8;
  const innerW = Math.max(width - PAD.left - padRight, 40);
  const innerH = H - PAD.top - PAD.bottom;
  const scaleOf = (axis: "left" | "right") =>
    fiveSteps(Math.max(0, ...visible.filter((s) => (s.axis ?? "left") === axis).flatMap((s) => s.values)));
  const scales = { left: scaleOf("left"), right: scaleOf("right") };
  const base = PAD.top + innerH;
  const yFor = (axis: "left" | "right", v: number) =>
    base - (Math.min(v, scales[axis].top) / scales[axis].top) * innerH;
  const band = innerW / Math.max(data.labels.length, 1);
  const x = (i: number) =>
    PAD.left +
    (type === "bar"
      ? band * (i + 0.5)
      : (innerW * i) / Math.max(data.labels.length - 1, 1));
  const grid = onLeft ? scales.left.ticks : scales.right.ticks;
  const labelEvery = Math.ceil(data.labels.length / Math.max(Math.floor(innerW / 64), 1));
  const fmt = (s: { format?: (v: number) => string }) => s.format ?? format;
  const valueFmt = (s: { format?: (v: number) => string; valueFormat?: (v: number) => string }) =>
    s.valueFormat ?? s.format ?? format;
  const leftSeries = visible.find((s) => (s.axis ?? "left") === "left");
  const rightSeries = visible.find((s) => s.axis === "right");

  const summary = donut
    ? visible.map((s) => `${s.label} ${valueFmt(s)(sum(s.values))}`).join(", ")
    : `Graphique de ${visible.map((s) => s.label).join(", ")}, du ${data.labels[0] ?? ""} au ${data.labels.at(-1) ?? ""}`;
  const donutTotal = sum(visible.map((s) => sum(s.values)));

  const tooltip =
    activeIndex === null ? null : donut ? (
      <TooltipRows
        title={visible[activeIndex]?.label}
        rows={[
          {
            color: visible[activeIndex]?.color,
            label: "Total",
            value: valueFmt(visible[activeIndex] ?? {})(sum(visible[activeIndex]?.values ?? [])),
          },
          {
            color: visible[activeIndex]?.color,
            label: "Part",
            value: `${donutTotal ? Math.round((sum(visible[activeIndex]?.values ?? []) / donutTotal) * 100) : 0} %`,
          },
        ]}
      />
    ) : (
      <TooltipRows
        title={tooltipTitles?.[activeIndex] ?? data.labels[activeIndex]}
        rows={visible.map((s) => ({
          color: s.color,
          label: s.label,
          value: valueFmt(s)(s.values[activeIndex] ?? 0),
        }))}
        note={tooltipNote?.(activeIndex)}
      />
    );

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("max-w-2xl", className)}>
        <ShellHeader
          icon={icons[type]}
          title={title}
          subtitle={subtitle}
          aside={
            total && (
              <RollingNumber
                value={total}
                className="text-[1.5rem] leading-none font-medium tracking-tight"
              />
            )
          }
        />
        <Panel className="p-4">
          {(series.length > 1 || toolbar) && (
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              {series.length > 1 ? (
                <div role="group" aria-label="Séries" className="flex min-w-0 flex-wrap gap-1.5">
                  {series.map((s) => {
                    const on = !hidden.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setHidden((h) =>
                            on
                              ? visible.length > 1
                                ? [...h, s.id]
                                : h
                              : h.filter((id) => id !== s.id),
                          )
                        }
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.97]",
                          on
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground opacity-60 hover:opacity-100",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{
                            background: on ? s.color : "transparent",
                            boxShadow: on ? undefined : `inset 0 0 0 1.5px ${s.color}`,
                          }}
                        />
                        <span>{s.label}</span>
                        {s.detail && <span className="text-muted-foreground">{s.detail}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span />
              )}
              {toolbar && <div className="flex shrink-0 items-center gap-1">{toolbar}</div>}
            </div>
          )}

          <div
            ref={ref}
            tabIndex={0}
            role="group"
            aria-label={`${title}. Flèches gauche et droite pour lire les valeurs.`}
            onKeyDown={onKeyDown}
            onBlur={() => fromKeyboard && setActive(null)}
            className="relative rounded-xl outline-offset-4"
          >
            <svg
              key={measured ? "measured" : "guess"}
              visibility={measured ? undefined : "hidden"}
              role="img"
              aria-label={summary}
              width={width}
              height={donut ? 220 : H}
              className="block overflow-visible"
              onPointerLeave={() => select(null, false)}
            >
              <defs>
                <clipPath id={`${uid}-reveal`}>
                  <motion.rect
                    x={0}
                    y={0}
                    height={H}
                    initial={{ width: 0 }}
                    animate={{ width }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                  />
                </clipPath>
                {series.map((s, i) => (
                  <linearGradient
                    key={s.id}
                    id={`${uid}-fill-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
                {series.map((s, i) => (
                  <pattern
                    key={s.id}
                    id={`${uid}-stripe-${i}`}
                    width="7"
                    height="7"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <rect width="7" height="7" fill={s.color} />
                    <rect width="3" height="7" fill="white" opacity="0.22" />
                  </pattern>
                ))}
              </defs>

              {donut ? (
                <Donut
                  series={visible}
                  width={width}
                  activeIndex={activeIndex}
                  instant={fromKeyboard || !!reduce}
                  onHover={(i) => select(i, false)}
                  format={format}
                  label={donutLabel}
                />
              ) : (
                <>
                  {grid.map((_, i) => (
                    <g key={i} className="text-muted-foreground">
                      <line
                        x1={PAD.left}
                        x2={width - padRight}
                        y1={base - (i / STEPS) * innerH}
                        y2={base - (i / STEPS) * innerH}
                        stroke="currentColor"
                        strokeDasharray={i === 0 ? undefined : "3 4"}
                        strokeOpacity={i === 0 ? 0.18 : 0.14}
                      />
                      {onLeft && leftSeries && (
                        <text
                          x={PAD.left - 8}
                          y={base - (i / STEPS) * innerH}
                          dy="0.32em"
                          textAnchor="end"
                          fontSize="12"
                          // The series colour mixed with the ink: still its colour, and text-legible on both grounds.
                          fill={bothAxes ? `color-mix(in oklab, ${leftSeries.color} 60%, var(--foreground))` : "currentColor"}
                        >
                          {fmt(leftSeries)(scales.left.ticks[i])}
                        </text>
                      )}
                      {onRight && rightSeries && (
                        <text
                          x={width - padRight + 8}
                          y={base - (i / STEPS) * innerH}
                          dy="0.32em"
                          textAnchor="start"
                          fontSize="12"
                          fill="currentColor"
                        >
                          {fmt(rightSeries)(scales.right.ticks[i])}
                        </text>
                      )}
                    </g>
                  ))}
                  {data.labels.map((label, i) =>
                    i % labelEvery === 0 ? (
                      <text
                        key={i}
                        x={x(i)}
                        y={H - 6}
                        textAnchor={i === 0 ? "start" : "middle"}
                        fontSize="12"
                        className="fill-muted-foreground"
                      >
                        {label}
                      </text>
                    ) : null,
                  )}

                  {type === "bar"
                    ? data.labels.map((_, i) => {
                        const gap = 2;
                        const groupW = Math.min(
                          band * 0.72,
                          18 * visible.length + gap * (visible.length - 1),
                        );
                        const barW =
                          (groupW - gap * (visible.length - 1)) /
                          Math.max(visible.length, 1);
                        return visible.map((s, j) => {
                          const v = s.values[i] ?? 0;
                          const index = series.findIndex((t) => t.id === s.id);
                          const axis = s.axis ?? "left";
                          return (
                            <motion.rect
                              key={`${s.id}-${i}`}
                              x={x(i) - groupW / 2 + j * (barW + gap)}
                              width={barW}
                              rx={3}
                              initial={{ y: base, height: 0 }}
                              animate={{ y: yFor(axis, v), height: base - yFor(axis, v) }}
                              transition={{
                                duration: 0.5,
                                ease: EASE_OUT,
                                delay: reduce ? 0 : Math.min(i * 0.03, 0.6),
                              }}
                              fill={
                                partialLast && i === data.labels.length - 1
                                  ? `url(#${uid}-stripe-${index})`
                                  : s.color
                              }
                              opacity={
                                activeIndex === null || activeIndex === i ? 1 : 0.4
                              }
                              style={{ transition: "opacity 150ms ease-out" }}
                            />
                          );
                        });
                      })
                    : visible.map((s) => {
                        const axis = s.axis ?? "left";
                        const points = s.values.map((v, i) => [x(i), yFor(axis, v)] as const);
                        const line = points
                          .map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`)
                          .join("");
                        const area = `${line}L${x(points.length - 1)},${base}L${x(0)},${base}Z`;
                        return (
                          <g key={s.id}>
                            {type === "area" && (
                              // Revealed left to right with the line, so the fill
                              // never fades in ahead of the stroke that bounds it.
                              <g clipPath={`url(#${uid}-reveal)`}>
                                <motion.path
                                  initial={{ d: area }}
                                  animate={{ d: area }}
                                  transition={{ duration: 0.4, ease: EASE_IN_OUT }}
                                  fill={`url(#${uid}-fill-${series.findIndex((t) => t.id === s.id)})`}
                                />
                              </g>
                            )}
                            <motion.path
                              initial={{ pathLength: 0, d: line }}
                              animate={{ pathLength: 1, d: line }}
                              transition={{
                                pathLength: { duration: 0.8, ease: EASE_OUT },
                                d: { duration: 0.4, ease: EASE_IN_OUT },
                              }}
                              fill="none"
                              stroke={s.color}
                              strokeWidth={2}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                            />
                            {s.markers &&
                              points.length <= MAX_MARKERS &&
                              points.map(([px, py], i) => (
                                <circle
                                  key={i}
                                  cx={px}
                                  cy={py}
                                  r={2.5}
                                  fill="var(--card-inset)"
                                  stroke={s.color}
                                  strokeWidth={1.5}
                                />
                              ))}
                          </g>
                        );
                      })}

                  {type !== "bar" && activeIndex !== null && (
                    <g>
                      <line
                        x1={x(activeIndex)}
                        x2={x(activeIndex)}
                        y1={PAD.top}
                        y2={base}
                        stroke="currentColor"
                        strokeOpacity={0.25}
                        className="text-foreground"
                      />
                      {visible.map((s) => (
                        <circle
                          key={s.id}
                          cx={x(activeIndex)}
                          cy={yFor(s.axis ?? "left", s.values[activeIndex] ?? 0)}
                          r={4.5}
                          fill={s.color}
                          stroke="var(--card-inset)"
                          strokeWidth={2}
                        />
                      ))}
                    </g>
                  )}

                  {/* Hit areas, wider than the marks. */}
                  {data.labels.map((_, i) => (
                    <rect
                      key={i}
                      x={
                        type === "bar"
                          ? x(i) - band / 2
                          : x(i) - innerW / Math.max(data.labels.length - 1, 1) / 2
                      }
                      y={PAD.top}
                      width={
                        type === "bar"
                          ? band
                          : innerW / Math.max(data.labels.length - 1, 1)
                      }
                      height={innerH}
                      fill="transparent"
                      onPointerEnter={() => select(i, false)}
                      onClick={() => select(i, false)}
                    />
                  ))}
                </>
              )}
            </svg>

            <AnimatePresence>
              {activeIndex !== null && tooltip && (
                <motion.div
                  key="tip"
                  initial={fromKeyboard ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1, transition: enter }}
                  exit={{ opacity: 0, transition: exit }}
                  className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-xl bg-[var(--card-raised)] px-3 py-2 text-xs"
                  style={
                    donut
                      ? { left: "50%", transform: "translateX(-50%)" }
                      : {
                          left: Math.min(Math.max(x(activeIndex) - 72, 0), Math.max(width - 200, 0)),
                          transformOrigin: "top center",
                        }
                  }
                >
                  {tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* In a <section>, not bare in the panel: Premium strips background, border and radius from any
              <div> holding a <table> as a direct child, which flattened the panel into its frame. */}
          <section className="sr-only">
            <table className="sr-only">
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">{donut ? "Série" : "Date"}</th>
                  {donut ? (
                    <th scope="col">Total</th>
                  ) : (
                    visible.map((s) => (
                      <th key={s.id} scope="col">
                        {s.label}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {donut
                  ? visible.map((s) => (
                      <tr key={s.id}>
                        <th scope="row">{s.label}</th>
                        <td>{valueFmt(s)(sum(s.values))}</td>
                      </tr>
                    ))
                  : data.labels.map((label, i) => (
                      <tr key={i}>
                        <th scope="row">{tooltipTitles?.[i] ?? label}</th>
                        {visible.map((s) => (
                          <td key={s.id}>{valueFmt(s)(s.values[i] ?? 0)}</td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </section>
          <p role="status" aria-live="polite" className="sr-only">
            {fromKeyboard && activeIndex !== null
              ? donut
                ? `${visible[activeIndex]?.label} : ${valueFmt(visible[activeIndex] ?? {})(sum(visible[activeIndex]?.values ?? []))}`
                : `${tooltipTitles?.[activeIndex] ?? data.labels[activeIndex]} : ${visible.map((s) => `${s.label} ${valueFmt(s)(s.values[activeIndex] ?? 0)}`).join(", ")}`
              : ""}
          </p>
          {footer}
        </Panel>
      </Shell>
    </MotionConfig>
  );
}

function TooltipRows({
  title,
  rows,
  note,
}: {
  title?: string;
  rows: { color?: string; label: string; value: string }[];
  note?: string;
}) {
  return (
    <>
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2 rounded-[2px]"
            style={{ background: row.color }}
          />
          <span className="flex-1">{row.label}</span>
          <span className="font-mono text-foreground tabular-nums">{row.value}</span>
        </p>
      ))}
      {note && <p className="mt-1 text-muted-foreground">{note}</p>}
    </>
  );
}

function Donut({
  series,
  width,
  activeIndex,
  instant,
  onHover,
  format,
  label,
}: {
  format: (value: number) => string;
  series: (ChartSeries & { color: string })[];
  width: number;
  activeIndex: number | null;
  instant: boolean;
  onHover: (index: number) => void;
  label: string;
}) {
  const total = sum(series.map((s) => sum(s.values))) || 1;
  const r = 78;
  const c = 2 * Math.PI * r;
  const gap = series.length > 1 ? 2 : 0;
  const starts = series.map((_, i) =>
    series.slice(0, i).reduce((n, s) => n + (sum(s.values) / total) * c, 0),
  );

  return (
    <g>
      <text
        x={width / 2}
        y={104}
        textAnchor="middle"
        fontSize="12"
        className="fill-muted-foreground"
      >
        {activeIndex === null ? label : series[activeIndex]?.label}
      </text>
      <text
        x={width / 2}
        y={126}
        textAnchor="middle"
        fontSize="18"
        fontWeight={500}
        className="fill-foreground tabular-nums"
      >
        {activeIndex === null
          ? format(sum(series.map((s) => sum(s.values))))
          : `${Math.round((sum(series[activeIndex]?.values ?? []) / total) * 100)} %`}
      </text>
      <g transform={`translate(${width / 2}, 110) rotate(-90)`}>
        {series.map((s, i) => {
          const share = sum(s.values) / total;
          const length = Math.max(share * c - gap, 0);
          const start = starts[i];
          return (
            <motion.circle
              key={s.id}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={activeIndex === i ? 26 : 22}
              strokeDashoffset={-start}
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${length} ${c}` }}
              transition={
                instant
                  ? { duration: 0 }
                  : { duration: 0.6, ease: EASE_OUT, delay: i * 0.06 }
              }
              style={{ transition: "stroke-width 150ms ease-out" }}
              onPointerEnter={() => onHover(i)}
            />
          );
        })}
      </g>
    </g>
  );
}
