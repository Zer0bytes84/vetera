"use client";

import { addDays, endOfDay, startOfDay } from "date-fns";
import { Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, Rectangle, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/db";
import { formatDZD } from "@/utils/currency";

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

interface CashflowBarShapeProps {
  height?: number;
  payload?: { expense?: number };
  width?: number;
  x?: number;
  y?: number;
}

const PERIOD_DAYS = {
  "7j": 7,
  "30j": 30,
  "90j": 90,
} as const;

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
    const sliceCount = PERIOD_DAYS[period];
    const paidTx = transactions.filter((t) => t.status === "paid");

    const daysData: Array<{
      date: string;
      expense: number;
      income: number;
      name: string;
    }> = [];
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
  const netCashflow = totalIncome - totalExpense;
  const expenseShare =
    totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-3 flex select-none items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <Wallet className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200">
            Flux de Trésorerie
          </span>
          <span className="hidden text-[11px] text-zinc-400 sm:inline">
            Entrées, sorties et résultat net
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector Tabs */}
          <div className="flex items-center rounded-md bg-zinc-250/20 p-0.5 ring-1 ring-zinc-200/50 dark:bg-zinc-800/50 dark:ring-zinc-850">
            {(["7j", "30j", "90j"] as const).map((p) => (
              <button
                className={cn(
                  "cursor-pointer rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider transition-colors",
                  period === p
                    ? "bg-white text-zinc-800 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
                key={p}
                onClick={() => setPeriod(p)}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>

          <button
            className="cursor-pointer font-medium text-[11px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            type="button"
          >
            Voir plus
          </button>
        </div>
      </div>

      {/* Inner White Box */}
      <div className="relative flex flex-1 flex-col justify-between rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        {/* KPI Headers */}
        <div className="mb-5 grid select-none divide-y divide-zinc-100 border-zinc-100 border-b pb-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800/80 dark:border-zinc-800/80">
          <div className="min-w-0 pb-4 sm:pr-5 sm:pb-0">
            <div className="flex items-center gap-1.5 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#93c5fd" }}
              />
              Entrées
            </div>
            <div className="mt-1 truncate font-bold font-sans text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {formatDZD(totalIncome)}
            </div>
          </div>
          <div className="min-w-0 py-4 sm:px-5 sm:py-0">
            <div className="flex items-center gap-1.5 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#10b981" }}
              />
              Résultat net
            </div>
            <div
              className={cn(
                "mt-1 truncate font-bold font-sans text-2xl tracking-tight",
                netCashflow >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {netCashflow >= 0 ? "+" : ""}
              {formatDZD(netCashflow)}
            </div>
          </div>
          <div className="min-w-0 pt-4 sm:pt-0 sm:pl-5">
            <div className="flex items-center gap-1.5 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "#2563eb" }}
              />
              Sorties
            </div>
            <div className="mt-1 truncate font-bold font-sans text-2xl text-zinc-900 tracking-tight dark:text-zinc-100">
              {formatDZD(totalExpense)}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900/60">
          <span className="font-medium text-[11px] text-zinc-500 dark:text-zinc-400">
            Poids des sorties sur la période
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-500"
                style={{ width: `${expenseShare}%` }}
              />
            </div>
            <span className="w-9 text-right font-mono font-semibold text-[11px] text-zinc-600 dark:text-zinc-300">
              {expenseShare.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Chart — exact shadcn/ui pattern */}
        <ChartContainer
          className="aspect-auto h-[220px] w-full"
          config={chartConfig}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              axisLine={false}
              dataKey="name"
              tickLine={false}
              tickMargin={10}
            />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              shape={(props: CashflowBarShapeProps) => {
                const { x, y, width, height, payload } = props;
                const hasExpense = (payload?.expense ?? 0) > 0;
                const radius: [number, number, number, number] = hasExpense
                  ? [0, 0, 0, 0]
                  : [4, 4, 0, 0];
                return (
                  <Rectangle
                    fill="var(--color-income)"
                    height={height}
                    radius={radius}
                    width={width}
                    x={x}
                    y={y}
                  />
                );
              }}
              stackId="a"
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              shape={(props: CashflowBarShapeProps) => {
                const { x, y, width, height } = props;
                return (
                  <Rectangle
                    fill="var(--color-expense)"
                    height={height}
                    radius={[4, 4, 0, 0]}
                    width={width}
                    x={x}
                    y={y}
                  />
                );
              }}
              stackId="a"
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
