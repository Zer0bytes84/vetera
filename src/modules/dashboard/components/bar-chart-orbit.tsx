"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface BarChartOrbitProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  totalLabel: string;
  totalValue: string;
}

const chartConfig = {
  actes: {
    label: "Actes",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const barColors = [
  "var(--color-actes)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function BarChartOrbit({
  data,
  totalLabel,
  totalValue,
  title = "Actes par mois",
}: BarChartOrbitProps) {
  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card pt-0 shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.06em]">
              Répartition
            </CardDescription>
            <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
              {title}
            </CardTitle>
          </div>
          <CardAction>
            <Badge className="rounded-full px-3 py-1 text-xs" variant="outline">
              {totalLabel}
            </Badge>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-5">
          <p className="font-medium text-[11px] text-muted-foreground/80 uppercase tracking-[0.06em]">
            {totalLabel}
          </p>
          <p className="font-semibold text-3xl text-foreground tabular-nums tracking-[-0.045em]">
            {totalValue}
          </p>
        </div>

        <ChartContainer
          className="dashboard-chart-frame aspect-auto h-[250px] w-full"
          config={chartConfig}
        >
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            />
            <Bar
              dataKey="value"
              fill="var(--color-actes)"
              maxBarSize={42}
              radius={[14, 14, 6, 6]}
            >
              {data.map((entry, index) => (
                <Cell
                  fill={barColors[index % barColors.length]}
                  key={`${entry.name}-${index}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
