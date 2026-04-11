"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Task01Icon,
  Alert02Icon,
  Clock01Icon,
  TrendingUp,
  ZapIcon,
  ArrowRight01Icon,
  Activity01Icon,
  PackageIcon,
  UserMultipleIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  FireIcon,
  File01Icon,
  DollarCircleIcon,
  MedicineIcon,
  StethoscopeIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface NextAppointment {
  id: string
  patient: string
  type: string
  startTime: Date
  vetName?: string
}

export interface Task {
  id: string
  title: string
  status: "pending" | "completed" | "cancelled"
  priority: "low" | "medium" | "high"
  dueDate?: Date
}

export interface StockProduct {
  id: string
  name: string
  quantity: number
  minStock: number
  unit?: string
}

export interface Activity {
  id: string
  type: "appointment" | "patient" | "invoice" | "stock"
  title: string
  description: string
  time: string
}

export interface SmartInsight {
  id: string
  type: "warning" | "info" | "success" | "opportunity"
  title: string
  description: string
  action?: string
  view?: string
}

// ============================================================================
// PROCHAIN RDV WIDGET - Style Luma V2
// ============================================================================

interface NextAppointmentWidgetProps {
  appointment: NextAppointment | null
  onNavigate: () => void
}

export function NextAppointmentWidgetLumaV2({ appointment, onNavigate }: NextAppointmentWidgetProps) {
  const timeString = appointment
    ? new Date(appointment.startTime).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
            <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="h-4 w-4 text-violet-600" />
          </div>
          <CardTitle className="text-sm font-medium">Prochain RDV</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigate}>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {appointment ? (
          <div className="space-y-4">
            {/* Patient avatar + name */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm">
                {appointment.patient.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{appointment.patient}</p>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{appointment.type}</p>
                </div>
              </div>
            </div>

            {/* Time & vet row */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 text-xs px-2.5 py-1">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={1.5} className="mr-1.5 h-3 w-3" />
                {timeString}
              </Badge>
              {appointment.vetName ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-medium text-teal-700">
                    {appointment.vetName.charAt(0)}
                  </div>
                  <span>Dr. {appointment.vetName}</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5">Non assigné</Badge>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="mr-1.5 h-3.5 w-3.5" />
                Arrivé
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700">
                <HugeiconsIcon icon={File01Icon} strokeWidth={1.5} className="mr-1.5 h-3.5 w-3.5" />
                Dossier
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir</p>
            <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" onClick={onNavigate}>
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="mr-1 h-3 w-3" />
              Voir l'agenda
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// TÂCHES WIDGET - Style Luma V2
// ============================================================================

interface TasksWidgetProps {
  tasks: Task[]
  onNavigate: () => void
}

export function TasksWidgetLumaV2({ tasks, onNavigate }: TasksWidgetProps) {
  const pendingTasks = tasks.filter((t) => t.status === "pending")
  const highPriority = pendingTasks.filter((t) => t.priority === "high")
  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100) : 0

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
            <HugeiconsIcon icon={Task01Icon} strokeWidth={1.5} className="h-4 w-4 text-amber-600" />
          </div>
          <CardTitle className="text-sm font-medium">Tâches</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigate}>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <p className="text-xl font-bold text-amber-600">{highPriority.length}</p>
            <p className="text-[10px] text-muted-foreground">Urgent</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p className="text-xl font-bold text-blue-600">
              {pendingTasks.filter(t => t.priority === "medium").length}
            </p>
            <p className="text-[10px] text-muted-foreground">Moyen</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-100">
            <p className="text-xl font-bold text-slate-600">
              {pendingTasks.filter(t => t.priority === "low").length}
            </p>
            <p className="text-[10px] text-muted-foreground">Faible</p>
          </div>
        </div>
        
        {/* Progress with segmented bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Complétion</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <div className="flex gap-0.5 h-2">
            <div 
              className="bg-emerald-500 rounded-l-full" 
              style={{ width: `${completionRate}%` }}
            />
            <div 
              className="bg-amber-400 rounded-r-full" 
              style={{ width: `${100 - completionRate}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {tasks.filter(t => t.status === "completed").length} sur {tasks.length} tâches terminées
          </p>
        </div>

        {/* Top 2 urgent tasks with details */}
        <div className="space-y-2">
          {highPriority.slice(0, 2).map((task) => (
            <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded bg-amber-500/20">
                <HugeiconsIcon icon={FireIcon} strokeWidth={2} className="h-3 w-3 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{task.title}</p>
                {task.dueDate && (
                  <p className="text-[10px] text-amber-600">
                    Échéance: {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STOCK ALERTS WIDGET - Style Luma V2
// ============================================================================

interface StockAlertsWidgetProps {
  products: StockProduct[]
  onNavigate: () => void
}

export function StockAlertsWidgetLumaV2({ products, onNavigate }: StockAlertsWidgetProps) {
  const alerts = products.filter((p) => p.quantity <= p.minStock)
  const critical = alerts.filter((p) => p.quantity <= p.minStock * 0.5)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} className="h-4 w-4 text-rose-600" />
          </div>
          <CardTitle className="text-sm font-medium">Stock</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigate}>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-rose-500/5">
            <p className="text-xl font-bold text-rose-600">{critical.length}</p>
            <p className="text-[10px] text-muted-foreground">Critique</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/5">
            <p className="text-xl font-bold text-amber-600">{alerts.length - critical.length}</p>
            <p className="text-[10px] text-muted-foreground">Alerte</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/5">
            <p className="text-xl font-bold text-emerald-600">{products.length - alerts.length}</p>
            <p className="text-[10px] text-muted-foreground">OK</p>
          </div>
        </div>

        {/* Mini bar chart */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Niveau global</span>
            <span className="font-medium">
              {Math.round(((products.length - alerts.length) / products.length) * 100)}% sain
            </span>
          </div>
          <div className="flex gap-1 h-2">
            <div 
              className="bg-emerald-500 rounded-full" 
              style={{ width: `${((products.length - alerts.length) / products.length) * 100}%` }}
            />
            <div 
              className="bg-amber-500 rounded-full" 
              style={{ width: `${((alerts.length - critical.length) / products.length) * 100}%` }}
            />
            <div 
              className="bg-rose-500 rounded-full" 
              style={{ width: `${(critical.length / products.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Top 2 urgent products */}
        {critical.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Urgent</p>
            {critical.slice(0, 2).map((product) => (
              <div key={product.id} className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-xs font-medium flex-1 truncate">{product.name}</span>
                <Badge variant="secondary" className="text-[10px] bg-rose-500/10 text-rose-600">
                  {product.quantity} / {product.minStock}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// ACTIVITÉ RÉCENTE WIDGET - Style Luma V2
// ============================================================================

interface RecentActivityWidgetProps {
  activities: Activity[]
  onNavigate: () => void
}

const activityConfig: Record<Activity["type"], { icon: IconSvgElement; bg: string; color: string }> = {
  appointment: { icon: Calendar01Icon, bg: "bg-violet-500/10", color: "text-violet-600" },
  patient: { icon: UserMultipleIcon, bg: "bg-blue-500/10", color: "text-blue-600" },
  invoice: { icon: Activity01Icon, bg: "bg-emerald-500/10", color: "text-emerald-600" },
  stock: { icon: PackageIcon, bg: "bg-amber-500/10", color: "text-amber-600" },
}

export function RecentActivityWidgetLumaV2({ activities, onNavigate }: RecentActivityWidgetProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
            <HugeiconsIcon icon={Activity01Icon} strokeWidth={1.5} className="h-4 w-4 text-blue-600" />
          </div>
          <CardTitle className="text-sm font-medium">Activité récente</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigate}>
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Activity stats */}
        <div className="flex gap-3 mb-4">
          <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 text-xs">
            {activities.filter(a => a.type === "appointment").length} RDV
          </Badge>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">
            {activities.filter(a => a.type === "patient").length} Patients
          </Badge>
        </div>

        {/* Timeline view - max 3 items without scroll */}
        <div className="space-y-2">
          {activities.slice(0, 3).map((activity, index) => {
            const config = activityConfig[activity.type]
            const isLast = index === activities.slice(0, 3).length - 1
            return (
              <div key={activity.id} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shrink-0", config.bg)}>
                    <HugeiconsIcon icon={config.icon} strokeWidth={1.5} className={cn("h-3.5 w-3.5", config.color)} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                {/* Content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{activity.title}</p>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{activity.time}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{activity.description}</p>
                </div>
              </div>
            )
          })}
          {activities.length === 0 && (
            <div className="py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto mb-2">
                <HugeiconsIcon icon={Activity01Icon} strokeWidth={1.5} className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Aucune activité récente</p>
            </div>
          )}
          {activities.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{activities.length - 3} autres activités
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// INSIGHTS IA WIDGET - Style Luma V2
// ============================================================================

interface InsightsWidgetProps {
  insights: SmartInsight[]
  onNavigate: (view: string) => void
}

const insightConfig: Record<SmartInsight["type"], { bg: string; border: string; icon: IconSvgElement }> = {
  warning: { bg: "bg-rose-500/5", border: "border-rose-500/20", icon: Alert02Icon },
  info: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: Activity01Icon },
  success: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: TrendingUp },
  opportunity: { bg: "bg-violet-500/5", border: "border-violet-500/20", icon: ZapIcon },
}

export function InsightsWidgetLumaV2({ insights, onNavigate }: InsightsWidgetProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
            <HugeiconsIcon icon={ZapIcon} strokeWidth={1.5} className="h-4 w-4 text-emerald-600" />
          </div>
          <CardTitle className="text-sm font-medium">Insights IA</CardTitle>
        </div>
        <Badge variant="secondary" className="text-xs">
          {insights.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Category distribution */}
        {insights.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {insights.filter(i => i.type === "warning").length > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-rose-500/10 text-rose-600">
                <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="h-3 w-3 mr-1" />
                {insights.filter(i => i.type === "warning").length} alertes
              </Badge>
            )}
            {insights.filter(i => i.type === "success").length > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                <HugeiconsIcon icon={TrendingUp} strokeWidth={2} className="h-3 w-3 mr-1" />
                {insights.filter(i => i.type === "success").length} tendances
              </Badge>
            )}
            {insights.filter(i => i.type === "opportunity").length > 0 && (
              <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600">
                <HugeiconsIcon icon={ZapIcon} strokeWidth={2} className="h-3 w-3 mr-1" />
                {insights.filter(i => i.type === "opportunity").length} opportunités
              </Badge>
            )}
          </div>
        )}

        {/* Top 2 insights with visual cards */}
        <div className="space-y-2">
          {insights.slice(0, 2).map((insight) => {
            const config = insightConfig[insight.type]
            return (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all hover:shadow-sm",
                  config.bg,
                  config.border
                )}
                onClick={() => insight.view && onNavigate(insight.view)}
              >
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 bg-white/50")}>
                  <HugeiconsIcon icon={config.icon} strokeWidth={1.5} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{insight.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {insights.length === 0 && (
          <div className="py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
              <HugeiconsIcon icon={ZapIcon} strokeWidth={1.5} className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Aucune suggestion pour le moment</p>
          </div>
        )}

        {insights.length > 2 && (
          <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => onNavigate("insights")}>
            Voir les {insights.length - 2} autres suggestions
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PERFORMANCE WIDGET - Style Luma V2
// ============================================================================

interface PerformanceWidgetProps {
  todayAppointments: number
  completedAppointments: number
  activePatients: number
}

export function PerformanceWidgetLumaV2({ todayAppointments, completedAppointments, activePatients }: PerformanceWidgetProps) {
  const completionRate = todayAppointments > 0 ? Math.round((completedAppointments / todayAppointments) * 100) : 0

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10">
            <HugeiconsIcon icon={TrendingUp} strokeWidth={1.5} className="h-4 w-4 text-emerald-600" />
          </div>
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big rating display */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-4xl font-bold",
              completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-amber-600" : "text-rose-600"
            )}>
              {completionRate}%
            </span>
            <span className="text-xs text-muted-foreground">efficacité</span>
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            completionRate >= 80 ? "bg-emerald-500/10" : completionRate >= 50 ? "bg-amber-500/10" : "bg-rose-500/10"
          )}>
            <HugeiconsIcon 
              icon={completionRate >= 80 ? TrendingUp : completionRate >= 50 ? TrendingUp : TrendingUp} 
              strokeWidth={2} 
              className={cn(
                "h-6 w-6",
                completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-amber-600" : "text-rose-600"
              )} 
            />
          </div>
        </div>

        {/* Status message */}
        <p className="text-xs text-muted-foreground">
          {completionRate >= 90 ? "🌟 Excellente journée !" : 
           completionRate >= 70 ? "👍 Bonne progression" :
           completionRate >= 40 ? "⚡ Encore un effort" :
           "💪 Courage, on y arrive !"}
        </p>
        
        {/* Progress bar with gradient */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">RDV complétés</span>
            <span className="font-medium">{completedAppointments}/{todayAppointments}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                completionRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : 
                completionRate >= 50 ? "bg-gradient-to-r from-amber-500 to-amber-400" : 
                "bg-gradient-to-r from-rose-500 to-rose-400"
              )}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Stats cards with icons */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{completedAppointments}</p>
              <p className="text-[10px] text-muted-foreground">Complétés</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 shrink-0">
              <HugeiconsIcon icon={UserMultipleIcon} strokeWidth={1.5} className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{activePatients}</p>
              <p className="text-[10px] text-muted-foreground">Patients</p>
            </div>
          </div>
        </div>

        {/* Pending appointments indicator */}
        {todayAppointments - completedAppointments > 0 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50">
            <span className="text-xs font-medium text-amber-700">
              {todayAppointments - completedAppointments} rendez-vous restants
            </span>
            <div className="flex -space-x-1">
              {[...Array(Math.min(3, todayAppointments - completedAppointments))].map((_, i) => (
                <div key={i} className="h-5 w-5 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-amber-700">
                  {i + 1}
                </div>
              ))}
              {(todayAppointments - completedAppointments) > 3 && (
                <div className="h-5 w-5 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-amber-600">
                  +{(todayAppointments - completedAppointments) - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
