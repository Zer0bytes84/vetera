"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "@/lib/icons";

export type SettleTone = "neutral" | "emerald" | "amber" | "blue" | "rose" | "ink";

const TONE_BADGE: Record<SettleTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/[0.12] dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-500/[0.12] dark:text-amber-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/[0.12] dark:text-blue-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/[0.12] dark:text-rose-300",
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300",
  ink: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
};

const TONE_STROKE: Record<SettleTone, string> = {
  neutral: "text-neutral-400 dark:text-neutral-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  blue: "text-blue-500",
  rose: "text-rose-400",
  ink: "text-neutral-900 dark:text-neutral-100",
};

const TONE_FILL: Record<SettleTone, string> = {
  neutral: "fill-neutral-400 dark:fill-neutral-500",
  emerald: "fill-emerald-500",
  amber: "fill-amber-500",
  blue: "fill-blue-500",
  rose: "fill-rose-500",
  ink: "fill-neutral-900 dark:fill-neutral-100",
};

const TONE_DOT: Record<SettleTone, string> = {
  neutral: "bg-neutral-400 dark:bg-neutral-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  blue: "bg-blue-400",
  rose: "bg-rose-500",
  ink: "bg-neutral-900 dark:bg-neutral-100",
};

const TONE_ICON_BG: Record<SettleTone, string> = {
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-white/[0.08] dark:text-neutral-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.14] dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/[0.14] dark:text-amber-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/[0.14] dark:text-blue-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/[0.14] dark:text-rose-300",
  ink: "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
};

/**
 * Catmull-Rom cubic bezier SVG SparkLine matching Settle 1:1.
 */
export function SettleSparkLine({
  values,
  tone = "neutral",
}: {
  values: number[];
  tone?: SettleTone;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((val, idx) => [
    Number(((104 * idx) / (values.length - 1)).toFixed(2)),
    Number((26 - ((val - min) / range) * 22).toFixed(2)),
  ]);

  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)}, ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  const lastPoint = points[points.length - 1];

  return (
    <svg
      viewBox="0 0 104 28"
      className="h-[24px] w-[72px] shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className={TONE_STROKE[tone] || TONE_STROKE.neutral}
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="2.6"
        className={TONE_FILL[tone] || TONE_FILL.neutral}
      />
    </svg>
  );
}

/**
 * StatTile widget matching Settle's top KPI cards 1:1.
 */
