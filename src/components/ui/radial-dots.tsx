// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { ChartPie } from "lucide-react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_OUT } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari from TuffUI's Radial Dots. The drawing is theirs: a cycle as rings of dots, each sector a slot of the
 * cycle, dots stacking outward series by series, the centre showing a figure until a sector is hovered. What changes:
 *  - colours are our tokens, never the TuffUI theme (`color` of each series is any of our colours);
 *  - dots are exact: while the busiest sector holds 24 or less (the 8 rings of 3 lanes), one dot is one unit, and above that
 *    one dot is `dotsPer(peak)` units, said under the figure; a sector that has anything always has a dot;
 *  - the legend always shows numbers: each series' total, or the hovered sector's;
 *  - text is French and never under 12 px once drawn (the svg is sized so its 14-unit labels land at 13 px or more);
 *  - the header's right side takes a toolbar (the views) and a slot under the legend holds the figures.
 */

export type RadialSeries = {
  id: string;
  label: string;
  /** One value per sector. Series stack outward in order. */
  values: number[];
  /** Any CSS colour. */
  color: string;
};

export type RadialDotsProps = {
  /** One label per sector, clockwise from the top: hours, weekdays. */
  labels: string[];
  series: RadialSeries[];
  title: string;
  subtitle?: ReactNode;
  /** Big number in the middle and the line under it. */
  center: { value: string; caption?: string };
  /** Which sector labels to draw around the edge. Defaults to the four quarters. */
  axis?: number[];
  /** What a unit is called when a sector is hovered: « 3 rendez-vous ». */
  format?: (value: number) => string;
  /** What the sector's tooltip title says (centre, top line). Defaults to its label. */
  sectorTitle?: (index: number) => string;
  /** Right of the header: the views. */
  toolbar?: ReactNode;
  /** Under the legend, in the panel. */
  children?: ReactNode;
  /** Unit written in « 1 point = 2 rendez-vous ». */
  unit?: string;
  className?: string;
};

const SIZE = 300;
const C = SIZE / 2;
const INNER = 70;
const RINGS = 8;
/** Where the rings may reach: the ring of dots ends before the ticks. */
const REACH = C - 8;
const LANES = 3;
const CAPACITY = RINGS * LANES;

const round = (n: number) => Math.round(n * 100) / 100;

const polar = (turn: number, r: number) => {
  const a = turn * 2 * Math.PI - Math.PI / 2;
  // Rounded so server and client trig agree.
  return [round(C + r * Math.cos(a)), round(C + r * Math.sin(a))] as const;
};

/** Units one dot stands for: 1 up to a busiest sector of 24, then whole units so the busiest sector still fits. */
export const dotsPer = (peak: number) => Math.max(1, Math.ceil(peak / CAPACITY));

/** Dots drawn for a value: exact at one per dot, never zero for a sector that has anything. */
export const dotsFor = (value: number, per: number) => (value > 0 ? Math.max(1, Math.round(value / per)) : 0);

