"use client";

import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface DistributionItem {
  fill: string;
  label: string;
  value: number;
}

export interface DistributionChartProps {
  data: DistributionItem[];
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

export function DistributionChart({ data, total }: DistributionChartProps) {
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.fill,
  }));

  const chartConfig: ChartConfig = {};
  for (const item of data) {
    chartConfig[item.label] = {
      label: item.label,
      color: item.fill,
    };
  }

  return (
    <Card className="h-full w-full gap-6 py-6 shadow-xs">
      <CardHeader className="px-6">
        <CardTitle className="font-medium text-lg">
          Répartition des revenus
        </CardTitle>
        <p className="text-muted-foreground text-xs">
          Sur les 12 derniers mois
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6 px-6">
        <ChartContainer
          className="mx-auto aspect-square max-h-[220px]"
          config={chartConfig}
        >
          <PieChart margin={{ top: -20 }}>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <Pie
              data={chartData}
              dataKey="value"
              endAngle={-270}
              innerRadius={68}
              nameKey="name"
              paddingAngle={2}
              startAngle={90}
              strokeWidth={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-muted-foreground text-[11px] uppercase tracking-[0.08em]"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 12}
                        >
                          Total
                        </tspan>
                        <tspan
                          className="fill-foreground font-semibold text-xl tracking-tight"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 14}
                        >
                          {formatCompact(total)} DA
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col gap-2.5">
          {data.map((item) => {
            const percent = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                className="flex items-center justify-between gap-3"
                key={item.label}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="truncate text-foreground text-sm">
                    {item.label}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="font-medium text-foreground text-sm">
                    {formatCompact(item.value)} DA
                  </span>
                  <span className="inline-flex min-w-[44px] items-center justify-center rounded-md bg-muted px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
