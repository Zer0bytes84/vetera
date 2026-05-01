import * as React from "react"
import {
  Alert01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  FlashIcon,
  InjectionIcon,
  Loading03Icon,
  MedicineIcon,
  PackageIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { EvilComposedChart } from "@/components/evilcharts/charts/composed-chart"
import { EvilLineChart } from "@/components/evilcharts/charts/line-chart"
import { type ChartConfig as EvilChartConfig } from "@/components/evilcharts/ui/chart"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Layer,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { APP_NAME } from "@/lib/brand"
import i18n from "@/i18n/config"
import { cn } from "@/lib/utils"
import type { Appointment, Owner, Task, Transaction } from "@/types/db"
import type { View } from "@/types"
import { formatDZD } from "@/utils/currency"
import { useTranslation } from "react-i18next"

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={className}>
      <path
        d="M4 1V7M4 7L1 4M4 7L7 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + amount)
  return next
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function safeDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function percentageDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

function formatCompactInteger(value: number) {
  return new Intl.NumberFormat(getCurrentLocale()).format(Math.round(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(getCurrentLocale()).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function findLastIndexBy<T>(items: T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }
  return -1
}

function findLastBy<T>(items: T[], predicate: (item: T) => boolean) {
  const index = findLastIndexBy(items, predicate)
  return index >= 0 ? items[index] : undefined
}

function getReferenceDate(_appointments: Appointment[], _transactions: Transaction[]) {
  // Utilise la date réelle du système pour refléter la réalité
  // Pas de manipulation basée sur les données stockées
  return new Date()
}

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>

function getCurrentLocale(language = i18n.language) {
  if (language.startsWith("ar")) return "ar"
  if (language.startsWith("en")) return "en-US"
  if (language.startsWith("es")) return "es-ES"
  if (language.startsWith("pt")) return "pt-PT"
  if (language.startsWith("de")) return "de-DE"
  return "fr-FR"
}

export function buildDashboardMetrics({
  appointments,
  owners,
  patients,
  tasks,
  transactions,
  locale = getCurrentLocale(),
}: {
  appointments: Appointment[]
  owners: Owner[]
  patients: Array<{ lastVisit?: string; createdAt: string; status: string }>
  tasks: Task[]
  transactions: Transaction[]
  locale?: string
}) {
  const referenceDate = getReferenceDate(appointments, transactions)
  const todayStart = startOfDay(referenceDate)
  const todayEnd = endOfDay(referenceDate)
  const yesterdayStart = startOfDay(addDays(referenceDate, -1))
  const yesterdayEnd = endOfDay(addDays(referenceDate, -1))
  const last30Start = startOfDay(addDays(referenceDate, -29))
  const previous30Start = startOfDay(addDays(referenceDate, -59))
  const previous30End = endOfDay(addDays(referenceDate, -30))
  const last90Start = startOfDay(addDays(referenceDate, -89))
  const previous90Start = startOfDay(addDays(referenceDate, -179))
  const previous90End = endOfDay(addDays(referenceDate, -90))

  const paidTransactions = transactions.filter((item) => item.status === "paid")
  const paidIncome = paidTransactions.filter((item) => item.type === "income")
  const paidExpense = paidTransactions.filter((item) => item.type === "expense")

  const income30 = paidIncome
    .filter((item) => {
      const date = safeDate(item.date)
      return date && date >= last30Start && date <= todayEnd
    })
    .reduce((sum, item) => sum + item.amount, 0)

  const previousIncome30 = paidIncome
    .filter((item) => {
      const date = safeDate(item.date)
      return date && date >= previous30Start && date <= previous30End
    })
    .reduce((sum, item) => sum + item.amount, 0)

  const incomeToday = paidIncome
    .filter((item) => {
      const date = safeDate(item.date)
      return date && date >= todayStart && date <= todayEnd
    })
    .reduce((sum, item) => sum + item.amount, 0)

  const incomeYesterday = paidIncome
    .filter((item) => {
      const date = safeDate(item.date)
      return date && date >= yesterdayStart && date <= yesterdayEnd
    })
    .reduce((sum, item) => sum + item.amount, 0)

  const averageBasket = paidIncome.length
    ? paidIncome.reduce((sum, item) => sum + item.amount, 0) / paidIncome.length
    : 0

  const currentQualified = appointments.filter((item) => {
    const date = safeDate(item.startTime)
    return date && date >= last30Start && date <= todayEnd && item.status === "completed"
  }).length

  const previousQualified = appointments.filter((item) => {
    const date = safeDate(item.startTime)
    return date && date >= previous30Start && date <= previous30End && item.status === "completed"
  }).length

  const todayAppointments = appointments.filter((item) => {
    const date = safeDate(item.startTime)
    const isToday = date && date >= todayStart && date <= todayEnd
    const isValidStatus = !["cancelled", "no_show"].includes(item.status)
    return isToday && isValidStatus
  })

  const yesterdayAppointments = appointments.filter((item) => {
    const date = safeDate(item.startTime)
    return date && date >= yesterdayStart && date <= yesterdayEnd && !["cancelled", "no_show"].includes(item.status)
  })

  const openTasks = tasks.filter((task) => task.status !== "done")
  const completedTasks = tasks.filter((task) => task.status === "done")
  const taskCompletionRate = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0
  const dueTasks = openTasks.filter((task) => {
    const dueDate = safeDate(task.dueDate)
    return dueDate && dueDate <= endOfDay(addDays(referenceDate, 7))
  }).length

  const currentActivePatients = patients.filter((patient) => {
    const lastVisit = safeDate(patient.lastVisit)
    return lastVisit && lastVisit >= last90Start && patient.status !== "decede"
  }).length

  const previousActivePatients = patients.filter((patient) => {
    const lastVisit = safeDate(patient.lastVisit)
    return lastVisit && lastVisit >= previous90Start && lastVisit <= previous90End && patient.status !== "decede"
  }).length

  const ownerCityMap = new Map(owners.map((owner) => [owner.id, owner.city || i18n.t("dashboardV2.fallbacks.unknownCity")]))
  const cityCounts = appointments.reduce<Map<string, number>>((acc, appointment) => {
    if (["cancelled", "no_show"].includes(appointment.status)) return acc
    const city = ownerCityMap.get(appointment.ownerId) || i18n.t("dashboardV2.fallbacks.unknownCity")
    acc.set(city, (acc.get(city) || 0) + 1)
    return acc
  }, new Map())

  const topCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }))

  // Fixed months: Janv to Déc (using current year)
  const currentYear = referenceDate.getFullYear()
  const monthNames = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"]
  
  const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfDay(new Date(currentYear, index, 1))
    const monthEnd = endOfDay(new Date(currentYear, index + 1, 0))
    const total = paidIncome
      .filter((item) => {
        const date = safeDate(item.date)
        return date && date >= monthStart && date <= monthEnd
      })
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      month: monthNames[index],
      value: total / 100,
      active: index === referenceDate.getMonth() ? total / 100 : 0,
      hasData: total > 0,
    }
  })

  const revenueTrend = Array.from({ length: 10 }, (_, index) => {
    const day = addDays(referenceDate, -9 + index)
    const start = startOfDay(day)
    const end = endOfDay(day)
    const value = paidIncome
      .filter((item) => {
        const date = safeDate(item.date)
        return date && date >= start && date <= end
      })
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      name: day.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      value: value / 100,
    }
  })

  const categoryTotals = paidIncome.reduce<Map<string, number>>((acc, item) => {
    const category = item.category || i18n.t("dashboardV2.fallbacks.other")
    acc.set(category, (acc.get(category) || 0) + item.amount)
    return acc
  }, new Map())

  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, value], index) => ({
      label,
      value,
      color: ["#21aceb", "#ff7a1a", "#f6c21d", "#23c7b7"][index] ?? "#a1a1aa",
    }))

  const appointmentTypeTotals = appointments.reduce<Map<string, number>>((acc, item) => {
    if (["cancelled", "no_show"].includes(item.status)) return acc
    acc.set(item.type, (acc.get(item.type) || 0) + 1)
    return acc
  }, new Map())

  const topAppointmentTypes = Array.from(appointmentTypeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, demand]) => ({ name, demand }))

  if (!topAppointmentTypes.length) {
    topAppointmentTypes.push({ name: i18n.t("dashboardV2.fallbacks.noProcedure"), demand: 0 })
  }

  const cashflowSeries = Array.from({ length: 14 }, (_, index) => {
    const day = addDays(referenceDate, -13 + index)
    const start = startOfDay(day)
    const end = endOfDay(day)
    const income = paidIncome
      .filter((item) => {
        const date = safeDate(item.date)
        return date && date >= start && date <= end
      })
      .reduce((sum, item) => sum + item.amount, 0)
    const expense = paidExpense
      .filter((item) => {
        const date = safeDate(item.date)
        return date && date >= start && date <= end
      })
      .reduce((sum, item) => sum + item.amount, 0)

    return {
      name: day.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      value: (income - expense) / 100,
    }
  })

  const activityDays = Array.from({ length: 84 }, (_, index) => {
    const day = addDays(referenceDate, -83 + index)
    const total = appointments.filter((item) => {
      const date = safeDate(item.startTime)
      return date && isSameDay(date, day) && !["cancelled", "no_show"].includes(item.status)
    }).length

    return {
      date: day,
      value: total,
    }
  })

  const taskCadenceSeries = Array.from({ length: 24 }, (_, index) => {
    const day = addDays(referenceDate, -23 + index)
    const start = startOfDay(day)
    const end = endOfDay(day)

    const tasksForDay = tasks.filter((task) => {
      const anchorDate = safeDate(task.dueDate || task.createdAt)
      return anchorDate && anchorDate >= start && anchorDate <= end
    })

    const completed = tasksForDay.filter((task) => task.status === "done").length

    return {
      label: day.toLocaleDateString(locale, { day: "numeric" }),
      total: tasksForDay.length,
      completed,
      pending: Math.max(tasksForDay.length - completed, 0),
      isCurrent: index === 23,
    }
  })

  const taskCadenceRate = taskCadenceSeries.length
    ? (taskCadenceSeries.reduce((sum, item) => {
        if (item.total === 0) return sum
        return sum + item.completed / item.total
      }, 0) /
        taskCadenceSeries.length) *
      100
    : taskCompletionRate

  const currentReturningPatients = Array.from(
    appointments.reduce<Map<string, number>>((acc, item) => {
      const date = safeDate(item.startTime)
      if (!date || date < last90Start || date > todayEnd || ["cancelled", "no_show"].includes(item.status)) {
        return acc
      }
      acc.set(item.patientId, (acc.get(item.patientId) || 0) + 1)
      return acc
    }, new Map()).values()
  ).filter((count) => count > 1).length

  const previousReturningPatients = Array.from(
    appointments.reduce<Map<string, number>>((acc, item) => {
      const date = safeDate(item.startTime)
      if (!date || date < previous90Start || date > previous90End || ["cancelled", "no_show"].includes(item.status)) {
        return acc
      }
      acc.set(item.patientId, (acc.get(item.patientId) || 0) + 1)
      return acc
    }, new Map()).values()
  ).filter((count) => count > 1).length

  const inProgressAppointments = appointments.filter((item) => {
    if (item.status !== "in_progress") return false
    const date = safeDate(item.startTime)
    if (!date) return false
    // Ne compter que les RDV in_progress des 7 derniers jours ou futurs
    const sevenDaysAgo = new Date(referenceDate)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return date >= sevenDaysAgo
  })
  
  const pipelineRows = [
    {
      label: i18n.t("dashboardV2.pipeline.new"),
      value: appointments.filter((item) => item.status === "scheduled").length,
      color: "#21aceb",
    },
    {
      label: i18n.t("dashboardV2.pipeline.inProgress"),
      value: inProgressAppointments.length,
      color: "#ff7a1a",
    },
    {
      label: i18n.t("dashboardV2.pipeline.completed"),
      value: appointments.filter((item) => item.status === "completed").length,
      color: "#f6c21d",
    },
    {
      label: i18n.t("dashboardV2.pipeline.followUp"),
      value: appointments.filter((item) => item.status === "no_show").length,
      color: "#23c7b7",
    },
  ]
  const pipelineMax = Math.max(...pipelineRows.map((row) => row.value), 1)

  // Monthly appointments data (similar to monthlyRevenue)
  const monthlyAppointments = Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfDay(new Date(currentYear, index, 1))
    const monthEnd = endOfDay(new Date(currentYear, index + 1, 0))
    const count = appointments
      .filter((item) => {
        const date = safeDate(item.startTime)
        return date && date >= monthStart && date <= monthEnd && !["cancelled", "no_show"].includes(item.status)
      })
      .length

    return {
      month: monthNames[index],
      value: count,
      hasData: count > 0,
    }
  })

  return {
    referenceDate,
    summary: {
      income30,
      previousIncome30,
      incomeToday,
      incomeYesterday,
      averageBasket,
      currentQualified,
      previousQualified,
      todayAppointments: todayAppointments.length,
      yesterdayAppointments: yesterdayAppointments.length,
      taskCompletionRate,
      taskCadenceRate,
      dueTasks,
      currentActivePatients,
      previousActivePatients,
      currentReturningPatients,
      previousReturningPatients,
      topCity: topCities[0] ?? { city: i18n.t("dashboardV2.cities.algiers"), count: 0 },
    },
    monthlyRevenue,
    revenueTrend,
    topCategories,
    topAppointmentTypes,
    cashflowSeries,
    activityDays,
    taskCadenceSeries,
    pipelineRows: pipelineRows.map((row) => ({
      ...row,
      ratio: row.value / pipelineMax,
    })),
    topCities,
    monthlyAppointments,
  }
}

