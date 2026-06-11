"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
} from "recharts";

export function AsterScoreChart({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const chartData = useMemo(() => {
    // Take the last 7 days from activityDays (which has 84 days)
    const recent = [...metrics.activityDays].reverse().slice(0, 7).reverse();
    return recent.map(day => ({
      name: day.date.toLocaleDateString("fr-FR", { weekday: "short" }),
      value: day.value
    }));
  }, [metrics.activityDays]);

  const totalThisWeek = chartData.reduce((sum, d) => sum + d.value, 0);
  const trend = 12.5; // Placeholder
  const isUp = trend >= 0;

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Activité (7 jours)</div>
          <div className="text-3xl font-semibold tracking-tight text-foreground">
            {totalThisWeek}
          </div>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-semibold", isUp ? "text-blue-500" : "text-rose-500")}>
          {Math.abs(trend)}%
          {isUp ? <TrendingUp className="w-4 h-4 stroke-[3]" /> : <TrendingDown className="w-4 h-4 stroke-[3]" />}
        </div>
      </div>
      
      <div className="w-full h-[120px] mt-auto relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 shadow-sm rounded-md px-3 py-2 text-xs font-medium">
                      {payload[0].value} actes
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
              fill="url(#scoreGrad)"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-[11px] text-muted-foreground mt-2 px-1 font-medium">
          {chartData.map((d, i) => (
            <span key={i} className="capitalize">{d.name.substring(0, 3)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
