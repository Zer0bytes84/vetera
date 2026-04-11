"use client"

import { useMemo } from "react"
import {
  Calendar01Icon,
  Clock01Icon,
  AiPhone01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTranslation } from "react-i18next"
import type { View } from "@/types"

export type NextAppointment = {
  id: string
  patient: string
  type: string
  startTime: Date
  vetName: string
  phone?: string
}

export function NextAppointmentHero({
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

    if (days > 0) return { value: days, unit: "j", urgent: false }
    if (hours > 0) return { value: hours, unit: "h", urgent: hours <= 2 }
    if (minutes > 0) return { value: minutes, unit: "min", urgent: true }
    return { value: 0, unit: "maintenant", urgent: true }
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

  // Empty state
  if (!appointment) {
    return (
      <Card className="overflow-hidden lg:col-span-2">
        <div className="flex h-full flex-col sm:flex-row">
          {/* Left side - icon placeholder */}
          <div className="flex items-center justify-center bg-muted/50 p-6 sm:w-48">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
              <HugeiconsIcon
                icon={Calendar01Icon}
                strokeWidth={2}
                className="size-8 text-muted-foreground"
              />
            </div>
          </div>

          {/* Right side - content */}
          <div className="flex-1 p-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("dashboardWidgets.noSuggestion")}
                </p>
                <CardTitle className="mt-1 text-lg">
                  Aucun rendez-vous prévu
                </CardTitle>
                <CardDescription>
                  {t("dashboardWidgets.insight.lowBookingsMessage")}
                </CardDescription>
              </div>

              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onNavigate}
              >
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  strokeWidth={2}
                  className="mr-2 size-4"
                />
                Planifier un rendez-vous
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden lg:col-span-2 border-primary/20">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />

      <div className="relative flex h-full flex-col sm:flex-row">
        {/* Left side - patient avatar & time */}
        <div className="flex items-center gap-4 bg-primary/5 p-6 sm:w-56 sm:flex-col sm:justify-center sm:gap-3">
          <Avatar className="size-16 ring-4 ring-primary/20 ring-offset-2 ring-offset-background transition-transform hover:scale-105 sm:size-20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-primary-foreground sm:text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="text-right sm:text-center">
            <div className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {timeString}
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">Aujourd'hui</p>
          </div>
        </div>

        {/* Right side - details & actions */}
        <div className="flex-1 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Badge temps restant */}
              <Badge
                variant="secondary"
                className={`mb-2 gap-1.5 ${
                  timeUntil?.urgent
                    ? "bg-amber-500/15 text-amber-600 border-amber-500/20"
                    : "bg-primary/15 text-primary border-primary/20"
                }`}
              >
                <HugeiconsIcon
                  icon={Clock01Icon}
                  strokeWidth={2}
                  className="size-3"
                />
                {timeUntil?.value === 0
                  ? "Maintenant"
                  : `Dans ${timeUntil?.value}${timeUntil?.unit}`}
              </Badge>

              <CardTitle className="truncate text-xl font-semibold tracking-tight">
                {appointment.patient}
              </CardTitle>
              <CardDescription className="mt-0.5">
                {appointment.type} • Dr. {appointment.vetName}
              </CardDescription>
            </div>

            {/* Actions rapides */}
            <div className="hidden sm:flex sm:flex-col sm:gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-primary/90 hover:bg-primary"
              >
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                Confirmer
              </Button>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                strokeWidth={2}
                className="size-4"
              />
              Confirmer
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <HugeiconsIcon
                icon={File01Icon}
                strokeWidth={2}
                className="size-4"
              />
              Dossier
            </Button>
            {appointment.phone && (
              <Button size="icon" variant="outline">
                <HugeiconsIcon
                  icon={AiPhone01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1 text-muted-foreground"
              onClick={onNavigate}
            >
              Agenda
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3"
              />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
