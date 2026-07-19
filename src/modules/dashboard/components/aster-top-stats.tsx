"use client";

import {
  Calendar,
  ClipboardList,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

interface AsterTopStatsProps {
  className?: string;
  metrics: DashboardMetrics;
}

export function AsterTopStats({ metrics, className }: AsterTopStatsProps) {
  // Formatters
  const formatValue = (val: number, type: "currency" | "number") => {
    if (type === "currency") {
      return new Intl.NumberFormat("fr-FR").format(val) + " DA";
    }
    return val.toString();
  };

  const getDeltaPercent = (current: number, previous: number) => {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  // Derive trends using actual metrics
  const revenueTrend = getDeltaPercent(
    metrics.summary.income30,
    metrics.summary.previousIncome30
  );
  const apptsTrend = getDeltaPercent(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  const returningTrend = getDeltaPercent(
    metrics.summary.currentReturningPatients,
    metrics.summary.previousReturningPatients
  );

  const stats = [
    {
      title: "Revenus 30j",
      value: formatValue(metrics.summary.income30, "currency"),
      trend: revenueTrend,
      period: "30 J",
      icon: DollarSign,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      glowColor: "group-hover:bg-emerald-500/5",
    },
    {
      title: "RDV aujourd'hui",
      value: metrics.summary.todayAppointments.toString(),
      trend: apptsTrend,
      period: "AUJ.",
      icon: Calendar,
      iconColor: "text-blue-500 dark:text-blue-400",
      glowColor: "group-hover:bg-blue-500/5",
    },
    {
      title: "Patients actifs",
      value: formatValue(metrics.summary.currentActivePatients, "number"),
      trend: returningTrend,
      period: "90 J",
      icon: Users,
      iconColor: "text-orange-500 dark:text-orange-400",
      glowColor: "group-hover:bg-orange-500/5",
    },
    {
      title: "Tâches dues",
      value: metrics.summary.dueTasks.toString(),
      trend: 0,
      period: "7 J",
      icon: ClipboardList,
      iconColor: "text-purple-500 dark:text-purple-400",
      glowColor: "group-hover:bg-purple-500/5",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isUp = stat.trend >= 0;
        return (
          <div
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-xs transition-all duration-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/30"
            key={idx}
          >
            {/* Protocol-style layered hover background */}
            <div className="pointer-events-none absolute inset-0 z-0">
              {/* Inset ring layer */}
              <div className="absolute inset-0 rounded-[20px] ring-1 ring-zinc-900/5 transition-all duration-300 group-hover:ring-zinc-900/10 dark:ring-white/5 dark:group-hover:ring-white/10" />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(215,237,234,0.15),rgba(244,251,223,0.15))] opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),rgba(16,185,129,0.04))]" />

              {/* Grid pattern layer */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full skew-y-[-18deg] stroke-zinc-900/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-50 dark:stroke-white/[0.02]"
                style={{
                  maskImage:
                    "radial-gradient(80% 80% at 50% 50%, white, transparent)",
                  WebkitMaskImage:
                    "radial-gradient(80% 80% at 50% 50%, white, transparent)",
                }}
              >
                <defs>
                  <pattern
                    height={16}
                    id={`grid-stat-${idx}`}
                    patternUnits="userSpaceOnUse"
                    width={16}
                    x="-1"
                    y="-1"
                  >
                    <path d="M.5 16V.5H16" fill="none" strokeDasharray="2 2" />
                  </pattern>
                </defs>
                <rect
                  fill={`url(#grid-stat-${idx})`}
                  height="100%"
                  strokeWidth={0}
                  width="100%"
                />
              </svg>
            </div>

            {/* Content (z-10 to stay above patterns) */}
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                  <Icon
                    className={cn(
                      "h-4 w-4 drop-shadow-sm transition-transform duration-300 group-hover:scale-110",
                      stat.iconColor
                    )}
                  />
                  {stat.title}
                </div>
              </div>

              <div className="mb-2 select-all font-semibold text-3xl text-foreground tracking-tight">
                {stat.value}
              </div>

              <div className="mt-auto flex select-none items-center justify-between pt-1 text-xs">
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[10px]",
                    isUp
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400"
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 stroke-[3]" />
                  )}
                  {Math.abs(stat.trend).toFixed(1)}%
                </div>
                <div className="rounded bg-zinc-200/50 px-1.5 py-0.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider dark:bg-zinc-800/60">
                  {stat.period}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
