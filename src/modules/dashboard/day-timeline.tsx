import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  Clock01Icon,
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

export type TimelineAppointment = {
  id: string
  patient: string
  type: string
  startTime: Date
  endTime: Date
  status: string
  vetName: string
}

const STATUS_META: Record<
  string,
  { label: string; dotClass: string; bgClass: string }
> = {
  scheduled: {
    label: "Planifié",
    dotClass: "bg-blue-500",
    bgClass: "bg-blue-500",
  },
  completed: {
    label: "Terminé",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500",
  },
  in_progress: {
    label: "En cours",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-500",
  },
  cancelled: {
    label: "Annulé",
    dotClass: "bg-muted-foreground/30",
    bgClass: "bg-muted-foreground/30",
  },
  no_show: {
    label: "Absent",
    dotClass: "bg-muted-foreground/20",
    bgClass: "bg-muted-foreground/20",
  },
}

export function DayTimeline({
  appointments,
  onNavigate,
}: {
  appointments: TimelineAppointment[]
  onNavigate: () => void
}) {
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60

  const todayApts = useMemo(() => {
    return [...appointments]
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, 6)
  }, [appointments])

  if (todayApts.length === 0) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Clock01Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
              <CardTitle className="text-sm font-medium">
                Planning du jour
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center pt-0 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={Calendar01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground/50"
            />
          </div>
          <p className="text-sm font-medium text-foreground">
            Aucun créneau aujourd'hui
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            La frise apparaîtra avec des RDV
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-7 text-xs"
            onClick={onNavigate}
          >
            Planifier
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Clock01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <CardTitle className="text-sm font-medium">
              Planning du jour
            </CardTitle>
            <Badge variant="secondary" className="text-[10px] font-medium">
              {todayApts.length} créneau{todayApts.length > 1 ? "x" : ""}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={onNavigate}
          >
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {/* Appointment list */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {todayApts.map((apt) => {
            const meta = STATUS_META[apt.status] || STATUS_META.scheduled
            const startH =
              apt.startTime.getHours() + apt.startTime.getMinutes() / 60
            const endH = apt.endTime.getHours() + apt.endTime.getMinutes() / 60
            const isNow = currentHour >= startH && currentHour <= endH
            const isPast = endH < currentHour

            return (
              <div
                key={apt.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50",
                  isNow && "bg-primary/5",
                  isPast && "opacity-50"
                )}
              >
                {/* Time column */}
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-foreground tabular-nums">
                    {apt.startTime.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {apt.endTime.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Status indicator */}
                <div
                  className={cn("size-2 shrink-0 rounded-full", meta.dotClass)}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {apt.patient}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {apt.type}
                  </p>
                </div>

                {/* Status badge */}
                {isNow && (
                  <Badge variant="default" className="text-[9px] font-medium">
                    En cours
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500" /> Planifié
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Terminé
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> En cours
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
