import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricOverviewTone =
  | "blue"
  | "orange"
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "violet";

export interface MetricOverviewItem {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  meta: string;
  note: string;
  onReport?: () => void;
  sparklineData: number[];
  tone: MetricOverviewTone;
  value: string;
}

const metricToneMap: Record<
  MetricOverviewTone,
  { icon: string; spark: string }
> = {
  blue: { icon: "text-blue-600", spark: "#3b82f6" },
  orange: { icon: "text-orange-600", spark: "#f97316" },
  emerald: { icon: "text-emerald-600", spark: "#10b981" },
  slate: { icon: "text-slate-600", spark: "#64748b" },
  amber: { icon: "text-amber-600", spark: "#f59e0b" },
  rose: { icon: "text-rose-600", spark: "#f43f5e" },
  violet: { icon: "text-violet-600", spark: "#8b5cf6" },
};

type DeltaIntent = "positive" | "negative" | "neutral";

function resolveDeltaIntent(meta: string): DeltaIntent {
  const trimmed = meta.trim();
  if (trimmed.startsWith("+") && !(trimmed === "+0.0%" || trimmed === "+0%")) {
    return "positive";
  }
  if (trimmed.startsWith("-") && !(trimmed === "-0.0%" || trimmed === "-0%")) {
    return "negative";
  }
  return "neutral";
}

const deltaIntentClass: Record<DeltaIntent, string> = {
  positive: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  negative: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * Build a smooth Catmull-Rom-ish SVG path for the sparkline footer.
 */
function buildSparkPath(
  values: number[],
  width: number,
  height: number,
  pad: number
): { line: string; area: string } {
  if (values.length === 0) {
    const y = height / 2;
    return {
      line: `M 0 ${y} L ${width} ${y}`,
      area: `M 0 ${y} L ${width} ${y} L ${width} ${height} L 0 ${height} Z`,
    };
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const innerW = width;
  const innerH = height - pad * 2;
  const stepX = values.length > 1 ? innerW / (values.length - 1) : innerW;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  let line = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const cx = (prev.x + cur.x) / 2;
    line += ` Q ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${((prev.y + cur.y) / 2).toFixed(2)} T ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
  }

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area };
}

function SparkFooter({
  data,
  color,
  uid,
}: {
  data: number[];
  color: string;
  uid: string;
}) {
  const width = 320;
  const height = 44;
  const { line, area } = buildSparkPath(data, width, height, 4);
  const gradId = `spark-grad-${uid}`;

  return (
    <svg
      className="block h-[44px] w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Tendance récente</title>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
      />
    </svg>
  );
}

export function MetricOverviewStrip({
  items,
}: {
  items: MetricOverviewItem[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, idx) => {
        const tone = metricToneMap[item.tone];
        const intent = resolveDeltaIntent(item.meta);
        const isInteractive = Boolean(item.onReport);

        return (
          <Card
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border-border/70 bg-card pb-0",
              "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              "transition-all duration-200 hover:border-border hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_-16px_rgba(15,23,42,0.18)]"
            )}
            key={item.label}
          >
            <CardContent className="flex flex-1 flex-col gap-5 px-5 pt-5 pb-4">
              {/* Header: title + bordered circular icon */}
              <div className="flex items-start justify-between">
                <span className="font-semibold text-[14px] text-foreground tracking-tight">
                  {item.label}
                </span>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                  <HugeiconsIcon
                    className={cn("size-[18px]", tone.icon)}
                    icon={item.icon}
                    strokeWidth={2}
                  />
                </div>
              </div>

              {/* Value + inline delta pill */}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[28px] text-foreground tabular-nums leading-none tracking-[-0.025em]">
                    {item.value}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[11px] tabular-nums",
                      deltaIntentClass[intent]
                    )}
                  >
                    {item.meta}
                  </span>
                </div>
                <p className="truncate text-[12px] text-muted-foreground">
                  {item.note}
                </p>
              </div>

              {/* "Voir détails →" outlined button (shadcnspace signature) */}
              <div className="mt-auto">
                {isInteractive ? (
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5",
                      "font-medium text-[12px] text-foreground",
                      "transition-colors hover:bg-muted/60 hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    onClick={item.onReport}
                    type="button"
                  >
                    Voir le détail
                    <HugeiconsIcon
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                    />
                  </button>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5",
                      "font-medium text-[12px] text-muted-foreground"
                    )}
                  >
                    Voir le détail
                    <HugeiconsIcon
                      className="size-3.5"
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                    />
                  </span>
                )}
              </div>
            </CardContent>

            {/* Sparkline footer strip — full-bleed bottom edge */}
            <div className="border-border/60 border-t">
              <SparkFooter
                color={tone.spark}
                data={item.sparklineData}
                uid={`${item.tone}-${idx}`}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
