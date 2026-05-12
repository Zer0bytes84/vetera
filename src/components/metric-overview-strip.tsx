import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

export type MetricOverviewTone =
  | "blue"
  | "orange"
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "violet";

export type MetricOverviewItem = {
  label: string;
  value: string;
  meta: string;
  note: string;
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  tone: MetricOverviewTone;
  sparklineData: number[];
};

const metricToneMap: Record<
  MetricOverviewTone,
  { text: string; spark: string }
> = {
  blue: {
    text: "text-blue-600",
    spark: "#3b82f6",
  },
  orange: {
    text: "text-orange-600",
    spark: "#f97316",
  },
  emerald: {
    text: "text-emerald-600",
    spark: "#10b981",
  },
  slate: {
    text: "text-slate-600",
    spark: "#64748b",
  },
  amber: {
    text: "text-amber-600",
    spark: "#f59e0b",
  },
  rose: {
    text: "text-rose-600",
    spark: "#f43f5e",
  },
  violet: {
    text: "text-violet-600",
    spark: "#8b5cf6",
  },
};

export function MetricOverviewStrip({
  items,
}: {
  items: MetricOverviewItem[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const tone = metricToneMap[item.tone];

        return (
          <Card
            className={cn(
              "card-vibrant overflow-hidden rounded-[24px] border border-border bg-card shadow-none",
              `metric-glow-${item.tone}`
            )}
            key={item.label}
          >
            <CardContent className="flex min-h-[154px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="font-medium text-[24px] text-foreground tracking-[-0.04em]">
                    {item.value}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-foreground/70">
                      {item.meta}
                    </span>
                    <span className="font-mono text-muted-foreground uppercase tracking-[0.04em]">
                      {item.note}
                    </span>
                  </div>
                </div>
                <div className="prospeo-glyph h-10 w-10 shrink-0">
                  <HugeiconsIcon
                    className={cn("size-[18px]", tone.text)}
                    icon={item.icon}
                    strokeWidth={2}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="max-w-[20ch] text-[12px] text-muted-foreground leading-[1.45]">
                  {item.note}
                </p>
                <Sparkline
                  color={tone.spark}
                  data={item.sparklineData}
                  fillOpacity={0.08}
                  height={28}
                  strokeWidth={2}
                  width={74}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
