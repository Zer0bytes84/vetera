import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClinicalActivityPoint } from "@/components/chart-area-interactive"

const chartConfig = {
  consultations: {
    label: "Consultations",
    color: "var(--chart-1)",
  },
  interventions: {
    label: "Actes",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const PERIOD_LABELS: Record<string, string> = {
  "7d": "7J",
  "30d": "30J",
  "90d": "90J",
}

export function DashboardOverviewAnalytics({
  data,
  referenceDate,
}: {
  data: ClinicalActivityPoint[]
  referenceDate: string
}) {
  const [timeRange, setTimeRange] = React.useState("90d")

  const filteredData = React.useMemo(() => {
    const maxDate = new Date(referenceDate)
    const startDate = new Date(maxDate)

    if (timeRange === "30d") {
      startDate.setDate(startDate.getDate() - 30)
    } else if (timeRange === "7d") {
      startDate.setDate(startDate.getDate() - 7)
    } else {
      startDate.setDate(startDate.getDate() - 90)
    }

    return data.filter((item) => new Date(item.date) >= startDate)
  }, [data, referenceDate, timeRange])

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Vue d&apos;activité</CardTitle>
          <CardDescription>
            Consultations et actes réalisés sur la période active
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[112px] rounded-lg sm:ml-auto"
            size="sm"
            aria-label="Sélectionner une période"
          >
            <SelectValue>{PERIOD_LABELS[timeRange] ?? "7J"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectGroup>
              <SelectItem value="90d">90J</SelectItem>
              <SelectItem value="30d">30J</SelectItem>
              <SelectItem value="7d">7J</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
          initialDimension={{ width: 1200, height: 300 }}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillConsultations" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-consultations)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-consultations)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillInterventions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-interventions)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-interventions)"
                  stopOpacity={0.1}
                />
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
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("fr-FR", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="interventions"
              type="natural"
              fill="url(#fillInterventions)"
              stroke="var(--color-interventions)"
              stackId="a"
            />
            <Area
              dataKey="consultations"
              type="natural"
              fill="url(#fillConsultations)"
              stroke="var(--color-consultations)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
