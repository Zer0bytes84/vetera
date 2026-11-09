// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RollingNumber } from "@/components/ui/rolling-number";
import { StatusPill } from "@/components/ui/status-pill";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/display-format";

/*
 * Adapted for Baitari: lucide icons, app tones (--tone-green / --tone-rose), 24 px figures (the scale),
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

export type Stat = {
  id: string;
  label: string;
  /** Preformatted value, e.g. "26 700 DA" or "1 204". Rolls when it changes. */
  value: string;
  /** Change vs. the previous period, in percent. */
  delta?: number;
  /** Whether a rise is good (revenue) or bad (latency, churn). */
  higherIsBetter?: boolean;
  /** Recent values, oldest first, for the sparkline. */
  trend?: number[];
  /** Progress toward a target, 0–1, with its label (e.g. "Objectif 60 000 DA"). */
  goal?: { ratio: number; label: string };
  hint?: string;
  /** The badge's text, when a percentage cannot be (a zero base): `delta` is then read only for its sign. */
  deltaText?: string;
  /** Icon in a tinted chip before the label, and the tone it takes. */
  icon?: LucideIcon;
  tone?: StatTone;
  /** The figure takes the tone: a warning. */
  emphasize?: boolean;
  /** The name of the card when it is clickable. */
  ariaLabel?: string;
};

export type StatGridProps = {
  data: Stat[];
  title?: string;
  subtitle?: string;
  /** The header's icon tile. */
  icon?: LucideIcon;
  /** On the right of the header: a switch between the widget's views. */
  toolbar?: ReactNode;
  /** Controls on the header's own line, between the title and the toolbar (the dashboard's period filters). */
  lead?: ReactNode;
  /** Show sparklines when stats carry a trend. */
  sparklines?: boolean;
  onSelect?: (stat: Stat) => void;
  /** Draw the goal bar of the stats that carry a `goal`. */
  goals?: boolean;
  /** `row`: every card on one single row, scrolling sideways when the window is too narrow. */
  layout?: "grid" | "row";
  className?: string;
};

export function StatGrid({
  data,
  title,
  subtitle,
  icon,
  toolbar,
  lead,
  sparklines = true,
  goals = true,
  onSelect,
  layout = "grid",
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
                  {lead && <div className="min-w-0" data-slot="band-lead">{lead}</div>}
                  {toolbar}
                </>
              ) : undefined
            }
            className={lead ? "flex-wrap gap-y-2" : undefined}
            icon={icon}
            subtitle={subtitle}
            title={title ?? ""}
          />
        )}
        <div
          className={cn(
            "grid gap-1.5",
            layout === "row"
              ? "grid-flow-col auto-cols-[minmax(11.5rem,1fr)] overflow-x-auto"
              : data.length > 2
                ? "grid-cols-1 @xs:grid-cols-2"
                : "grid-cols-1 @md:grid-cols-2",
          )}
        >
          {data.map((stat, i) => (
            <StatCard
              key={stat.id}
              stat={stat}
              index={i}
              sparkline={sparklines}
              showGoal={goals}
              onSelect={onSelect}
            />
          ))}
        </div>
      </Shell>
    </MotionConfig>
  );
}

