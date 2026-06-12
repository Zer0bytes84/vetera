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
    },
    {
      title: "RDV aujourd'hui",
      value: metrics.summary.todayAppointments.toString(),
      trend: apptsTrend,
      period: "AUJ.",
      icon: Calendar,
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      title: "Patients actifs",
      value: formatValue(metrics.summary.currentActivePatients, "number"),
      trend: returningTrend,
      period: "90 J",
      icon: Users,
      iconColor: "text-orange-500 dark:text-orange-400",
    },
    {
      title: "Tâches dues",
      value: metrics.summary.dueTasks.toString(),
      trend: 0, // Not easily calculable without previous
      period: "7 J",
      icon: ClipboardList,
      iconColor: "text-purple-500 dark:text-purple-400",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border bg-card p-6 shadow-sm lg:p-8 dark:border-border",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isUp = stat.trend >= 0;
          return (
            <div className="stat-col relative flex flex-col" key={idx}>
              {/* Divider for desktop (between columns) */}
              {idx !== stats.length - 1 && (
                <div className="absolute top-0 -right-3 bottom-0 hidden w-px bg-zinc-200 lg:block dark:bg-[#333333]" />
              )}

              <div className="mb-3 flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                <Icon
                  className={cn("h-4 w-4 drop-shadow-sm", stat.iconColor)}
                />
                {stat.title}
              </div>

              <div className="mb-2 font-semibold text-3xl text-foreground tracking-tight">
                {stat.value}
              </div>

              <div className="mt-auto flex items-center justify-between text-xs">
                <div
                  className={cn(
                    "flex items-center gap-1 font-semibold",
                    isUp ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {Math.abs(stat.trend).toFixed(2)}%
                  {isUp ? (
                    <TrendingUp className="h-3.5 w-3.5 stroke-[3]" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 stroke-[3]" />
                  )}
                </div>
                <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                  {stat.period}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
