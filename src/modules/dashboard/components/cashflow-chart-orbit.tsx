"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type CashflowPoint = {
  name: string;
  value: number;
};

type CashflowChartOrbitProps = {
  data: CashflowPoint[];
};

const chartConfig = {
  value: {
    label: "Cashflow",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

function formatDA(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " DA";
}

export function CashflowChartOrbit({ data }: CashflowChartOrbitProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const isPositive = total >= 0;

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card pt-0 shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.06em]">
          Trésorerie
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          Cashflow net
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Solde 14 jours</p>
            <p className="font-semibold text-3xl text-foreground tabular-nums tracking-[-0.04em]">
              {formatDA(total)}
            </p>
          </div>
          <span
            className={
              isPositive
                ? "font-semibold text-emerald-600 text-xs dark:text-emerald-300"
                : "font-semibold text-rose-600 text-xs dark:text-rose-300"
            }
          >
            {isPositive ? "Flux positif" : "Flux négatif"}
          </span>
        </div>

        <ChartContainer
          className="dashboard-chart-frame aspect-auto h-[220px] w-full"
          config={chartConfig}
        >
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillCashflow" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.42}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <ReferenceLine stroke="var(--border)" strokeDasharray="4 4" y={0} />
            <XAxis
              axisLine={false}
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="dot" />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            />
            <Area
              dataKey="value"
              fill="url(#fillCashflow)"
              stroke="var(--color-value)"
              strokeWidth={2.8}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
