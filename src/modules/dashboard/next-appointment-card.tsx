import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Clock01Icon,
  UserCircle02Icon,
  ArrowRight01Icon,
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

export type NextAppointmentData = {
  id: string
  patient: string
  owner: string
  type: string
  startTime: Date
  vetName: string
}

export function NextAppointmentCard({
  appointment,
  onNavigate,
}: {
  appointment: NextAppointmentData | null
  onNavigate: () => void
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const timeUntil = useMemo(() => {
    if (!appointment) return null
    const diff = appointment.startTime.getTime() - now.getTime()
    if (diff <= 0) return { label: "En cours", urgent: true }

    const minutes = Math.floor(diff / 60_000)
    if (minutes < 60) return { label: `${minutes} min`, urgent: minutes < 15 }

    const hours = Math.floor(minutes / 60)
    const remainingMin = minutes % 60
    return {
      label: remainingMin > 0 ? `${hours}h${remainingMin}` : `${hours}h`,
      urgent: false,
    }
  }, [appointment, now])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Prochain RDV</CardTitle>
        {timeUntil && (
          <Badge
            variant={timeUntil.urgent ? "destructive" : "default"}
            className="text-xs font-bold tabular-nums"
          >
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="mr-1 size-3"
            />
            {timeUntil.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {appointment ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold">{appointment.patient}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.type}
              </p>
            </div>
            <Separator />
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={UserCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate">{appointment.owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  strokeWidth={2}
                  className="size-3.5 shrink-0"
                />
                <span>
                  {appointment.startTime.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs"
              onClick={onNavigate}
            >
              Ouvrir le dossier
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                className="size-3"
              />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={Calendar01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </div>
            <p className="text-sm font-medium">Aucun RDV à venir</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Libre pour planifier
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-7 text-xs"
              onClick={onNavigate}
            >
              Planifier
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
