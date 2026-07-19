"use client";

import { Activity, HelpCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

// Format date nicely
const formatDateLong = (date: Date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
    const w: (typeof heatmapData)[] = [];
    let currentWeek: typeof heatmapData = [];

    for (const day of heatmapData) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        w.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      w.push(currentWeek);
    }
    return w;
  }, [heatmapData]);

  // Calculations for stats
  const stats = useMemo(() => {
    const totalRDV = heatmapData.reduce((sum, d) => sum + d.value, 0);
    const totalRev = heatmapData.reduce((sum, d) => sum + d.revenue, 0);
    const peakAppointments = Math.max(...heatmapData.map((d) => d.value), 0);
    const peakRevenue = Math.max(...heatmapData.map((d) => d.revenue), 0);

    return { totalRDV, totalRev, peakAppointments, peakRevenue };
  }, [heatmapData]);

  // Calculate trend comparing this period vs previous period
  const trend = useMemo(() => {
    const totalDays = 147;
    const currentPeriod = metrics.activityDays.slice(-totalDays);
    const previousPeriod = metrics.activityDays.slice(
      -totalDays * 2,
      -totalDays
    );

    const currentRDV = currentPeriod.reduce((sum, d) => sum + d.value, 0);
    const previousRDV = previousPeriod.reduce((sum, d) => sum + d.value, 0);

    if (previousRDV <= 0) {
      return currentRDV > 0 ? 100 : 0;
    }
    return ((currentRDV - previousRDV) / previousRDV) * 100;
  }, [metrics.activityDays]);

  const maxActivity = useMemo(
    () => Math.max(...heatmapData.map((d) => d.value), 1),
    [heatmapData]
  );

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
        "relative flex flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="z-10 mb-3 flex select-none items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Activity className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200">
            Activité
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex select-none items-center gap-1 rounded-full border border-zinc-955/5 bg-white/50 px-2 py-0.5 font-bold text-[10px] shadow-sm backdrop-blur-sm dark:border-white/5 dark:bg-zinc-900/50",
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

          <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
            Intensité 5M
          </span>
        </div>
      </div>

      {/* Inner White Box */}
      <div className="relative z-10 flex flex-1 flex-col justify-between rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        {/* Heatmap & Stats row */}
        <div className="flex flex-col items-stretch gap-6 lg:flex-row">
          {/* Calendar Grid */}
          <div className="flex min-w-[280px] flex-1 flex-col justify-center">
            {/* Months Header Row */}
            <div className="relative h-5 w-full select-none font-semibold text-[9px] text-zinc-400 uppercase dark:text-zinc-500">
              {monthLabels.map((lbl) => (
                <span
                  className="absolute"
                  key={`${lbl.label}-${lbl.index}`}
                  style={{ left: `${(lbl.index / weeks.length) * 100}%` }}
                >
                  {lbl.label}
                </span>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex items-start gap-2">
              {/* Day Labels Column */}
              <div className="flex h-[105px] select-none flex-col justify-between pt-0.5 pb-1 font-bold text-[8px] text-zinc-400 uppercase dark:text-zinc-500">
                <span>Lun</span>
                <span>Mer</span>
                <span>Ven</span>
                <span>Dim</span>
              </div>

              {/* Grid Column wrapper */}
              <div className="flex h-[105px] flex-1 justify-between">
                {weeks.map((week) => (
                  <div
                    className="flex h-full flex-col justify-between gap-[3px]"
                    key={week[0]?.date.toISOString()}
                  >
                    {week.map((day) => (
                      <button
                        aria-label={`${formatDateLong(new Date(day.date))}: ${day.value} rendez-vous`}
                        className={cn(
                          "h-3 w-3 shrink-0 cursor-pointer rounded-[2px] shadow-3xs transition-all duration-200",
                          getCellColorClass(day.value)
                        )}
                        key={day.date.toISOString()}
                        onBlur={() => setHoveredDay(null)}
                        onFocus={() =>
                          setHoveredDay({
                            date: new Date(day.date),
                            value: day.value,
                            revenue: day.revenue,
                          })
                        }
                        onMouseEnter={() =>
                          setHoveredDay({
                            date: new Date(day.date),
                            value: day.value,
                            revenue: day.revenue,
                          })
                        }
                        onMouseLeave={() => setHoveredDay(null)}
                        type="button"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="mt-4 flex select-none items-center justify-end gap-1.5 font-semibold text-[9px] text-zinc-400 dark:text-zinc-500">
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
          <div className="grid w-full grid-cols-3 gap-3 border-zinc-100 border-t pt-4 lg:w-56 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 dark:border-zinc-800/80">
            <div className="min-w-0">
              <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                Total Consultations
              </span>
              <span className="mt-1 block font-bold text-xl text-zinc-800 tabular-nums tracking-tight dark:text-zinc-100">
                {stats.totalRDV} RDV
              </span>
            </div>

            <div className="min-w-0">
              <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                Volume Financier
              </span>
              <span className="mt-1 block truncate font-bold text-sm text-zinc-700 tabular-nums dark:text-zinc-300">
                {new Intl.NumberFormat("fr-FR").format(stats.totalRev)} DA
              </span>
            </div>

            <div className="min-w-0">
              <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                Pic quotidien
              </span>
              <span className="mt-1 block font-bold text-xl text-zinc-800 tabular-nums tracking-tight dark:text-zinc-100">
                {stats.peakAppointments} RDV
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Tooltip overlay on top of the card footer */}
        <div className="mt-3 flex min-h-[32px] items-center justify-between border-zinc-150/60 border-t pt-2 dark:border-zinc-800/80">
          {hoveredDay ? (
            <div className="flex w-full select-none items-center justify-between text-[10px]">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                {formatDateLong(hoveredDay.date)}
              </span>
              <span className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
                <span>{hoveredDay.value} RDV</span>
                <span className="font-medium text-zinc-400 dark:text-zinc-500">
                  ({new Intl.NumberFormat("fr-FR").format(hoveredDay.revenue)}{" "}
                  DA)
                </span>
              </span>
            </div>
          ) : (
            <div className="flex select-none items-center gap-1.5 font-medium text-[9px] text-zinc-400 dark:text-zinc-500">
              <HelpCircle className="h-3.5 w-3.5" />
              Survolez un carré pour afficher le volume et les revenus
              journaliers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
