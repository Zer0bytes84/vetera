// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/20/solid";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

export interface ChartSeries {
  /** Scale the series is read on. Two scales share one grid. Defaults to the left one. */
  axis?: "left" | "right";
  /** Any CSS color. Defaults to the palette by position, so a series keeps its color. */
  color?: string;
  /** Text after the label in the legend, e.g. a total and its change. */
  detail?: string;
  /** Formats this series' ticks; falls back to the card's `format`. */
  format?: (value: number) => string;
  id: string;
  label: string;
  /** A hollow marker on each point of a line or area, while the points stay apart. */
  markers?: boolean;
  /** Formats its values in the tooltip and the table; falls back to `format`. */
  valueFormat?: (value: number) => string;
  /** One value per label. For a donut, a slice is the sum of its values. */
  values: number[];
}

export interface ChartCardProps {
  className?: string;
  data: { labels: string[]; series: ChartSeries[] };
  /** The donut's centre label when nothing is hovered. */
  donutLabel?: string;
  /** Under the chart, inside the panel: a forecast, a footer. */
  footer?: ReactNode;
  /** Formats values in ticks and the tooltip. */
  format?: (value: number) => string;
  /** Plot height in px. */
  height?: number;
  /**
   * The data is still being read: the headline, the legend and the plot are drawn as Loading Skeleton
   * shapes of the same size, so no « 0 DA » shows before the figures are known and nothing moves when
   * they arrive. The toolbar and the footer stay as they are.
   */
  loading?: boolean;
  loadingLabel?: string;
  /** While loading, the placeholders stay invisible until this turns true (useDelayedSkeleton): no flash on a fast read. */
  loadingRevealed?: boolean;
  onSelect?: (index: number) => void;
  /** Stripe the last point (bars) — e.g. a period that isn't over yet. */
  partialLast?: boolean;
  subtitle?: string;
  title: string;
  /** Beside the legend, on its right: a period or a view switch. */
  toolbar?: ReactNode;
  /** A last line in the tooltip, e.g. the same point in the previous period. */
  tooltipNote?: (index: number) => string | undefined;
  /** The tooltip's title for each point, when the axis label is too short to name it. */
  tooltipTitles?: string[];
  /** Headline in the header, e.g. a total. Rolls when it changes. */
  total?: string;
  type?: ChartType;
}

// The app's accent tones, in the order a series gets them: blue, green, violet, amber, rose.
const palette = [
  "var(--tone-blue)",
  "var(--tone-green)",
  "var(--tone-violet)",
  "var(--tone-amber)",
  "var(--tone-rose)",
];
const icons = {
  bar: ChartBarIcon,
  line: ArrowTrendingUpIcon,
  area: PresentationChartLineIcon,
  donut: ChartPieIcon,
};
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
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return {
    top: step * STEPS,
    ticks: Array.from(
      { length: STEPS + 1 },
      (_, i) => Math.round(step * i * 100) / 100
    ),
  };
}

