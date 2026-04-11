import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import { 
  UserGroupIcon, 
  UserAddIcon, 
  ArrowRight01Icon,
  TrendingUp,
  UserMultipleIcon,
  File01Icon,
} from "@hugeicons/core-free-icons"

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
import { cn } from "@/lib/utils"
import type { View } from "@/types"

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
  view?: View
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
  onNavigate?: (view: View) => void
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

import type { IconSvgElement } from "@hugeicons/react"

function MetricCardView({ 
  metric, 
  icon, 
  color = "blue",
  subtitle 
}: { 
  metric: MetricCard
  icon?: IconSvgElement
  color?: "blue" | "emerald" | "violet" | "amber"
  subtitle?: string
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-600",
  }
  
  return (
    <div className="rounded-xl border bg-muted/20 p-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {metric.label}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            {metric.value}
          </div>
          {subtitle && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorClasses[color])}>
            <HugeiconsIcon icon={icon} strokeWidth={1.5} className="h-4 w-4" />
          </div>
        )}
      </div>
      <div
        className={cn(
          "mt-2 text-xs font-medium",
          metric.positive ? "text-emerald-600" : "text-rose-600"
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
  onNavigate,
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
      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Performance financière</CardTitle>
            <CardDescription>
              Encaissements, décaissements et solde net sur la période.
            </CardDescription>
          </div>
          <Select value={financeView} onValueChange={(value) => setFinanceView(value as "month" | "week")}>
            <SelectTrigger className="w-[132px] rounded-lg sm:ml-auto" size="sm">
              <SelectValue>
                {financeView === "month" ? "Mensuel" : "Hebdomadaire"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectGroup>
                <SelectItem value="month">Mensuel</SelectItem>
                <SelectItem value="week">Hebdomadaire</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-4">
            <MetricCardView metric={financeSeries.primary} />
            <MetricCardView metric={financeSeries.secondary} />
          </div>
          <ChartContainer
            config={financeConfig}
            className="h-[340px] w-full"
            initialDimension={{ width: 1080, height: 340 }}
          >
            <AreaChart data={financeData} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="finance-revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="finance-expenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={42} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="natural"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="url(#finance-revenue)"
                strokeWidth={2.2}
              />
              <Area
                type="natural"
                dataKey="expenses"
                stroke="var(--color-expenses)"
                fill="url(#finance-expenses)"
                strokeWidth={2}
              />
              <Line
                type="natural"
                dataKey="net"
                stroke="var(--color-net)"
                strokeWidth={2.2}
                dot={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} className="h-5 w-5 text-blue-600" />
            </div>
            <div className="grid flex-1 gap-0.5">
              <CardTitle>Registre clinique</CardTitle>
              <CardDescription>
                Nouveaux dossiers et patients de retour dans le temps.
              </CardDescription>
            </div>
          </div>
          <Select value={visitorsView} onValueChange={(value) => setVisitorsView(value as "month" | "week")}>
            <SelectTrigger className="w-[132px] rounded-lg sm:ml-auto" size="sm">
              <SelectValue>
                {visitorsView === "month" ? "Mensuel" : "Hebdomadaire"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectGroup>
                <SelectItem value="month">Mensuel</SelectItem>
                <SelectItem value="week">Hebdomadaire</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-5 px-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-4">
            <MetricCardView 
              metric={visitorsSeries.primary} 
              icon={UserAddIcon} 
              color="blue"
              subtitle="Nouveaux ce mois"
            />
            <MetricCardView 
              metric={visitorsSeries.secondary} 
              icon={UserGroupIcon} 
              color="emerald"
              subtitle="Patients récurrents"
            />
            {/* Ratio indicator */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
              <span className="text-xs text-muted-foreground">Ratio nouveaux/fidèles</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 border border-white" />
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-white" />
                </div>
                <span className="text-sm font-semibold">
                  {(() => {
                    const newP = parseInt(visitorsSeries.primary.value.replace(/\D/g, '')) || 0
                    const retP = parseInt(visitorsSeries.secondary.value.replace(/\D/g, '')) || 0
                    const total = newP + retP
                    return total > 0 ? `${Math.round((newP / total) * 100)}%` : '0%'
                  })()}
                </span>
              </div>
            </div>
          </div>
          <ChartContainer
            config={visitorsConfig}
            className="h-[340px] w-full"
            initialDimension={{ width: 1080, height: 340 }}
          >
            <AreaChart data={visitorsData} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
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
                    stopOpacity={0.48}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-newPatients)"
                    stopOpacity={0.05}
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
                    stopOpacity={0.34}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-returningPatients)"
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={42} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="natural"
                dataKey="newPatients"
                stroke="var(--color-newPatients)"
                fill="url(#visitors-new)"
                strokeWidth={2.2}
              />
              <Area
                type="natural"
                dataKey="returningPatients"
                stroke="var(--color-returningPatients)"
                fill="url(#visitors-returning)"
                strokeWidth={2.2}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
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
                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className={cn(
                      "font-medium transition-colors",
                      source.view && onNavigate
                        ? "cursor-pointer hover:text-primary"
                        : "cursor-default"
                    )}
                    onClick={() => {
                      if (source.view && onNavigate) {
                        onNavigate(source.view)
                      }
                    }}
                  >
                    {source.label}
                  </button>
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
