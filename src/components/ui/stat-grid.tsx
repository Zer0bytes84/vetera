// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  MinusIcon,
} from "@heroicons/react/16/solid";
import type { ComponentType } from "react";

/** Widget icons: Heroicons solid (they take className; strokeWidth is ignored by a filled glyph). */
export type StatIcon = ComponentType<{
  className?: string;
  strokeWidth?: number | string;
}>;

import { MotionConfig, motion } from "motion/react";
import { type CSSProperties, type ReactNode, useId } from "react";
import "./loading-skeleton.css";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RollingNumber } from "@/components/ui/rolling-number";
import { StatusPill } from "@/components/ui/status-pill";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/display-format";

/*
 * Adapted for Baitari: Heroicons, app tones (--tone-green / --tone-rose), 24 px figures (the scale),
 * French text and numbers. Optional extras, all off by default, for a row of key figures:
 *  - `icon` + `tone`: a tinted icon chip before the label, in one of the app's five tones;
 *  - `hint` is one short line under the badge, never wrapped; `deltaText` words a change a percentage cannot;
 *  - every card is built on the same rows of fixed height, so badges, lines, bars and curves line up across a row;
 *  - `emphasize`: the figure takes the tone, for a warning;
 *  - `ariaLabel`: the name of a clickable card;
 *  - `layout="row"`: one single row, never wrapped onto a second one;
 *  - `goals={false}`: the goal bars are hidden, so a view can show the sparklines OR the goals; a goal bar
 *    sits at the foot of its card, so every bar of a row is on one line whatever the text above it;
 *  - `icon` + `toolbar`: the header's icon, and a control on its right (the widget's views).
 * A change is « flat » only when it is exactly 0, as the dashboard has always read it.
 */
export type StatTone = "green" | "blue" | "violet" | "amber" | "rose";

export interface Stat {
  /** The name of the card when it is clickable. */
  ariaLabel?: string;
  /** Change vs. the previous period, in percent. */
  delta?: number;
  /** The badge's text, when a percentage cannot be (a zero base): `delta` is then read only for its sign. */
  deltaText?: string;
  /** The figure takes the tone: a warning. */
  emphasize?: boolean;
  /** Progress toward a target, 0–1, with its label (e.g. "Objectif 60 000 DA"). */
  goal?: { ratio: number; label: string };
  /** Whether a rise is good (revenue) or bad (latency, churn). */
  higherIsBetter?: boolean;
  hint?: string;
  /** Icon in a tinted chip before the label, and the tone it takes. */
  icon?: StatIcon;
  id: string;
  label: string;
  tone?: StatTone;
  /** Recent values, oldest first, for the sparkline. */
  trend?: number[];
  /** Preformatted value, e.g. "26 700 DA" or "1 204". Rolls when it changes. */
  value: string;
}

export interface StatGridProps {
  /** `false`: no badge row at all, for a grid whose cards carry no change (counts of what is to do). */
  badges?: boolean;
  className?: string;
  data: Stat[];
  /** Draw the goal bar of the stats that carry a `goal`. */
  goals?: boolean;
  /** The header's icon tile. */
  icon?: StatIcon;
  /** `row`: every card on one single row, scrolling sideways when the window is too narrow. */
  layout?: "grid" | "row";
  /** Controls on the header's own line, between the title and the toolbar (the dashboard's period filters). */
  lead?: ReactNode;
  /**
   * The figures are still being read: each card is drawn as the Cards variant of the Loading Skeleton, row for row
   * (label, figure, badge, line, goal), so nothing moves when they arrive and no figure is shown before it is known
   * (19 November 2026: the dashboard showed « 0 DA » for as long as its journal took to read).
   */
  loading?: boolean;
  loadingLabel?: string;
  /** While loading, the placeholders stay invisible until this turns true (useDelayedSkeleton): no flash on a fast read. */
  loadingRevealed?: boolean;
  onSelect?: (stat: Stat) => void;
  /** Show sparklines when stats carry a trend. */
  sparklines?: boolean;
  subtitle?: string;
  title?: string;
  /** On the right of the header: a switch between the widget's views. */
  toolbar?: ReactNode;
}

