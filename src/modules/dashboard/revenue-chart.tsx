"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Coins01Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"

const chartConfig: ChartConfig = {
  encaissements: {
    label: "Encaissements",
    color: "var(--chart-1)",
  },
  depenses: {
    label: "Dépenses",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

function formatAmount(value: number) {
  return `${(value / 1000).toFixed(1)}k`
}

type RevenuePoint = {
  time: string
  encaissements: number
  depenses: number
}

export function RevenueChart({
  data,
  onNavigate,
}: {
  data: RevenuePoint[]
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = React.useMemo(() => {
    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    
    if (sortedData.length === 0) return []
    
    // Get the most recent date from data
    const lastDate = new Date(sortedData[sortedData.length - 1].time)
    
    // Calculate start date based on timeRange
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    
    const startDate = new Date(lastDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    // Filter data to include only dates within the range
    return sortedData.filter((item) => {
      const itemDate = new Date(item.time)
      return itemDate >= startDate && itemDate <= lastDate
    })
  }, [data, timeRange])

  const totals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, d) => ({
        encaissements: acc.encaissements + d.encaissements,
        depenses: acc.depenses + d.depenses,
      }),
      { encaissements: 0, depenses: 0 }
    )
  }, [filteredData])

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <HugeiconsIcon
                icon={Coins01Icon}
                strokeWidth={2}
                className="size-5 text-emerald-600"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {t("dashboard.revenue.title", { defaultValue: "Flux financiers" })}
                </CardTitle>
                <div className="flex gap-1.5">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-0 bg-emerald-500/10 text-emerald-600 text-xs font-medium"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" />
                    +{formatAmount(totals.encaissements)}k
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-0 bg-rose-500/10 text-rose-600 text-xs font-medium"
                  >
                    <span className="size-2 rounded-full bg-rose-500" />
                    -{formatAmount(totals.depenses)}k
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-xs">
                {t("dashboard.revenue.description", { defaultValue: "Évolution des flux financiers" })}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="hidden w-[160px] rounded-lg sm:flex"
                aria-label="Sélectionner une période"
              >
                <SelectValue placeholder="90 derniers jours" />
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
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground"
                onClick={onNavigate}
              >
                {t("dashboard.viewDetails", { defaultValue: "Voir détails" })}
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Button>
            </CardAction>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillEncaissements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-encaissements)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-encaissements)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDepenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-depenses)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-depenses)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
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
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("fr-FR", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                  formatter={(value) => (
                    <span className="font-mono font-medium">
                      {Number(value).toLocaleString("fr-DZ")} DA
                    </span>
                  )}
                />
              }
            />
            <Area
              dataKey="depenses"
              type="natural"
              fill="url(#fillDepenses)"
              stroke="var(--color-depenses)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="encaissements"
              type="natural"
              fill="url(#fillEncaissements)"
              stroke="var(--color-encaissements)"
              strokeWidth={2}
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
