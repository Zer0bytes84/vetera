"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface RevenueCategory {
  color: string;
  key: string;
  label: string;
}

export type MonthlyRevenueRow = {
  month: string;
  [key: string]: string | number;
};

export interface RevenueBreakdownChartProps {
  categories: RevenueCategory[];
  data: MonthlyRevenueRow[];
  delta: number;
  total: number;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function RevenueBreakdownChart({
  data,
  categories,
  total,
  delta,
}: RevenueBreakdownChartProps) {
  const chartConfig: ChartConfig = {};
  for (const cat of categories) {
    chartConfig[cat.key] = {
      label: cat.label,
      color: cat.color,
    };
  }

  const positive = delta >= 0;

  return (
    <Card className="w-full gap-8 py-6 shadow-xs">
      <CardHeader className="flex flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="font-medium text-[15px] text-muted-foreground">
            Évolution des revenus
          </CardTitle>
          <div className="flex items-baseline gap-2.5">
            <h3 className="font-semibold text-3xl text-foreground tabular-nums tracking-[-0.03em]">
              {formatCompact(total)} DA
            </h3>
            <Badge
              className={cn(
                "rounded-full px-2 py-0.5 font-medium text-[11px] tabular-nums shadow-none ring-1",
                positive
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
                  : "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300"
              )}
            >
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </Badge>
            <span className="text-muted-foreground text-xs">
              vs année précédente
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {categories.map((item) => (
            <div
              className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5"
              key={item.key}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <BarChart accessibilityLayer data={data} margin={{ left: -20 }}>
            <CartesianGrid
              stroke="rgba(144, 164, 174, 0.3)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="month"
              fontSize={12}
              tickFormatter={(value: string) => value.slice(0, 3)}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              fontSize={12}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              tickMargin={10}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel indicator="line" />}
              cursor={false}
            />
            {categories.map((cat, index) => {
              let radius: [number, number, number, number];
              if (index === 0) {
                radius = [0, 0, 4, 4];
              } else if (index === categories.length - 1) {
                radius = [4, 4, 0, 0];
              } else {
                radius = [0, 0, 0, 0];
              }
              return (
                <Bar
                  barSize={20}
                  dataKey={cat.key}
                  fill={`var(--color-${cat.key})`}
                  fillOpacity={index === categories.length - 1 ? 0.5 : 1}
                  key={cat.key}
                  radius={radius}
                  stackId="a"
                />
              );
            })}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