export function StatGrid({
  data,
  title,
  subtitle,
  icon,
  toolbar,
  lead,
  sparklines = true,
  goals = true,
  badges = true,
  onSelect,
  layout = "grid",
  loading = false,
  loadingRevealed = true,
  loadingLabel = "Chargement des chiffres",
  className,
}: StatGridProps) {
  return (
    <MotionConfig reducedMotion="user">
      <Shell className={cn("max-w-2xl", className)}>
        {(title || toolbar || lead) && (
          <ShellHeader
            aside={
              lead || toolbar ? (
                <>
                  {lead && (
                    <div className="min-w-0" data-slot="band-lead">
                      {lead}
                    </div>
                  )}
                  {toolbar}
                </>
              ) : undefined
            }
            className={lead ? "flex-wrap gap-y-2" : undefined}
            icon={icon}
            subtitle={subtitle}
            subtitleClassName="whitespace-nowrap"
            title={title ?? ""}
          />
        )}
        <div
          aria-busy={loading || undefined}
          aria-label={loading ? loadingLabel : undefined}
          className={cn(
            "grid gap-1.5",
            loading && "loading-skeleton",
            loading && !loadingRevealed && "invisible",
            layout === "row"
              ? "auto-cols-[minmax(11.5rem,1fr)] grid-flow-col overflow-x-auto"
              : data.length > 2
                ? "@xs:grid-cols-2 grid-cols-1"
                : "@md:grid-cols-2 grid-cols-1"
          )}
          // The band's row of cards: in Clean, its cards sit on the band by the contrast of fills alone.
          data-slot="stat-grid"
          role={loading ? "status" : undefined}
        >
          {data.map((stat) =>
            loading ? (
              <StatCardPlaceholder
                key={stat.id}
                showBadge={badges}
                showGoal={goals && Boolean(stat.goal)}
              />
            ) : (
              <StatCard
                key={stat.id}
                onSelect={onSelect}
                showBadge={badges}
                showGoal={goals}
                sparkline={sparklines}
                stat={stat}
              />
            )
          )}
        </div>
      </Shell>
    </MotionConfig>
  );
}

