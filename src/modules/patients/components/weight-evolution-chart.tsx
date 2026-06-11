import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WeightEntry } from "@/types/db";

const chartConfig = {
  weightKg: {
    label: "Poids (kg)",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export type WeightChartPoint = {
  date: string;
  weightKg: number;
  measuredAt: string;
};

function buildPoints(entries: WeightEntry[]): WeightChartPoint[] {
  return [...entries]
    .sort(
      (a, b) =>
        new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
    )
    .map((entry) => ({
      date: new Date(entry.measuredAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      weightKg: entry.weightKg,
      measuredAt: entry.measuredAt,
    }));
}

interface WeightEvolutionChartProps {
  className?: string;
  emptyMessage: string;
  entries: WeightEntry[];
  onAdd?: () => void;
  onEditEntry?: (entry: WeightEntry) => void;
  title: string;
}

export function WeightEvolutionChart({
  className,
  emptyMessage,
  entries,
  onAdd,
  onEditEntry,
  title,
}: WeightEvolutionChartProps) {
  const { t } = useTranslation();
  const data = buildPoints(entries);

  if (data.length === 0) {
    return (
      <Card className={cn("overflow-hidden rounded-2xl shadow-sm border-zinc-200 dark:border-zinc-800", className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-4">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {onAdd ? (
            <Button
              className="h-8 gap-1.5 rounded-lg"
              onClick={onAdd}
              size="sm"
              variant="default"
            >
              <Plus weight="bold" className="size-3.5" />
              {t("patientDetail.overview.newWeight")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden rounded-2xl shadow-sm border-zinc-200 dark:border-zinc-800", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-xs mt-1">
            {data.length} {data.length > 1 ? "mesures" : "mesure"}
          </CardDescription>
        </div>
        {onAdd ? (
          <Button
            className="h-8 gap-1.5 rounded-lg"
            onClick={onAdd}
            size="sm"
            variant="default"
          >
            <Plus weight="bold" className="size-3.5" />
            {t("patientDetail.overview.newWeight")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="px-2 pt-6 sm:px-4 sm:pt-6">
        <ChartContainer
          className="aspect-auto h-[220px] w-full"
          config={chartConfig}
        >
          <LineChart data={data}>
            <defs>
              <linearGradient id="fillWeight" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-weightKg)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-weightKg)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={20}
              tickLine={false}
              tickMargin={6}
            />
            <YAxis
              axisLine={false}
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(value) => `${Number(value).toFixed(1)}`}
              tickLine={false}
              tickMargin={4}
              width={40}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  className="shadow-lg border-border/50 dark:border-border/30 bg-background/95 backdrop-blur-md"
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const measuredAt = payload?.[0]?.payload?.measuredAt;
                    if (!measuredAt) {
                      return "";
                    }
                    return new Date(measuredAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                  }}
                />
              }
              cursor={{ stroke: "var(--color-weightKg)", strokeWidth: 1 }}
            />
            <Line
              activeDot={
                onEditEntry
                  ? {
                      r: 5,
                      strokeWidth: 0,
                      onClick: (_event, payload) => {
                        const matched = entries.find(
                          (e) => e.measuredAt === payload?.measuredAt
                        );
                        if (matched) {
                          onEditEntry(matched);
                        }
                      },
                    }
                  : { r: 5, strokeWidth: 0 }
              }
              dataKey="weightKg"
              dot={{ fill: "var(--color-weightKg)", r: 3, strokeWidth: 0 }}
              stroke="var(--color-weightKg)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
