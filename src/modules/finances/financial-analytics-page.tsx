import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, Line, XAxis } from "recharts"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import MotivationalHeader from "@/components/MotivationalHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  net: {
    label: "Solde net",
    color: "var(--chart-3)",
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

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardDescription>Bloc analytique</CardDescription>
              <CardTitle className="text-2xl tracking-[-0.04em]">
                Activité financière multi-lignes
              </CardTitle>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>Encaissements: {formatDZD(totals.income * 100)}</span>
                <span>Décaissements: {formatDZD(totals.expense * 100)}</span>
                <span>Solde net: {formatDZD(totals.net * 100)}</span>
              </div>
            </div>
            <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
              <TabsList>
                <TabsTrigger value="7d">7J</TabsTrigger>
                <TabsTrigger value="30d">30J</TabsTrigger>
                <TabsTrigger value="90d">90J</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card shadow-xs">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Encaissements</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatDZD(totals.income * 100)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-xs">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Décaissements</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatDZD(totals.expense * 100)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-xs">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Pic de solde</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatDZD(peakNet * 100)}
                </div>
              </CardContent>
            </Card>
          </div>

          <ChartContainer
            config={chartConfig}
            className="h-[420px] w-full"
            initialDimension={{ width: 960, height: 420 }}
          >
            <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12, top: 16, bottom: 0 }}>
              <defs>
                <linearGradient id="finance-income-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex min-w-[150px] items-center justify-between gap-3">
                        <span>{name}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatDZD(Number(value) * 100)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-income)"
                fill="url(#finance-income-fill)"
                strokeWidth={2.5}
              />
              <Line type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