/** A card being read: the same rows as StatCard (24, 32, 20, 16 px and the goal), in the Loading Skeleton's sheen. */
function StatCardPlaceholder({
  showBadge,
  showGoal,
}: {
  showBadge: boolean;
  showGoal: boolean;
}) {
  const shape = "loading-skeleton-shape";
  return (
    <Panel aria-hidden="true" className="flex h-full flex-col gap-2 p-4">
      <div className="flex h-6 items-center gap-2">
        <span className={cn(shape, "size-6 rounded-md")} />
        <span className={cn(shape, "h-2 w-20")} />
      </div>
      <div className="flex h-8 items-center">
        <span className={cn(shape, "h-6 w-24 rounded-lg")} />
      </div>
      {showBadge && (
        <div className="flex h-5 items-center">
          <span className={cn(shape, "h-4 w-12")} />
        </div>
      )}
      <div className="flex h-4 items-center">
        <span className={cn(shape, "h-2 w-32")} />
      </div>
      {showGoal && (
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <span className={cn(shape, "h-1.5 w-full")} />
          <div className="flex h-4 items-center">
            <span className={cn(shape, "h-2 w-24")} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function StatCard({
  stat,
  sparkline,
  showGoal,
  showBadge,
  onSelect,
}: {
  stat: Stat;
  sparkline: boolean;
  showGoal: boolean;
  showBadge: boolean;
  onSelect?: (stat: Stat) => void;
}) {
  const { delta, higherIsBetter = true } = stat;
  // Exactly 0, not « under 0.05 »: the dashboard has always shown +0,03 % as a rise.
  const flat = delta === undefined || delta === 0;
  const good = !flat && delta > 0 === higherIsBetter;
  const DeltaIcon = flat
    ? MinusIcon
    : delta > 0
      ? ArrowUpRightIcon
      : ArrowDownRightIcon;
  const Root = onSelect ? motion.button : motion.div;
  const percent =
    delta === undefined
      ? ""
      : `${delta > 0 ? "+" : ""}${formatNumber(delta, { maximumFractionDigits: 1 })} %`;

  return (
    <Root
      aria-label={onSelect ? stat.ariaLabel : undefined}
      // No entrance: a band read every morning is simply there, and a filter that changes a figure rolls the figure only.
      className={cn(
        "group min-w-0 text-left",
        onSelect &&
          "rounded-2xl outline-offset-2 transition-[scale] duration-150 ease-out active:scale-[0.98]"
      )}
      onClick={onSelect ? () => onSelect(stat) : undefined}
      type={onSelect ? "button" : undefined}
    >
      {/*
        One template for every card, on rows of fixed height: label, figure (with its curve at the top
        right, level with it), badge, one short line, and the goal bar at the foot. No row can wrap or
        grow, so each of them falls on the same line from one card to the next.
      */}
      <Panel
        className={cn(
          "flex h-full flex-col gap-2 p-4",
          // A clickable card answers the pointer by its fill alone: no border, no shadow.
          onSelect &&
            "transition-[background-color] duration-150 ease-out group-hover:bg-[color-mix(in_oklab,var(--card-inset),var(--foreground)_3%)] group-active:bg-[color-mix(in_oklab,var(--card-inset),var(--foreground)_5%)]"
        )}
      >
        <p
          className="flex h-6 items-center gap-2 text-[0.8125rem] text-muted-foreground"
          data-slot="stat-label"
        >
          {stat.icon && (
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-md"
              style={
                {
                  "--tone": stat.tone
                    ? `var(--tone-${stat.tone})`
                    : "currentColor",
                  color: "var(--tone)",
                  background:
                    "color-mix(in oklab, var(--tone) 16%, transparent)",
                } as CSSProperties
              }
            >
              <stat.icon className="size-3.5" strokeWidth={1.75} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{stat.label}</span>
          {onSelect && (
            <ArrowRightIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          )}
        </p>
        <div className="flex h-8 items-center justify-between gap-3">
          <span
            className="shrink-0 whitespace-nowrap"
            data-slot="stat-value"
            style={
              stat.emphasize && stat.tone
                ? { color: `var(--tone-${stat.tone})` }
                : undefined
            }
          >
            <RollingNumber
              className="font-medium text-[1.5rem] leading-none tracking-tight"
              value={stat.value}
            />
          </span>
          {sparkline && stat.trend && stat.trend.length > 1 && (
            <Sparkline
              tone={flat ? "neutral" : good ? "positive" : "negative"}
              values={stat.trend}
            />
          )}
        </div>
        {showBadge && (
          <div className="flex h-5 items-center">
            {delta !== undefined && (
              <StatusPill
                icon={DeltaIcon}
                iconWeight="bold"
                size="sm"
                tone={flat ? "neutral" : good ? "positive" : "negative"}
              >
                <RollingNumber value={stat.deltaText ?? percent} />
                <span className="sr-only">
                  {flat ? "stable" : good ? ", favorable" : ", défavorable"}
                </span>
              </StatusPill>
            )}
          </div>
        )}
        <p className="h-4 truncate text-muted-foreground text-xs leading-4">
          {stat.hint}
        </p>
        {showGoal && stat.goal && (
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            <ProgressBar
              label={`${stat.label}: ${stat.goal.label}`}
              max={1}
              size="sm"
              striped
              tone={stat.goal.ratio >= 1 ? "positive" : "brand"}
              value={stat.goal.ratio}
              valueText={`${Math.round(stat.goal.ratio * 100)} % : ${stat.goal.label}`}
            />
            <p className="flex h-4 items-center justify-between gap-2 text-muted-foreground text-xs leading-4">
              <span className="min-w-0 truncate">{stat.goal.label}</span>
              <span className="shrink-0 tabular-nums">
                {Math.round(stat.goal.ratio * 100)} %
              </span>
            </p>
          </div>
        )}
      </Panel>
    </Root>
  );
}

const toneColor = {
  positive: "var(--tone-green)",
  negative: "var(--tone-rose)",
  neutral: "var(--muted-foreground)",
};

/** Tiny trend line; the last point is marked so "now" is easy to find. */
function Sparkline({
  values,
  tone,
}: {
  values: number[];
  tone: keyof typeof toneColor;
}) {
  const id = useId().replace(/:/g, "");
  const w = 72;
  const h = 28;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map(
    (v, i) =>
      [
        (i / (values.length - 1)) * (w - 4) + 2,
        h - 3 - ((v - min) / span) * (h - 6),
      ] as const
  );
  const d = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
  const end = pts.at(-1);
  if (!end) {
    return null;
  }
  const [lx, ly] = end;
  const color = toneColor[tone];

  return (
    <svg
      aria-hidden="true"
      className="shrink-0 overflow-visible"
      height={h}
      width={w}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        animate={{ d: `${d}L${lx},${h}L${pts[0][0]},${h}Z` }}
        fill={`url(#${id})`}
        transition={{ duration: 0.4, ease: EASE_IN_OUT }}
      />
      <motion.path
        animate={{ pathLength: 1, d }}
        fill="none"
        initial={{ pathLength: 0 }}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        transition={{
          pathLength: { duration: 0.7, ease: EASE_OUT },
          d: { duration: 0.4, ease: EASE_IN_OUT },
        }}
      />
      <motion.circle
        animate={{ cx: lx, cy: ly }}
        fill={color}
        r={2.5}
        transition={{ duration: 0.4, ease: EASE_IN_OUT }}
      />
    </svg>
  );
}
