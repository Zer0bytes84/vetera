import * as React from "react"
import { ArrowLeft01Icon, StethoscopeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
import { useAuth } from "@/contexts/AuthContext"
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

function getReferenceDate(appointments: Appointment[], transactions: Transaction[]) {
  const timestamps = [
    ...appointments.map((item) => safeDate(item.startTime)?.getTime() ?? NaN),
    ...transactions.map((item) => safeDate(item.date)?.getTime() ?? NaN),
  ].filter(Number.isFinite)

  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now())
}

export type DashboardMetrics = ReturnType<typeof buildDashboardMetrics>

function DashboardWelcomeCard({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { t, i18n } = useTranslation()
  const { currentUser } = useAuth()
  const firstName = currentUser?.displayName?.trim().split(" ")[0] || t("dashboardV2.welcome.fallbackName")
  const todayLabel = new Intl.DateTimeFormat(getCurrentLocale(i18n.language), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date())

  return (
    <div className="pb-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {todayLabel}
          </p>
          <div className="space-y-1">
            <h1 className="text-[1.85rem] font-medium tracking-[-0.065em] text-foreground lg:text-[2.2rem]">
              {t("dashboardV2.welcome.title", { name: firstName })}
            </h1>
            <p className="max-w-[58ch] text-sm leading-6 text-muted-foreground">
              {t("dashboardV2.welcome.subtitle")}
            </p>
          </div>
        </div>

        {onNavigate && (
          <div className="flex items-center shrink-0">
            <Button variant="default" onClick={() => onNavigate("clinique" as View)}>
              <HugeiconsIcon
                icon={StethoscopeIcon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Nouvelle consultation
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

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
    return date && date >= todayStart && date <= todayEnd && !["cancelled", "no_show"].includes(item.status)
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

  const pipelineRows = [
    {
      label: i18n.t("dashboardV2.pipeline.new"),
      value: appointments.filter((item) => item.status === "scheduled").length,
      color: "#21aceb",
    },
    {
      label: i18n.t("dashboardV2.pipeline.inProgress"),
      value: appointments.filter((item) => item.status === "in_progress").length,
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
  }
}

export type InsightCardData = {
  eyebrow: string
  value: string
  detailLead: string
  detailText: string
  detailInline?: boolean
  isNegative?: boolean
  title: string
  description: string
  chart: React.ReactNode
}

type InsightCardProps = InsightCardData & {
  active?: boolean
}

export function DashboardV2Page({ onNavigate }: { onNavigate?: (view: View) => void } = {}) {
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
          <DashboardWelcomeCard onNavigate={onNavigate} />

          <LeadMetricStrip metrics={metrics} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(330px,1fr)]">
            <LeadRevenuePanel metrics={metrics} />
            <LeadSegmentationPanel metrics={metrics} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
            <LeadStatusPanel metrics={metrics} />
            <WebVisitsPanel metrics={metrics} />
          </div>
        </section>

        <DashboardSection
          title={t("dashboardV2.operational.title")}
          subtitle={t("dashboardV2.operational.subtitle", { appName: APP_NAME })}
          cards={galleryCards}
        />
      </div>
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(330px,1fr)]">
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
        "group min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-soft",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:border-foreground/10",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
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

export function LeadMetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const items = [
    {
      label: t("dashboardV2.metricStrip.income30"),
      value: formatDZD(metrics.summary.income30),
      delta: formatDeltaText(metrics.summary.income30, metrics.summary.previousIncome30),
      note: t("dashboardV2.metricStrip.income30Note"),
      negative: percentageDelta(metrics.summary.income30, metrics.summary.previousIncome30) < 0,
    },
    {
      label: t("dashboardV2.metricStrip.averageBasket"),
      value: formatDZD(metrics.summary.averageBasket),
      delta: formatDeltaText(metrics.summary.averageBasket, metrics.summary.previousIncome30 ? metrics.summary.previousIncome30 / Math.max(1, metrics.summary.currentQualified) : 0),
      note: t("dashboardV2.metricStrip.averageBasketNote"),
      negative: false,
    },
    {
      label: t("dashboardV2.metricStrip.todayAppointments"),
      value: formatCompactInteger(metrics.summary.todayAppointments),
      delta: formatDeltaText(metrics.summary.todayAppointments, metrics.summary.yesterdayAppointments),
      note: t("dashboardV2.metricStrip.todayAppointmentsNote"),
      negative: percentageDelta(metrics.summary.todayAppointments, metrics.summary.yesterdayAppointments) < 0,
    },
    {
      label: t("dashboardV2.metricStrip.activePatients"),
      value: formatCompactInteger(metrics.summary.currentActivePatients),
      delta: formatDeltaText(metrics.summary.currentActivePatients, metrics.summary.previousActivePatients),
      note: t("dashboardV2.metricStrip.activePatientsNote"),
      negative: percentageDelta(metrics.summary.currentActivePatients, metrics.summary.previousActivePatients) < 0,
    },
    {
      label: t("dashboardV2.metricStrip.completedTasks"),
      value: formatPercent(metrics.summary.taskCompletionRate),
      delta: formatCompactInteger(metrics.summary.dueTasks),
      note: t("dashboardV2.metricStrip.completedTasksNote"),
      negative: false,
    },
  ]

  return (
    <Card className="overflow-hidden rounded-[24px] border border-border bg-card">
      <div className="grid divide-y divide-border xl:grid-cols-5 xl:divide-x xl:divide-y-0">
        {items.map((metric) => (
          <div key={metric.label} className="flex min-h-[132px] flex-col justify-between px-4 py-4">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">{metric.label}</p>
              <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">{metric.value}</p>
            </div>
            <MetricDelta value={metric.delta} note={metric.note} negative={metric.negative} />
          </div>
        ))}
      </div>
    </Card>
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
}: {
  label: string
  value: string
  negative?: boolean
  active?: boolean
}) {
  return (
    <div className={cn(
      "min-w-[112px] rounded-[16px] border border-border bg-card px-3 py-2 shadow-soft transition-all",
      active && "bg-[var(--color-surface-soft)] ring-1 ring-foreground/6"
    )}>
      <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
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
    <div className="rounded-[12px] border border-border bg-[var(--color-surface-soft)] px-2.5 py-2 shadow-soft">
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

export function LeadRevenuePanel({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = React.useState("12m")
  
  // Get current month index (0-11)
  const currentMonthIndex = new Date().getMonth()
  
  // Filter data based on selected time range
  const filteredData = React.useMemo(() => {
    if (timeRange === "12m") {
      // Show all 12 months
      return metrics.monthlyRevenue
    } else if (timeRange === "6m") {
      // Show last 6 months up to current
      const startIndex = Math.max(0, currentMonthIndex - 5)
      return metrics.monthlyRevenue.slice(startIndex, currentMonthIndex + 1)
    } else if (timeRange === "3m") {
      // Show last 3 months up to current
      const startIndex = Math.max(0, currentMonthIndex - 2)
      return metrics.monthlyRevenue.slice(startIndex, currentMonthIndex + 1)
    }
    return metrics.monthlyRevenue
  }, [metrics.monthlyRevenue, timeRange, currentMonthIndex])
  
  // Calculate totals for the selected period
  const periodTotals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, item) => acc + item.value,
      0
    )
  }, [filteredData])
  
  const activeMonth = filteredData[filteredData.length - 1] ?? metrics.monthlyRevenue[currentMonthIndex]
  const previousMonth = filteredData[filteredData.length - 2] ?? metrics.monthlyRevenue[currentMonthIndex - 1]
  const activeMonthDelta = percentageDelta(activeMonth?.value ?? 0, previousMonth?.value ?? 0)

  return (
    <Card className="h-full rounded-[24px] border border-border bg-card">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("dashboardV2.revenuePanel.title")}</p>
            <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">
              {formatDZD((periodTotals ?? 0) * 100)}
            </p>
            <MetricDelta
              value={formatPercent(Math.abs(activeMonthDelta))}
              note={previousMonth ? t("dashboardV2.revenuePanel.compare", { current: activeMonth?.month ?? "", previous: previousMonth.month }) : activeMonth?.month ?? ""}
              negative={activeMonthDelta < 0}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="w-[140px] rounded-lg"
                aria-label="Sélectionner une période"
              >
                <SelectValue placeholder="12 mois" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="12m" className="rounded-lg">
                  12 mois
                </SelectItem>
                <SelectItem value="6m" className="rounded-lg">
                  6 mois
                </SelectItem>
                <SelectItem value="3m" className="rounded-lg">
                  3 mois
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 min-h-[248px] flex-1">
          <LeadRevenueAreaChart data={filteredData} />
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
    <Card className="group h-full rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">{t("dashboardV2.segmentationPanel.title")}</p>
            <div className="flex items-end gap-2">
              <p className="text-[20px] font-medium tracking-[-0.03em] text-foreground">
                {formatCompactInteger(selectedRow ? selectedRow.value / 100 : total / 100)}
              </p>
              <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                {selectedRow ? selectedRow.label : t("dashboardV2.segmentationPanel.distributed")}
              </span>
            </div>
          </div>
          {selectedRow ? (
            <div
              className={cn(
                "min-w-[148px] rounded-[16px] border px-3 py-2 transition-all",
                isPreviewing
                  ? "border-foreground/10 bg-[var(--color-surface-soft-2)] shadow-soft"
                  : "border-border bg-[var(--color-surface-soft)]"
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                {isPreviewing ? t("dashboardV2.segmentationPanel.preview") : t("dashboardV2.segmentationPanel.activeSegment")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: selectedRow.color }} />
                <span className="text-[12px] font-medium text-foreground">{selectedRow.label}</span>
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[18px] font-medium tracking-[-0.03em] text-foreground">
                  {formatCompactInteger(selectedRow.value / 100)}
                </span>
                <span className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
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
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors",
                item.label === selectedLabel
                  ? "border-border bg-[var(--color-surface-soft)] text-foreground shadow-soft"
                  : item.label === hoveredLabel
                    ? "border-foreground/10 bg-[var(--color-surface-soft-2)] text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-[var(--color-surface-soft)]"
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
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
              <div className="flex items-center gap-2 text-foreground">
                <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
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

  return (
    <Card className="group rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
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

        <div className="mt-8 space-y-5">
          {metrics.pipelineRows.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => setSelectedLabel(row.label)}
              onMouseEnter={() => setHoveredLabel(row.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              className={cn(
                "grid w-full grid-cols-[92px_1fr_42px] items-center gap-3 rounded-[14px] px-1.5 py-1.5 text-left transition-colors",
                row.label === displayLabel ? "bg-[var(--color-surface-soft)]" : "hover:bg-muted/40"
              )}
            >
              <span className="truncate font-mono text-[11px] uppercase tracking-[0.05em] text-foreground/75">
                {row.label}
              </span>
              <div className="h-5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(row.ratio * 100, row.value > 0 ? 18 : 0)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="font-mono text-[12px] text-foreground">{formatCompactInteger(row.value)}</span>
            </button>
          ))}
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
    },
    {
      id: "14d" as const,
      label: t("dashboardV2.cashflowPanel.pills.fourteenDays"),
      value: formatDZD(netTotal * 100),
      negative: netTotal < 0,
    },
    {
      id: "today" as const,
      label: t("dashboardV2.cashflowPanel.pills.today"),
      value: formatDZD(todayNet * 100),
      negative: todayNet < 0,
    },
  ]
  const chartSeries =
    selectedRange === "14d" ? metrics.cashflowSeries : metrics.cashflowSeries.slice(-7)

  return (
    <Card className="group rounded-[24px] border border-border bg-card shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/10">
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

function LeadRevenueAreaChart({
  data,
}: {
  data: Array<{ month: string; value: number; active: number; hasData: boolean }>
}) {
  const { t } = useTranslation()

  const config = {
    previsions: {
      label: t("dashboard.revenue.previsions", { defaultValue: "Prévisions" }),
      color: "#f97316",
    },
    encaissements: {
      label: t("dashboard.revenue.encaissements", { defaultValue: "Encaissements" }),
      color: "#f97316",
    },
  } satisfies ChartConfig

  // Transform data to include previsions (simulated at 120% of actual value)
  const chartData = data.map((entry) => ({
    ...entry,
    encaissements: entry.value,
    previsions: Math.round(entry.value * 1.2), // Simulated: 120% of actual revenue as forecast
  }))

  return (
    <ChartContainer config={config} className="h-full w-full">
      <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 16, bottom: 20 }}>
        <defs>
          <linearGradient id="fillPrevisions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillEncaissements" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={8}
          interval={0}
          tickFormatter={(value) => value.slice(0, 3)}
          fontSize={10}
          className="fill-muted-foreground"
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => formatDZD(Number(value) * 100)}
            />
          }
        />
        <Area
          dataKey="previsions"
          type="natural"
          stroke="var(--color-previsions)"
          fill="url(#fillPrevisions)"
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        <Area
          dataKey="encaissements"
          type="natural"
          stroke="var(--color-encaissements)"
          fill="url(#fillEncaissements)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function RevenueBarsChart({
  data,
}: {
  data: Array<{ month: string; value: number; active: number; hasData: boolean }>
}) {
  const { t } = useTranslation()
  
  const config = {
    value: { label: t("dashboardV2.chartLabels.revenue"), color: "var(--chart-1)" },
  } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 20 }}>
        <defs>
          <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={20}
          minTickGap={8}
          height={40}
          interval={0}
          tickFormatter={(value) => value.slice(0, 3)}
          fontSize={10}
          className="fill-muted-foreground"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => formatDZD((value as number) * 100)}
              indicator="dot"
            />
          }
        />
        <Area
          dataKey="value"
          type="natural"
          fill="url(#fillRevenue)"
          stroke="var(--color-value)"
          strokeWidth={2}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
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
  const config = { demand: { label: t("dashboardV2.chartLabels.procedures"), color: "#ff7a1a" } } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ""}
            />
          }
        />
        <Bar dataKey="demand" fill="url(#itemDemandFillV2)" radius={[10, 10, 10, 10]} maxBarSize={32} />
        <defs>
          <linearGradient id="itemDemandFillV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa24a" />
            <stop offset="100%" stopColor="#ff7a1a" />
          </linearGradient>
        </defs>
      </BarChart>
    </ChartContainer>
  )
}

