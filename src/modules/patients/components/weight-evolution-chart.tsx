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
      <Card className={className}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {onAdd ? (
            <Button
              className="h-8 gap-1.5"
              onClick={onAdd}
              size="sm"
              variant="outline"
            >
              <Plus weight="duotone" className="size-4" />
              {t("patientDetail.overview.newWeight")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs">
            {data.length} {data.length > 1 ? "mesures" : "mesure"}
          </CardDescription>
        </div>
        {onAdd ? (
          <Button
            className="h-8 gap-1.5"
            onClick={onAdd}
            size="sm"
            variant="outline"
          >
            <Plus weight="duotone" className="size-4" />
            {t("patientDetail.overview.newWeight")}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-4 sm:pt-4">
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
