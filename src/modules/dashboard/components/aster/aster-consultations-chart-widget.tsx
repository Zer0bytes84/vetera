"use client";

import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const chartConfig = {
  consultations: {
    label: "Consultations",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;

function getTrendLabel(trend: number | null, current: number) {
  if (trend === null) {
    return current > 0 ? "Nouvelle activité" : "Aucune variation";
  }
  return `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`;
}

export function AsterConsultationsChartWidget({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const gradientId = `clinical-activity-${useId().replace(/:/g, "")}`;

  const weeklyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, weekIndex) => {
        const days = metrics.activityDays.slice(
          weekIndex * 7,
          weekIndex * 7 + 7
        );
        const start = days[0]?.date ?? metrics.referenceDate;
        const consultations = days.reduce((sum, day) => sum + day.value, 0);
        const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
        const activeDays = days.filter((day) => day.value > 0).length;

        return {
          activeDays,
          consultations,
          date: new Date(start).toISOString(),
          label: new Date(start).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          }),
          revenue,
        };
      }),
    [metrics.activityDays, metrics.referenceDate]
  );

  const summary = useMemo(() => {
    const total = weeklyData.reduce((sum, week) => sum + week.consultations, 0);
    const totalRevenue = weeklyData.reduce(
      (sum, week) => sum + week.revenue,
      0
    );
    const peak = Math.max(...weeklyData.map((week) => week.consultations), 0);
    const activeWeeks = weeklyData.filter(
      (week) => week.consultations > 0
    ).length;
    const previous = weeklyData
      .slice(0, 6)
      .reduce((sum, week) => sum + week.consultations, 0);
    const current = weeklyData
      .slice(6)
      .reduce((sum, week) => sum + week.consultations, 0);
    const trend = previous > 0 ? ((current - previous) / previous) * 100 : null;

    return {
      activeWeeks,
      average: total / weeklyData.length,
      current,
      peak,
      total,
      totalRevenue,
      trend,
    };
  }, [weeklyData]);

  const trendLabel = getTrendLabel(summary.trend, summary.current);
  const trendIsPositive = summary.trend === null || summary.trend >= 0;

  return (
    <section
      aria-labelledby="clinical-activity-title"
      className={cn(
        "flex min-h-[390px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
            <Activity className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h2
              className="truncate font-heading font-semibold text-sm text-zinc-800 tracking-[-0.02em] dark:text-zinc-200"
              id="clinical-activity-title"
            >
              Activité clinique
            </h2>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 font-semibold text-[10px] tabular-nums",
            trendIsPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {trendIsPositive ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          <span aria-hidden="true" className="hidden min-[380px]:inline">
            {trendLabel}
          </span>
          <span className="sr-only">{trendLabel}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[12px] border border-zinc-200/60 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex flex-col gap-4 border-zinc-100 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5 dark:border-zinc-800">
          <div className="min-w-0">
            <span className="font-semibold text-[9px] text-zinc-400 uppercase tracking-[0.12em] dark:text-zinc-500">
              Consultations · 12 semaines
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-heading font-semibold text-3xl text-zinc-950 tabular-nums leading-none tracking-[-0.05em] dark:text-zinc-50">
                {summary.total}
              </span>
              <span className="font-medium text-xs text-zinc-400">RDV</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 sm:min-w-[300px]">
            <ClinicalCompactStat
              label="Moyenne"
              value={`${summary.average.toFixed(1)} / sem.`}
            />
            <ClinicalCompactStat label="Pic" value={`${summary.peak} RDV`} />
            <ClinicalCompactStat
              label="Actives"
              value={`${summary.activeWeeks} / 12`}
            />
          </div>
        </div>

        <div className="relative flex flex-1 flex-col px-3 pt-4 sm:px-5">
          <ChartContainer
            className="aspect-auto h-[220px] w-full"
            config={chartConfig}
            initialDimension={{ width: 620, height: 220 }}
          >
            <AreaChart
              accessibilityLayer
              data={weeklyData}
              margin={{ top: 12, right: 4, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-consultations)"
                    stopOpacity={0.34}
                  />
                  <stop
                    offset="72%"
                    stopColor="var(--color-consultations)"
                    stopOpacity={0.08}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-consultations)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 5" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={38}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                domain={[0, "dataMax + 1"]}
                hide
                tickLine={false}
              />
              {summary.average > 0 && (
                <ReferenceLine
                  stroke="var(--color-consultations)"
                  strokeDasharray="3 5"
                  strokeOpacity={0.28}
                  y={summary.average}
                />
              )}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="border-zinc-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-950/95"
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const point = payload[0]?.payload as
                        | { date?: string }
                        | undefined;
                      return point?.date
                        ? `Semaine du ${new Date(point.date).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                            }
                          )}`
                        : "";
                    }}
                  />
                }
                cursor={{
                  stroke: "var(--color-consultations)",
                  strokeDasharray: "3 4",
                  strokeOpacity: 0.35,
                }}
              />
              <Area
                activeDot={{
                  fill: "var(--color-consultations)",
                  r: 5,
                  stroke: "white",
                  strokeWidth: 3,
                }}
                dataKey="consultations"
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                stroke="var(--color-consultations)"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>

          <div className="mt-auto flex items-center justify-between gap-3 border-zinc-100 border-t py-3 text-[10px] dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">
              Survolez la courbe pour explorer chaque semaine
            </span>
            <span className="shrink-0 font-medium text-zinc-700 tabular-nums dark:text-zinc-300">
              {new Intl.NumberFormat("fr-FR").format(summary.totalRevenue)} DA
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClinicalCompactStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 sm:border-zinc-100 sm:border-l sm:pl-4 dark:sm:border-zinc-800">
      <span className="block font-semibold text-[9px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
        {label}
      </span>
      <span className="mt-1 block truncate font-heading font-semibold text-sm text-zinc-800 tabular-nums leading-none tracking-[-0.02em] dark:text-zinc-200">
        {value}
      </span>
    </div>
  );
}