function CampaignDataChart({
  data,
}: {
  data: Array<{ name: string; value: number }>
}) {
  const { t } = useTranslation()
  const config = { value: { label: t("dashboardV2.chartLabels.netFlow"), color: "#ff7a1a" } } satisfies ChartConfig

  return (
    <ChartContainer config={config} className="h-full w-full">
      <AreaChart 
        accessibilityLayer
        data={data} 
        margin={{ top: 10, right: 12, left: 12, bottom: 20 }}
      >
        <defs>
          <linearGradient id="campaignFillV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff7a1a" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.name ?? ""}
              formatter={(value) => formatDZD(Number(value) * 100)}
            />
          }
        />
        <Area
          type="natural"
          dataKey="value"
          stroke="var(--color-value)"
          fill="url(#campaignFillV2)"
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
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
    value: { label: t("dashboardV2.chartLabels.averageConsultations"), color: "#21aceb" },
  } satisfies ChartConfig

  return (
    <div className="flex h-full w-full flex-col justify-between px-1">
      <div className="flex items-end justify-between font-mono text-[9px] uppercase tracking-[0.05em] text-muted-foreground">
        <span>{t("dashboardV2.weeklyLoad.weeks")}</span>
        <span>{t("dashboardV2.weeklyLoad.perDay", { count: formatCompactInteger(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length) })}</span>
      </div>
      <ChartContainer config={config} className="h-[78px] w-full">
        <LineChart data={chartData} margin={{ top: 10, right: 4, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#8a8a8a" }}
          />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.label ?? ""}
                formatter={(value) => t("dashboardV2.weeklyLoad.consultations", { count: value })}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={{ r: 3, fill: "#21aceb", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#21aceb", stroke: "white", strokeWidth: 1.5 }}
          />
        </LineChart>
      </ChartContainer>
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
