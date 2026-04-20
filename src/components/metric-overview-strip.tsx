import React from "react"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent } from "@/components/ui/card"
import { Sparkline } from "@/components/ui/sparkline"
import { cn } from "@/lib/utils"

export type MetricOverviewTone =
  | "blue"
  | "orange"
  | "emerald"
  | "slate"
  | "amber"
  | "rose"
  | "violet"

export type MetricOverviewItem = {
  label: string
  value: string
  meta: string
  note: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  tone: MetricOverviewTone
  sparklineData: number[]
}

const metricToneMap: Record<
  MetricOverviewTone,
  { bg: string; text: string; spark: string }
> = {
  blue: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    spark: "#f97316",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    spark: "#f97316",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    spark: "#10b981",
  },
  slate: {
    bg: "bg-slate-500/10",
    text: "text-slate-600",
    spark: "#64748b",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    spark: "#f59e0b",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    spark: "#f43f5e",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600",
    spark: "#8b5cf6",
  },
}

export function MetricOverviewStrip({ items }: { items: MetricOverviewItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const tone = metricToneMap[item.tone]

        return (
          <Card
            key={item.label}
            className="overflow-hidden rounded-[24px] border border-border bg-card shadow-none"
          >
            <CardContent className="flex min-h-[154px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="text-[24px] font-medium tracking-[-0.04em] text-foreground">
                    {item.value}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-foreground/70">{item.meta}</span>
                    <span className="font-mono uppercase tracking-[0.04em] text-muted-foreground">
                      {item.note}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-xl border border-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                    tone.bg
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    strokeWidth={2}
                    className={cn("size-[18px]", tone.text)}
                  />
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="max-w-[20ch] text-[12px] leading-[1.45] text-muted-foreground">
                  {item.note}
                </p>
                <Sparkline
                  data={item.sparklineData}
                  width={74}
                  height={28}
                  color={tone.spark}
                  strokeWidth={2}
                  fillOpacity={0.08}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
