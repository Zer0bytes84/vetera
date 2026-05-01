"use client"

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
  TrendingUp,
  TrendingDown,
  DollarCircleIcon,
  UserMultipleIcon,
  Activity01Icon,
  ChartIcon,
  PieChartIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Calendar01Icon,
  Clock01Icon,
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { View } from "@/types"
import { SectionCardsPremium, type SectionCardItem } from "@/components/section-cards-premium"

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

export type DashboardAnalyticsV2Props = {
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
    color: "oklch(0.65 0.18 150)",
  },
  expenses: {
    label: "Décaissements",
    color: "oklch(0.50 0.02 230)",
  },
  net: {
    label: "Solde net",
    color: "oklch(0.65 0.15 35)",
  },
} satisfies ChartConfig

const visitorsConfig = {
  newPatients: {
    label: "Nouveaux patients",
    color: "oklch(0.65 0.15 35)",
  },
  returningPatients: {
    label: "Patients de retour",
    color: "oklch(0.65 0.12 220)",
  },
} satisfies ChartConfig

const customerConfig = {
  activePatients: {
    label: "Patients actifs",
    color: "oklch(0.65 0.12 220)",
  },
  completedAppointments: {
    label: "Consultations clôturées",
    color: "oklch(0.60 0.18 280)",
  },
} satisfies ChartConfig

const accentMap = {
  emerald: {
    card: "",
    header: "border-b border-border/35 bg-muted/10",
    iconWrap: "bg-emerald-500/12 text-emerald-600",
  },
  blue: {
    card: "",
    header: "border-b border-border/35 bg-muted/10",
    iconWrap: "bg-blue-500/12 text-blue-600",
  },
  violet: {
    card: "",
    header: "border-b border-border/35 bg-muted/10",
    iconWrap: "bg-violet-500/12 text-violet-600",
  },
  cyan: {
    card: "",
    header: "border-b border-border/35 bg-muted/10",
    iconWrap: "bg-cyan-500/12 text-cyan-600",
  },
  rose: {
    card: "",
    header: "border-b border-border/35 bg-muted/10",
    iconWrap: "bg-rose-500/12 text-rose-600",
  },
} as const

