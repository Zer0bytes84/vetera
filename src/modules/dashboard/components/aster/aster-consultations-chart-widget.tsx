"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function AsterConsultationsChartWidget({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const [period, setPeriod] = useState<7 | 14 | 30 | 60 | 84>(30);

  const chartData = useMemo(
    () =>
      metrics.activityDays.slice(-period).map((d) => ({
        name: new Date(d.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        }),
        value: d.value,
      })),
    [metrics.activityDays, period]
  );

  const totalPeriod = chartData.reduce((sum, item) => sum + item.value, 0);
  const previousData = metrics.activityDays.slice(-period * 2, -period);
  const totalPrevious = previousData.reduce((sum, d) => sum + d.value, 0);

  const trend =
    totalPrevious > 0
      ? ((totalPeriod - totalPrevious) / totalPrevious) * 100
      : totalPeriod > 0
        ? 100
        : 0;

  const isUp = trend >= 0;

  return (
    <div
      className={cn(
        "dashboard-luxe-card group relative flex flex-col overflow-hidden rounded-[16px] border border-zinc-200 bg-card p-6 shadow-sm lg:p-8 dark:border-white/[0.05]",
        className
      )}
    >
      {/* Background radial glow (Mesh gradient) */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100">
        <div className="absolute -top-24 -right-24 h-96 w-96 animate-pulse rounded-full bg-orange-500/20 blur-3xl duration-4000 dark:bg-orange-500/10" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-amber-500/20 blur-3xl duration-4000 dark:bg-amber-500/10" />
      </div>

      <div className="relative z-10 mb-8 flex flex-col">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
              Volume de Consultations
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1 rounded-full border border-zinc-950/5 bg-white/50 px-2 py-0.5 font-bold text-[11px] shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-zinc-900/50",
              isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {isUp ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="font-extrabold text-3xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
            {new Intl.NumberFormat("fr-FR").format(totalPeriod)}
          </span>

          {/* Subtle Inline Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group/trigger flex items-center gap-1 border-muted-foreground/40 border-b border-dashed pb-[1px] font-semibold text-muted-foreground text-xs outline-none transition-colors hover:border-foreground/40 hover:text-foreground">
                sur {period === 84 ? "12 semaines" : `${period} jours`}
                <ChevronDown className="size-3 opacity-50 transition-opacity group-hover/trigger:opacity-100" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer text-xs",
                  period === 7 &&
                    "bg-orange-500/10 font-bold text-orange-500 dark:text-orange-400"
                )}
                onClick={() => setPeriod(7)}
              >
                7 jours
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer text-xs",
                  period === 14 &&
                    "bg-orange-500/10 font-bold text-orange-500 dark:text-orange-400"
                )}
                onClick={() => setPeriod(14)}
              >
                14 jours
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer text-xs",
                  period === 30 &&
                    "bg-orange-500/10 font-bold text-orange-500 dark:text-orange-400"
                )}
                onClick={() => setPeriod(30)}
              >
                30 jours
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer text-xs",
                  period === 60 &&
                    "bg-orange-500/10 font-bold text-orange-500 dark:text-orange-400"
                )}
                onClick={() => setPeriod(60)}
              >
                60 jours
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer text-xs",
                  period === 84 &&
                    "bg-orange-500/10 font-bold text-orange-500 dark:text-orange-400"
                )}
                onClick={() => setPeriod(84)}
              >
                12 semaines
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Recharts AreaChart Viewport with AnimatePresence for smooth transitions */}
      <div className="relative z-10 mt-auto h-[180px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="h-full w-full"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            key={`chart-${period}`}
            transition={{ duration: 0.3 }}
          >
            <ResponsiveContainer
              height="100%"
              minHeight={0}
              minWidth={0}
              width="100%"
            >
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="consultationsFlowGrad"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(128,128,128,0.08)"
                  strokeDasharray="3 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                  tickFormatter={(value) =>
                    period > 30 ? "" : String(value).split(" ")[0]
                  } // Hide labels if period is too long to prevent clutter
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tick={{
                    fill: "var(--muted-foreground)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!(active && payload?.length)) {
                      return null;
                    }
                    return (
                      <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                        <p className="font-bold text-[10px] text-muted-foreground">
                          {payload[0].payload.name}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-6 font-semibold text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="text-zinc-500 dark:text-zinc-400">
                              Consultations
                            </span>
                          </div>
                          <span className="font-bold text-zinc-900 tabular-nums dark:text-white">
                            {payload[0].payload.value}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  activeDot={{
                    r: 4,
                    strokeWidth: 1.5,
                    fill: "var(--background)",
                    stroke: "#f97316",
                  }}
                  dataKey="value"
                  fill="url(#consultationsFlowGrad)"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
