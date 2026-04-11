"use client"

import { useMemo } from "react"
import { TrendingUp, Target01Icon, Clock01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function PerformanceWidget({
  todayAppointments,
  completedAppointments,
  activePatients,
  avgDuration,
}: {
  todayAppointments: number
  completedAppointments: number
  activePatients: number
  avgDuration: number // in minutes
}) {
  const { t } = useTranslation()

  const completionRate = useMemo(() => {
    return todayAppointments > 0 ? Math.round((completedAppointments / todayAppointments) * 100) : 0
  }, [todayAppointments, completedAppointments])

  const stats = [
    {
      label: t("dashboard.performance.completion", { defaultValue: "Complétés" }),
      value: `${completedAppointments}/${todayAppointments}`,
      percent: completionRate,
      icon: Target01Icon,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("dashboard.performance.patients", { defaultValue: "Patients" }),
      value: String(activePatients),
      percent: null,
      icon: UserGroupIcon,
      color: "text-violet-600",
      bgColor: "bg-violet-500/10",
    },
    {
      label: t("dashboard.performance.duration", { defaultValue: "Durée moy" }),
      value: `${avgDuration}min`,
      percent: null,
      icon: Clock01Icon,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <HugeiconsIcon
              icon={TrendingUp}
              strokeWidth={2}
              className="size-4 text-emerald-600"
            />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {t("dashboard.performance.title", { defaultValue: "Performance" })}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("dashboard.performance.today", { defaultValue: "Aujourd'hui" })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-lg", stat.bgColor)}>
              <HugeiconsIcon icon={stat.icon} strokeWidth={2} className={cn("size-4", stat.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-semibold">{stat.value}</span>
              </div>
              {stat.percent !== null && (
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
