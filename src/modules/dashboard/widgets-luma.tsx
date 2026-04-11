"use client"

import { useMemo } from "react"
import {
  Calendar01Icon,
  Clock01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  AiPhone01Icon,
  Task01Icon,
  Package02Icon,
  SparklesIcon,
  Clock02Icon,
  TrendingUp,
  Target01Icon,
  UserGroupIcon,
  AlertCircleIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { View } from "@/types"

// ============================================================================
// NEXT APPOINTMENT WIDGET - Style Luma
// ============================================================================

export type NextAppointment = {
  id: string
  patient: string
  type: string
  startTime: Date
  vetName: string
  phone?: string
}

export function NextAppointmentWidgetLuma({
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

  const initials = useMemo(() => {
    if (!appointment) return "?"
    return appointment.patient
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [appointment])

  const timeString = useMemo(() => {
    if (!appointment) return ""
    return appointment.startTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [appointment])

  if (!appointment) {
    return (
      <Card className="h-full" size="sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("dashboardWidgets.nextAppointment", { defaultValue: "Prochain RDV" })}
          </CardTitle>
          <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("dashboardWidgets.noSuggestion")}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full" size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboardWidgets.nextAppointment", { defaultValue: "Prochain RDV" })}
        </CardTitle>
        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{appointment.patient}</span>
          <Badge variant="outline" className="text-xs">
            {timeString}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {appointment.type} • {timeUntil}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" className="h-8 text-xs">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="mr-1 size-3.5" />
            Confirmer
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-2">
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={onNavigate}>
            Agenda
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1 size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TASKS WIDGET - Style Luma
// ============================================================================

type TaskItem = {
  id: string
  title: string
  status: string
  priority?: string
  dueDate?: string
}

export function TasksWidgetLuma({
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
    <Card className="h-full" size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboardWidgets.tasks", { defaultValue: "Tâches" })}
        </CardTitle>
        <HugeiconsIcon icon={Task01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{stats.pending}</div>
          <Badge
            variant="secondary"
            className={stats.percent >= 50 
              ? "bg-emerald-500/10 text-emerald-600" 
              : "bg-amber-500/10 text-amber-600"
            }
          >
            {stats.percent}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.pending} en attente sur {stats.total}
        </p>
        <Progress value={stats.percent} className="mt-3 h-1.5" />
        {recentPending.length > 0 && (
          <div className="mt-3 space-y-2">
            {recentPending.slice(0, 2).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "size-2 rounded-full",
                  task.priority === "high" ? "bg-amber-500" : "bg-muted-foreground/30"
                )} />
                <span className="flex-1 truncate">{task.title}</span>
                {task.priority === "high" && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                    Urgent
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STOCK ALERTS WIDGET - Style Luma
// ============================================================================

type StockItem = {
  id: string
  name: string
  quantity: number
  minStock: number
  unit: string
}

export function StockAlertsWidgetLuma({
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
    <Card className={cn("h-full", lowStock.length > 0 && "border-amber-500/30")} size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboardWidgets.stock", { defaultValue: "Stock" })}
        </CardTitle>
        <HugeiconsIcon 
          icon={Package02Icon} 
          strokeWidth={2} 
          className={cn("size-4", lowStock.length > 0 ? "text-amber-600" : "text-muted-foreground")} 
        />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{lowStock.length}</div>
          {criticalCount > 0 ? (
            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20">
              {criticalCount} critique
            </Badge>
          ) : lowStock.length > 0 ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Alertes
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              OK
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {lowStock.length > 0 
            ? `${lowStock.length} produit${lowStock.length > 1 ? "s" : ""} en alerte`
            : "Niveaux de stock optimaux"
          }
        </p>
        {lowStock.length > 0 && (
          <div className="mt-3 space-y-2">
            {lowStock.slice(0, 2).map((product) => (
              <div key={product.id} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{product.name}</span>
                <span className="text-amber-600 font-medium">{product.quantity} {product.unit}</span>
              </div>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs text-muted-foreground" 
              onClick={onNavigate}
            >
              Voir le stock
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="ml-1 size-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// INSIGHTS WIDGET - Style Luma
// ============================================================================

export type SmartInsight = {
  id: string
  type: "warning" | "success" | "info" | "trend"
  title: string
  message: string
  action?: string
  view?: View
}

const INSIGHT_META: Record<string, { icon: IconSvgElement; color: string; bg: string }> = {
  warning: { icon: AlertCircleIcon, color: "text-amber-600", bg: "bg-amber-500/10" },
  success: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  info: { icon: SparklesIcon, color: "text-blue-600", bg: "bg-blue-500/10" },
  trend: { icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-500/10" },
}

export function InsightsWidgetLuma({
  insights,
  onNavigate,
}: {
  insights: SmartInsight[]
  onNavigate: (view: View) => void
}) {
  const { t } = useTranslation()

  if (insights.length === 0) {
    return (
      <Card className="h-full" size="sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("dashboardWidgets.aiInsights", { defaultValue: "Insights IA" })}
          </CardTitle>
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("dashboardWidgets.allGood")}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full" size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboardWidgets.aiInsights", { defaultValue: "Insights IA" })}
        </CardTitle>
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{insights.length}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("dashboardWidgets.suggestionsCount", { count: insights.length })}
        </p>
        <ScrollArea className="h-[100px] mt-3">
          <div className="space-y-2 pr-4">
            {insights.slice(0, 3).map((insight) => {
              const meta = INSIGHT_META[insight.type] || INSIGHT_META.info
              return (
                <div key={insight.id} className="flex items-start gap-2 text-xs">
                  <div className={cn("flex size-6 shrink-0 items-center justify-center rounded", meta.bg)}>
                    <HugeiconsIcon icon={meta.icon} strokeWidth={2} className={cn("size-3", meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{insight.title}</p>
                    <p className="text-muted-foreground line-clamp-1">{insight.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// RECENT ACTIVITY WIDGET - Style Luma
// ============================================================================

type ActivityType = "appointment" | "patient" | "invoice" | "stock"

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  time: string
}

const activityMeta: Record<
  ActivityType,
  { icon: typeof Calendar01Icon; color: string; bg: string }
> = {
  appointment: {
    icon: Calendar01Icon,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  patient: {
    icon: UserGroupIcon,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  invoice: {
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  stock: {
    icon: Package02Icon,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
}

export function RecentActivityWidgetLuma({
  activities,
  onNavigate,
}: {
  activities: Activity[]
  onNavigate: () => void
}) {
  const { t } = useTranslation()

  return (
    <Card className="h-full" size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboard.recentActivity", { defaultValue: "Activité récente" })}
        </CardTitle>
        <HugeiconsIcon icon={Clock02Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[120px]">
          <div className="space-y-2 pr-4">
            {activities.length > 0 ? (
              activities.slice(0, 4).map((activity) => {
                const meta = activityMeta[activity.type]
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <div className={cn("flex size-7 items-center justify-center rounded", meta.bg)}>
                      <HugeiconsIcon icon={meta.icon} strokeWidth={2} className={cn("size-3.5", meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{activity.title}</p>
                      <p className="text-[10px] text-muted-foreground">{activity.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{activity.time}</span>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.noActivity", { defaultValue: "Aucune activité récente" })}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PERFORMANCE WIDGET - Style Luma
// ============================================================================

export function PerformanceWidgetLuma({
  todayAppointments,
  completedAppointments,
  activePatients,
}: {
  todayAppointments: number
  completedAppointments: number
  activePatients: number
}) {
  const { t } = useTranslation()

  const completionRate = useMemo(() => {
    return todayAppointments > 0 ? Math.round((completedAppointments / todayAppointments) * 100) : 0
  }, [todayAppointments, completedAppointments])

  return (
    <Card className="h-full" size="sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboard.performance.title", { defaultValue: "Performance" })}
        </CardTitle>
        <HugeiconsIcon icon={Target01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{completionRate}%</div>
          <Badge
            variant="secondary"
            className={completionRate >= 80 
              ? "bg-emerald-500/10 text-emerald-600" 
              : "bg-amber-500/10 text-amber-600"
            }
          >
            {completedAppointments}/{todayAppointments}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Rendez-vous complétés aujourd'hui
        </p>
        <Progress value={completionRate} className="mt-3 h-1.5" />
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Patients actifs</span>
          <span className="font-medium">{activePatients}</span>
        </div>
      </CardContent>
    </Card>
  )
}