export function SettleStatTile({
  label,
  tip,
  value,
  caption,
  delta,
  badge,
  spark,
  onClick,
}: {
  label: string;
  tip?: string;
  value: string;
  caption?: string;
  delta?: { value: string; direction: "up" | "down"; good: boolean };
  badge?: { label: string; tone: SettleTone };
  spark?: { values: number[]; tone: SettleTone };
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "settle-stat-tile rounded-[14px] p-4 bg-white dark:bg-neutral-900 border border-black/[0.07] dark:border-white/[0.08] shadow-[0_1px_2px_rgb(0_0_0/0.05)] flex flex-col justify-between transition-all",
        onClick && "cursor-pointer hover:border-black/[0.15] dark:hover:border-white/[0.18] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06)]"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <p
            className="settle-stat-label m-0 min-w-0 truncate text-[11.5px] font-medium uppercase tracking-[0.06em] text-neutral-500 dark:text-neutral-400"
            title={tip}
          >
            {label}
          </p>
          {spark ? (
            <span className="-mt-1">
              <SettleSparkLine values={spark.values} tone={spark.tone} />
            </span>
          ) : null}
        </div>
        <p className="settle-stat-value m-0 mt-3 tabular-nums text-[28px] font-semibold tracking-[-0.03em] text-neutral-900 dark:text-neutral-100">
          {value}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {delta ? (
          <span
            className={cn(
              "badge whitespace-nowrap inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[11px] font-medium tabular-nums",
              delta.good ? TONE_BADGE.emerald : TONE_BADGE.rose
            )}
          >
            {delta.direction === "up" ? (
              <ArrowUpRight size={12} className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight size={12} className="h-3 w-3" aria-hidden="true" />
            )}
            {delta.value}
          </span>
        ) : badge ? (
          <span
            className={cn(
              "badge whitespace-nowrap inline-flex items-center gap-1 h-[22px] px-2 rounded-[7px] text-[11px] font-medium tabular-nums",
              TONE_BADGE[badge.tone] || TONE_BADGE.neutral
            )}
          >
            {badge.label}
          </span>
        ) : null}
        {caption ? (
          <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Multi-segment horizontal progress bar matching Settle 1:1.
 */
export function SettleProgressBar({
  segments,
  max,
  height = "h-2",
}: {
  segments: { value: number; tone: SettleTone; label?: string }[];
  max?: number;
  height?: string;
}) {
  const visible = segments.filter(segment => Number.isFinite(segment.value) && segment.value > 0);
  const total = max ?? visible.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div
      role="img"
      aria-label={visible.length ? visible.map(segment => `${segment.label ?? segment.tone} : ${segment.value.toLocaleString("fr-FR")}`).join(", ") : "Aucun montant à répartir"}
      className={cn(
        "settle-progress-bar flex w-full overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.07]",
        height
      )}
    >
      {visible.map((segment, index) => (
        <span
          key={index}
          data-tone={segment.tone}
          data-value={segment.value}
          title={`${segment.label ?? segment.tone} : ${segment.value.toLocaleString("fr-FR")}`}
          className={cn("settle-progress-segment h-full transition-[width] duration-300 motion-reduce:transition-none", TONE_DOT[segment.tone])}
          // Keep small outstanding balances visible; flex shrinks the larger segments to fit.
          style={{ width: `${(segment.value / (total || 1)) * 100}%`, minWidth: 6, flexShrink: 1 }}
        />
      ))}
    </div>
  );
}

/**
 * Card surface matching Settle 1:1.
 */
export function SettleCard({
  title,
  subtitle,
  action,
  pad = true,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  pad?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "settle-card rounded-[18px] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05)] dark:border-white/[0.08] dark:bg-neutral-900 flex flex-col",
        className
      )}
    >
      {title ? (
        <div className="premium-card-heading flex flex-wrap items-start justify-between gap-4 px-4 pt-4">
          <div className="min-w-0">
            <h2 className="m-0 text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h2>
            {subtitle ? (
              <p className="m-0 mt-0.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("flex flex-1 flex-col", pad && "p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * 4-Metric Vertical Hairline Footer matching Settle's Settlement volume footer.
 */
export function SettleMetricFooter({
  metrics,
}: {
  metrics: {
    label: string;
    value: string;
    caption?: string;
    tip?: string;
  }[];
}) {
  return (
    <>
      <div className="h-px bg-black/[0.06] dark:bg-white/[0.08]" />
      <div className="settle-metric-footer grid grid-cols-2 divide-x divide-black/[0.06] sm:grid-cols-4 dark:divide-white/[0.08]">
        {metrics.map((m, idx) => (
          <div key={idx} className="settle-metric-cell px-4 py-3.5" title={m.tip}>
            <p className="m-0 text-[11px] font-medium uppercase tracking-[0.04em] text-neutral-500 dark:text-neutral-400">
              {m.label}
            </p>
            <p className="m-0 mt-1 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {m.value}
            </p>
            {m.caption ? (
              <p className="m-0 mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {m.caption}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Exception / Action Queue item matching Settle 1:1.
 */
export function SettleQueueItem({
  title,
  subtitle,
  amount,
  meta,
  tone = "neutral",
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle?: string;
  amount?: string;
  meta?: string;
  tone?: SettleTone;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "settle-queue-item flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
        onClick && "cursor-pointer group"
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px]",
            TONE_ICON_BG[tone] || TONE_ICON_BG.neutral
          )}
        >
          <Icon className="h-4 w-4" size={16} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </p>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {(amount || meta) ? (
        <div className="shrink-0 text-right">
          {amount ? (
            <p className="m-0 text-[12.5px] font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {amount}
            </p>
          ) : null}
          {meta ? (
            <p className="m-0 mt-0.5 text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
              {meta}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
