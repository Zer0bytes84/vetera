"use client"

import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Task01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  SparklesIcon,
  ArrowRight01Icon,
  Package02Icon,
  Calendar01Icon,
  StethoscopeIcon,
  Invoice03Icon,
  UserGroupIcon,
  Clock01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { View } from "@/types"
import { useTranslation } from "react-i18next"

// ============================================================================
// SMART INSIGHTS WIDGET - Style moderne avec icônes colorées
// ============================================================================

export type SmartInsight = {
  id: string
  type: "warning" | "info" | "success" | "trend"
  title: string
  message: string
  action?: string
  view?: View
}

const INSIGHT_META: Record<string, { 
  icon: typeof SparklesIcon
  bgClass: string 
  iconClass: string
}> = {
  warning: { 
    icon: Alert02Icon, 
    bgClass: "bg-amber-500/10",
    iconClass: "text-amber-600 dark:text-amber-400"
  },
  info: { 
    icon: SparklesIcon, 
    bgClass: "bg-blue-500/10",
    iconClass: "text-blue-600 dark:text-blue-400"
  },
  success: { 
    icon: CheckmarkCircle02Icon, 
    bgClass: "bg-emerald-500/10",
    iconClass: "text-emerald-600 dark:text-emerald-400"
  },
  trend: { 
    icon: Invoice03Icon, 
    bgClass: "bg-violet-500/10",
    iconClass: "text-violet-600 dark:text-violet-400"
  },
}

