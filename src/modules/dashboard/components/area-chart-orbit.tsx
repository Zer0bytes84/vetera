"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AreaChartOrbitProps {
  data: Array<{ name: string; value: number }>;
  totalLabel: string;
  totalValue: string;
  trend: number;
  trendLabel?: string;
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AreaChartOrbit({
  data,
  totalLabel,
  totalValue,
  trend,
  trendLabel = "vs période précédente",
}: AreaChartOrbitProps) {
  const isPositive = trend >= 0;
  const [timeRange, setTimeRange] = useState("all");

  const filteredData =
    timeRange === "all" ? data : data.slice(-Number(timeRange));

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[28px] bg-card pt-0 shadow-none">
      <CardHeader className="flex items-center gap-2 space-y-0 border-border/50 border-b px-6 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.08em]">
            Trajectoire
          </CardDescription>
          <CardTitle className="font-semibold text-[24px] tracking-[-0.05em]">
            Revenus, rythme net
          </CardTitle>
        </div>
        <Select
          onValueChange={(value) => {
            if (!value) {
              return;
            }
            setTimeRange(value);
          }}
          value={timeRange}
        >
          <SelectTrigger className="hidden h-8 w-[130px] rounded-lg sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem className="rounded-lg" value="7">
              7 jours
            </SelectItem>
            <SelectItem className="rounded-lg" value="14">
              14 jours
            </SelectItem>
            <SelectItem className="rounded-lg" value="30">
              30 jours
            </SelectItem>
            <SelectItem className="rounded-lg" value="all">
              Tout
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-medium text-[11px] text-muted-foreground/80 uppercase tracking-[0.06em]">
              {totalLabel}
            </p>
            <p className="font-semibold text-[36px] text-foreground tabular-nums leading-none tracking-[-0.055em]">
              {totalValue}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-xs",
                isPositive
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
              )}
            >
              {isPositive ? (
                <HugeiconsIcon
                  className="size-3"
                  icon={ArrowUpIcon}
                  strokeWidth={2}
                />
              ) : (
                <HugeiconsIcon
                  className="size-3"
                  icon={ArrowDownIcon}
                  strokeWidth={2}
                />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="text-[11px] text-muted-foreground">
              {trendLabel}
            </span>
          </div>
        </div>

        <ChartContainer
          className="dashboard-chart-frame aspect-auto h-[308px] w-full"
          config={chartConfig}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.42}
                />
                <stop
                  offset="58%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.11}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <YAxis
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              tickLine={false}
              width={46}
            />
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
              fill="url(#fillRevenue)"
              stroke="var(--color-revenue)"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              dataKey="value"
              dot={false}
              opacity={0.32}
              stroke="var(--color-revenue)"
              strokeWidth={1.2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
