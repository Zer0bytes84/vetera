"use client";

import { Bar, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ComposedChartOrbitProps {
  data: Array<{ name: string; revenus: number; rdv: number }>;
  title?: string;
  totalLabel: string;
  totalValue: string;
}

const chartConfig = {
  revenus: {
    label: "Revenus",
    color: "var(--chart-1)",
  },
  rdv: {
    label: "RDV",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ComposedChartOrbit({
  data,
  totalLabel,
  totalValue,
  title = "Revenus vs Actes",
}: ComposedChartOrbitProps) {
  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card pt-0 shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.06em]">
              Comparaison mensuelle
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
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">{totalLabel}</p>
          <p className="font-semibold text-3xl text-foreground tabular-nums tracking-[-0.04em]">
            {totalValue}
          </p>
        </div>

        <ChartContainer
          className="dashboard-chart-frame aspect-auto h-[250px] w-full"
          config={chartConfig}
        >
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
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
              cursor={{ fill: "var(--muted)", opacity: 0.34 }}
            />
            <Bar
              dataKey="revenus"
              fill="var(--color-revenus)"
              maxBarSize={32}
              opacity={0.78}
              radius={[12, 12, 5, 5]}
            />
            <Line
              activeDot={{ r: 4, fill: "var(--color-rdv)" }}
              dataKey="rdv"
              dot={false}
              stroke="var(--color-rdv)"
              strokeWidth={2.5}
              type="monotone"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
