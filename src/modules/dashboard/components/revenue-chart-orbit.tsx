"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RevenueChartOrbitProps {
  data: Array<{
    month: string;
    value: number;
    active: number;
    hasData: boolean;
  }>;
  totalValue: number;
  trend: number;
  trendLabel?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0]?.value || 0;
    return (
      <div className="rounded-xl border border-border/50 bg-card/95 px-4 py-2.5 shadow-xl backdrop-blur-sm">
        <p className="font-bold text-foreground text-lg tabular-nums">
          {value > 0 ? `${(value).toLocaleString()} DA` : "-"}
        </p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    );
  }
  return null;
};

export function RevenueChartOrbit({
  data,
  totalValue,
  trend,
  trendLabel = "vs last month",
}: RevenueChartOrbitProps) {
  const [period, setPeriod] = useState<"monthly" | "weekly" | "daily">(
    "monthly"
  );

  const formattedTotal =
    totalValue > 0 ? `${totalValue.toLocaleString()} DA` : "-";

  const isPositive = trend >= 0;

  const chartData = data.map((entry) => ({
    ...entry,
    base: entry.value,
    activeOverlay: entry.hasData ? entry.value : 0,
  }));

  return (
    <Card className="card-vibrant overflow-hidden rounded-[24px] border border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-start justify-between border-border border-b px-6 py-5">
        <div>
          <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
            Revenus
          </CardDescription>
          <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
            {formattedTotal}
          </CardTitle>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-xs",
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
            <span className="text-muted-foreground text-xs">{trendLabel}</span>
          </div>
        </div>
        <Select
          onValueChange={(v) => setPeriod(v as typeof period)}
          value={period}
        >
          <SelectTrigger className="h-8 w-[110px] rounded-xl border-border bg-secondary/50 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Quotidien</SelectItem>
            <SelectItem value="weekly">Hebdomadaire</SelectItem>
            <SelectItem value="monthly">Mensuel</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-6">
        <div className="h-[280px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient
                  id="barGradientMuted"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--muted-foreground)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--muted-foreground)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="month"
                dy={10}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(value) => `${value}k`}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar
                dataKey="base"
                fill="url(#barGradient)"
                maxBarSize={48}
                radius={[8, 8, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    className="transition-all duration-200 hover:opacity-80"
                    fill={
                      entry.hasData
                        ? "url(#barGradient)"
                        : "url(#barGradientMuted)"
                    }
                    key={`cell-${index}`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