export function RadialDots({
  labels,
  series,
  title,
  subtitle,
  center,
  axis,
  format = (value) => value.toLocaleString("fr-FR"),
  sectorTitle,
  toolbar,
  children,
  unit = "rendez-vous",
  className,
}: RadialDotsProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = useState(false);

  const n = labels.length;
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const peak = Math.max(0, ...totals);
  const per = dotsPer(peak);
  // Only as many rings as the busiest sector needs, spread over the same reach, so a quiet week still draws dots you can see.
  const rings = Math.min(RINGS, Math.max(3, Math.ceil(Math.max(1, Math.round(peak / per)) / LANES)));
  const ringStep = Math.min(16, (REACH - (INNER + 6)) / rings);
  const dotR = round(Math.min(4.5, ringStep * 0.32, ((2 * Math.PI * (INNER + 6)) / n / LANES) * 0.4));
  const quarters = axis ?? [0, n / 4, n / 2, (3 * n) / 4].filter(Number.isInteger);
  const titleOf = (i: number) => sectorTitle?.(i) ?? labels[i];

  const select = (index: number | null, keyboard: boolean) => {
    setFromKeyboard(keyboard);
    setActive(index);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!n) return;
    const keys: Record<string, number> = {
      ArrowRight: (active ?? -1) + 1,
      ArrowDown: (active ?? -1) + 1,
      ArrowLeft: (active ?? n) - 1,
      ArrowUp: (active ?? n) - 1,
      Home: 0,
      End: n - 1,
    };
    if (event.key === "Escape") return select(null, true);
    if (!(event.key in keys)) return;
    event.preventDefault();
    select((keys[event.key] + n) % n, true);
  };

  const wedge = (i: number) => {
    const [x1, y1] = polar(i / n, INNER);
    const [x2, y2] = polar(i / n, C);
    const [x3, y3] = polar((i + 1) / n, C);
    const [x4, y4] = polar((i + 1) / n, INNER);
    return `M${x1} ${y1}L${x2} ${y2}A${C} ${C} 0 0 1 ${x3} ${y3}L${x4} ${y4}A${INNER} ${INNER} 0 0 0 ${x1} ${y1}Z`;
  };

  const seriesTotal = (s: RadialSeries) => s.values.reduce((sum, v) => sum + v, 0);

  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("flex h-full flex-col", className)}>
        <ShellHeader aside={toolbar} as="h2" icon={ChartPie} subtitle={subtitle} title={title} />
        <Panel className="flex flex-1 flex-col p-4">
          <div
            aria-label={`${title}. Les flèches du clavier lisent chaque secteur.`}
            className="relative mx-auto w-full max-w-80 rounded-full outline-offset-4"
            onBlur={() => fromKeyboard && setActive(null)}
            onKeyDown={onKeyDown}
            role="group"
            tabIndex={0}
          >
            <svg
              aria-label={
                peak
                  ? `${title} : le plus chargé, ${titleOf(totals.indexOf(peak))}, ${format(peak)}`
                  : `${title} : aucun rendez-vous`
              }
              className="block w-full overflow-visible"
              onPointerLeave={() => select(null, false)}
              role="img"
              viewBox={`-24 -24 ${SIZE + 48} ${SIZE + 48}`}
            >
              {labels.map((label, i) => {
                const [x1, y1] = polar(i / n, C - 2);
                const [x2, y2] = polar(i / n, C + 4);
                const labeled = quarters.includes(i);
                // The label of a slot sits at its middle when the slots are few and wide.
                const turn = n <= 12 ? (i + 0.5) / n : i / n;
                const [tx, ty] = polar(turn, C + 24);
                return (
                  <g className="text-muted-foreground" key={i}>
                    <line
                      stroke="currentColor"
                      strokeOpacity={labeled ? 0.7 : 0.3}
                      strokeWidth={1.25}
                      x1={x1}
                      x2={x2}
                      y1={y1}
                      y2={y2}
                    />
                    {labeled && (
                      <text dy="0.32em" fill="currentColor" fontSize="14" textAnchor="middle" x={tx} y={ty}>
                        {label}
                      </text>
                    )}
                  </g>
                );
              })}

              <circle className="stroke-foreground/10" cx={C} cy={C} fill="none" r={INNER - 6} />

              {labels.map((_, i) => {
                // Fill lanes ring by ring, inner series first.
                const slots: (string | null)[] = Array(rings * LANES).fill(null);
                let at = 0;
                for (const s of series) {
                  const dots = dotsFor(s.values[i] ?? 0, per);
                  for (let k = 0; k < dots && at < slots.length; k++) slots[at++] = s.color;
                }
                const dim = active !== null && active !== i;
                return (
                  <motion.g
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    key={i}
                    transition={{ duration: 0.3, ease: EASE_OUT, delay: reduce ? 0 : i * (n > 12 ? 0.02 : 0.05) }}
                  >
                    <g className={cn("transition-opacity duration-150", dim && "opacity-40", fromKeyboard && "duration-0")}>
                      {slots.map((color, k) => {
                        const ring = Math.floor(k / LANES);
                        const lane = k % LANES;
                        const [x, y] = polar((i + (lane + 0.5) / LANES) / n, INNER + 6 + ring * ringStep);
                        return color ? (
                          <circle cx={x} cy={y} data-dot="" key={k} r={dotR} style={{ fill: color }} />
                        ) : (
                          <circle className="fill-foreground/15" cx={x} cy={y} key={k} r={round(dotR * 0.42)} />
                        );
                      })}
                    </g>
                  </motion.g>
                );
              })}

              {labels.map((_, i) => (
                <path d={wedge(i)} fill="transparent" key={i} onPointerEnter={() => select(i, false)} />
              ))}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {active === null ? (
                <>
                  <p className="text-[1.5rem] font-medium tracking-tight tabular-nums">{center.value}</p>
                  {center.caption && <p className="text-xs text-muted-foreground">{center.caption}</p>}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground first-letter:uppercase">{titleOf(active)}</p>
                  <p className="text-[1.5rem] font-medium tracking-tight tabular-nums">{format(totals[active])}</p>
                </>
              )}
            </div>
          </div>

          <ul aria-label="Légende" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {series.map((s) => (
              <li className="flex items-center gap-1.5" key={s.id}>
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.color }} />
                {s.label}
                <span className="text-foreground tabular-nums">
                  {(active === null ? seriesTotal(s) : (s.values[active] ?? 0)).toLocaleString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
          {per > 1 ? (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              1 point = {per} {unit}
            </p>
          ) : null}

          <p aria-live="polite" className="sr-only" role="status">
            {fromKeyboard && active !== null
              ? `${titleOf(active)} : ${series.map((s) => `${s.label} ${s.values[active] ?? 0}`).join(", ")}`
              : ""}
          </p>

          {children}
        </Panel>
      </Shell>
    </MotionConfig>
  );
}
