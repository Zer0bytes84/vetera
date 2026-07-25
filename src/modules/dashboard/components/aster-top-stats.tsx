"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import { formatDZD } from "@/utils/currency";

interface AsterTopStatsProps {
  className?: string;
  metrics: DashboardMetrics;
  onNavigate?: (view: View) => void;
}

function getDeltaPercent(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export function AsterTopStats({
  metrics,
  className,
  onNavigate,
}: AsterTopStatsProps) {
  const reduceMotion = useReducedMotion();
  const stats = [
    {
      title: "Revenus",
      value: formatDZD(metrics.summary.income30),
      trend: getDeltaPercent(
        metrics.summary.income30,
        metrics.summary.previousIncome30
      ),
      comparison: "vs 30 jours précédents",
      detail: `Panier moyen ${formatDZD(metrics.summary.averageBasket)}`,
      period: "30 jours",
      icon: CircleDollarSign,
      accent:
        "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10",
      view: "finances" as View,
    },
    {
      title: "Rendez-vous",
      value: metrics.summary.todayAppointments.toString(),
      trend: getDeltaPercent(
        metrics.summary.todayAppointments,
        metrics.summary.yesterdayAppointments
      ),
      comparison: "vs hier",
      detail: `${metrics.summary.yesterdayAppointments} hier`,
      period: "Aujourd’hui",
      icon: CalendarDays,
      accent: "text-sky-600 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-400/10",
      view: "agenda" as View,
    },
    {
      title: "Patients actifs",
      value: metrics.summary.currentActivePatients.toString(),
      trend: getDeltaPercent(
        metrics.summary.currentActivePatients,
        metrics.summary.previousActivePatients
      ),
      comparison: "vs période précédente",
      detail: `${metrics.summary.currentReturningPatients} suivis réguliers`,
      period: "90 jours",
      icon: UsersRound,
      accent:
        "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10",
      view: "patients" as View,
    },
    {
      title: "Actions dues",
      value: metrics.summary.dueTasks.toString(),
      comparison: "à traiter",
      detail: `${Math.round(metrics.summary.taskCompletionRate)}% réalisées`,
      period: "7 jours",
      icon: ClipboardCheck,
      accent:
        metrics.summary.dueTasks > 0
          ? "text-rose-600 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-400/10"
          : "text-zinc-600 bg-zinc-500/10 dark:text-zinc-300 dark:bg-zinc-400/10",
      view: "taches" as View,
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2.5 lg:grid-cols-4 min-[400px]:grid-cols-2",
        className
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const hasTrend = stat.trend !== undefined;
        const trendUp = hasTrend && stat.trend >= 0;

        return (
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            aria-label={`Ouvrir ${stat.title}`}
            className="group relative min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 text-left shadow-xs outline-none transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950/70 dark:focus-visible:ring-offset-zinc-950 dark:hover:border-zinc-700"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            key={stat.title}
            onClick={() => onNavigate?.(stat.view)}
            transition={{
              duration: 0.32,
              delay: reduceMotion ? 0 : index * 0.045,
              ease: [0.22, 1, 0.36, 1],
            }}
            type="button"
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.985 }}
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:via-zinc-600/70" />

            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[10px] text-zinc-500 uppercase tracking-[0.1em] dark:text-zinc-400">
                {stat.title}
              </span>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                  stat.accent
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
            </div>

            <p className="mt-2.5 truncate font-heading font-semibold text-2xl text-zinc-950 tabular-nums leading-none tracking-[-0.04em] dark:text-zinc-50">
              {stat.value}
            </p>

            <div className="mt-2.5 flex min-h-4 min-w-0 items-center gap-1.5">
              {hasTrend ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 font-semibold text-[11px] tabular-nums",
                    trendUp
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {trendUp ? (
                    <TrendingUp className="size-3" strokeWidth={2.4} />
                  ) : (
                    <TrendingDown className="size-3" strokeWidth={2.4} />
                  )}
                  {Math.abs(stat.trend).toFixed(1)}%
                </span>
              ) : (
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    metrics.summary.dueTasks > 0
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  )}
                />
              )}
              <span className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                {stat.comparison}
              </span>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-zinc-100 border-t pt-2.5 text-[10px] dark:border-zinc-800">
              <span className="truncate font-medium text-zinc-500 dark:text-zinc-400">
                {stat.detail}
              </span>
              <span className="shrink-0 text-zinc-400 dark:text-zinc-500">
                {stat.period}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