export function InsightsWidget({
  insights,
  onNavigate,
}: {
  insights: SmartInsight[]
  onNavigate: (view: View) => void
}) {
  const { t } = useTranslation()

  if (insights.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t("dashboardWidgets.aiInsights")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboardWidgets.smartSuggestions")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">{t("dashboardWidgets.allGood")}</p>
            <p className="text-xs text-muted-foreground">{t("dashboardWidgets.noSuggestion")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t("dashboardWidgets.aiInsights")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboardWidgets.suggestionsCount", { count: insights.length })}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {t("dashboardWidgets.local")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.slice(0, 3).map((insight) => {
          const meta = INSIGHT_META[insight.type] || INSIGHT_META.info
          return (
            <div key={insight.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", meta.bgClass)}>
                <HugeiconsIcon icon={meta.icon} strokeWidth={2} className={cn("size-4", meta.iconClass)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{insight.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{insight.message}</p>
                {insight.action && insight.view && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[11px] text-primary"
                    onClick={() => onNavigate(insight.view!)}
                  >
                    {insight.action}
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-0.5 size-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASKS WIDGET - Style moderne avec progression
// ============================================================================

type TaskItem = {
  id: string
  title: string
  status: string
  priority?: string
  dueDate?: string
}

export function TasksWidget({
  tasks,
  onNavigate,
}: {
  tasks: TaskItem[]
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "done").length
    const pending = total - done
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, pending, percent }
  }, [tasks])

  const recentPending = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => (a.priority === "high" ? -1 : 1))
      .slice(0, 3)
  }, [tasks])

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
              <HugeiconsIcon icon={Task01Icon} strokeWidth={2} className="size-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{t("dashboardWidgets.tasks")}</CardTitle>
              <CardDescription className="text-xs">{t("dashboardWidgets.pendingCount", { count: stats.pending })}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{stats.percent}%</p>
          </div>
        </div>
        <Progress value={stats.percent} className="mt-2 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-2">
        {recentPending.length > 0 ? (
          recentPending.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
            >
              <div className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                task.priority === "high" ? "border-amber-500" : "border-muted-foreground/30"
              )}>
                <div className={cn("size-1.5 rounded-full", task.priority === "high" && "bg-amber-500")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{task.title}</p>
                {task.dueDate && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
              {task.priority === "high" && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[9px]">
                  Urgent
                </Badge>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xs font-medium">{t("dashboardWidgets.allGood")}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full gap-1 text-xs mt-1" onClick={onNavigate}>
          {t("dashboardWidgets.insight.viewTasks")}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STOCK ALERTS WIDGET - Alertes stock critique
// ============================================================================

type StockItem = {
  id: string
  name: string
  quantity: number
  minStock: number
  unit: string
}

export function StockAlertsWidget({
  products,
  onNavigate,
}: {
  products: StockItem[]
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const lowStock = useMemo(() => {
    return products
      .filter((p) => p.quantity <= p.minStock)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 3)
  }, [products])

  const criticalCount = lowStock.filter((p) => p.quantity === 0).length

  return (
    <Card className={cn("h-full", lowStock.length > 0 && "border-amber-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              lowStock.length > 0 ? "bg-amber-500/10" : "bg-muted"
            )}>
              <HugeiconsIcon 
                icon={Package02Icon} 
                strokeWidth={2} 
                className={cn("size-4", lowStock.length > 0 ? "text-amber-600" : "text-muted-foreground")} 
              />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Stock</CardTitle>
              <CardDescription className="text-xs">
                {lowStock.length > 0 ? `${lowStock.length} alerte${lowStock.length > 1 ? "s" : ""}` : "Niveaux OK"}
              </CardDescription>
            </div>
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {criticalCount} critique
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStock.length > 0 ? (
          <>
            {lowStock.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-600">{product.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">min: {product.minStock} {product.unit}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full gap-1 text-xs" onClick={onNavigate}>
              {t("dashboardWidgets.insight.viewStock")}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xs font-medium">Stock optimal</p>
            <p className="text-[10px] text-muted-foreground">Aucun produit en alerte</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// NEXT APPOINTMENT WIDGET - Prochain rendez-vous
// ============================================================================

export type NextAppointment = {
  id: string
  patient: string
  type: string
  startTime: Date
  vetName: string
}

export function NextAppointmentWidget({
  appointment,
  onNavigate,
}: {
  appointment: NextAppointment | null
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const timeUntil = useMemo(() => {
    if (!appointment) return null
    const diff = appointment.startTime.getTime() - Date.now()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `dans ${days}j`
    if (hours > 0) return `dans ${hours}h`
    if (minutes > 0) return `dans ${minutes}min`
    return "maintenant"
  }, [appointment])

  if (!appointment) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Prochain RDV</CardTitle>
              <CardDescription className="text-xs">{t("dashboardWidgets.noSuggestion")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("dashboardWidgets.insight.lowBookingsMessage")}</p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={onNavigate}>
              Planifier
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Prochain RDV</CardTitle>
              <CardDescription className="text-xs">{timeUntil}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {appointment.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="font-semibold text-sm">{appointment.patient}</p>
          <p className="text-xs text-muted-foreground">{appointment.type}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Dr. {appointment.vetName}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full gap-1 text-xs" onClick={onNavigate}>
          {t("dashboardWidgets.viewAgenda")}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// QUICK STATS WIDGET - Statistiques rapides
// ============================================================================

export function QuickStatsWidget({
  todayAppointments,
  activePatients,
  todayRevenue,
  onNavigate,
}: {
  todayAppointments: number
  activePatients: number
  todayRevenue: number
  onNavigate: (view: View) => void
}) {
  const { t } = useTranslation()
  const formatMoney = (amount: number) => {
    if (amount >= 100000) return `${(amount / 1000).toFixed(0)}k DA`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k DA`
    return `${amount} DA`
  }

  const stats = [
    {
      label: t("dashboardWidgets.consultations"),
      value: todayAppointments,
      icon: StethoscopeIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      view: "agenda" as View,
    },
    {
      label: t("dashboardWidgets.patients"),
      value: activePatients,
      icon: UserGroupIcon,
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
      view: "patients" as View,
    },
    {
      label: t("dashboardWidgets.revenues"),
      value: formatMoney(todayRevenue),
      icon: Invoice03Icon,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      view: "finances" as View,
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{t("dashboardWidgets.today")}</CardTitle>
            <CardDescription className="text-xs">{t("dashboardWidgets.overview")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => onNavigate(stat.view)}
            className="flex w-full items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 text-left"
          >
            <div className={cn("flex size-8 items-center justify-center rounded-lg", stat.bgColor)}>
              <HugeiconsIcon icon={stat.icon} strokeWidth={2} className={cn("size-4", stat.color)} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-semibold">{stat.value}</p>
            </div>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// GENERATE INSIGHTS - Fonction utilitaire
// ============================================================================

export function generateInsights({
  todayAppointments,
  upcomingAppointments,
  lowStockProducts,
  pendingTasks,
  currentIncome,
  previousIncome,
  translate,
}: {
  todayAppointments: number
  upcomingAppointments: number
  lowStockProducts: Array<{ id: string; name: string; quantity: number }>
  pendingTasks: number
  currentIncome: number
  previousIncome: number
  translate: (key: string, options?: Record<string, unknown>) => string
}): SmartInsight[] {
  const insights: SmartInsight[] = []

  if (lowStockProducts.length > 0) {
    const first = lowStockProducts[0]
    insights.push({
      id: "stock-low",
      type: "warning",
      title: translate("dashboardWidgets.insight.stockCritical"),
      message: translate("dashboardWidgets.insight.stockCriticalMessage", {
        count: lowStockProducts.length,
        name: first.name,
        quantity: first.quantity,
      }),
      action: translate("dashboardWidgets.insight.viewStock"),
      view: "stock",
    })
  }

  if (pendingTasks > 0) {
    insights.push({
      id: "tasks-pending",
      type: "info",
      title: translate("dashboardWidgets.insight.pendingTasks"),
      message: translate("dashboardWidgets.insight.pendingTasksMessage", {
        count: pendingTasks,
      }),
      action: translate("dashboardWidgets.insight.viewTasks"),
      view: "taches",
    })
  }

  if (previousIncome > 0) {
    const delta = ((currentIncome - previousIncome) / previousIncome) * 100
    if (delta > 10) {
      insights.push({
        id: "income-up",
        type: "success",
        title: translate("dashboardWidgets.insight.risingRevenue"),
        message: translate("dashboardWidgets.insight.risingRevenueMessage", {
          delta: delta.toFixed(0),
        }),
      })
    } else if (delta < -10) {
      insights.push({
        id: "income-down",
        type: "trend",
        title: translate("dashboardWidgets.insight.fallingRevenue"),
        message: translate("dashboardWidgets.insight.fallingRevenueMessage", {
          delta: delta.toFixed(0),
        }),
        action: translate("dashboardWidgets.insight.finances"),
        view: "finances",
      })
    }
  }

  if (todayAppointments === 0 && upcomingAppointments < 3) {
    insights.push({
      id: "low-bookings",
      type: "info",
      title: translate("dashboardWidgets.insight.lowBookings"),
      message: translate("dashboardWidgets.insight.lowBookingsMessage"),
      action: translate("dashboardWidgets.viewAgenda"),
      view: "agenda",
    })
  }

  return insights.slice(0, 3)
}