/** `paused` while the card draws its skeleton: the plot isn't there yet, so it is measured once it is. */
function useWidth(paused = false) {
  const ref = useRef<HTMLDivElement>(null);
  // null until measured: the chart draws once at its real width, so entrance
  // animations don't tween from a guessed size.
  const [width, setWidth] = useState<number | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: paused n'est pas lu, mais quand le squelette laisse place au graphique, l'effet doit mesurer la zone qui vient d'apparaître.
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
  }, [paused]);
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
  loading = false,
  loadingRevealed = true,
  loadingLabel = "Chargement du graphique",
  className,
}: ChartCardProps) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const [ref, width, measured] = useWidth(loading);
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
    if (!(event.key in keys)) {
      if (event.key === "Escape") {
        select(null, true);
      }
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
    fiveSteps(
      Math.max(
        0,
        ...visible
          .filter((s) => (s.axis ?? "left") === axis)
          .flatMap((s) => s.values)
      )
    );
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
  const labelEvery = Math.ceil(
    data.labels.length / Math.max(Math.floor(innerW / 64), 1)
  );
  const fmt = (s: { format?: (v: number) => string }) => s.format ?? format;
  const valueFmt = (s: {
    format?: (v: number) => string;
    valueFormat?: (v: number) => string;
  }) => s.valueFormat ?? s.format ?? format;
  const leftSeries = visible.find((s) => (s.axis ?? "left") === "left");
  const rightSeries = visible.find((s) => s.axis === "right");

  const summary = donut
    ? visible.map((s) => `${s.label} ${valueFmt(s)(sum(s.values))}`).join(", ")
    : `Graphique de ${visible.map((s) => s.label).join(", ")}, du ${data.labels[0] ?? ""} au ${data.labels.at(-1) ?? ""}`;
  const donutTotal = sum(visible.map((s) => sum(s.values)));

  const tooltip =
    activeIndex === null ? null : donut ? (
      <TooltipRows
        rows={[
          {
            color: visible[activeIndex]?.color,
            label: "Total",
            value: valueFmt(visible[activeIndex] ?? {})(
              sum(visible[activeIndex]?.values ?? [])
            ),
          },
          {
            color: visible[activeIndex]?.color,
            label: "Part",
            value: `${donutTotal ? Math.round((sum(visible[activeIndex]?.values ?? []) / donutTotal) * 100) : 0} %`,
          },
        ]}
        title={visible[activeIndex]?.label}
      />
    ) : (
      <TooltipRows
        note={tooltipNote?.(activeIndex)}
        rows={visible.map((s) => ({
          color: s.color,
          label: s.label,
          value: valueFmt(s)(s.values[activeIndex] ?? 0),
        }))}
        title={tooltipTitles?.[activeIndex] ?? data.labels[activeIndex]}
      />
    );

  if (loading) {
    const shape = "loading-skeleton-shape";
    const hide = !loadingRevealed && "invisible";
    return (
      <Shell className={cn("loading-skeleton max-w-2xl", className)}>
        <ShellHeader
          aside={
            total !== undefined && (
              <span
                aria-hidden="true"
                className={cn(shape, "block h-6 w-32 rounded-lg", hide)}
              />
            )
          }
          icon={icons[type]}
          subtitle={subtitle}
          title={title}
        />
        <Panel className="p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div
              aria-hidden="true"
              className={cn("flex min-w-0 flex-wrap gap-1.5", hide)}
            >
              {(series.length > 1 ? series : []).map((s) => (
                <span
                  className={cn(shape, "block h-7 w-36 rounded-full")}
                  key={s.id}
                />
              ))}
            </div>
            {toolbar && (
              <div className="flex shrink-0 items-center gap-1">{toolbar}</div>
            )}
          </div>
          <div
            aria-busy="true"
            aria-label={loadingLabel}
            className={cn("relative", hide)}
            role="status"
            style={{ height: donut ? 220 : H }}
          >
            <span
              aria-hidden="true"
              className={cn(shape, "absolute inset-0 rounded-xl")}
            />
          </div>
          {footer}
        </Panel>
      </Shell>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("max-w-2xl", className)}>
        <ShellHeader
          aside={
            total && (
              <RollingNumber
                className="font-medium text-[1.5rem] leading-none tracking-tight"
                value={total}
              />
            )
          }
          icon={icons[type]}
          subtitle={subtitle}
          title={title}
        />
        <Panel className="p-4">
          {(series.length > 1 || toolbar) && (
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              {series.length > 1 ? (
                <div
                  aria-label="Séries"
                  className="flex min-w-0 flex-wrap gap-1.5"
                  role="group"
                >
                  {series.map((s) => {
                    const on = !hidden.includes(s.id);
                    return (
                      <button
                        aria-pressed={on}
                        className={cn(
                          "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-left text-xs transition-[background-color,color,opacity,scale] duration-150 ease-out active:scale-[0.97]",
                          on
                            ? "bg-foreground/[0.06] text-foreground"
                            : "text-muted-foreground opacity-60 hover:opacity-100"
                        )}
                        key={s.id}
                        onClick={() =>
                          setHidden((h) =>
                            on
                              ? visible.length > 1
                                ? [...h, s.id]
                                : h
                              : h.filter((id) => id !== s.id)
                          )
                        }
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{
                            background: on ? s.color : "transparent",
                            boxShadow: on
                              ? undefined
                              : `inset 0 0 0 1.5px ${s.color}`,
                          }}
                        />
                        <span>{s.label}</span>
                        {s.detail && (
                          <span className="text-muted-foreground">
                            {s.detail}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span />
              )}
              {toolbar && (
                <div className="flex shrink-0 items-center gap-1">
                  {toolbar}
                </div>
              )}
            </div>
          )}

          <div
            aria-label={`${title}. Flèches gauche et droite pour lire les valeurs.`}
            className="relative rounded-xl outline-offset-4"
            onBlur={() => fromKeyboard && setActive(null)}
            onKeyDown={onKeyDown}
            ref={ref}
            role="group"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: graphique focalisable : onKeyDown fait lire chaque point aux flèches, ce tabIndex est son entrée au clavier.
            tabIndex={0}
          >
            <svg
              aria-label={summary}
              className="block overflow-visible"
              height={donut ? 220 : H}
              key={measured ? "measured" : "guess"}
              onPointerLeave={() => select(null, false)}
              role="img"
              visibility={measured ? undefined : "hidden"}
              width={width}
            >
              <defs>
                <clipPath id={`${uid}-reveal`}>
                  <motion.rect
                    animate={{ width }}
                    height={H}
                    initial={{ width: 0 }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                    x={0}
                    y={0}
                  />
                </clipPath>
                {series.map((s, i) => (
                  <linearGradient
                    id={`${uid}-fill-${i}`}
                    key={s.id}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                    <stop
                      offset="100%"
                      stopColor={s.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                ))}
                {series.map((s, i) => (
                  <pattern
                    height="7"
                    id={`${uid}-stripe-${i}`}
                    key={s.id}
                    patternTransform="rotate(45)"
                    patternUnits="userSpaceOnUse"
                    width="7"
                  >
                    <rect fill={s.color} height="7" width="7" />
                    <rect fill="white" height="7" opacity="0.22" width="3" />
                  </pattern>
                ))}
              </defs>

              {donut ? (
                <Donut
                  activeIndex={activeIndex}
                  format={format}
                  instant={fromKeyboard || !!reduce}
                  label={donutLabel}
                  onHover={(i) => select(i, false)}
                  series={visible}
                  width={width}
                />
              ) : (
                <>
                  {grid.map((_, i) => (
                    <g
                      className="text-muted-foreground"
                      // biome-ignore lint/suspicious/noArrayIndexKey: une graduation par position de l'axe vertical, sa position est son identité
                      key={i}
                    >
                      <line
                        stroke="currentColor"
                        strokeDasharray={i === 0 ? undefined : "3 4"}
                        strokeOpacity={i === 0 ? 0.18 : 0.14}
                        x1={PAD.left}
                        x2={width - padRight}
                        y1={base - (i / STEPS) * innerH}
                        y2={base - (i / STEPS) * innerH}
                      />
                      {onLeft && leftSeries && (
                        <text
                          dy="0.32em"
                          // The series colour mixed with the ink: still its colour, and text-legible on both grounds.
                          fill={
                            bothAxes
                              ? `color-mix(in oklab, ${leftSeries.color} 60%, var(--foreground))`
                              : "currentColor"
                          }
                          fontSize="12"
                          textAnchor="end"
                          x={PAD.left - 8}
                          y={base - (i / STEPS) * innerH}
                        >
                          {fmt(leftSeries)(scales.left.ticks[i])}
                        </text>
                      )}
                      {onRight && rightSeries && (
                        <text
                          dy="0.32em"
                          fill="currentColor"
                          fontSize="12"
                          textAnchor="start"
                          x={width - padRight + 8}
                          y={base - (i / STEPS) * innerH}
                        >
                          {fmt(rightSeries)(scales.right.ticks[i])}
                        </text>
                      )}
                    </g>
                  ))}
                  {data.labels.map((label, i) =>
                    i % labelEvery === 0 ? (
                      <text
                        className="fill-muted-foreground"
                        fontSize="12"
                        // biome-ignore lint/suspicious/noArrayIndexKey: une étiquette par position de l'axe horizontal ; deux libellés peuvent se ressembler, la position non
                        key={i}
                        textAnchor={i === 0 ? "start" : "middle"}
                        x={x(i)}
                        y={H - 6}
                      >
                        {label}
                      </text>
                    ) : null
                  )}

                  {type === "bar"
                    ? data.labels.map((_, i) => {
                        const gap = 2;
                        const groupW = Math.min(
                          band * 0.72,
                          18 * visible.length + gap * (visible.length - 1)
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
                              animate={{
                                y: yFor(axis, v),
                                height: base - yFor(axis, v),
                              }}
                              fill={
                                partialLast && i === data.labels.length - 1
                                  ? `url(#${uid}-stripe-${index})`
                                  : s.color
                              }
                              initial={{ y: base, height: 0 }}
                              // biome-ignore lint/suspicious/noArrayIndexKey: une barre par série et par position ; la clé par position fait glisser la barre d'une valeur à l'autre au changement de période
                              key={`${s.id}-${i}`}
                              opacity={
                                activeIndex === null || activeIndex === i
                                  ? 1
                                  : 0.4
                              }
                              rx={3}
                              style={{ transition: "opacity 150ms ease-out" }}
                              transition={{
                                duration: 0.5,
                                ease: EASE_OUT,
                                delay: reduce ? 0 : Math.min(i * 0.03, 0.6),
                              }}
                              width={barW}
                              x={x(i) - groupW / 2 + j * (barW + gap)}
                            />
                          );
                        });
                      })
                    : visible.map((s) => {
                        const axis = s.axis ?? "left";
                        const points = s.values.map(
                          (v, i) => [x(i), yFor(axis, v)] as const
                        );
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
                                  animate={{ d: area }}
                                  fill={`url(#${uid}-fill-${series.findIndex((t) => t.id === s.id)})`}
                                  initial={{ d: area }}
                                  transition={{
                                    duration: 0.4,
                                    ease: EASE_IN_OUT,
                                  }}
                                />
                              </g>
                            )}
                            <motion.path
                              animate={{ pathLength: 1, d: line }}
                              fill="none"
                              initial={{ pathLength: 0, d: line }}
                              stroke={s.color}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              transition={{
                                pathLength: { duration: 0.8, ease: EASE_OUT },
                                d: { duration: 0.4, ease: EASE_IN_OUT },
                              }}
                            />
                            {s.markers &&
                              points.length <= MAX_MARKERS &&
                              points.map(([px, py], i) => (
                                <circle
                                  cx={px}
                                  cy={py}
                                  fill="var(--card-inset)"
                                  // biome-ignore lint/suspicious/noArrayIndexKey: un marqueur par point de la courbe, repéré par sa position sur l'axe
                                  key={i}
                                  r={2.5}
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
                        className="text-foreground"
                        stroke="currentColor"
                        strokeOpacity={0.25}
                        x1={x(activeIndex)}
                        x2={x(activeIndex)}
                        y1={PAD.top}
                        y2={base}
                      />
                      {visible.map((s) => (
                        <circle
                          cx={x(activeIndex)}
                          cy={yFor(
                            s.axis ?? "left",
                            s.values[activeIndex] ?? 0
                          )}
                          fill={s.color}
                          key={s.id}
                          r={4.5}
                          stroke="var(--card-inset)"
                          strokeWidth={2}
                        />
                      ))}
                    </g>
                  )}

                  {/* Hit areas, wider than the marks. */}
                  {data.labels.map((_, i) => (
                    <rect
                      fill="transparent"
                      height={innerH}
                      // biome-ignore lint/suspicious/noArrayIndexKey: une zone de survol par position de l'axe, et select(i) attend justement cette position
                      key={i}
                      onClick={() => select(i, false)}
                      onPointerEnter={() => select(i, false)}
                      width={
                        type === "bar"
                          ? band
                          : innerW / Math.max(data.labels.length - 1, 1)
                      }
                      x={
                        type === "bar"
                          ? x(i) - band / 2
                          : x(i) -
                            innerW / Math.max(data.labels.length - 1, 1) / 2
                      }
                      y={PAD.top}
                    />
                  ))}
                </>
              )}
            </svg>

            <AnimatePresence>
              {activeIndex !== null && tooltip && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, transition: enter }}
                  className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-xl bg-[var(--card-raised)] px-3 py-2 text-xs"
                  exit={{ opacity: 0, transition: exit }}
                  initial={fromKeyboard ? false : { opacity: 0, scale: 0.97 }}
                  key="tip"
                  style={
                    donut
                      ? { left: "50%", transform: "translateX(-50%)" }
                      : {
                          left: Math.min(
                            Math.max(x(activeIndex) - 72, 0),
                            Math.max(width - 200, 0)
                          ),
                          transformOrigin: "top center",
                        }
                  }
                >
                  {tooltip}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* In a <section>, not bare in the panel: the base stylesheet strips background, border and radius from any
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
                      <tr
                        // biome-ignore lint/suspicious/noArrayIndexKey: une ligne du tableau accessible par position de l'axe, dans l'ordre des données du graphique
                        key={i}
                      >
                        <th scope="row">{tooltipTitles?.[i] ?? label}</th>
                        {visible.map((s) => (
                          <td key={s.id}>{valueFmt(s)(s.values[i] ?? 0)}</td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          </section>
          <p aria-live="polite" className="sr-only" role="status">
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
        <p
          className="flex items-center gap-2 text-muted-foreground"
          key={row.label}
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-[2px]"
            style={{ background: row.color }}
          />
          <span className="flex-1">{row.label}</span>
          <span className="font-mono text-foreground tabular-nums">
            {row.value}
          </span>
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
    series.slice(0, i).reduce((n, s) => n + (sum(s.values) / total) * c, 0)
  );

  return (
    <g>
      <text
        className="fill-muted-foreground"
        fontSize="12"
        textAnchor="middle"
        x={width / 2}
        y={104}
      >
        {activeIndex === null ? label : series[activeIndex]?.label}
      </text>
      <text
        className="fill-foreground tabular-nums"
        fontSize="18"
        fontWeight={500}
        textAnchor="middle"
        x={width / 2}
        y={126}
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
              animate={{ strokeDasharray: `${length} ${c}` }}
              fill="none"
              initial={{ strokeDasharray: `0 ${c}` }}
              key={s.id}
              onPointerEnter={() => onHover(i)}
              r={r}
              stroke={s.color}
              strokeDashoffset={-start}
              strokeWidth={activeIndex === i ? 26 : 22}
              style={{ transition: "stroke-width 150ms ease-out" }}
              transition={
                instant
                  ? { duration: 0 }
                  : { duration: 0.6, ease: EASE_OUT, delay: i * 0.06 }
              }
            />
          );
        })}
      </g>
    </g>
  );
}
