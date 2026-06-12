"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardMetrics } from "@/lib/metrics";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AsterConsultationsChartWidget({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const [period, setPeriod] = useState<7 | 14 | 30 | 60 | 84>(30);

  const chartData = useMemo(() => {
    return metrics.activityDays.slice(-period).map((d) => ({
      name: new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      value: d.value,
    }));
  }, [metrics.activityDays, period]);
  
  const totalPeriod = chartData.reduce((sum, item) => sum + item.value, 0);
  const previousData = metrics.activityDays.slice(-period * 2, -period);
  const totalPrevious = previousData.reduce((sum, d) => sum + d.value, 0);

  const trend = totalPrevious > 0 
    ? ((totalPeriod - totalPrevious) / totalPrevious) * 100 
    : (totalPeriod > 0 ? 100 : 0);
  
  const isUp = trend >= 0;

  return (
    <div className={cn("dashboard-luxe-card bg-card relative overflow-hidden p-6 lg:p-8 shadow-sm flex flex-col group border border-zinc-200 dark:border-white/[0.05] rounded-[16px]", className)}>
      
      {/* Background radial glow (Mesh gradient) */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl dark:bg-orange-500/10 animate-pulse duration-4000" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl dark:bg-amber-500/10 animate-pulse duration-4000" />
      </div>

      <div className="relative z-10 flex flex-col mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Volume de Consultations
            </span>
          </div>
          
          <div className={cn("flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-950/5 dark:border-white/5 shadow-sm", isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {new Intl.NumberFormat("fr-FR").format(totalPeriod)}
          </span>
          
          {/* Subtle Inline Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b border-dashed border-muted-foreground/40 hover:border-foreground/40 pb-[1px] outline-none group/trigger">
                sur {period === 84 ? "12 semaines" : `${period} jours`}
                <ChevronDown className="size-3 opacity-50 group-hover/trigger:opacity-100 transition-opacity" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setPeriod(7)} className={cn("text-xs cursor-pointer", period === 7 && "font-bold text-orange-500 dark:text-orange-400 bg-orange-500/10")}>7 jours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod(14)} className={cn("text-xs cursor-pointer", period === 14 && "font-bold text-orange-500 dark:text-orange-400 bg-orange-500/10")}>14 jours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod(30)} className={cn("text-xs cursor-pointer", period === 30 && "font-bold text-orange-500 dark:text-orange-400 bg-orange-500/10")}>30 jours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod(60)} className={cn("text-xs cursor-pointer", period === 60 && "font-bold text-orange-500 dark:text-orange-400 bg-orange-500/10")}>60 jours</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPeriod(84)} className={cn("text-xs cursor-pointer", period === 84 && "font-bold text-orange-500 dark:text-orange-400 bg-orange-500/10")}>12 semaines</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Recharts AreaChart Viewport with AnimatePresence for smooth transitions */}
      <div className="relative z-10 mt-auto h-[180px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`chart-${period}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="consultationsFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="rgba(128,128,128,0.08)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(value) => period > 30 ? "" : String(value).split(" ")[0]} // Hide labels if period is too long to prevent clutter
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                        <p className="text-[10px] text-muted-foreground font-bold">{payload[0].payload.name}</p>
                        <div className="mt-2 flex items-center gap-6 justify-between text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="text-zinc-500 dark:text-zinc-400">Consultations</span>
                          </div>
                          <span className="text-zinc-900 dark:text-white font-bold tabular-nums">
                            {payload[0].payload.value}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#consultationsFlowGrad)"
                  activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--background)", stroke: "#f97316" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