export type InsightCardData = {
  chart?: React.ReactNode
  description?: string
  eyebrow: string
  value: string
  detailLead: string
  detailText: string
  detailInline?: boolean
  isNegative?: boolean
  title: string
}

type InsightCardProps = InsightCardData & {
  active?: boolean
}

const revenueGradient = ["#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc"]
const revenueGradientDark = ["#a5b4fc", "#818cf8", "#6366f1", "#4338ca", "#312e81"]
const clinicalGradient = ["#312e81", "#4338ca", "#6366f1"]
const clinicalGradientDark = ["#a5b4fc", "#818cf8", "#6366f1"]

// Portfolio Panel - Huashu Design Style (replaces middle widget)
// Adapted to use real app data: revenue as portfolio value, categories as holdings
export function PortfolioPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  
  // Adapt app data to portfolio concept
  // Use 30-day income as "portfolio value" (total business value)
  const portfolioValue = metrics.summary.income30
  const previousValue = metrics.summary.previousIncome30 || portfolioValue * 0.88
  const portfolioDelta = percentageDelta(portfolioValue, previousValue)
  
  const chartData = metrics.monthlyRevenue.slice(-6) // Last 6 months
  const hasRevenueTrend = chartData.some((item) => item.value > 0)
  const fallbackTrendBase = Math.max(
    portfolioValue / 600,
    metrics.summary.incomeToday / 140,
    1
  )
  const composedChartData = chartData.map((entry, index, rows) => {
    const value = hasRevenueTrend
      ? entry.value
      : fallbackTrendBase * ([0.72, 0.92, 0.78, 1.08, 0.96, 1.16][index] ?? 1)
    const window = rows.slice(Math.max(0, index - 2), index + 1)
    const momentum = hasRevenueTrend
      ? window.reduce((sum, item) => sum + item.value, 0) / Math.max(window.length, 1)
      : fallbackTrendBase * ([0.82, 0.9, 0.86, 0.98, 1.02, 1.12][index] ?? 1)

    return {
      month: entry.month || `M${index + 1}`,
      collected: Number(value.toFixed(1)),
      momentum: Number(momentum.toFixed(1)),
    }
  })

  const composedBarConfig = {
    collected: {
      label: t("dashboardV2.chartLabels.revenue", { defaultValue: "Revenus" }),
      colors: {
        light: ["#f97316", "#f59e0b", "#2563eb"],
        dark: ["#fb923c", "#facc15", "#60a5fa"],
      },
    },
  } satisfies EvilChartConfig
  const composedLineConfig = {
    momentum: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: {
        light: revenueGradient,
        dark: revenueGradientDark,
      },
    },
  } satisfies EvilChartConfig

  return (
    <Card className="group relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        {/* Header - same pattern as other widgets */}
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.portfolio.title", { defaultValue: "Chiffre d'affaires" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[24px] font-semibold tracking-[-0.03em] text-foreground tabular-nums">
              {formatCurrency(portfolioValue)}
            </p>
            <span className={cn(
              "text-[13px] font-semibold",
              portfolioDelta >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {portfolioDelta >= 0 ? "+" : ""}{formatPercent(Math.abs(portfolioDelta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.portfolio.subtitle", { defaultValue: "30 derniers jours" })}
          </p>
        </div>

        <div className="relative min-h-[220px] flex-1">
          <EvilComposedChart
            isClickable
            enableHoverHighlight
            className="h-full w-full !aspect-auto"
            xDataKey="month"
            barConfig={composedBarConfig}
            lineConfig={composedLineConfig}
            barVariant="gradient"
            barRadius={8}
            barCategoryGap={18}
            curveType="bump"
            strokeVariant="solid"
            activeDotVariant="colored-border"
            dotVariant="border"
            glowingBars={["collected"]}
            glowingLines={["momentum"]}
            data={composedChartData}
            chartProps={{ margin: { top: 12, right: 12, left: 12, bottom: 16 } }}
            tooltipVariant="frosted-glass"
            xAxisProps={{ tickFormatter: (value) => String(value).slice(0, 3), hide: true }}
            hideCartesianGrid
            hideLegend
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardV2Page({ onNavigate, onOpenAIAgent }: { onNavigate?: (view: View) => void; onOpenAIAgent?: () => void } = {}) {
  const { t, i18n } = useTranslation()
  const { data: appointments } = useAppointmentsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: patients } = usePatientsRepository()
  const { data: tasks } = useTasksRepository()
  const { data: transactions } = useTransactionsRepository()
  const locale = getCurrentLocale(i18n.language)

  const metrics = React.useMemo(
    () => buildDashboardMetrics({ appointments, owners, patients, tasks, transactions, locale }),
    [appointments, owners, patients, tasks, transactions, locale]
  )

  const incomeTodayDelta = percentageDelta(metrics.summary.incomeToday, metrics.summary.incomeYesterday)
  const appointmentsDelta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  )
  const retentionDelta = percentageDelta(
    metrics.summary.currentReturningPatients,
    metrics.summary.previousReturningPatients
  )

  const galleryCards: InsightCardData[] = [
    {
      eyebrow: t("dashboardV2.cards.revenue.eyebrow"),
      value: formatDZD(metrics.summary.incomeToday),
      detailLead: formatPercent(Math.abs(incomeTodayDelta)),
      detailText: t("dashboardV2.cards.revenue.detail"),
      isNegative: incomeTodayDelta < 0,
      title: t("dashboardV2.cards.revenue.title"),
      description: t("dashboardV2.cards.revenue.description"),
      chart: <RevenueBarsChart data={metrics.monthlyRevenue} />,
    },
    {
      eyebrow: t("dashboardV2.cards.mix.eyebrow"),
      value: `${formatCompactInteger(metrics.topCategories.reduce((sum, item) => sum + item.value / 100, 0))} DA`,
      detailLead: formatCompactInteger(metrics.topCategories.length),
      detailText: t("dashboardV2.cards.mix.detail"),
      detailInline: true,
      title: t("dashboardV2.cards.mix.title"),
      description: t("dashboardV2.cards.mix.description"),
      chart: <ChannelSourcesChart rows={metrics.topCategories} />,
    },
    {
      eyebrow: t("dashboardV2.cards.procedures.eyebrow"),
      value: formatPercent(
        metrics.topAppointmentTypes.reduce((sum, item) => sum + item.demand, 0)
          ? (metrics.topAppointmentTypes[0]?.demand ?? 0) /
            metrics.topAppointmentTypes.reduce((sum, item) => sum + item.demand, 0) *
            100
          : 0
      ),
      detailLead: formatPercent(Math.abs(appointmentsDelta)),
      detailText: t("dashboardV2.cards.procedures.detail"),
      isNegative: appointmentsDelta < 0,
      title: t("dashboardV2.cards.procedures.title"),
      description: t("dashboardV2.cards.procedures.description", { appName: APP_NAME }),
      chart: <ItemDemandChart data={metrics.topAppointmentTypes} />,
    },
    {
      eyebrow: t("dashboardV2.cards.cashflow.eyebrow"),
      value: formatDZD(
        metrics.cashflowSeries.reduce((sum, item) => sum + item.value, 0) * 100
      ),
      detailLead: formatPercent(Math.abs(percentageDelta(metrics.cashflowSeries.at(-1)?.value ?? 0, metrics.cashflowSeries.at(-2)?.value ?? 0))),
      detailText: t("dashboardV2.cards.cashflow.detail"),
      isNegative:
        percentageDelta(metrics.cashflowSeries.at(-1)?.value ?? 0, metrics.cashflowSeries.at(-2)?.value ?? 0) < 0,
      title: t("dashboardV2.cards.cashflow.title"),
      description: t("dashboardV2.cards.cashflow.description"),
      chart: <CampaignDataChart data={metrics.cashflowSeries} />,
    },
    {
      eyebrow: t("dashboardV2.cards.tasks.eyebrow"),
      value: formatPercent(metrics.summary.taskCadenceRate),
      detailLead: formatCompactInteger(metrics.summary.dueTasks),
      detailText: t("dashboardV2.cards.tasks.detail"),
      title: t("dashboardV2.cards.tasks.title"),
      description: t("dashboardV2.cards.tasks.description"),
      chart: <WorkflowPaceChart series={metrics.taskCadenceSeries} />,
    },
    {
      eyebrow: t("dashboardV2.cards.retention.eyebrow"),
      value: formatPercent(
        metrics.summary.currentActivePatients
          ? (metrics.summary.currentReturningPatients / metrics.summary.currentActivePatients) * 100
          : 0
      ),
      detailLead: formatPercent(Math.abs(retentionDelta)),
      detailText: t("dashboardV2.cards.retention.detail"),
      isNegative: retentionDelta < 0,
      title: t("dashboardV2.cards.retention.title"),
      description: t("dashboardV2.cards.retention.description"),
      chart: <UserRetentionGrid days={metrics.activityDays} />,
    },
    {
      eyebrow: t("dashboardV2.cards.load.eyebrow"),
      value: formatCompactInteger(
        metrics.activityDays.slice(-28).reduce((sum, day) => sum + day.value, 0) / 4
      ),
      detailLead: (() => {
        const weekdayNames = [
          t("dashboardV2.weekdays.sundayShort"),
          t("dashboardV2.weekdays.mondayShort"),
          t("dashboardV2.weekdays.tuesdayShort"),
          t("dashboardV2.weekdays.wednesdayShort"),
          t("dashboardV2.weekdays.thursdayShort"),
          t("dashboardV2.weekdays.fridayShort"),
          t("dashboardV2.weekdays.saturdayShort"),
        ]
        const grouped = metrics.activityDays.slice(-28).reduce<Record<number, number>>((acc, day) => {
          const weekday = day.date.getDay()
          acc[weekday] = (acc[weekday] ?? 0) + day.value
          return acc
        }, {})
        const busiestDay = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]
        return busiestDay ? weekdayNames[Number(busiestDay[0])] : t("dashboardV2.weekdays.mondayShort")
      })(),
      detailText: t("dashboardV2.cards.load.detail"),
      title: t("dashboardV2.cards.load.title"),
      description: t("dashboardV2.cards.load.description"),
      chart: <WeeklyLoadChart days={metrics.activityDays} />,
    },
    {
      eyebrow: t("dashboardV2.cards.cities.eyebrow"),
      value: formatCompactInteger(metrics.summary.topCity.count),
      detailLead: metrics.summary.topCity.city,
      detailText: t("dashboardV2.cards.cities.detail"),
      title: t("dashboardV2.cards.cities.title"),
      description: t("dashboardV2.cards.cities.description"),
      chart: <CityBreakdownChart topCities={metrics.topCities} />,
    },
  ]

  return (
    <div className="flex flex-1 flex-col px-4 py-4 lg:px-6 lg:py-6">
      <div className="w-full max-w-[1160px] min-w-0 space-y-11 overflow-x-hidden ms-0 me-auto">
        <section className="space-y-5">
          <LeadMetricStrip metrics={metrics} />

          {/* Main widgets row - rebalanced as 2x2 for better breathing room */}
          <div className="grid gap-5 xl:grid-cols-2">
            <LeadRevenuePanel metrics={metrics} />
            <PortfolioPanel metrics={metrics} />
            <TasksPanel metrics={metrics} tasks={tasks} />
            <OperationsPulsePanel metrics={metrics} />
          </div>
        </section>

        <DashboardSection
          title={t("dashboardV2.operational.title")}
          subtitle={t("dashboardV2.operational.subtitle", { appName: APP_NAME })}
          cards={galleryCards}
        />
      </div>

      {/* Floating AI Assistant Button - Dashboard Only */}
      {onOpenAIAgent && (
        <button
          type="button"
          onClick={onOpenAIAgent}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-300 ease-out hover:scale-110 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] hover:-translate-y-1 active:scale-95"
          aria-label="Assistant AI"
        >
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5" />
        </button>
      )}
    </div>
  )
}

export function FinancialAnalyticsV2Page({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  const { t, i18n } = useTranslation()
  const { data: appointments } = useAppointmentsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: patients } = usePatientsRepository()
  const { data: tasks } = useTasksRepository()
  const { data: transactions } = useTransactionsRepository()
  const locale = getCurrentLocale(i18n.language)

  const metrics = React.useMemo(
    () => buildDashboardMetrics({ appointments, owners, patients, tasks, transactions, locale }),
    [appointments, owners, patients, tasks, transactions, locale]
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
      <div className="flex w-full max-w-[1160px] min-w-0 flex-col gap-6 ms-0 me-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("dashboardV2.analytics.eyebrow")}
            </p>
            <h2 className="text-[28px] font-normal tracking-[-0.04em] text-foreground">
              {t("dashboardV2.analytics.title")}
            </h2>
            <p className="max-w-[62ch] text-sm text-muted-foreground">
              {t("dashboardV2.analytics.subtitle", { appName: APP_NAME })}
            </p>
          </div>
          <Button variant="outline" className="h-9 rounded-xl px-4" onClick={() => onNavigate("finances")}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            {t("dashboardV2.analytics.back")}
          </Button>
        </div>

        <LeadMetricStrip metrics={metrics} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(360px,1fr)]">
          <LeadRevenuePanel metrics={metrics} />
          <LeadSegmentationPanel metrics={metrics} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
          <LeadStatusPanel metrics={metrics} />
          <WebVisitsPanel metrics={metrics} />
        </div>
      </div>
    </div>
  )
}

export function DashboardSection({
  title,
  subtitle,
  cards,
}: {
  title: string
  subtitle: string
  cards: InsightCardData[]
}) {
  return (
    <section className="space-y-4.5">
      <div className="space-y-1">
        <h2 className="text-[20px] leading-none font-normal tracking-[-0.02em] text-foreground">{title}</h2>
        <p className="font-mono text-[10px] tracking-[0.02em] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="min-w-0 grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <InsightCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  )
}

export function InsightCard({
  eyebrow,
  value,
  detailLead,
  detailText,
  detailInline,
  isNegative,
  title,
  description,
  chart,
  active,
}: InsightCardProps) {
  return (
    <Card
      className={cn(
        "group min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant card-hover-lift",
        "transition-all duration-300 ease-out",
        active && "border-foreground/10 ring-1 ring-foreground/6 shadow-md"
      )}
    >
      <CardContent className="flex min-h-[358px] flex-col overflow-hidden p-4">
        <div
          className={cn(
            "panel-inset relative min-h-[186px] overflow-hidden rounded-[18px] border border-border px-4 py-4",
            active && "bg-[var(--color-surface-soft)]"
          )}
        >
          <div className="mb-3 space-y-0.5">
            <p className="text-[10px] font-normal uppercase tracking-[0.02em] text-muted-foreground">{eyebrow}</p>
            <div className="flex items-end gap-1.5">
              <p className="text-[17px] leading-none font-normal tracking-[-0.02em] text-foreground">{value}</p>
              {detailText && detailInline ? (
                <span className="pb-0.5 font-mono text-[9px] text-muted-foreground">{detailText}</span>
              ) : null}
            </div>
            <p className="flex flex-wrap items-center gap-1 text-[10px]">
              {isNegative && <ArrowDownIcon className="text-chart-red" />}
              <span className={cn("font-mono", isNegative ? "text-chart-red" : "text-foreground/60")}>
                {detailLead}
              </span>
              {detailText && !detailInline ? (
                <span className="text-muted-foreground">{detailText}</span>
              ) : null}
            </p>
          </div>
          <div className="h-[126px] overflow-hidden" onClick={(e) => e.stopPropagation()}>{chart}</div>
        </div>

        <div className="mt-auto space-y-1 px-1.5 pt-5">
          <h3 className="line-clamp-2 text-[14px] leading-[1.1] font-normal tracking-[-0.02em] text-foreground">{title}</h3>
          <p className="line-clamp-3 min-h-[52px] max-w-[28ch] text-[12px] leading-[1.45] text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function metricDeltaTone(negative?: boolean) {
  return negative ? "text-chart-red" : "text-[#17c964]"
}

function formatDeltaText(current: number, previous: number) {
  return formatPercent(Math.abs(percentageDelta(current, previous)))
}

// Composant sparkline minimal pour les mini-graphiques
function MiniSparkline({ data, color = "#8b5cf6", positive = true }: { data: number[]; color?: string; positive?: boolean }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 80
  const height = 40
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const gradientColor = positive ? color : "#ef4444"

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkline-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradientColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={gradientColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M0,${height} L${points} L${width},${height} Z`}
        fill={`url(#sparkline-${positive})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={gradientColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MetricCard({
  title,
  value,
  delta,
  deltaLabel,
  positive,
  data,
  color,
}: {
  title: string
  value: string
  delta: string
  deltaLabel: string
  positive: boolean
  data: number[]
  color: string
}) {
  return (
    <Card className="overflow-hidden rounded-[20px] border border-border/60 bg-card/80 p-5 card-vibrant transition-all duration-200 ease-out hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">{value}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("flex items-center text-[12px] font-medium", positive ? "text-emerald-500" : "text-red-500")}>
              {positive ? "↑" : "↓"} {delta}
            </span>
            <span className="text-[12px] text-muted-foreground">{deltaLabel}</span>
          </div>
        </div>
        <div className="flex-shrink-0 pt-1">
          <MiniSparkline data={data} color={color} positive={positive} />
        </div>
      </div>
    </Card>
  )
}

export function LeadMetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()

  // Générer des données de sparkline simulées (dans un cas réel, ces données viendraient d'un historique)
  const generateSparklineData = (baseValue: number, trend: 'up' | 'down' | 'neutral') => {
    const points = 7
    return Array.from({ length: points }, (_, i) => {
      const variance = Math.random() * 0.3 + 0.85 // entre 0.85 et 1.15
      const trendFactor = trend === 'up' ? 1 + (i * 0.05) : trend === 'down' ? 1 - (i * 0.03) : 1
      return Math.round(baseValue * variance * trendFactor)
    })
  }

  const incomeDelta = percentageDelta(metrics.summary.income30, metrics.summary.previousIncome30)
  const appointmentsDelta = percentageDelta(metrics.summary.todayAppointments, metrics.summary.yesterdayAppointments)
  const basketDelta = percentageDelta(metrics.summary.averageBasket, metrics.summary.previousIncome30 ? metrics.summary.previousIncome30 / Math.max(1, metrics.summary.currentQualified) : 0)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title={t("dashboardV2.metricStrip.income30", "Revenus 30j")}
        value={formatDZD(metrics.summary.income30)}
        delta={formatDeltaText(metrics.summary.income30, metrics.summary.previousIncome30)}
        deltaLabel="vs période précédente"
        positive={incomeDelta >= 0}
        data={generateSparklineData(metrics.summary.income30 / 30, incomeDelta >= 0 ? 'up' : 'down')}
        color="#8b5cf6"
      />
      <MetricCard
        title={t("dashboardV2.metricStrip.todayAppointments", "Rendez-vous du jour")}
        value={formatCompactInteger(metrics.summary.todayAppointments)}
        delta={formatDeltaText(metrics.summary.todayAppointments, metrics.summary.yesterdayAppointments)}
        deltaLabel="vs hier"
        positive={appointmentsDelta >= 0}
        data={generateSparklineData(metrics.summary.todayAppointments, appointmentsDelta >= 0 ? 'up' : 'down')}
        color="#06b6d4"
      />
      <MetricCard
        title={t("dashboardV2.metricStrip.averageBasket", "Panier moyen")}
        value={formatDZD(metrics.summary.averageBasket)}
        delta={formatDeltaText(metrics.summary.averageBasket, metrics.summary.previousIncome30 ? metrics.summary.previousIncome30 / Math.max(1, metrics.summary.currentQualified) : 0)}
        deltaLabel="vs période précédente"
        positive={basketDelta >= 0}
        data={generateSparklineData(metrics.summary.averageBasket, basketDelta >= 0 ? 'up' : 'neutral')}
        color="#f59e0b"
      />
    </div>
  )
}

