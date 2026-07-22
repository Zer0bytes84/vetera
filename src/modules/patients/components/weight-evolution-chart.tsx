import { Plus, Scales } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
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
      <div
        className={cn("clinical-surface flex flex-col p-5 sm:p-6", className)}
      >
        <div className="mb-4 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
              <Scales className="size-4" weight="duotone" />
            </span>
            <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
              {title}
            </div>
          </div>
          {onAdd ? (
            <Button
              className="h-8 gap-1.5 rounded-lg"
              onClick={onAdd}
              size="sm"
              variant="default"
            >
              <Plus className="size-3.5" weight="bold" />
              {t("patientDetail.overview.newWeight")}
            </Button>
          ) : null}
        </div>
        <div className="flex h-[120px] flex-col items-center justify-center rounded-[16px] border border-border/60 border-dashed bg-muted/20 p-5 text-center">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("clinical-surface flex flex-col p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
            <Scales className="size-4" weight="duotone" />
          </span>
          <div>
            <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
              {title}
            </div>
            <div className="mt-0.5 text-muted-foreground text-xs">
              {data.length} {data.length > 1 ? "mesures" : "mesure"}
            </div>
          </div>
        </div>
        {onAdd ? (
          <Button
            className="h-8 gap-1.5 rounded-lg"
            onClick={onAdd}
            size="sm"
            variant="default"
          >
            <Plus className="size-3.5" weight="bold" />
            {t("patientDetail.overview.newWeight")}
          </Button>
        ) : null}
      </div>
      <div className="px-2 pt-2 sm:px-4">
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
                  className="border-border/50 bg-background/95 shadow-lg backdrop-blur-md dark:border-border/30"
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
                      onClick: (payload) => {
                        const point = (
                          payload as typeof payload & {
                            payload?: WeightChartPoint;
                          }
                        ).payload;
                        const matched = entries.find(
                          (entry) => entry.measuredAt === point?.measuredAt
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
      </div>
    </div>
  );
}
