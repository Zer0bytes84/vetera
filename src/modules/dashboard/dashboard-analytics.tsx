import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

import type { ClinicalActivityPoint } from "@/components/chart-area-interactive"

type WeeklyActivityPoint = {
  label: string
  consultations: number
  interventions: number
}

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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

export function DashboardAnalytics({
  data,
  weeklyData,
  referenceDate,
}: {
  data: ClinicalActivityPoint[]
  weeklyData: WeeklyActivityPoint[]
  referenceDate: string
}) {
  const [period, setPeriod] = React.useState("90d")
  const [chartType, setChartType] = React.useState("area")

  const filteredData = React.useMemo(() => {
    const maxDate = new Date(referenceDate)
    const startDate = new Date(maxDate)

    if (period === "30d") {
      startDate.setDate(startDate.getDate() - 29)
    } else if (period === "7d") {
      startDate.setDate(startDate.getDate() - 6)
    } else {
      startDate.setDate(startDate.getDate() - 89)
    }

    return data.filter((item) => new Date(item.date) >= startDate)
  }, [data, period, referenceDate])

  const mixData = React.useMemo(() => {
    const consultations = filteredData.reduce(
      (sum, item) => sum + item.consultations,
      0
    )
    const interventions = filteredData.reduce(
      (sum, item) => sum + item.interventions,
      0
    )
    const total = consultations + interventions

    if (!total) {
      return [
        { name: "Consultations", value: 0, color: "var(--chart-1)" },
        { name: "Interventions", value: 0, color: "var(--chart-2)" },
      ]
    }

    return [
      {
        name: "Consultations",
        value: Math.round((consultations / total) * 100),
        color: "var(--chart-1)",
      },
      {
        name: "Interventions",
        value: Math.round((interventions / total) * 100),
        color: "var(--chart-2)",
      },
    ]
  }, [filteredData])

  return (
    <div className="grid gap-6 px-4 lg:grid-cols-3 lg:px-6">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle>Vue d&apos;activité</CardTitle>
            <CardDescription>
              Consultations et interventions sur la période active
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <ToggleGroup
              multiple={false}
              value={[chartType]}
              onValueChange={(value) => {
                setChartType((value[0] as "area" | "line" | undefined) ?? "area")
              }}
              size="sm"
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
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="h-[320px] w-full"
            initialDimension={{ width: 960, height: 320 }}
          >
            {chartType === "area" ? (
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
                  tickFormatter={formatShortDate}
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
            ) : (
              <LineChart data={filteredData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={28}
                  tickFormatter={formatShortDate}
                />
                <YAxis tickLine={false} axisLine={false} width={28} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
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
                <Line
                  type="monotone"
                  dataKey="consultations"
                  stroke="var(--color-consultations)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="interventions"
                  stroke="var(--color-interventions)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            )}
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Répartition clinique</CardTitle>
          <CardDescription>
            Poids relatif des consultations et interventions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="h-[260px] w-full"
            initialDimension={{ width: 360, height: 260 }}
          >
            <PieChart>
              <Pie
                data={mixData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={4}
                dataKey="value"
              >
                {mixData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
            </PieChart>
          </ChartContainer>
          <div className="mt-4 flex justify-center gap-4">
            {mixData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Cadence hebdomadaire</CardTitle>
          <CardDescription>
            Distribution de l&apos;activité sur les 7 derniers jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="bar">Barres</TabsTrigger>
              <TabsTrigger value="stacked">Empilé</TabsTrigger>
            </TabsList>
            <TabsContent value="bar">
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full"
                initialDimension={{ width: 960, height: 250 }}
              >
                <BarChart data={weeklyData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="consultations"
                    fill="var(--color-consultations)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="interventions"
                    fill="var(--color-interventions)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="stacked">
              <ChartContainer
                config={chartConfig}
                className="h-[250px] w-full"
                initialDimension={{ width: 960, height: 250 }}
              >
                <BarChart data={weeklyData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="consultations"
                    stackId="activity"
                    fill="var(--color-consultations)"
                  />
                  <Bar
                    dataKey="interventions"
                    stackId="activity"
                    fill="var(--color-interventions)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
