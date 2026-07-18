"use client";

import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Bar, BarChart, XAxis, Rectangle } from "recharts";
import { addDays, startOfDay, endOfDay } from "date-fns";
import type { DashboardMetrics } from "@/lib/metrics";
import type { Transaction } from "@/types/db";
import { formatDZD } from "@/utils/currency";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  income: {
    label: "Entrées",
    color: "#93c5fd",
  },
  expense: {
    label: "Sorties",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export function AsterScoreChart({
  metrics,
  transactions = [],
  className,
}: {
  metrics: DashboardMetrics;
  transactions?: Transaction[];
  className?: string;
}) {
  const [period, setPeriod] = useState<"7j" | "30j" | "90j">("7j");

  const { chartData, totalIncome, totalExpense } = useMemo(() => {
    const sliceCount = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const paidTx = transactions.filter((t) => t.status === "paid");

    const daysData = [];
    let sumIncome = 0;
    let sumExpense = 0;

    for (let i = sliceCount - 1; i >= 0; i--) {
      const day = addDays(new Date(metrics.referenceDate), -i);
      const start = startOfDay(day);
      const end = endOfDay(day);

      const dayTx = paidTx.filter((t) => {
        const txDate = new Date(t.date);
        return txDate >= start && txDate <= end;
      });

      const dayIncome = dayTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = dayTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      sumIncome += dayIncome;
      sumExpense += dayExpense;

      const dayName = day.toLocaleDateString("fr-FR", {
        weekday: "short",
      });
      const name =
        period === "7j"
          ? dayName.charAt(0).toUpperCase() + dayName.slice(1)
          : day.toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            });

      daysData.push({
        date: day.toISOString().split("T")[0],
        name,
        income: dayIncome / 100,
        expense: dayExpense / 100,
      });
    }

    return {
      chartData: daysData,
      totalIncome: sumIncome,
      totalExpense: sumExpense,
    };
  }, [transactions, metrics.referenceDate, period]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 pt-3 px-1.5 pb-1.5 shadow-xs",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-2 flex items-center justify-between px-1 select-none">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Wallet className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 tracking-tight">
            Flux de Trésorerie
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector Tabs */}
          <div className="flex items-center rounded-md bg-zinc-250/20 dark:bg-zinc-800/50 p-0.5 ring-1 ring-zinc-200/50 dark:ring-zinc-850">
            {(["7j", "30j", "90j"] as const).map((p) => (
              <button
                className={cn(
                  "rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider transition-colors cursor-pointer",
                  period === p
                    ? "bg-white text-zinc-800 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
                key={p}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <button className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 font-medium transition-colors cursor-pointer">
            Voir plus
          </button>
        </div>
      </div>

      {/* Inner White Box */}
      <div className="flex-1 rounded-[12px] border border-zinc-200/60 dark:border-zinc-800 bg-white p-5 shadow-xs dark:bg-zinc-950/80 flex flex-col justify-between relative">
        {/* KPI Headers */}
        <div className="mb-4 flex gap-12 select-none">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#93c5fd" }}
              />
              Entrées
            </div>
            <div className="mt-1 font-sans text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatDZD(totalIncome)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#2563eb" }}
              />
              Sorties
            </div>
            <div className="mt-1 font-sans text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatDZD(totalExpense)}
            </div>
          </div>
        </div>

        {/* Chart — exact shadcn/ui pattern */}
        <ChartContainer config={chartConfig} className="h-[220px] w-full aspect-auto">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <Bar
              dataKey="income"
              stackId="a"
              fill="var(--color-income)"
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const hasExpense = payload.expense > 0;
                const radius: [number, number, number, number] = hasExpense
                  ? [0, 0, 0, 0]
                  : [4, 4, 0, 0];
                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill="var(--color-income)"
                    radius={radius}
                  />
                );
              }}
            />
            <Bar
              dataKey="expense"
              stackId="a"
              fill="var(--color-expense)"
              shape={(props: any) => {
                const { x, y, width, height } = props;
                return (
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill="var(--color-expense)"
                    radius={[4, 4, 0, 0]}
                  />
                );
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={false}
              defaultIndex={1}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
