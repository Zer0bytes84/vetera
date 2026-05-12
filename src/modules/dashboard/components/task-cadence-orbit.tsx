"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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

type TaskCadencePoint = {
  label: string;
  total: number;
  completed: number;
  pending: number;
  isCurrent: boolean;
};

type TaskCadenceOrbitProps = {
  data: TaskCadencePoint[];
  rate: number;
};

const chartConfig = {
  completed: {
    label: "Terminées",
    color: "var(--chart-4)",
  },
  pending: {
    label: "À faire",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function TaskCadenceOrbit({ data, rate }: TaskCadenceOrbitProps) {
  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card pt-0 shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.06em]">
          Opérations
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          Cadence tâches
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-4">
          <p className="font-medium text-[11px] text-muted-foreground/80 uppercase tracking-[0.06em]">
            Taux moyen
          </p>
          <p className="font-semibold text-3xl text-foreground tabular-nums tracking-[-0.04em]">
            {Math.round(rate)}%
          </p>
        </div>
        <ChartContainer
          className="dashboard-chart-frame aspect-auto h-[220px] w-full"
          config={chartConfig}
        >
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
              cursor={{ fill: "var(--muted)", opacity: 0.32 }}
            />
            <Bar
              dataKey="completed"
              fill="var(--color-completed)"
              radius={[10, 10, 4, 4]}
              stackId="tasks"
            />
            <Bar
              dataKey="pending"
              fill="var(--color-pending)"
              opacity={0.48}
              radius={[10, 10, 4, 4]}
              stackId="tasks"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
