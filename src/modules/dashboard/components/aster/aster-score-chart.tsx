"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  Cell
} from "recharts";

export function AsterScoreChart({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const [period, setPeriod] = useState<"7j" | "30j" | "90j">("30j");

  const { chartData, totalRevenue, trend } = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 84;
    
    // Recent slice
    const recent = [...metrics.activityDays].reverse().slice(0, days).reverse();
    // Previous slice for trend
    const previous = [...metrics.activityDays].reverse().slice(days, days * 2).reverse();

    const avgBasket = metrics.summary.averageBasket || 2500; // fallback avg basket

    const data = recent.map((day, i) => ({
      name: day.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      value: day.value * avgBasket,
      index: i + 1
    }));

    const sumRecent = data.reduce((sum, d) => sum + d.value, 0);
    const sumPrevious = previous.reduce((sum, d) => sum + (d.value * avgBasket), 0);
    
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
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 flex flex-col shadow-sm", className)}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Revenus</div>
          <div className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            {new Intl.NumberFormat("fr-FR").format(totalRevenue)} DA
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className={isUp ? "text-emerald-500" : "text-rose-500"}>
              {isUp ? "+" : ""}{trend.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              les derniers {period === "7j" ? "7" : period === "30j" ? "30" : "90"} jours
            </span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-md p-1">
          {(["7j", "30j", "90j"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 text-[11px] font-medium rounded transition-colors",
                period === p 
                  ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      
      <div className="w-full h-[180px] mt-auto relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              cursor={{ fill: '#a1a1aa', opacity: 0.15 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white dark:bg-zinc-800 border border-border shadow-xl rounded-lg px-3 py-2 text-xs font-medium text-foreground">
                      {new Intl.NumberFormat("fr-FR").format(payload[0].value as number)} DA
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 4, 4]} 
              barSize={period === "7j" ? 32 : period === "30j" ? 10 : 5}
              minPointSize={6}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#0ea5e9" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Custom X Axis labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground mt-3 px-2 font-medium">
          {period === "30j" && [1, 6, 11, 16, 21, 26, 30].map((n, i) => (
            <span key={i}>{n}</span>
          ))}
          {period === "7j" && chartData.map((d, i) => (
            <span key={i} className="capitalize">{d.name.substring(0, 3)}</span>
          ))}
          {period === "90j" && ["Jan", "Fév", "Mar"].map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
