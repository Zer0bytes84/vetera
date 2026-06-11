"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, DollarSign, Users, Calendar, ClipboardList } from "lucide-react";
import { DashboardMetrics } from "@/lib/metrics";

interface AsterTopStatsProps {
  metrics: DashboardMetrics;
  className?: string;
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
    if (previous <= 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Derive trends using actual metrics
  const revenueTrend = getDeltaPercent(metrics.summary.income30, metrics.summary.previousIncome30);
  const apptsTrend = getDeltaPercent(metrics.summary.todayAppointments, metrics.summary.yesterdayAppointments);
  const returningTrend = getDeltaPercent(metrics.summary.currentReturningPatients, metrics.summary.previousReturningPatients);

  const stats = [
    {
      title: "Revenus 30j",
      value: formatValue(metrics.summary.income30, "currency"),
      trend: revenueTrend,
      period: "30 J",
      icon: DollarSign,
    },
    {
      title: "RDV aujourd'hui",
      value: metrics.summary.todayAppointments.toString(),
      trend: apptsTrend,
      period: "AUJ.",
      icon: Calendar,
    },
    {
      title: "Patients actifs",
      value: formatValue(metrics.summary.currentActivePatients, "number"),
      trend: returningTrend,
      period: "90 J",
      icon: Users,
    },
    {
      title: "Tâches dues",
      value: metrics.summary.dueTasks.toString(),
      trend: 0, // Not easily calculable without previous
      period: "7 J",
      icon: ClipboardList,
    },
  ];

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 lg:p-8 shadow-sm", className)}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isUp = stat.trend >= 0;
          return (
            <div key={idx} className="relative flex flex-col stat-col">
              {/* Divider for desktop (between columns) */}
              {idx !== stats.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-0 bottom-0 w-px bg-zinc-200 dark:bg-[#333333]" />
              )}
              
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Icon className="w-4 h-4 opacity-70" />
                {stat.title}
              </div>
              
              <div className="text-3xl font-semibold mb-2 tracking-tight text-foreground">
                {stat.value}
              </div>
              
              <div className="flex justify-between items-center text-xs mt-auto">
                <div className={cn("flex items-center gap-1 font-semibold", isUp ? "text-emerald-500" : "text-rose-500")}>
                  {Math.abs(stat.trend).toFixed(2)}% 
                  {isUp ? (
                    <TrendingUp className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                </div>
                <div className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
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
