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
  consultations: { label: "Consultations", color: "#0ea5e9" },
  revenue: { label: "Revenus", color: "#10b981" },
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
  const [period, setPeriod] = useState<Period>("7d");
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
    period === "7d"
      ? dailyData
      : weeklyData.slice(period === "6w" ? -6 : -12);
  const today = dailyData.at(-1) ?? {
    consultations: 0,
    label: "Aujourd’hui",
    revenue: 0,
  };
  const total = chartData.reduce(
    (sum, entry) => sum + entry.consultations,
    0
  );
  const revenue = chartData.reduce((sum, entry) => sum + entry.revenue, 0);
  const average = total / Math.max(chartData.length, 1);
  const averageLabel = period === "7d" ? "Moyenne / jour" : "Moyenne / sem.";
  const periodLabel =
    period === "7d" ? "7 derniers jours" : period === "6w" ? "6 semaines" : "12 semaines";
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
      description="Consultations et valeur générée"
      icon={Activity}
      iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"
      title="Activité clinique"
    >
      <div className="grid grid-cols-2 divide-x divide-zinc-200/70 border-zinc-200/70 border-b md:grid-cols-4 dark:divide-white/8 dark:border-white/8">
        {[
          [today.consultations, `Aujourd’hui · ${today.label}`],
          [total, periodLabel],
          [average.toFixed(1), averageLabel],
          [formatCurrency(revenue), "Valeur sur la période"],
        ].map(([value, label]) => (
          <div className="min-w-0 px-4 py-3.5" key={label}>
            <p className="truncate font-semibold text-lg tabular-nums tracking-[-0.03em]">
              {value}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="px-3 pt-5 pb-2 sm:px-5">
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
            <CartesianGrid strokeDasharray="3 5" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={22}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              domain={[0, "auto"]}
              tickLine={false}
              tickMargin={8}
              width={32}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={{ fill: "rgba(14, 165, 233, 0.04)" }}
            />
            <Bar
              dataKey="consultations"
              fill="var(--color-consultations)"
              opacity={0.16}
              radius={[5, 5, 1, 1]}
            />
            <Line
              activeDot={{ r: 4, strokeWidth: 3 }}
              dataKey="consultations"
              dot={false}
              stroke="var(--color-consultations)"
              strokeWidth={2.4}
              type="monotone"
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
