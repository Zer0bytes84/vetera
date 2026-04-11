"use client"

import { useMemo } from "react"
import {
  Calendar01Icon,
  Clock01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  AiPhone01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export type NextAppointment = {
  id: string
  patient: string
  type: string
  startTime: Date
  vetName: string
  phone?: string
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

    if (days > 0) return { text: `dans ${days}j`, urgent: false }
    if (hours > 0) return { text: `dans ${hours}h`, urgent: hours <= 2 }
    if (minutes > 0) return { text: `dans ${minutes}min`, urgent: true }
    return { text: "maintenant", urgent: true }
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

  // Empty state - compact
  if (!appointment) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground"
                />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t("dashboardWidgets.nextAppointment", { defaultValue: "Prochain RDV" })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("dashboardWidgets.noSuggestion")}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-5 text-muted-foreground"
              />
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {t("dashboardWidgets.insight.lowBookingsMessage")}
            </p>
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={onNavigate}>
              {t("dashboard.schedule", { defaultValue: "Planifier" })}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Has appointment - compact layout
  return (
    <Card className="h-full border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Calendar01Icon}
                strokeWidth={2}
                className="size-4 text-primary"
              />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {t("dashboardWidgets.nextAppointment", { defaultValue: "Prochain RDV" })}
              </CardTitle>
              <CardDescription className="text-xs">{timeUntil?.text}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              timeUntil?.urgent && "border-amber-500/50 text-amber-600 bg-amber-500/10"
            )}
          >
            {timeString}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Patient info */}
        <div className="flex items-center gap-3">
          <Avatar className="size-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{appointment.patient}</p>
            <p className="text-xs text-muted-foreground">
              {appointment.type} • Dr. {appointment.vetName}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
            Confirmer
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-2">
            <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-3.5" />
          </Button>
          {appointment.phone && (
            <Button size="sm" variant="outline" className="h-8 px-2">
              <HugeiconsIcon icon={AiPhone01Icon} strokeWidth={2} className="size-3.5" />
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1 text-xs text-muted-foreground"
          onClick={onNavigate}
        >
          {t("dashboardWidgets.viewAgenda")}
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3" />
        </Button>
      </CardContent>
    </Card>
  )
}
