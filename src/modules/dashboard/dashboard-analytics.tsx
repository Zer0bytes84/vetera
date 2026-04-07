import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

type SeriesPoint = {
  label: string
  revenue?: number
  expenses?: number
  net?: number
  newPatients?: number
  returningPatients?: number
  activePatients?: number
  completedAppointments?: number
}

type TrafficSourceItem = {
  label: string
  value: number
}

type ProfileShareItem = {
  label: string
  value: number
  color: string
}

type MetricCard = {
  label: string
  value: string
  delta: string
  positive?: boolean
}

export type DashboardAnalyticsProps = {
  financeSeries: {
    month: SeriesPoint[]
    week: SeriesPoint[]
    primary: MetricCard
    secondary: MetricCard
  }
  visitorsSeries: {
    month: SeriesPoint[]
    week: SeriesPoint[]
    primary: MetricCard
    secondary: MetricCard
  }
  trafficSources: TrafficSourceItem[]
  customerTrend: SeriesPoint[]
  profileShare: ProfileShareItem[]
}

const financeConfig = {
  revenue: {
    label: "Encaissements",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Décaissements",
    color: "var(--chart-4)",
  },
  net: {
    label: "Solde net",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const visitorsConfig = {
  newPatients: {
    label: "Nouveaux patients",
    color: "var(--chart-2)",
  },
  returningPatients: {
    label: "Patients de retour",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

const customerConfig = {
  activePatients: {
    label: "Patients actifs",
    color: "var(--chart-1)",
  },
  completedAppointments: {
    label: "Consultations clôturées",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

function MetricCardView({ metric }: { metric: MetricCard }) {
  return (
    <div className="rounded-3xl border bg-muted/35 p-4">
      <div className="text-sm font-medium text-muted-foreground">
        {metric.label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
        {metric.value}
      </div>
      <div
        className={cn(
          "mt-2 text-sm",
          metric.positive ? "text-emerald-600" : "text-destructive"
        )}
      >
        {metric.delta}
      </div>
    </div>
  )
}

export function DashboardAnalytics({
  financeSeries,
  visitorsSeries,
  trafficSources,
  customerTrend,
  profileShare,
}: DashboardAnalyticsProps) {
  const [financeView, setFinanceView] = React.useState<"month" | "week">(
    "month"
  )
  const [visitorsView, setVisitorsView] = React.useState<"month" | "week">(
    "week"
  )

  const financeData = financeSeries[financeView]
  const visitorsData = visitorsSeries[visitorsView]

  return (
    <div className="grid gap-6 px-4 lg:px-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Performance financière</CardTitle>
            <div className="inline-flex rounded-md bg-muted p-1">
              <Button
                variant={financeView === "month" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={() => setFinanceView("month")}
              >
                Mois
              </Button>
              <Button
                variant={financeView === "week" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={() => setFinanceView("week")}
              >
                Semaine
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Encaissements et équilibre de trésorerie sur la période.
            </CardDescription>
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch">
              <div className="space-y-4">
                <MetricCardView metric={financeSeries.primary} />
                <MetricCardView metric={financeSeries.secondary} />
              </div>
              <ChartContainer
                config={financeConfig}
                className="h-[320px] w-full"
                initialDimension={{ width: 760, height: 320 }}
              >
                <BarChart data={financeData} barGap={12}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="revenue"
                    fill="var(--color-revenue)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Flux patients</CardTitle>
            <div className="inline-flex rounded-md bg-muted p-1">
              <Button
                variant={visitorsView === "month" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={() => setVisitorsView("month")}
              >
                Mois
              </Button>
              <Button
                variant={visitorsView === "week" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={() => setVisitorsView("week")}
              >
                Semaine
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Nouveaux dossiers et retours à la clinique au fil du temps.
            </CardDescription>
            <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-stretch">
              <div className="space-y-4">
                <MetricCardView metric={visitorsSeries.primary} />
                <MetricCardView metric={visitorsSeries.secondary} />
              </div>
              <ChartContainer
                config={visitorsConfig}
                className="h-[320px] w-full"
                initialDimension={{ width: 760, height: 320 }}
              >
                <AreaChart data={visitorsData}>
                  <defs>
                    <linearGradient
                      id="visitors-new"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-newPatients)"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-newPatients)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient
                      id="visitors-returning"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-returningPatients)"
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-returningPatients)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="newPatients"
                    stroke="var(--color-newPatients)"
                    fill="url(#visitors-new)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="returningPatients"
                    stroke="var(--color-returningPatients)"
                    fill="url(#visitors-returning)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des actes</CardTitle>
            <CardDescription>
              Vue rapide des motifs les plus fréquents sur la période active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trafficSources.map((source) => (
              <div key={source.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{source.label}</span>
                  <span className="text-muted-foreground">{source.value}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${source.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendance patients</CardTitle>
            <CardDescription>
              Évolution du volume patient et des consultations clôturées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={customerConfig}
              className="h-[260px] w-full"
              initialDimension={{ width: 480, height: 260 }}
            >
              <AreaChart data={customerTrend}>
                <defs>
                  <linearGradient
                    id="customer-active"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-activePatients)"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-activePatients)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                  <linearGradient
                    id="customer-completed"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-completedAppointments)"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-completedAppointments)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="activePatients"
                  stroke="var(--color-activePatients)"
                  fill="url(#customer-active)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="completedAppointments"
                  stroke="var(--color-completedAppointments)"
                  fill="url(#customer-completed)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil patients</CardTitle>
            <CardDescription>
              Répartition des espèces suivies dans la base active.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                dogs: { label: "Chiens", color: "var(--chart-1)" },
                cats: { label: "Chats", color: "var(--chart-2)" },
                others: { label: "Autres", color: "var(--chart-3)" },
              }}
              className="h-[260px] w-full"
              initialDimension={{ width: 360, height: 260 }}
            >
              <PieChart>
                <Pie
                  data={profileShare}
                  dataKey="value"
                  innerRadius={64}
                  outerRadius={92}
                  paddingAngle={4}
                >
                  {profileShare.map((item) => (
                    <Cell key={item.label} fill={item.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid gap-2">
              {profileShare.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
