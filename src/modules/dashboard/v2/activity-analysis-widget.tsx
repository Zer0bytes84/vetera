import { Activity, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { formatCurrency } from "./model";
import { WidgetShell } from "./widget-shell";

const chartConfig = {
  consultations: { label: "Consultations", color: "#5485f5" },
  revenue: { label: "Encaissements", color: "#b276f0" },
} satisfies ChartConfig;

type Period = "7d" | "6w" | "12w";

const periodOptions: Array<{ label: string; value: Period }> = [
  { label: "7 j", value: "7d" },
  { label: "6 sem.", value: "6w" },
  { label: "12 sem.", value: "12w" },
];

export function ActivityAnalysisWidget({
  metrics,
  onOpenAnalytics,
}: {
  metrics: DashboardMetrics;
  onOpenAnalytics?: () => void;
}) {
  const [period, setPeriod] = useState<Period>("6w");
  const weeklyData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, weekIndex) => {
        const days = metrics.activityDays.slice(
          weekIndex * 7,
          weekIndex * 7 + 7
        );
        const start = days[0]?.date ?? metrics.referenceDate;
        return {
          consultations: days.reduce((sum, day) => sum + day.value, 0),
          label: `${new Date(start).toLocaleDateString("fr-FR", {
            day: "numeric",
          })}–${new Date(days.at(-1)?.date ?? start).toLocaleDateString(
            "fr-FR",
            { day: "numeric", month: "short" }
          )}`,
          revenue: days.reduce((sum, day) => sum + day.revenue, 0),
        };
      }),
    [metrics.activityDays, metrics.referenceDate]
  );
  const dailyData = useMemo(
    () =>
      metrics.activityDays.slice(-7).map((day) => ({
        consultations: day.value,
        label: day.date.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        }),
        revenue: day.revenue,
      })),
    [metrics.activityDays]
  );
  const chartData =
    period === "7d" ? dailyData : weeklyData.slice(period === "6w" ? -6 : -12);
  const today = dailyData.at(-1) ?? {
    consultations: 0,
    label: "Aujourd’hui",
    revenue: 0,
  };
  const total = chartData.reduce((sum, entry) => sum + entry.consultations, 0);
  const revenue = chartData.reduce((sum, entry) => sum + entry.revenue, 0);
  const average = total / Math.max(chartData.length, 1);
  const averageLabel = period === "7d" ? "Moyenne / jour" : "Moyenne / sem.";
  const periodLabel =
    period === "7d"
      ? "7 derniers jours"
      : period === "6w"
        ? "6 semaines"
        : "12 semaines";
  const busiest = chartData.reduce(
    (current, entry) =>
      entry.consultations > current.consultations ? entry : current,
    chartData[0] ?? { consultations: 0, label: "—", revenue: 0 }
  );

  return (
    <WidgetShell
      action={
        <div className="flex rounded-full border border-zinc-200/80 bg-zinc-50 p-0.5 dark:border-white/10 dark:bg-white/5">
          {periodOptions.map((option) => (
            <button
              aria-pressed={period === option.value}
              className={cn(
                "h-6 rounded-full px-2.5 font-medium text-[10px] transition-colors",
                period === option.value
                  ? "bg-white text-foreground shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={option.value}
              onClick={() => setPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      className="min-h-[420px]"
      contentClassName="p-0"
      description="Consultations et encaissements sur deux axes"
      icon={Activity}
      iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"
      title="Activité clinique"
    >
      <div className="widget-metrics grid grid-cols-2 gap-y-4 px-5 pt-2 pb-5 md:grid-cols-4">
        {[
          [total, periodLabel],
          [today.consultations, `Aujourd’hui · ${today.label}`],
          [average.toFixed(1), averageLabel],
          [formatCurrency(revenue), "Encaissé sur la période"],
        ].map(([value, label]) => (
          <div className="min-w-0 pe-3" key={label}>
            <p className="break-words font-medium text-2xl tabular-nums tracking-[-0.03em]">
              {value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-[#5485f5]" />
          Consultations · axe gauche
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 rounded-full bg-[#b276f0]" />
          Encaissements (DA) · axe droit
        </span>
      </div>
      <div className="widget-chart-surface mx-3 mb-3 rounded-xl px-2 pt-5 pb-2 sm:mx-4 sm:px-3">
        <ChartContainer
          className="h-[250px] w-full"
          config={chartConfig}
          initialDimension={{ width: 720, height: 250 }}
        >
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ bottom: 0, left: 2, right: 8, top: 8 }}
          >
            <CartesianGrid
              strokeDasharray="2 6"
              vertical={false}
              strokeOpacity={0.55}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={22}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              axisLine={false}
              domain={[0, "auto"]}
              tickLine={false}
              tickMargin={8}
              width={32}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(value: number) =>
                value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center justify-between gap-6">
                      <span className="text-muted-foreground">
                        {item.dataKey === "revenue"
                          ? "Encaissements"
                          : "Consultations"}
                      </span>
                      <span className="font-medium tabular-nums">
                        {item.dataKey === "revenue"
                          ? formatCurrency(Number(value))
                          : Number(value).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  )}
                />
              }
              cursor={{ fill: "rgba(14, 165, 233, 0.04)" }}
            />
            <Bar
              yAxisId="count"
              activeBar={{ fill: "#3664cc" }}
              dataKey="consultations"
              fill="var(--color-consultations)"
              maxBarSize={32}
              background={{ fill: "var(--widget-track)", radius: 8 }}
              radius={[8, 8, 4, 4]}
            />
            <Line
              yAxisId="revenue"
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 3 }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
      <div className="flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 text-[11px] text-muted-foreground dark:border-white/8">
        <span>
          Pic : {busiest.consultations} consultation
          {busiest.consultations > 1 ? "s" : ""} · {busiest.label}
        </span>
        <Button onClick={onOpenAnalytics} size="xs" variant="ghost">
          Rapport
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </WidgetShell>
  );
}
