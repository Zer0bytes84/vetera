"use client";

import { useMemo, useState } from "react";
import { Activity, TrendingDown, TrendingUp, HelpCircle } from "lucide-react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Format date nicely
const formatDateLong = (date: Date) => {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function AsterConsultationsChartWidget({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const [hoveredDay, setHoveredDay] = useState<{
    date: Date;
    value: number;
    revenue: number;
  } | null>(null);

  // We show a 21-week (147-day) activity heatmap of daily consultations and revenue
  const heatmapData = useMemo(() => {
    const totalDays = 147;
    return metrics.activityDays.slice(-totalDays);
  }, [metrics.activityDays]);

  // Group into weeks (arrays of 7 days)
  const weeks = useMemo(() => {
    const w: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];
    
    heatmapData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        w.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      w.push(currentWeek);
    }
    return w;
  }, [heatmapData]);

  // Calculations for stats
  const stats = useMemo(() => {
    const totalRDV = heatmapData.reduce((sum, d) => sum + d.value, 0);
    const totalRev = heatmapData.reduce((sum, d) => sum + d.revenue, 0);
    const activeDays = heatmapData.filter((d) => d.value > 0 || d.revenue > 0).length;
    const peakAppointments = Math.max(...heatmapData.map((d) => d.value), 0);
    const peakRevenue = Math.max(...heatmapData.map((d) => d.revenue), 0);

    return { totalRDV, totalRev, activeDays, peakAppointments, peakRevenue };
  }, [heatmapData]);

  // Calculate trend comparing this period vs previous period
  const trend = useMemo(() => {
    const totalDays = 147;
    const currentPeriod = metrics.activityDays.slice(-totalDays);
    const previousPeriod = metrics.activityDays.slice(-totalDays * 2, -totalDays);
    
    const currentRDV = currentPeriod.reduce((sum, d) => sum + d.value, 0);
    const previousRDV = previousPeriod.reduce((sum, d) => sum + d.value, 0);

    if (previousRDV <= 0) {
      return currentRDV > 0 ? 100 : 0;
    }
    return ((currentRDV - previousRDV) / previousRDV) * 100;
  }, [metrics.activityDays]);

  const maxActivity = useMemo(() => {
    return Math.max(...heatmapData.map((d) => d.value), 1);
  }, [heatmapData]);

  // Color mapping based on daily consultation volume (GitHub contribution style)
  const getCellColorClass = (value: number) => {
    if (value === 0) {
      return "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700";
    }
    const ratio = value / maxActivity;
    if (ratio <= 0.25) {
      return "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:scale-110";
    }
    if (ratio <= 0.5) {
      return "bg-orange-300 dark:bg-orange-850 text-orange-800 dark:text-orange-350 hover:scale-110";
    }
    if (ratio <= 0.75) {
      return "bg-orange-500 dark:bg-orange-600 text-white hover:scale-110";
    }
    return "bg-orange-600 dark:bg-orange-500 text-white hover:scale-110";
  };

  // Month labels position
  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, wIdx) => {
      const firstDay = week[0]?.date ? new Date(week[0].date) : null;
      if (firstDay && firstDay.getMonth() !== lastMonth) {
        lastMonth = firstDay.getMonth();
        labels.push({
          label: firstDay.toLocaleDateString("fr-FR", { month: "short" }),
          index: wIdx,
        });
      }
    });

    return labels;
  }, [weeks]);

  const isUp = trend >= 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 pt-3 px-1.5 pb-1.5 shadow-xs relative",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-3 flex items-center justify-between px-1 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Activity className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 tracking-tight">
            Activité
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full border border-zinc-955/5 bg-white/50 px-2 py-0.5 font-bold text-[10px] shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-zinc-900/50 select-none",
              isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>

          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Intensité 5M
          </span>
        </div>
      </div>

      {/* Inner White Box */}
      <div className="flex-1 rounded-[12px] border border-zinc-200/60 dark:border-zinc-800 bg-white p-5 shadow-xs dark:bg-zinc-950/80 flex flex-col justify-between z-10 relative">
        
        {/* Heatmap & Stats row */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6">
          
          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col justify-center min-w-[280px]">
            {/* Months Header Row */}
            <div className="relative h-5 w-full select-none text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
              {monthLabels.map((lbl, idx) => (
                <span
                  key={idx}
                  className="absolute"
                  style={{ left: `${(lbl.index / weeks.length) * 100}%` }}
                >
                  {lbl.label}
                </span>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex items-start gap-2">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between h-[105px] text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase select-none pt-0.5 pb-1">
                <span>Lun</span>
                <span>Mer</span>
                <span>Ven</span>
                <span>Dim</span>
              </div>

              {/* Grid Column wrapper */}
              <div className="flex-1 flex justify-between h-[105px]">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px] h-full justify-between">
                    {week.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className={cn(
                          "h-3 w-3 rounded-[2px] transition-all duration-200 cursor-pointer shadow-3xs shrink-0",
                          getCellColorClass(day.value)
                        )}
                        onMouseEnter={() => setHoveredDay({
                          date: new Date(day.date),
                          value: day.value,
                          revenue: day.revenue,
                        })}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-4 flex items-center justify-end gap-1.5 text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 select-none">
              <span>Moins</span>
              <div className="h-2.5 w-2.5 rounded-[1px] bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-2.5 w-2.5 rounded-[1px] bg-orange-100 dark:bg-orange-950/40" />
              <div className="h-2.5 w-2.5 rounded-[1px] bg-orange-300 dark:bg-orange-850" />
              <div className="h-2.5 w-2.5 rounded-[1px] bg-orange-500 dark:bg-orange-600" />
              <div className="h-2.5 w-2.5 rounded-[1px] bg-orange-600 dark:bg-orange-500" />
              <span>Plus</span>
            </div>
          </div>

          {/* Stats Breakdown Side panel */}
          <div className="w-full lg:w-48 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-800/80 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Total Consultations
              </span>
              <span className="text-xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight tabular-nums">
                {stats.totalRDV} RDV
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Volume Financier
              </span>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
                {new Intl.NumberFormat("fr-FR").format(stats.totalRev)} DA
              </span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-orange-500/5 px-2 py-1.5 border border-orange-500/10 dark:bg-orange-500/10">
              <Activity className="h-3.5 w-3.5 text-orange-500 dark:text-orange-450" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider leading-none">
                  Productivité
                </span>
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 leading-none mt-0.5">
                  {stats.activeDays} jours actifs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tooltip overlay on top of the card footer */}
        <div className="mt-3 min-h-[32px] border-t border-zinc-150/60 dark:border-zinc-800/80 pt-2 flex items-center justify-between">
          {hoveredDay ? (
            <div className="flex items-center justify-between w-full select-none text-[10px]">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                {formatDateLong(hoveredDay.date)}
              </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <span>{hoveredDay.value} RDV</span>
                <span className="text-zinc-400 dark:text-zinc-500 font-medium">({new Intl.NumberFormat("fr-FR").format(hoveredDay.revenue)} DA)</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 dark:text-zinc-500 font-medium select-none">
              <HelpCircle className="h-3.5 w-3.5" />
              Survolez un carré pour afficher le volume et les revenus journaliers.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
