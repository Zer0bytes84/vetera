"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function AsterScoreChart({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const [period, setPeriod] = useState<"7j" | "30j" | "90j">("30j");

  const { chartData, totalRevenue, trend } = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 84;

    // Recent slice
    const recent = [...metrics.activityDays].reverse().slice(0, days).reverse();
    // Previous slice for trend
    const previous = [...metrics.activityDays]
      .reverse()
      .slice(days, days * 2)
      .reverse();

    const avgBasket = metrics.summary.averageBasket || 2500; // fallback avg basket

    const data = recent.map((day, i) => ({
      name: day.date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      value: day.value * avgBasket,
      index: i + 1,
    }));

    const sumRecent = data.reduce((sum, d) => sum + d.value, 0);
    const sumPrevious = previous.reduce(
      (sum, d) => sum + d.value * avgBasket,
      0
    );

    let calcTrend = 0;
    if (sumPrevious > 0) {
      calcTrend = ((sumRecent - sumPrevious) / sumPrevious) * 100;
    } else if (sumRecent > 0) {
      calcTrend = 100;
    }

    return { chartData: data, totalRevenue: sumRecent, trend: calcTrend };
  }, [metrics.activityDays, metrics.summary.averageBasket, period]);

  const isUp = trend >= 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 font-medium text-[12px] text-muted-foreground uppercase tracking-wider">
            Revenus
          </div>
          <div className="mb-2 font-semibold text-3xl text-foreground tracking-tight">
            {new Intl.NumberFormat("fr-FR").format(totalRevenue)} DA
          </div>
          <div className="flex items-center gap-2 font-medium text-[11px]">
            <span className={isUp ? "text-emerald-500" : "text-rose-500"}>
              {isUp ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              les derniers{" "}
              {period === "7j" ? "7" : period === "30j" ? "30" : "90"} jours
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center rounded-md bg-zinc-100 p-1 dark:bg-zinc-800/80">
          {(["7j", "30j", "90j"] as const).map((p) => (
            <button
              className={cn(
                "rounded px-3 py-1 font-medium text-[11px] transition-colors",
                period === p
                  ? "bg-white text-foreground shadow-sm dark:bg-zinc-700"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={p}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-auto h-[180px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground text-xs shadow-xl dark:bg-zinc-800">
                      {new Intl.NumberFormat("fr-FR").format(
                        payload[0].value as number
                      )}{" "}
                      DA
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "#a1a1aa", opacity: 0.15 }}
            />
            <Bar
              barSize={period === "7j" ? 32 : period === "30j" ? 10 : 5}
              dataKey="value"
              minPointSize={6}
              radius={[4, 4, 4, 4]}
            >
              {chartData.map((entry, index) => (
                <Cell fill="#0ea5e9" key={`cell-${index}`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Custom X Axis labels */}
        <div className="mt-3 flex justify-between px-2 font-medium text-[10px] text-muted-foreground">
          {period === "30j" &&
            [1, 6, 11, 16, 21, 26, 30].map((n, i) => <span key={i}>{n}</span>)}
          {period === "7j" &&
            chartData.map((d, i) => (
              <span className="capitalize" key={i}>
                {d.name.substring(0, 3)}
              </span>
            ))}
          {period === "90j" &&
            ["Jan", "Fév", "Mar"].map((n, i) => <span key={i}>{n}</span>)}
        </div>
      </div>
    </div>
  );
}