export function DashboardAnalyticsV2({
  financeSeries,
  visitorsSeries,
  trafficSources,
  customerTrend,
  profileShare,
  onNavigate,
}: DashboardAnalyticsV2Props) {
  const [financeView, setFinanceView] = React.useState<"month" | "week">("month")
  const [visitorsView, setVisitorsView] = React.useState<"month" | "week">("week")

  const financeData = financeSeries[financeView]
  const visitorsData = visitorsSeries[visitorsView]

  // Generate analytics summary cards
  const analyticsCards = React.useMemo<SectionCardItem[]>(() => {
    const compactDelta = (value: string) =>
      value
        .replace("vs mois précédent", "vs mois préc.")
        .replace("sur le retour", "retour")
        .replace("sur le suivi", "suivi")
        .replace("sur le mois", "ce mois")

    const generateSparkline = (base: number) => 
      Array.from({ length: 8 }, () => base + Math.floor(Math.random() * 4) - 2)

    return [
      {
        title: "Revenus",
        value: financeSeries.primary.value,
        badge: compactDelta(financeSeries.primary.delta),
        trend: financeSeries.primary.positive ? "up" : "down",
        summary: "Encaissements",
        icon: ArrowUp01Icon,
        sparklineData: generateSparkline(parseInt(financeSeries.primary.value.replace(/\D/g, '')) / 100 || 50),
        color: "emerald",
      },
      {
        title: "Dépenses",
        value: financeSeries.secondary.value,
        badge: compactDelta(financeSeries.secondary.delta),
        trend: financeSeries.secondary.positive ? "up" : "down",
        summary: "Décaissements",
        icon: ArrowDown01Icon,
        sparklineData: generateSparkline(parseInt(financeSeries.secondary.value.replace(/\D/g, '')) / 100 || 30),
        color: "red",
      },
      {
        title: "Nouveaux pts",
        value: visitorsSeries.primary.value,
        badge: compactDelta(visitorsSeries.primary.delta),
        trend: visitorsSeries.primary.positive ? "up" : "down",
        summary: "Acquisitions",
        icon: UserMultipleIcon,
        sparklineData: generateSparkline(parseInt(visitorsSeries.primary.value) || 10),
        color: "slate",
      },
      {
        title: "Fidèles",
        value: visitorsSeries.secondary.value,
        badge: compactDelta(visitorsSeries.secondary.delta),
        trend: visitorsSeries.secondary.positive ? "up" : "down",
        summary: "Retours",
        icon: Activity01Icon,
        sparklineData: generateSparkline(parseInt(visitorsSeries.secondary.value) || 20),
        color: "violet",
      },
    ]
  }, [financeSeries, visitorsSeries])

  return (
    <div className="grid gap-6 px-4 lg:px-6">
      {/* Summary Cards Row */}
      <SectionCardsPremium items={analyticsCards} />

      {/* Main Charts Row */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Financial Performance Card */}
        <Card className={cn("relative overflow-hidden", accentMap.emerald.card)}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/[0.05] via-emerald-500/[0.02] to-transparent" />
          <CardHeader className={cn("relative flex items-center gap-2 space-y-0 py-5 sm:flex-row", accentMap.emerald.header)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentMap.emerald.iconWrap)}>
                <HugeiconsIcon icon={DollarCircleIcon} strokeWidth={2} className="h-5 w-5" />
              </div>
              <div className="grid flex-1 gap-0.5">
                <CardTitle>Performance financière</CardTitle>
                <CardDescription>
                  Évolution des encaissements et décaissements
                </CardDescription>
              </div>
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
          <CardContent className="p-6">
            <ChartContainer
              config={financeConfig}
              className="h-[300px] w-full"
              initialDimension={{ width: 600, height: 300 }}
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
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
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

        {/* Patient Flow Card */}
        <Card className={cn("relative overflow-hidden", accentMap.blue.card)}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-500/[0.05] via-blue-500/[0.02] to-transparent" />
          <CardHeader className={cn("relative flex items-center gap-2 space-y-0 py-5 sm:flex-row", accentMap.blue.header)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentMap.blue.iconWrap)}>
                <HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} className="h-5 w-5" />
              </div>
              <div className="grid flex-1 gap-0.5">
                <CardTitle>Flux patients</CardTitle>
                <CardDescription>
                  Nouveaux et patients de retour dans le temps
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
          <CardContent className="p-6">
            <ChartContainer
              config={visitorsConfig}
              className="h-[300px] w-full"
              initialDimension={{ width: 600, height: 300 }}
            >
              <AreaChart data={visitorsData} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitors-new" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-newPatients)" stopOpacity={0.48} />
                    <stop offset="95%" stopColor="var(--color-newPatients)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="visitors-returning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-returningPatients)" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="var(--color-returningPatients)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
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
      </div>

      {/* Bottom Row - 3 Cards */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Traffic Sources */}
        <Card className={cn("relative overflow-hidden", accentMap.violet.card)}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-violet-500/[0.05] via-violet-500/[0.02] to-transparent" />
          <CardHeader className={cn("relative", accentMap.violet.header)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap.violet.iconWrap)}>
                <HugeiconsIcon icon={ChartIcon} strokeWidth={2} className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Répartition des actes</CardTitle>
                <CardDescription className="text-xs">
                  Motifs les plus fréquents
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {trafficSources.slice(0, 5).map((source, index) => (
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
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-100 text-slate-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                      {source.label}
                    </span>
                  </button>
                  <Badge variant="secondary" className="text-xs">
                    {source.value}%
                  </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      index === 0 ? "bg-amber-500" :
                      index === 1 ? "bg-slate-500" :
                      index === 2 ? "bg-orange-500" :
                      "bg-muted-foreground/50"
                    )}
                    style={{ width: `${source.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Customer Trend */}
        <Card className={cn("relative overflow-hidden", accentMap.cyan.card)}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/[0.05] via-cyan-500/[0.02] to-transparent" />
          <CardHeader className={cn("relative", accentMap.cyan.header)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap.cyan.iconWrap)}>
                <HugeiconsIcon icon={TrendingUp} strokeWidth={2} className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Tendance patients</CardTitle>
                <CardDescription className="text-xs">
                  Évolution du volume
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <ChartContainer
              config={customerConfig}
              className="h-[200px] w-full"
              initialDimension={{ width: 400, height: 200 }}
            >
              <AreaChart data={customerTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="customer-active" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-activePatients)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-activePatients)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="customer-completed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-completedAppointments)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--color-completedAppointments)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} width={28} fontSize={10} />
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

        {/* Profile Share - Pie Chart */}
        <Card className={cn("relative overflow-hidden", accentMap.rose.card)}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-rose-500/[0.05] via-rose-500/[0.02] to-transparent" />
          <CardHeader className={cn("relative", accentMap.rose.header)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap.rose.iconWrap)}>
                <HugeiconsIcon icon={PieChartIcon} strokeWidth={2} className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Profil patients</CardTitle>
                <CardDescription className="text-xs">
                  Répartition des espèces
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <ChartContainer
                config={{
                  dogs: { label: "Chiens", color: "var(--chart-1)" },
                  cats: { label: "Chats", color: "var(--chart-2)" },
                  others: { label: "Autres", color: "var(--chart-3)" },
                }}
                className="h-[140px] w-[140px] shrink-0"
                initialDimension={{ width: 140, height: 140 }}
              >
                <PieChart>
                  <Pie
                    data={profileShare}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
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
              <div className="flex-1 grid gap-2">
                {profileShare.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground text-xs">{item.label}</span>
                    </div>
                    <span className="font-semibold text-sm">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