function StatCard({
  stat,
  index,
  sparkline,
  showGoal,
  onSelect,
}: {
  stat: Stat;
  index: number;
  sparkline: boolean;
  showGoal: boolean;
  onSelect?: (stat: Stat) => void;
}) {
  const { delta, higherIsBetter = true } = stat;
  // Exactly 0, not « under 0.05 »: the dashboard has always shown +0,03 % as a rise.
  const flat = delta === undefined || delta === 0;
  const good = !flat && delta > 0 === higherIsBetter;
  const DeltaIcon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const Root = onSelect ? motion.button : motion.div;
  const percent = delta === undefined ? "" : `${delta > 0 ? "+" : ""}${formatNumber(delta, { maximumFractionDigits: 1 })} %`;

  return (
    <Root
      type={onSelect ? "button" : undefined}
      onClick={onSelect ? () => onSelect(stat) : undefined}
      aria-label={onSelect ? stat.ariaLabel : undefined}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT, delay: index * 0.05 }}
      className={cn(
        "group min-w-0 text-left",
        onSelect &&
          "rounded-2xl outline-offset-2 transition-[scale] duration-150 ease-out active:scale-[0.98]",
      )}
    >
      {/*
        One template for every card, on rows of fixed height: label, figure (with its curve at the top
        right, level with it), badge, one short line, and the goal bar at the foot. No row can wrap or
        grow, so each of them falls on the same line from one card to the next.
      */}
      <Panel className="flex h-full flex-col gap-2 p-4">
        <p className="flex h-6 items-center gap-2 text-[0.8125rem] text-muted-foreground">
          {stat.icon && (
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-md"
              style={
                {
                  "--tone": stat.tone ? `var(--tone-${stat.tone})` : "currentColor",
                  color: "var(--tone)",
                  background: "color-mix(in oklab, var(--tone) 16%, transparent)",
                } as CSSProperties
              }
            >
              <stat.icon className="size-3.5" strokeWidth={1.75} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{stat.label}</span>
          {onSelect && (
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          )}
        </p>
        <div className="flex h-8 items-center justify-between gap-3">
          <span
            className="shrink-0 whitespace-nowrap"
            style={stat.emphasize && stat.tone ? { color: `var(--tone-${stat.tone})` } : undefined}
          >
            <RollingNumber
              value={stat.value}
              className="text-[1.5rem] leading-none font-medium tracking-tight"
            />
          </span>
          {sparkline && stat.trend && stat.trend.length > 1 && (
            <Sparkline
              values={stat.trend}
              tone={flat ? "neutral" : good ? "positive" : "negative"}
            />
          )}
        </div>
        <div className="flex h-5 items-center">
          {delta !== undefined && (
            <StatusPill
              size="sm"
              tone={flat ? "neutral" : good ? "positive" : "negative"}
              icon={DeltaIcon}
              iconWeight="bold"
            >
              <RollingNumber value={stat.deltaText ?? percent} />
              <span className="sr-only">
                {flat ? "stable" : good ? ", favorable" : ", défavorable"}
              </span>
            </StatusPill>
          )}
        </div>
        <p className="h-4 truncate text-xs leading-4 text-muted-foreground">{stat.hint}</p>
        {showGoal && stat.goal && (
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            <ProgressBar
              value={stat.goal.ratio}
              max={1}
              size="sm"
              striped
              tone={stat.goal.ratio >= 1 ? "positive" : "brand"}
              label={`${stat.label}: ${stat.goal.label}`}
              valueText={`${Math.round(stat.goal.ratio * 100)} % : ${stat.goal.label}`}
            />
            <p className="flex h-4 items-center justify-between gap-2 text-xs leading-4 text-muted-foreground">
              <span className="min-w-0 truncate">{stat.goal.label}</span>
              <span className="shrink-0 tabular-nums">{Math.round(stat.goal.ratio * 100)} %</span>
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
function Sparkline({ values, tone }: { values: number[]; tone: keyof typeof toneColor }) {
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
      ] as const,
  );
  const d = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
  const [lx, ly] = pts[pts.length - 1];
  const color = toneColor[tone];

  return (
    <svg width={w} height={h} aria-hidden="true" className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        animate={{ d: `${d}L${pts.at(-1)![0]},${h}L${pts[0][0]},${h}Z` }}
        transition={{ duration: 0.4, ease: EASE_IN_OUT }}
        fill={`url(#${id})`}
      />
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1, d }}
        transition={{
          pathLength: { duration: 0.7, ease: EASE_OUT },
          d: { duration: 0.4, ease: EASE_IN_OUT },
        }}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.circle
        animate={{ cx: lx, cy: ly }}
        transition={{ duration: 0.4, ease: EASE_IN_OUT }}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}
