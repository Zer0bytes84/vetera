import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowRight01Icon,
  SparklesIcon,
  Alert02Icon,
  ArrowUp01Icon,
  WalletIcon,
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type SmartInsight = {
  id: string
  type: "warning" | "info" | "success" | "trend"
  message: string
  action?: string
  view?: string
}

const TYPE_META: Record<
  string,
  { icon: typeof SparklesIcon; iconClass: string }
> = {
  warning: { icon: Alert02Icon, iconClass: "text-amber-500" },
  info: { icon: SparklesIcon, iconClass: "text-blue-500" },
  success: { icon: ArrowUp01Icon, iconClass: "text-emerald-500" },
  trend: { icon: WalletIcon, iconClass: "text-violet-500" },
}

export function SmartInsights({
  insights,
  onNavigate,
}: {
  insights: SmartInsight[]
  onNavigate: (view: string) => void
}) {
  if (insights.length === 0) return null

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={SparklesIcon}
            strokeWidth={2}
            className="size-4 text-violet-500"
          />
          <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px]">
            IA locale
          </Badge>
        </div>
        <CardDescription>
          {insights.length} suggestion{insights.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 pt-0">
        {insights.slice(0, 5).map((insight, i) => {
          const meta = TYPE_META[insight.type] || TYPE_META.info
          return (
            <div key={insight.id}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  <HugeiconsIcon
                    icon={meta.icon}
                    strokeWidth={2}
                    className={cn("size-4", meta.iconClass)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-foreground">
                    {insight.message}
                  </p>
                  {insight.action && insight.view && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-[11px] text-primary"
                      onClick={() => onNavigate(insight.view!)}
                    >
                      {insight.action}
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        strokeWidth={2}
                        className="ml-0.5 size-2.5"
                      />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function generateSmartInsights({
  todayAppointments,
  upcomingAppointments,
  lowStockProducts,
  pendingReminders,
  currentIncome,
  previousIncome,
}: {
  todayAppointments: number
  upcomingAppointments: number
  lowStockProducts: Array<{ name: string; quantity: number }>
  pendingReminders: Array<{ patient: string; reason: string }>
  currentIncome: number
  previousIncome: number
}): SmartInsight[] {
  const insights: SmartInsight[] = []

  if (lowStockProducts.length > 0) {
    const first = lowStockProducts[0]
    insights.push({
      id: "stock-low",
      type: "warning",
      message: `${lowStockProducts.length} produit${lowStockProducts.length > 1 ? "s" : ""} en stock critique — ${first.name} (${first.quantity} restant${first.quantity > 1 ? "s" : ""})`,
      action: "Voir le stock",
      view: "stock",
    })
  }

  if (pendingReminders.length > 0) {
    const first = pendingReminders[0]
    insights.push({
      id: "reminders",
      type: "info",
      message: `${pendingReminders.length} rappel${pendingReminders.length > 1 ? "s" : ""} en attente — ${first.patient}: ${first.reason}`,
      action: "Voir les rappels",
      view: "agenda",
    })
  }

  if (previousIncome > 0) {
    const delta = ((currentIncome - previousIncome) / previousIncome) * 100
    if (delta > 10) {
      insights.push({
        id: "income-up",
        type: "success",
        message: `Revenus en hausse de +${delta.toFixed(0)}% vs mois précédent — bonne dynamique`,
      })
    } else if (delta < -10) {
      insights.push({
        id: "income-down",
        type: "trend",
        message: `Revenus en baisse de ${delta.toFixed(0)}% vs mois précédent — surveillez la trésorerie`,
        action: "Voir les finances",
        view: "finances",
      })
    }
  }

  if (todayAppointments === 0 && upcomingAppointments === 0) {
    insights.push({
      id: "no-rdv",
      type: "info",
      message: "Aucun rendez-vous aujourd'hui — pensez à relancer les clients",
      action: "Planifier",
      view: "agenda",
    })
  } else if (todayAppointments > 8) {
    insights.push({
      id: "busy-day",
      type: "info",
      message: `Journée chargée : ${todayAppointments} consultations prévues — prévoyez des pauses`,
    })
  }

  return insights
}
