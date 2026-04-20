import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import MotivationalHeader from "@/components/MotivationalHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTransactionsRepository } from "@/data/repositories"
import type { View } from "@/types"
import { formatDZD } from "@/utils/currency"

type RangeKey = "7d" | "30d" | "90d"

const chartConfig = {
  income: {
    label: "Encaissements",
    color: "var(--chart-1)",
  },
  expense: {
    label: "Décaissements",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export default function FinancialAnalyticsPage({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  const [range, setRange] = useState<RangeKey>("30d")
  const { data: transactions } = useTransactionsRepository()

  const chartData = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const today = startOfDay(new Date())
    const start = addDays(today, -(days - 1))

    return Array.from({ length: days }, (_, index) => {
      const date = addDays(start, index)
      const dayKey = date.toISOString().slice(0, 10)

      const dayTransactions = transactions.filter((transaction) => {
        const txDate = startOfDay(new Date(transaction.date))
        return txDate.getTime() === date.getTime() && transaction.status === "paid"
      })

      const income = dayTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0)
      const expense = dayTransactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0)

      return {
        date: dayKey,
        label: date.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: days > 30 ? "short" : undefined,
        }),
        income: Math.round(income / 100),
        expense: Math.round(expense / 100),
        net: Math.round((income - expense) / 100),
      }
    })
  }, [range, transactions])

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, item) => {
        acc.income += item.income
        acc.expense += item.expense
        acc.net += item.net
        return acc
      },
      { income: 0, expense: 0, net: 0 }
    )
  }, [chartData])

  const peakNet = useMemo(
    () => chartData.reduce((max, item) => Math.max(max, item.net), 0),
    [chartData]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <MotivationalHeader
          section="finances"
          title="Analyse des flux"
          subtitle="Vue large des encaissements, décaissements et du solde net sur la période active."
        />
        <Button variant="outline" onClick={() => onNavigate("finances")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Retour aux finances
        </Button>
      </div>

      <Card className="overflow-hidden pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Encaissements</CardTitle>
            <CardDescription>
              Lecture journalière des encaissements réglés et décaissements sur la période active.
            </CardDescription>
          </div>
          <CardAction>
            <Select value={range} onValueChange={(value) => setRange(value as RangeKey)}>
              <SelectTrigger
                className="hidden w-[170px] rounded-lg sm:ml-auto sm:flex"
                aria-label="Sélectionner une période"
              >
                <SelectValue placeholder="30 derniers jours" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  90 derniers jours
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  30 derniers jours
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  7 derniers jours
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Encaissements
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                {formatDZD(totals.income * 100)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Décaissements
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                {formatDZD(totals.expense * 100)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Pic de solde
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                {formatDZD(peakNet * 100)}
              </p>
            </div>
          </div>

          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
            initialDimension={{ width: 960, height: 320 }}
          >
            <AreaChart accessibilityLayer data={chartData}>
              <defs>
                <linearGradient id="finance-income-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.72} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="finance-expense-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("fr-FR", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("fr-FR", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                    formatter={(value, name) => [
                      formatDZD(Number(value) * 100),
                      name,
                    ]}
                  />
                }
              />
              <Area
                dataKey="expense"
                type="natural"
                fill="url(#finance-expense-fill)"
                stroke="var(--color-expense)"
                stackId="a"
                strokeWidth={2}
              />
              <Area
                dataKey="income"
                type="natural"
                fill="url(#finance-income-fill)"
                stroke="var(--color-income)"
                stackId="a"
                strokeWidth={2.2}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