function MetricDelta({
  value,
  note,
  negative,
}: {
  value: string
  note: string
  negative?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {negative && <ArrowDownIcon className="text-chart-red" />}
      <span className={cn("font-mono", metricDeltaTone(negative))}>{value}</span>
      {note ? <span className="font-mono uppercase tracking-[0.04em] text-muted-foreground">{note}</span> : null}
    </div>
  )
}

function GrowthChip({
  label,
  value,
  negative,
  active,
  icon,
  iconColor,
}: {
  label: string
  value: string
  negative?: boolean
  active?: boolean
  icon?: IconSvgElement
  iconColor?: string
}) {
  return (
    <div className={cn(
      "min-w-[112px] rounded-[16px] border border-border/50 bg-card/78 px-3 py-2 shadow-soft backdrop-blur-sm transition-all",
      active && "bg-[var(--color-surface-soft)] ring-1 ring-foreground/6"
    )}>
      <div className="flex items-center gap-1.5">
        {icon && iconColor ? (
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, ${iconColor} 14%, transparent)`,
              color: iconColor,
            }}
          >
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-2.5" />
          </span>
        ) : null}
        <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
      </div>
      <div className="mt-2">
        <MetricDelta value={value} note="" negative={negative} />
      </div>
    </div>
  )
}

function WidgetHoverPreview({
  label,
  value,
  meta,
  color,
}: {
  label: string
  value: string
  meta?: string
  color?: string
}) {
  return (
    <div className="rounded-[12px] border border-border/45 bg-[color-mix(in_oklab,var(--color-surface-soft)_86%,white_14%)] px-2.5 py-2 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> : null}
          <span className="text-[11px] font-medium text-foreground">{label}</span>
        </div>
        {meta ? <span className="font-mono text-[10px] text-muted-foreground">{meta}</span> : null}
      </div>
      <div className="mt-1 font-mono text-[11px] text-foreground">{value}</div>
    </div>
  )
}

function MetricMicroCard({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-[14px] border border-border/45 bg-[color-mix(in_oklab,var(--color-surface-soft)_86%,white_14%)] px-2.5 py-2 shadow-soft backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-foreground">{value}</p>
    </div>
  )
}

export function LeadRevenuePanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const currentMonthIndex = new Date().getMonth()
  const revenueData = metrics.monthlyRevenue.map((entry, index, rows) => {
    const window = rows.slice(Math.max(0, index - 2), index + 1)
    const baseline = window.reduce((sum, item) => sum + item.value, 0) / Math.max(window.length, 1)

    return {
      month: entry.month,
      revenue: Number(entry.value.toFixed(1)),
      baseline: Number(baseline.toFixed(1)),
    }
  })
  const total = revenueData.reduce((sum, item) => sum + item.revenue, 0)
  const activeEntry = revenueData[currentMonthIndex] ?? revenueData.at(-1)
  const prevEntry = revenueData[currentMonthIndex - 1]
  const delta = percentageDelta(activeEntry?.revenue ?? 0, prevEntry?.revenue ?? 0)
  const isPositive = delta >= 0
  const chartConfig = {
    revenue: {
      label: t("dashboardV2.chartLabels.revenue"),
      colors: {
        light: revenueGradient,
        dark: revenueGradientDark,
      },
    },
    baseline: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: {
        light: ["#cbd5e1"],
        dark: ["#64748b"],
      },
    },
  } satisfies EvilChartConfig

  return (
    <Card className="group relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.revenuePanel.title", { defaultValue: "Encaissements" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-foreground tabular-nums">
              {formatDZD(total * 100)}
            </p>
            <span className={cn("text-[13px] font-semibold", isPositive ? "text-emerald-500" : "text-rose-500")}>
              {isPositive ? "+" : "-"}
              {formatPercent(Math.abs(delta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.revenuePanel.compare", {
              current: activeEntry?.month ?? "",
              previous: prevEntry?.month ?? "",
            })}
          </p>
        </div>

        <div className="flex-1 min-h-[180px]">
          <EvilLineChart
            isClickable
            enableBufferLine
            glowingLines={["revenue"]}
            className="h-full w-full !aspect-auto"
            xDataKey="month"
            curveType="bump"
            strokeVariant="solid"
            activeDotVariant="colored-border"
            dotVariant="border"
            data={revenueData}
            chartConfig={chartConfig}
            chartProps={{ margin: { top: 12, right: 12, left: 12, bottom: 16 } }}
            hideLegend
            tooltipVariant="frosted-glass"
            xAxisProps={{
              tickFormatter: (value) => String(value).slice(0, 3),
              tickMargin: 10,
              interval: 0,
              padding: { left: 10, right: 10 },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Appointments Panel - V2 Minimal Capsules Style (kept for reference)
export function AppointmentsPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const currentMonthIndex = new Date().getMonth()
  const [hoveredMonth, setHoveredMonth] = React.useState<number | null>(null)
  const [previewMonth, setPreviewMonth] = React.useState<number | null>(null)
  
  const monthNames = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"]
  
  // Force demo data for all months to ensure colors show up
  const demoValues = [25, 42, 18, 35, 28, 45, 22, 38, 31, 26, 40, 33]
  const monthlyAppointments = Array.from({ length: 12 }, (_, i) => ({
    month: monthNames[i],
    value: demoValues[i] || Math.round(15 + Math.random() * 35),
    hasData: true
  }))
  
  const maxVal = Math.max(...monthlyAppointments.map(d => d.value), 1)
  const total = monthlyAppointments.reduce((sum, d) => sum + d.value, 0)
  const todayCount = metrics.summary.todayAppointments
  const delta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  )

  return (
    <Card className="group relative h-full overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-5">
        {/* Header */}
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.appointments.title", { defaultValue: "Rendez-vous" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground tabular-nums">
              {todayCount}
            </p>
            <span className={cn(
              "text-[13px] font-semibold",
              delta >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {delta >= 0 ? "+" : ""}{formatPercent(Math.abs(delta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">Aujourd'hui</p>
        </div>

        {/* Capsule Bars */}
        <div className="flex-1 flex items-end gap-[6px] mb-4">
          {monthlyAppointments.map((entry, i) => {
            const ratio = maxVal > 0 ? entry.value / maxVal : 0
            const barHeight = Math.max(ratio * 100, 8)
            const isCurrent = i === currentMonthIndex
            const isHovered = hoveredMonth === i
            const isActive = isHovered || (hoveredMonth === null && isCurrent)
            const hasData = entry.value > 0
            
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1.5 cursor-pointer group"
                onMouseEnter={() => setHoveredMonth(i)}
                onMouseLeave={() => setHoveredMonth(null)}
                onClick={() => setPreviewMonth(i)}
              >
                <div
                  className={cn(
                    "w-full rounded-full transition-all duration-300 min-h-[8px] flex items-end justify-center",
                    isActive && hasData
                      ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                      : hasData
                        ? "bg-foreground/10 group-hover:bg-foreground/20"
                        : "bg-muted/30"
                  )}
                  style={{ height: `${barHeight}%` }}
                >
                  {hasData && barHeight > 15 && (
                    <span className="text-[8px] font-bold text-foreground/70 tabular-nums">
                      {entry.value}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[8px] uppercase tracking-wide transition-colors",
                  isActive ? "font-bold text-blue-500" : "font-medium text-muted-foreground/40"
                )}>
                  {entry.month.slice(0, 3)}
                </span>
              </div>
            )
          })}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-medium text-muted-foreground/50">Aujourd'hui</p>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">{metrics.summary.todayAppointments}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-medium text-muted-foreground/50">Cette semaine</p>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">
              {Math.round(metrics.summary.todayAppointments * 5.2)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-medium text-muted-foreground/50">Ce mois</p>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">
              {monthlyAppointments[currentMonthIndex]?.value || 0}
            </p>
          </div>
        </div>

        {/* Preview Modal */}
        {previewMonth !== null && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-[24px] p-5 flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{monthlyAppointments[previewMonth]?.month} 2026</h3>
                <p className="text-sm text-muted-foreground">Détails des rendez-vous</p>
              </div>
              <button 
                onClick={() => setPreviewMonth(null)}
                className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Total RDV</span>
                <span className="text-lg font-semibold">{monthlyAppointments[previewMonth]?.value || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Complétés</span>
                <span className="text-lg font-semibold text-emerald-500">{Math.round((monthlyAppointments[previewMonth]?.value || 0) * 0.85)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Annulés</span>
                <span className="text-lg font-semibold text-rose-500">{Math.round((monthlyAppointments[previewMonth]?.value || 0) * 0.15)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Tasks Panel — Sankey Flow (Priorité → Tâches → Statut)
// ============================================================================

const TASKS_SANKEY_PALETTE: Record<string, string> = {
  // Sources — priorities
  Haute: "#ef4444",
  Moyenne: "#f59e0b",
  Basse: "#64748b",
  // Hub
  Tâches: "#a855f7",
  // Targets — statuses
  Terminée: "#10b981",
  "En cours": "#3b82f6",
  "À faire": "#94a3b8",
}

interface TasksSankeyNodeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: { name: string; value: number; depth?: number }
  containerWidth?: number
}

function TasksSankeyNode({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  containerWidth = 0,
}: TasksSankeyNodeProps) {
  if (!payload) return null
  const fill = TASKS_SANKEY_PALETTE[payload.name] ?? "#94a3b8"
  const isLeft = (payload.depth ?? 0) === 0
  const isRight = x + width + 6 > containerWidth - 1
  const labelX = isLeft ? x - 8 : x + width + 8
  const anchor: "start" | "end" = isLeft ? "end" : "start"
  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={Math.max(2, height)}
        fill={fill}
        fillOpacity={0.95}
        radius={[4, 4, 4, 4]}
      />
      {(isLeft || isRight) && height > 10 && (
        <text
          x={labelX}
          y={y + height / 2}
          textAnchor={anchor}
          dominantBaseline="middle"
          className="fill-foreground"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {payload.name}
          <tspan dx={4} className="fill-muted-foreground" style={{ fontWeight: 400 }}>
            {payload.value}
          </tspan>
        </text>
      )}
    </Layer>
  )
}

interface TasksSankeyLinkProps {
  sourceX?: number
  targetX?: number
  sourceY?: number
  targetY?: number
  sourceControlX?: number
  targetControlX?: number
  linkWidth?: number
  payload?: { source: { name: string }; target: { name: string }; value: number }
}

function TasksSankeyLink(props: TasksSankeyLinkProps) {
  const {
    sourceX = 0,
    targetX = 0,
    sourceY = 0,
    targetY = 0,
    sourceControlX = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
  } = props
  const id = `tasks-sankey-link-${payload?.source.name}-${payload?.target.name}`
  const colorFrom = TASKS_SANKEY_PALETTE[payload?.source.name ?? ""] ?? "#94a3b8"
  const colorTo = TASKS_SANKEY_PALETTE[payload?.target.name ?? ""] ?? "#94a3b8"
  return (
    <Layer>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={colorFrom} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colorTo} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <path
        d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={0.9}
      />
    </Layer>
  )
}

export function TasksPanel({ metrics, tasks }: { metrics: DashboardMetrics; tasks: Task[] }) {
  const { t } = useTranslation()

  const stats = React.useMemo(() => {
    const priorityLabel = (p: Task["priority"]): "Haute" | "Moyenne" | "Basse" => {
      if (p === "high") return "Haute"
      if (p === "medium") return "Moyenne"
      return "Basse"
    }
    const statusLabel = (s: Task["status"]): "Terminée" | "En cours" | "À faire" => {
      if (s === "done") return "Terminée"
      if (s === "in_progress") return "En cours"
      return "À faire"
    }

    const matrix = new Map<string, Map<string, number>>()
    for (const task of tasks) {
      const p = priorityLabel(task.priority)
      const s = statusLabel(task.status)
      if (!matrix.has(p)) matrix.set(p, new Map())
      const m = matrix.get(p)!
      m.set(s, (m.get(s) ?? 0) + 1)
    }

    const priorityOrder = ["Haute", "Moyenne", "Basse"] as const
    const statusOrder = ["Terminée", "En cours", "À faire"] as const
    const priorities = priorityOrder.filter((p) => matrix.has(p))
    const statuses = statusOrder.filter((s) => Array.from(matrix.values()).some((m) => (m.get(s) ?? 0) > 0))

    const nodes = [
      ...priorities.map((n) => ({ name: n })),
      { name: "Tâches" },
      ...statuses.map((n) => ({ name: n })),
    ]
    const indexOf = (name: string) => nodes.findIndex((n) => n.name === name)
    const links: Array<{ source: number; target: number; value: number }> = []

    for (const p of priorities) {
      const total = Array.from(matrix.get(p)!.values()).reduce((a, b) => a + b, 0)
      if (total > 0) links.push({ source: indexOf(p), target: indexOf("Tâches"), value: total })
    }
    for (const s of statuses) {
      const total = Array.from(matrix.values()).reduce((a, m) => a + (m.get(s) ?? 0), 0)
      if (total > 0) links.push({ source: indexOf("Tâches"), target: indexOf(s), value: total })
    }

    const total = tasks.length
    const completed = tasks.filter((tk) => tk.status === "done").length
    const inProgress = tasks.filter((tk) => tk.status === "in_progress").length
    const high = tasks.filter((tk) => tk.priority === "high" && tk.status !== "done").length

    return {
      sankeyData: { nodes, links },
      total,
      completed,
      inProgress,
      high,
      hasFlow: links.length > 0,
    }
  }, [tasks])

  const completionPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  const cadenceRate = metrics.summary.taskCadenceRate ?? 0
  const cadenceDelta = cadenceRate - completionPct
  const isPositive = cadenceDelta >= 0

  return (
    <Card className="group relative h-full min-h-[276px] overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-4">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.tasks.title", { defaultValue: "Tâches" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-foreground tabular-nums">
              {stats.total}
            </p>
            <span
              className={cn(
                "text-[13px] font-semibold",
                isPositive ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {isPositive ? "+" : "-"}
              {formatPercent(Math.abs(cadenceDelta) / 100)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {formatPercent(completionPct / 100)} complétées · {stats.high} urgent
            {stats.high > 1 ? "es" : "e"}
          </p>
        </div>

        <div className="flex-1 min-h-[110px]">
          {stats.hasFlow ? (
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={stats.sankeyData}
                nodePadding={10}
                nodeWidth={8}
                margin={{ top: 4, right: 56, bottom: 4, left: 56 }}
                link={<TasksSankeyLink />}
                node={<TasksSankeyNode />}
                iterations={28}
              >
                <RechartsTooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value: number) => [`${value} tâche${value > 1 ? "s" : ""}`, "Flux"]}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Aucune tâche disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function OperationsPulsePanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const pipelineRows = metrics.pipelineRows
  const totalPipeline = pipelineRows.reduce((sum, row) => sum + row.value, 0)
  const completed = pipelineRows.find((row) =>
    row.label.toLowerCase().includes("termin")
  )?.value ?? 0
  const completionPct = totalPipeline > 0 ? (completed / totalPipeline) * 100 : 0

  const trendData = metrics.monthlyAppointments.slice(-6).map((item, index) => ({
    month: item.month,
    appointments: item.value > 0 ? item.value : [12, 15, 14, 18, 19, 22][index] ?? 10,
    baseline: [10, 11, 12, 13, 14, 15][index] ?? 10,
  }))
  const trendDelta = percentageDelta(
    trendData[trendData.length - 1]?.appointments ?? 0,
    trendData[trendData.length - 2]?.appointments ?? 0
  )

  const chartConfig = {
    appointments: {
      label: t("dashboardV2.metricStrip.todayAppointments", { defaultValue: "Rendez-vous" }),
      colors: {
        light: ["#6366f1", "#8b5cf6", "#ec4899"],
        dark: ["#818cf8", "#a78bfa", "#f472b6"],
      },
    },
    baseline: {
      label: t("dashboardV2.chartLabels.reference", { defaultValue: "Référence" }),
      colors: {
        light: ["#22c55e"],
        dark: ["#4ade80"],
      },
    },
  } satisfies EvilChartConfig

  const pipelineColors = ["#22c55e", "#f59e0b", "#3b82f6", "#a855f7"]

  return (
    <Card className="group relative h-full min-h-[276px] overflow-hidden rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3">
          <p className="text-[11px] text-muted-foreground">
            {t("dashboardV2.appointments.title", { defaultValue: "Pipeline rendez-vous" })}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-foreground tabular-nums">
              {formatCompactInteger(totalPipeline)}
            </p>
            <span className={cn("text-[13px] font-semibold", trendDelta >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {trendDelta >= 0 ? "+" : "-"}
              {formatPercent(Math.abs(trendDelta))}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            {t("dashboardV2.cashflowPanel.note", { defaultValue: "État actuel + tendance 6 mois" })}
          </p>
        </div>

        <div className="relative mb-3 min-h-[96px] flex-1">
          <EvilLineChart
            isClickable
            className="h-full w-full !aspect-auto"
            data={trendData}
            chartConfig={chartConfig}
            xDataKey="month"
            curveType="bump"
            strokeVariant="solid"
            dotVariant="colored-border"
            activeDotVariant="colored-border"
            hideLegend
            hideCartesianGrid
            glowingLines={["appointments"]}
            tooltipVariant="frosted-glass"
            xAxisProps={{ tickFormatter: (value) => String(value).slice(0, 3), hide: true }}
          />
        </div>

        <div className="space-y-2.5 border-t border-border/30 pt-3">
          {pipelineRows.map((row, index) => {
            const share = totalPipeline > 0 ? (row.value / totalPipeline) * 100 : 0
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(share, row.value > 0 ? 8 : 0)}%`,
                      backgroundColor: pipelineColors[index % pipelineColors.length],
                    }}
                  />
                </div>
              </div>
            )
          })}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <MetricMicroCard color="#22c55e" label={t("dashboardV2.pipeline.completed", { defaultValue: "Complété" })} value={formatPercent(completionPct)} />
            <MetricMicroCard color="#3b82f6" label={t("dashboardV2.metricStrip.todayAppointments", { defaultValue: "Aujourd'hui" })} value={formatCompactInteger(metrics.summary.todayAppointments)} />
            <MetricMicroCard color="#f59e0b" label={t("dashboardV2.tasks.title", { defaultValue: "Tâches dues" })} value={formatCompactInteger(metrics.summary.dueTasks)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LeadSegmentationPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const rows = metrics.topCategories.length
    ? metrics.topCategories
    : [{ label: t("dashboardV2.fallbacks.noData"), value: 0, color: "#eef0f3" }]
  const total = rows.reduce((sum, item) => sum + item.value, 0)
  const [selectedLabel, setSelectedLabel] = React.useState<string>(rows[0]?.label ?? "")
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!rows.some((row) => row.label === selectedLabel)) {
      setSelectedLabel(rows[0]?.label ?? "")
    }
  }, [rows, selectedLabel])

  const displayLabel = hoveredLabel ?? selectedLabel
  const selectedRow = rows.find((row) => row.label === displayLabel) ?? rows[0]
  const isPreviewing = hoveredLabel !== null && hoveredLabel !== selectedLabel

  return (
    <Card className="group h-full rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("dashboardV2.segmentationPanel.title")}</p>
            <div className="flex items-end gap-2">
              <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">
                {formatCompactInteger(selectedRow ? selectedRow.value / 100 : total / 100)}
              </p>
              <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground max-w-[120px] truncate inline-block">
                {selectedRow ? selectedRow.label : t("dashboardV2.segmentationPanel.distributed")}
              </span>
            </div>
          </div>
          {selectedRow ? (
            <div
              className={cn(
                "min-w-[140px] max-w-[160px] rounded-[16px] border px-3 py-2 transition-all overflow-hidden",
                isPreviewing
                  ? "border-foreground/10 bg-[var(--color-surface-soft-2)] shadow-soft"
                  : "border-border bg-[var(--color-surface-soft)]"
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {isPreviewing ? t("dashboardV2.segmentationPanel.preview") : t("dashboardV2.segmentationPanel.activeSegment")}
              </p>
              <div className="mt-2 flex items-center gap-2 overflow-hidden">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: selectedRow.color }} />
                <span className="text-[12px] font-medium text-foreground truncate">{selectedRow.label}</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[18px] font-medium tracking-[-0.03em] text-foreground">
                  {formatCompactInteger(selectedRow.value / 100)}
                </span>
                <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground shrink-0">
                  {total ? formatPercent((selectedRow.value / total) * 100) : "0%"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex h-3 gap-1.5">
          {rows.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className={cn(
                "rounded-full transition-all",
                item.label === selectedLabel && "ring-2 ring-foreground/10",
                item.label === hoveredLabel && item.label !== selectedLabel && "opacity-100 ring-1 ring-foreground/8",
                item.label !== displayLabel && "opacity-80 hover:opacity-100"
              )}
              style={{ backgroundColor: item.color, flex: item.value || 1 }}
              aria-label={t("dashboardV2.segmentationPanel.showSegment", { label: item.label })}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          {rows.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors min-w-0",
                item.label === selectedLabel
                  ? "border-border bg-[var(--color-surface-soft)] text-foreground shadow-soft"
                  : item.label === hoveredLabel
                    ? "border-foreground/10 bg-[var(--color-surface-soft-2)] text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-[var(--color-surface-soft)]"
              )}
            >
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate max-w-[100px]">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-[1.4fr_80px_70px] items-center font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
            <span>{t("dashboardV2.segmentationPanel.columns.channel")}</span>
            <span>{t("dashboardV2.segmentationPanel.columns.amount")}</span>
            <span>{t("dashboardV2.segmentationPanel.columns.share")}</span>
          </div>
          {rows.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedLabel(item.label)}
              onMouseEnter={() => setHoveredLabel(item.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className={cn(
                "grid w-full grid-cols-[1.4fr_80px_70px] items-center rounded-[16px] px-2 py-2 text-left text-[12px] transition-colors",
                item.label === selectedLabel
                  ? "bg-[var(--color-surface-soft)]"
                  : item.label === hoveredLabel
                    ? "bg-[var(--color-surface-soft-2)]"
                    : "hover:bg-[var(--color-surface-soft)]/60"
              )}
            >
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className="font-mono text-foreground">{formatCompactInteger(item.value / 100)}</span>
              <span className="font-mono text-[#17c964]">
                {total ? formatPercent((item.value / total) * 100) : "0%"}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function LeadStatusPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const total = metrics.pipelineRows.reduce((sum, row) => sum + row.value, 0)
  const [selectedLabel, setSelectedLabel] = React.useState<string>(metrics.pipelineRows[0]?.label ?? "")
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!metrics.pipelineRows.some((row) => row.label === selectedLabel)) {
      setSelectedLabel(metrics.pipelineRows[0]?.label ?? "")
    }
  }, [metrics.pipelineRows, selectedLabel])

  const displayLabel = hoveredLabel ?? selectedLabel
  const displayRow = metrics.pipelineRows.find((row) => row.label === displayLabel) ?? metrics.pipelineRows[0]

  // Icone associee a chaque etape du pipeline (meme ordre que pipelineRows)
  const pipelineIcons: IconSvgElement[] = [
    Calendar01Icon,        // new
    Loading03Icon,         // inProgress
    CheckmarkCircle01Icon, // completed
    Alert01Icon,           // followUp
  ]

  return (
    <Card className="group rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("dashboardV2.statusPanel.title")}</p>
            <div className="flex items-end gap-2">
              <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">
                {formatCompactInteger(total)}
              </p>
              <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                {t("dashboardV2.statusPanel.inPlanning")}
              </span>
            </div>
          </div>
          {displayRow ? (
            <div className="min-w-[140px]">
              <WidgetHoverPreview
                label={displayRow.label}
                value={t("dashboardV2.statusPanel.appointmentsCount", { count: formatCompactInteger(displayRow.value) })}
                meta={total ? formatPercent((displayRow.value / total) * 100) : "0%"}
                color={displayRow.color}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-4">
          {metrics.pipelineRows.map((row, index) => {
            const Icon = pipelineIcons[index] ?? Calendar01Icon
            return (
              <button
                key={row.label}
                type="button"
                onClick={() => setSelectedLabel(row.label)}
                onMouseEnter={() => setHoveredLabel(row.label)}
                onMouseLeave={() => setHoveredLabel(null)}
                className={cn(
                  "w-full rounded-[14px] px-3 py-3 text-left transition-all duration-200",
                  row.label === displayLabel ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${row.color} 14%, transparent)`,
                        color: row.color,
                      }}
                    >
                      <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-3.5" />
                    </span>
                    <span className="truncate font-mono text-[11px] uppercase tracking-[0.05em] text-foreground/75">
                      {row.label}
                    </span>
                  </div>
                  <span className="font-mono text-[12px] text-foreground">{formatCompactInteger(row.value)}</span>
                </div>
                {/* Barre de progression horizontale colorée */}
                <div className="h-2 w-full rounded-full bg-muted-foreground/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(row.ratio * 100, 5)}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function WebVisitsPanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const [selectedRange, setSelectedRange] = React.useState<"7d" | "14d" | "today">("14d")
  const netTotal = metrics.cashflowSeries.reduce((sum, item) => sum + item.value, 0)
  const previousNet = metrics.cashflowSeries.slice(0, -7).reduce((sum, item) => sum + item.value, 0)
  const currentNet = metrics.cashflowSeries.slice(-7).reduce((sum, item) => sum + item.value, 0)
  const todayNet = metrics.cashflowSeries.at(-1)?.value ?? 0
  const yesterdayNet = metrics.cashflowSeries.at(-2)?.value ?? 0
  const trendPills = [
    {
      id: "7d" as const,
      label: t("dashboardV2.cashflowPanel.pills.sevenDays"),
      value: formatDZD(currentNet * 100),
      negative: currentNet < 0,
      icon: Calendar01Icon,
      iconColor: "#21aceb",
    },
    {
      id: "14d" as const,
      label: t("dashboardV2.cashflowPanel.pills.fourteenDays"),
      value: formatDZD(netTotal * 100),
      negative: netTotal < 0,
      icon: ChartUpIcon,
      iconColor: "#a855f7",
    },
    {
      id: "today" as const,
      label: t("dashboardV2.cashflowPanel.pills.today"),
      value: formatDZD(todayNet * 100),
      negative: todayNet < 0,
      icon: FlashIcon,
      iconColor: "#f59e0b",
    },
  ]
  const chartSeries =
    selectedRange === "14d" ? metrics.cashflowSeries : metrics.cashflowSeries.slice(-7)

  return (
    <Card className="group rounded-[24px] border border-border bg-card shadow-soft card-vibrant transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("dashboardV2.cashflowPanel.title")}</p>
            <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">
              {formatDZD(netTotal * 100)}
            </p>
            <MetricDelta
              value={formatDeltaText(currentNet, previousNet)}
              note={t("dashboardV2.cashflowPanel.note")}
              negative={percentageDelta(currentNet, previousNet) < 0}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {trendPills.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedRange(item.id)}
                className="text-left"
              >
                <GrowthChip
                  label={item.label}
                  value={item.value}
                  negative={item.negative}
                  active={selectedRange === item.id}
                  icon={item.icon}
                  iconColor={item.iconColor}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-[264px]">
          <CampaignDataChart data={chartSeries} />
        </div>
      </CardContent>
    </Card>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function RevenueBarsChart({
  data,
}: {
  data: Array<{ month: string; value: number; active: number; hasData: boolean }>
}) {
  const { t } = useTranslation()

  const chartData = data.map((entry, index, rows) => {
    const previousWindow = rows.slice(Math.max(0, index - 2), index + 1)
    const reference = previousWindow.reduce((sum, item) => sum + item.value, 0) / Math.max(previousWindow.length, 1)

    return {
      month: entry.month,
      revenue: Number(entry.value.toFixed(1)),
      reference: Number(reference.toFixed(1)),
    }
  })

  const config = {
    revenue: {
      label: t("dashboardV2.chartLabels.revenue"),
      colors: {
        light: revenueGradient,
        dark: revenueGradientDark,
      },
    },
    reference: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: {
        light: ["#d4d4d8"],
        dark: ["#71717a"],
      },
    },
  } satisfies EvilChartConfig

  return (
    <EvilLineChart
      isClickable
      enableBufferLine
      glowingLines={["revenue"]}
      className="h-full w-full !aspect-auto"
      xDataKey="month"
      curveType="bump"
      strokeVariant="solid"
      activeDotVariant="colored-border"
      dotVariant="border"
      data={chartData}
      chartConfig={config}
      hideLegend
      tooltipVariant="frosted-glass"
      xAxisProps={{
        tickFormatter: (value) => String(value).slice(0, 3).toUpperCase(),
        tickMargin: 10,
      }}
    />
  )
}

function ChannelSourcesChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; color: string }>
}) {
  const compactRows = rows.slice(0, 3)
  const listRows = compactRows.slice(0, 2)
  const total = compactRows.reduce((acc, row) => acc + row.value, 0)
  const formatCompactAmount = (value: number) => {
    const absolute = Math.abs(value)
    if (absolute >= 1000) {
      return `${new Intl.NumberFormat(getCurrentLocale(), {
        minimumFractionDigits: absolute >= 100000 ? 0 : 1,
        maximumFractionDigits: 1,
      }).format(value / 1000)}k`
    }
    return formatCompactInteger(value)
  }
  const [selectedLabel, setSelectedLabel] = React.useState<string>(compactRows[0]?.label ?? "")
  const [hoveredLabel, setHoveredLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!compactRows.some((row) => row.label === selectedLabel)) {
      setSelectedLabel(compactRows[0]?.label ?? "")
    }
  }, [compactRows, selectedLabel])

  const displayLabel = hoveredLabel ?? selectedLabel
  const displayRow = compactRows.find((row) => row.label === displayLabel) ?? compactRows[0]
  const isPreviewing = hoveredLabel !== null && hoveredLabel !== selectedLabel

  return (
    <div className="flex h-full flex-col">
      {displayRow ? (
        <div
          className={cn(
            "mb-2.5 rounded-[12px] border px-2.5 py-2 transition-all",
            isPreviewing
              ? "border-foreground/10 bg-[var(--color-surface-soft-2)] shadow-soft"
              : "border-border bg-[var(--color-surface-soft)]"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: displayRow.color }} />
              <span className="text-[11px] font-medium text-foreground">{displayRow.label}</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {total ? formatPercent((displayRow.value / total) * 100) : "0%"}
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-foreground">{formatCompactAmount(displayRow.value / 100)} DA</div>
        </div>
      ) : null}

      <div className="mb-2.5 flex h-2 gap-1.5">
        {compactRows.map((row) => (
          <button
            key={row.label}
            className={cn(
              "h-full cursor-pointer rounded-full transition-all",
              row.label === selectedLabel && "ring-2 ring-foreground/10",
              row.label === hoveredLabel && row.label !== selectedLabel && "opacity-100 ring-1 ring-foreground/8",
              displayLabel && displayLabel !== row.label && "opacity-40"
            )}
            style={{
              backgroundColor: row.color,
              flex: row.value || 1,
            }}
            type="button"
            onClick={() => setSelectedLabel(row.label)}
            onMouseEnter={() => setHoveredLabel(row.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          />
        ))}
      </div>

      <div className="space-y-0.5">
        {listRows.map((row) => (
          <button
            key={row.label}
            className={cn(
              "-mx-1 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_46px_84px] items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors",
              row.label === selectedLabel
                ? "bg-[var(--color-surface-soft)]"
                : row.label === hoveredLabel
                  ? "bg-[var(--color-surface-soft-2)]"
                  : "hover:bg-muted/40"
            )}
            type="button"
            onClick={() => setSelectedLabel(row.label)}
            onMouseEnter={() => setHoveredLabel(row.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate text-[11px] text-foreground">{row.label}</span>
            </div>
            <span className="text-right font-mono text-[10px] text-muted-foreground">
              {total ? formatPercent((row.value / total) * 100) : "0%"}
            </span>
            <span className="text-right font-mono text-[11px] text-foreground">
              {formatCompactAmount(row.value / 100)} DA
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ItemDemandChart({
  data,
}: {
  data: Array<{ name: string; demand: number }>
}) {
  const { t } = useTranslation()
  const chartData = data.map((entry) => ({
    name: entry.name,
    demand: entry.demand,
  }))
  const config = {
    demand: {
      label: t("dashboardV2.chartLabels.procedures"),
      colors: {
        light: ["#f97316", "#f59e0b", "#06b6d4"],
        dark: ["#fb923c", "#facc15", "#22d3ee"],
      },
    },
  } satisfies EvilChartConfig

  return (
    <EvilLineChart
      isClickable
      glowingLines={["demand"]}
      className="h-full w-full !aspect-auto"
      xDataKey="name"
      curveType="monotone"
      strokeVariant="solid"
      activeDotVariant="colored-border"
      dotVariant="colored-border"
      data={chartData}
      chartConfig={config}
      hideLegend
      hideCartesianGrid
      tooltipVariant="frosted-glass"
      xAxisProps={{ tickFormatter: (value) => String(value).slice(0, 3) }}
    />
  )
}

function CampaignDataChart({
  data,
}: {
  data: Array<{ name: string; value: number }>
}) {
  const { t } = useTranslation()
  const chartData = data.map((entry, index, rows) => {
    const previous = rows[Math.max(0, index - 1)]?.value ?? entry.value

    return {
      name: entry.name,
      value: Number(entry.value.toFixed(1)),
      reference: Number(previous.toFixed(1)),
    }
  })
  const config = {
    value: {
      label: t("dashboardV2.chartLabels.netFlow"),
      colors: {
        light: revenueGradient,
        dark: revenueGradientDark,
      },
    },
    reference: {
      label: t("dashboardV2.chartLabels.reference"),
      colors: {
        light: ["#d6d3d1"],
        dark: ["#78716c"],
      },
    },
  } satisfies EvilChartConfig

  return (
    <EvilLineChart
      isClickable
      enableBufferLine
      glowingLines={["value"]}
      className="h-full w-full !aspect-auto"
      xDataKey="name"
      curveType="bump"
      strokeVariant="solid"
      activeDotVariant="colored-border"
      dotVariant="border"
      data={chartData}
      chartConfig={config}
      hideLegend
      tooltipVariant="frosted-glass"
      xAxisProps={{
        tickFormatter: (value) => String(value).slice(0, 3),
        tickMargin: 10,
        interval: 0,
        padding: { left: 10, right: 10 },
      }}
    />
  )
}

function WorkflowPaceChart({
  series,
}: {
  series: Array<{ label: string; total: number; completed: number; pending: number; isCurrent: boolean }>
}) {
  const { t } = useTranslation()
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const displaySeries = series.length
    ? series
    : Array.from({ length: 24 }, (_, index) => ({
        label: `${index + 1}`,
        total: 1,
        completed: index < 14 ? 1 : 0,
        pending: index < 14 ? 0 : 1,
        isCurrent: index === 23,
      }))

  const totalTasks = displaySeries.reduce((sum, item) => sum + item.total, 0)
  const completedTasks = displaySeries.reduce((sum, item) => sum + item.completed, 0)
  const pendingTasks = displaySeries.reduce((sum, item) => sum + item.pending, 0)
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Color based on level
  const fillColor =
    percentage >= 70
      ? "var(--task-full)"
      : percentage >= 30
        ? "var(--task-mid)"
        : "var(--task-low)"

  const hoveredItem = hoveredIndex !== null ? displaySeries[hoveredIndex] : null

  return (
    <div className="flex h-full w-full flex-col justify-between px-2">
      {/* Hover info or default header */}
      <div className="flex items-end justify-between font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">
        {hoveredItem ? (
          <>
            <span className="text-foreground font-medium">
              {t("dashboardV2.workflow.tooltip", {
                label: hoveredItem.label,
                completed: hoveredItem.completed,
                total: Math.max(hoveredItem.total, 1),
              })}
            </span>
            <span style={{ color: fillColor }} className="font-semibold">
              {hoveredItem.total > 0 ? Math.round((hoveredItem.completed / hoveredItem.total) * 100) : 0}%
            </span>
          </>
        ) : (
          <>
            <span>{t("dashboardV2.workflow.days")}</span>
            <span style={{ color: fillColor }} className="font-semibold">{percentage}%</span>
          </>
        )}
      </div>
      <div className="flex h-[64px] items-end gap-[4px]">
        {displaySeries.map((item, index) => {
          const completion = item.total > 0 ? item.completed / item.total : 0
          const fillHeight = 14 + completion * 38
          const isHovered = hoveredIndex === index
          return (
            <button
              key={`${item.label}-${index}`}
              type="button"
              className="flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="w-full rounded-full transition-all duration-200"
                style={{
                  height: `${fillHeight}px`,
                  backgroundColor: completion > 0 ? fillColor : "var(--task-cell-empty)",
                  opacity: isHovered ? 1 : completion > 0 ? 0.7 : 1,
                  transform: isHovered ? "scaleX(1.35)" : "scaleX(1)",
                }}
              />
            </button>
          )
        })}
      </div>
      {/* Horizontal fill bar */}
      <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-[var(--task-cell-empty)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: fillColor }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{t("dashboardV2.workflow.completedCount", { count: formatCompactInteger(completedTasks) })}</span>
        <span>{t("dashboardV2.workflow.pendingCount", { count: formatCompactInteger(pendingTasks) })}</span>
      </div>
    </div>
  )
}

function UserRetentionGrid({
  days,
}: {
  days: Array<{ date: Date; value: number }>
}) {
  const { t, i18n } = useTranslation()
  const previewDays = days.length
    ? days.slice(-84)
    : Array.from({ length: 84 }, (_, index) => ({
        date: addDays(new Date(), -83 + index),
        value: 4 + (index % 9),
      }))
  const values = previewDays.map((item) => item.value)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  
  // Couleurs de rétention avec meilleur contraste
  const getRetentionColor = (value: number) => {
    const intensity = maxValue === minValue ? 0 : (value - minValue) / (maxValue - minValue)
    if (value <= 0) return "#e2e8f0" // slate-200 pour vide
    if (intensity > 0.8) return "#10b981" // emerald-500 - très actif
    if (intensity > 0.6) return "#34d399" // emerald-400 - actif
    if (intensity > 0.4) return "#6ee7b7" // emerald-300 - moyen
    if (intensity > 0.2) return "#a7f3d0" // emerald-200 - faible
    return "#d1fae5" // emerald-100 - minimal
  }

  return (
    <div className="flex h-full w-full flex-col justify-between px-3 py-2">
      {/* Header avec stats */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("dashboardV2.retention.weeks")}
        </span>
        <span className="font-mono text-[10px] font-semibold text-emerald-600">
          {formatCompactInteger(previewDays.reduce((sum, day) => sum + day.value, 0))} {t("dashboardV2.retention.returnsLabel", { defaultValue: "retours" })}
        </span>
      </div>
      
      {/* Grille de rétention */}
      <div className="flex flex-1 items-center justify-center py-2">
        <div
          className="grid gap-[4px]"
          style={{
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
          }}
        >
          {previewDays.map((item, index) => {
            const color = getRetentionColor(item.value)
            const isEmpty = item.value <= 0
            return (
              <button
                key={index}
                type="button"
                className={cn(
                  "group relative flex items-center justify-center rounded-sm transition-all duration-200",
                  "hover:z-10 hover:scale-150 hover:shadow-md"
                )}
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: color,
                  opacity: isEmpty ? 0.5 : 1,
                }}
                title={t("dashboardV2.retention.dayTooltip", {
                  date: item.date.toLocaleDateString(getCurrentLocale(i18n.language), { day: "numeric", month: "short" }),
                  count: item.value,
                })}
              >
                {/* Bordure subtile pour les cellules non vides */}
                {!isEmpty && (
                  <span className="absolute inset-0 rounded-sm border border-emerald-600/10" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Légende */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-slate-200" />
          <span className="text-muted-foreground">{t("dashboardV2.retention.low")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-200" />
          <span className="h-2 w-2 rounded-sm bg-emerald-300" />
          <span className="h-2 w-2 rounded-sm bg-emerald-400" />
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          <span className="text-muted-foreground">{t("dashboardV2.retention.high")}</span>
        </div>
      </div>
    </div>
  )
}

function WeeklyLoadChart({
  days,
}: {
  days: Array<{ date: Date; value: number }>
}) {
  const { t } = useTranslation()
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]
  const weekdayLabels: Record<number, string> = {
    0: t("dashboardV2.weekdays.sundayShort"),
    1: t("dashboardV2.weekdays.mondayShort"),
    2: t("dashboardV2.weekdays.tuesdayShort"),
    3: t("dashboardV2.weekdays.wednesdayShort"),
    4: t("dashboardV2.weekdays.thursdayShort"),
    5: t("dashboardV2.weekdays.fridayShort"),
    6: t("dashboardV2.weekdays.saturdayShort"),
  }
  const chartData = weekdayOrder.map((weekday) => {
    const values = days
      .slice(-28)
      .filter((item) => item.date.getDay() === weekday)
      .map((item) => item.value)

    const total = values.reduce((sum, value) => sum + value, 0)
    const average = values.length ? total / values.length : 0

    return {
      label: weekdayLabels[weekday],
      value: Number(average.toFixed(1)),
    }
  })

  const config = {
    value: {
      label: t("dashboardV2.chartLabels.averageConsultations"),
      colors: {
        light: clinicalGradient,
        dark: clinicalGradientDark,
      },
    },
  } satisfies EvilChartConfig

  return (
    <div className="flex h-full w-full flex-col justify-between px-1">
      <div className="flex items-end justify-between font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">
        <span>{t("dashboardV2.weeklyLoad.weeks")}</span>
        <span>{t("dashboardV2.weeklyLoad.perDay", { count: formatCompactInteger(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length) })}</span>
      </div>
      <EvilLineChart
        isClickable
        glowingLines={["value"]}
        className="h-[78px] w-full !aspect-auto"
        xDataKey="label"
        curveType="bump"
        strokeVariant="solid"
        activeDotVariant="colored-border"
        dotVariant="colored-border"
        data={chartData}
        chartConfig={config}
        hideLegend
        hideCartesianGrid
        tooltipVariant="frosted-glass"
        xAxisProps={{ tickFormatter: (value) => String(value), tickMargin: 8 }}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{chartData[0]?.label}</span>
        <span>{t("dashboardV2.weeklyLoad.busiest", { day: chartData.sort((a, b) => b.value - a.value)[0]?.label ?? t("dashboardV2.weekdays.fridayShort") })}</span>
      </div>
    </div>
  )
}

function CityBreakdownChart({
  topCities,
}: {
  topCities: Array<{ city: string; count: number }>
}) {
  const { t } = useTranslation()
  const displayCities = topCities.length
    ? topCities.slice(0, 4)
    : [
        { city: t("dashboardV2.cities.algiers"), count: 0 },
        { city: t("dashboardV2.cities.oran"), count: 0 },
        { city: t("dashboardV2.cities.blida"), count: 0 },
        { city: t("dashboardV2.cities.setif"), count: 0 },
      ]
  const total = displayCities.reduce((sum, city) => sum + city.count, 0)
  const palette = ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"]

  return (
    <div className="flex h-full w-full flex-col justify-between px-2 py-1">
      {/* Barre de progression proportionnelle */}
      <div className="flex h-3 gap-1 rounded-full overflow-hidden bg-muted/50 p-0.5">
        {displayCities.map((city, index) => (
          <div
            key={city.city}
            className="h-full rounded-full transition-all duration-300 hover:opacity-80"
            style={{
              backgroundColor: palette[index] ?? "#dbe6ef",
              flex: Math.max(city.count, 0.5),
              minWidth: city.count > 0 ? "4px" : "0",
            }}
            title={t("dashboardV2.cities.clientsTitle", { city: city.city, count: city.count })}
          />
        ))}
      </div>
      
      {/* Liste des villes avec barres visuelles */}
      <div className="flex-1 space-y-2 py-2">
        {displayCities.map((city, index) => {
          const percentage = total ? (city.count / total) * 100 : 0
          return (
            <div
              key={city.city}
              className="group flex flex-col gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="size-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: palette[index] ?? "#dbe6ef" }} 
                  />
                  <span className="truncate text-[11px] font-medium text-foreground">{city.city}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-right font-mono text-[10px] font-semibold text-foreground">
                    {formatPercent(percentage)}
                  </span>
                  <span className="text-right font-mono text-[10px] text-muted-foreground w-12">
                    {formatCompactInteger(city.count)}
                  </span>
                </div>
              </div>
              {/* Mini barre de progression individuelle */}
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: palette[index] ?? "#dbe6ef"
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer avec total et ville principale */}
      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px]">
        <span className="text-muted-foreground">
          {t("dashboardV2.cities.totalCount", { count: formatCompactInteger(total) })}
        </span>
        <span className="font-medium text-foreground">
          {t("dashboardV2.cities.leading", { city: displayCities[0]?.city ?? t("dashboardV2.cities.algiers") })}
        </span>
      </div>
    </div>
  )
}

function LegacyPipelineChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; ratio: number; color: string }>
}) {
  const config = {
    value: { label: "Pipeline", color: "#21aceb" },
  } satisfies ChartConfig
  const chartData = rows.map((row) => ({ stage: row.label, value: row.value, fill: row.color }))

  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="stage"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={64}
          tick={{ fontSize: 9, fontFamily: "IBM Plex Mono", letterSpacing: "0.04em", fill: "#8a8a8a" }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.stage ?? ""}
              formatter={(value) => `${formatCompactInteger(Number(value))} rendez-vous`}
            />
          }
        />
        <Bar dataKey="value" radius={[999, 999, 999, 999]} barSize={6}>
          {chartData.map((entry) => (
            <Cell key={entry.stage} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function LegacyWorldMap({
  topCities,
}: {
  topCities: Array<{ city: string; count: number }>
}) {
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null)

  const cityCoordinates: Record<string, { x: number; y: number }> = {
    Alger: { x: 49, y: 23 },
    Blida: { x: 50, y: 24 },
    Tipaza: { x: 47, y: 24 },
    Boumerdes: { x: 51, y: 22 },
    Oran: { x: 43, y: 24 },
    Constantine: { x: 55, y: 22 },
    Annaba: { x: 58, y: 20 },
    Setif: { x: 54, y: 25 },
    Tlemcen: { x: 39, y: 24 },
    Bejaia: { x: 53, y: 23 },
    Ghardaia: { x: 50, y: 34 },
    Ouargla: { x: 56, y: 37 },
    Bechar: { x: 39, y: 36 },
    Adrar: { x: 36, y: 43 },
    Tamanrasset: { x: 50, y: 58 },
  }
  const worldPaths = [
    "M7 24C10 19 16 16 23 15C29 14 35 16 38 20C40 23 39 27 34 29C30 31 27 34 26 38C25 42 23 45 20 47C17 49 14 48 12 45C10 41 9 37 7 33C5 29 5 26 7 24Z",
    "M22 48C25 50 27 54 28 58C29 63 27 69 24 73C22 76 20 74 19 69C18 63 18 58 19 53C20 50 20 48 22 48Z",
    "M42 21C45 18 49 16 54 16C58 16 62 18 63 21C64 24 62 27 58 29C55 30 52 32 51 35C50 39 48 42 45 43C42 44 40 42 39 39C38 35 38 31 39 27C39 24 40 22 42 21Z",
    "M47 43C50 41 54 41 59 42C64 43 69 45 73 47C77 49 80 50 84 50C88 50 92 51 95 54C98 57 98 60 95 62C92 64 88 65 84 66C80 67 77 69 73 71C69 73 65 73 61 71C57 69 54 65 51 61C48 57 46 53 45 49C44 46 45 44 47 43Z",
    "M55 45C57 48 58 52 58 57C58 62 56 66 53 69C50 72 48 70 47 65C46 60 46 55 47 50C48 47 50 45 52 45C53 45 54 45 55 45Z",
    "M80 69C83 68 86 68 89 69C92 70 94 72 95 74C96 76 95 78 92 79C89 80 85 80 82 79C79 78 77 76 77 73C77 71 78 70 80 69Z",
  ]

  const maxCount = Math.max(...topCities.map((item) => item.count), 1)
  const nodes = topCities.slice(0, 6).map((item, index) => {
    const coordinates = cityCoordinates[item.city] ?? [
      { x: 49, y: 23 },
      { x: 20, y: 25 },
      { x: 76, y: 31 },
      { x: 70, y: 45 },
      { x: 85, y: 65 },
      { x: 27, y: 64 },
    ][index]

    return {
      ...item,
      ...coordinates,
      color: index === 0 ? "#21aceb" : "#a1a1aa",
      featured: index === 0,
    }
  })
  const activeNode = nodes.find((entry) => entry.city === hoveredNode) ?? nodes[0]
  const totalCount = nodes.reduce((sum, node) => sum + node.count, 0)

  return (
    <div className="relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-card">
      {activeNode ? (
        <WidgetHoverPreview
          label={activeNode.city}
          value={`${activeNode.count} client(s)`}
          meta={totalCount ? formatPercent((activeNode.count / totalCount) * 100) : undefined}
          color={activeNode.color}
        />
      ) : null}
      <svg viewBox="0 0 100 80" className="h-full w-full">
        <defs>
          <pattern id="world-dots-v2" x="0" y="0" width="2.05" height="2.05" patternUnits="userSpaceOnUse">
            <circle cx="1.025" cy="1.025" r="0.33" fill="var(--color-muted-foreground)" opacity="0.56" />
          </pattern>
        </defs>

        <g transform="translate(1.5 3.5) scale(0.965)">
          {worldPaths.map((path, index) => (
            <path key={index} d={path} fill="url(#world-dots-v2)" opacity="0.9" />
          ))}
        </g>

        {nodes.map((node) => {
          const isHovered = hoveredNode === node.city
          const size = node.featured ? 2.55 : isHovered ? 1.9 : 1.2
          const intensity = node.count / maxCount
          return (
            <g key={node.city}>
              {node.featured ? (
                <>
                  <circle cx={node.x} cy={node.y} r="6.6" fill="#21aceb" opacity="0.1" />
                  <circle cx={node.x} cy={node.y} r="4.4" fill="none" stroke="#21aceb" strokeWidth="0.75" opacity="0.48" />
                </>
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={size + (node.featured ? 1.9 : 0.9)}
                fill={node.color}
                opacity={node.featured ? 0.16 : 0.08 + intensity * 0.06}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={size}
                fill={node.color}
                stroke={node.featured ? "white" : "var(--color-card)"}
                strokeWidth={node.featured ? "0.95" : "0.3"}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.city)}
                onMouseLeave={() => setHoveredNode(null)}
              />
              {node.featured ? <circle cx={node.x} cy={node.y} r="0.78" fill="white" /> : null}
              {(isHovered || node.featured) && (
                <text
                  x={node.x}
                  y={node.y - (node.featured ? 7.4 : 4.6)}
                  textAnchor="middle"
                  fontSize={node.featured ? "3" : "2.55"}
                  fill="var(--color-foreground)"
                  opacity={node.featured ? 0.82 : 0.65}
                  fontWeight={node.featured ? "600" : "500"}
                >
                  {node.city}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
