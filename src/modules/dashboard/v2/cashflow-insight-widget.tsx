import { ArrowUpRight, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/db";
import { buildCashflowSeries, formatCurrency } from "./model";
import { WidgetShell } from "./widget-shell";

const chartConfig = {
  income: { label: "Revenus", color: "#10b981" },
  expense: { label: "Dépenses", color: "#fb7185" },
  net: { label: "Solde", color: "#0f172a" },
} satisfies ChartConfig;

type Period = 14 | 30 | 90;

export function CashflowInsightWidget({
  transactions,
  referenceDate,
  onOpenFinances,
}: {
  transactions: Transaction[];
  referenceDate: Date;
  onOpenFinances?: () => void;
}) {
  const [period, setPeriod] = useState<Period>(30);
  const series = useMemo(
    () => buildCashflowSeries(transactions, referenceDate, period),
    [period, referenceDate, transactions]
  );
  const totals = useMemo(
    () =>
      series.reduce(
        (accumulator, point) => ({
          income: accumulator.income + point.income,
          expense: accumulator.expense + point.expense,
          net: accumulator.net + point.net,
        }),
        { income: 0, expense: 0, net: 0 }
      ),
    [series]
  );
  const chartData =
    period === 90 ? series.filter((_, index) => index % 3 === 0) : series;

  return (
    <WidgetShell
      action={
        <div className="flex rounded-full border border-zinc-200/80 bg-zinc-50 p-0.5 dark:border-white/10 dark:bg-white/5">
          {([14, 30, 90] as const).map((value) => (
            <button
              aria-pressed={period === value}
              className={cn(
                "h-6 rounded-full px-2 font-medium text-[10px] transition-colors",
                period === value
                  ? "bg-white text-foreground shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={value}
              onClick={() => setPeriod(value)}
              type="button"
            >
              {value} j
            </button>
          ))}
        </div>
      }
      className="min-h-[410px]"
      contentClassName="p-0"
      description="Encaissements et dépenses réellement payés"
      icon={Landmark}
      iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
      title="Trésorerie"
    >
      <div className="grid grid-cols-3 divide-x divide-zinc-200/70 border-zinc-200/70 border-b dark:divide-white/8 dark:border-white/8">
        <div className="px-4 py-4">
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingUp className="size-3 text-emerald-500" /> Revenus
          </p>
          <p className="mt-1.5 truncate font-semibold text-lg tabular-nums tracking-[-0.03em]">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <TrendingDown className="size-3 text-rose-500" /> Dépenses
          </p>
          <p className="mt-1.5 truncate font-semibold text-lg tabular-nums tracking-[-0.03em]">
            {formatCurrency(totals.expense)}
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[10px] text-muted-foreground">Solde net</p>
          <p
            className={cn(
              "mt-1.5 truncate font-semibold text-lg tabular-nums tracking-[-0.03em]",
              totals.net < 0 && "text-rose-600 dark:text-rose-300"
            )}
          >
            {formatCurrency(totals.net)}
          </p>
        </div>
      </div>

      <div className="px-3 pt-5 pb-2 sm:px-5">
        <ChartContainer
          className="h-[220px] w-full"
          config={chartConfig}
          initialDimension={{ width: 720, height: 220 }}
        >
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -18, right: 6, top: 8 }}
          >
            <defs>
              <linearGradient
                id="dashboard-v2-income"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.24}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 5" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              minTickGap={28}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis axisLine={false} tickLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="income"
              fill="url(#dashboard-v2-income)"
              stroke="var(--color-income)"
              strokeWidth={2.2}
              type="monotone"
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              opacity={0.42}
              radius={[3, 3, 0, 0]}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 text-[11px] text-muted-foreground dark:border-white/8">
        <span>
          {
            transactions.filter(
              (transaction) => transaction.status === "pending"
            ).length
          }{" "}
          écriture(s) en attente
        </span>
        <Button onClick={onOpenFinances} size="xs" variant="ghost">
          Ouvrir les finances
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </WidgetShell>
  );
}
