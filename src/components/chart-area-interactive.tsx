import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export type ClinicalActivityPoint = {
  date: string
  consultations: number
  interventions: number
}

const fallbackData: ClinicalActivityPoint[] = [
  { date: "2026-01-05", consultations: 8, interventions: 1 },
  { date: "2026-01-12", consultations: 11, interventions: 2 },
  { date: "2026-01-19", consultations: 10, interventions: 1 },
  { date: "2026-01-26", consultations: 14, interventions: 3 },
  { date: "2026-02-02", consultations: 12, interventions: 2 },
  { date: "2026-02-09", consultations: 15, interventions: 2 },
  { date: "2026-02-16", consultations: 13, interventions: 1 },
  { date: "2026-02-23", consultations: 17, interventions: 3 },
]

const chartConfig = {
  consultations: {
    label: "Consultations",
    color: "var(--chart-1)",
  },
  interventions: {
    label: "Interventions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const PERIOD_LABELS: Record<string, string> = {
  "7d": "7J",
  "30d": "30J",
  "90d": "90J",
}

export function ChartAreaInteractive({
  data = fallbackData,
}: {
  data?: ClinicalActivityPoint[]
}) {
  const [period, setPeriod] = React.useState("90d")
  const [chartType, setChartType] = React.useState("area")

  const filteredData = React.useMemo(() => {
    const maxDate = new Date(
      data.length ? data[data.length - 1].date : fallbackData[fallbackData.length - 1].date
    )
    const startDate = new Date(maxDate)

    if (period === "30d") {
      startDate.setDate(startDate.getDate() - 29)
    } else if (period === "7d") {
      startDate.setDate(startDate.getDate() - 6)
    } else {
      startDate.setDate(startDate.getDate() - 89)
    }

    return data.filter((item) => new Date(item.date) >= startDate)
  }, [data, period])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Vue d&apos;activité</CardTitle>
        <CardDescription>
          Consultations et interventions sur la période active
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <ToggleGroup
            multiple={false}
            value={[chartType]}
            onValueChange={(value) => {
              setChartType((value[0] as "area" | "line" | undefined) ?? "area")
            }}
            variant="outline"
            className="hidden @[767px]/card:flex"
          >
            <ToggleGroupItem value="area">Aire</ToggleGroupItem>
            <ToggleGroupItem value="line">Ligne</ToggleGroupItem>
          </ToggleGroup>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28" size="sm">
              <SelectValue>{PERIOD_LABELS[period] ?? "90J"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="7d">7J</SelectItem>
                <SelectItem value="30d">30J</SelectItem>
                <SelectItem value="90d">90J</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="h-[250px] w-full"
          initialDimension={{ width: 960, height: 250 }}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="dashboard-consultations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-consultations)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-consultations)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="dashboard-interventions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-interventions)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-interventions)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              }
            />
            <YAxis tickLine={false} axisLine={false} width={28} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="consultations"
              stroke="var(--color-consultations)"
              fill="url(#dashboard-consultations)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="interventions"
              stroke="var(--color-interventions)"
              fill="url(#dashboard-interventions)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
