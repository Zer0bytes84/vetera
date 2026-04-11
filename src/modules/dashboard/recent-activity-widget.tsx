"use client"

import { useMemo } from "react"
import {
  Calendar01Icon,
  UserGroupIcon,
  Invoice03Icon,
  Package02Icon,
  ArrowRight01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

type ActivityType = "appointment" | "patient" | "invoice" | "stock"

interface Activity {
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
    icon: Invoice03Icon,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  stock: {
    icon: Package02Icon,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
}

export function RecentActivityWidget({
  appointments,
  patients,
  transactions,
  onNavigate,
}: {
  appointments: Array<{ id: string; patient: string; type: string; startTime: string; status: string }>
  patients: Array<{ id: string; name: string; createdAt: string }>
  transactions: Array<{ id: string; type: string; amount: number; date: string; description: string }>
  onNavigate: (view: string) => void
}) {
  const { t } = useTranslation()

  const activities = useMemo<Activity[]>(() => {
    const items: Activity[] = []

    // Recent appointments (completed today)
    const today = new Date()
    const todayAppointments = appointments
      .filter(
        (a) =>
          a.status === "completed" &&
          new Date(a.startTime).toDateString() === today.toDateString()
      )
      .slice(0, 2)
      .map((a) => ({
        id: `apt-${a.id}`,
        type: "appointment" as const,
        title: a.patient,
        description: a.type,
        time: new Date(a.startTime).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))

    // Recent new patients
    const newPatients = patients
      .slice(-2)
      .map((p) => ({
        id: `pat-${p.id}`,
        type: "patient" as const,
        title: p.name,
        description: "Nouveau patient",
        time: "Aujourd'hui",
      }))

    // Recent transactions
    const recentInvoices = transactions
      .filter((t) => t.type === "income")
      .slice(-2)
      .map((t) => ({
        id: `inv-${t.id}`,
        type: "invoice" as const,
        title: `${t.amount.toLocaleString("fr-FR")} DA`,
        description: t.description || "Paiement",
        time: new Date(t.date).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))

    // Combine and sort by priority (simplified)
    items.push(...todayAppointments, ...newPatients, ...recentInvoices)

    return items.slice(0, 4)
  }, [appointments, patients, transactions])

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {t("dashboard.recentActivity", { defaultValue: "Activité récente" })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("dashboard.todayUpdates", { defaultValue: "Mises à jour du jour" })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {activities.length > 0 ? (
          <>
            {activities.map((activity) => {
              const meta = activityMeta[activity.type]
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      meta.bg
                    )}
                  >
                    <HugeiconsIcon
                      icon={meta.icon}
                      strokeWidth={2}
                      className={cn("size-4", meta.color)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{activity.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activity.time}
                  </span>
                </div>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1 text-xs mt-1"
              onClick={() => onNavigate("agenda")}
            >
              {t("dashboard.viewAll", { defaultValue: "Voir tout" })}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {t("dashboard.noActivity", { defaultValue: "Aucune activité récente" })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
