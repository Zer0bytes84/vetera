"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { 
  StethoscopeIcon, 
  CheckmarkCircle01Icon,
  Clock01Icon,
  HourglassIcon,
  ArrowRight01Icon,
  UserGroupIcon,
  Activity01Icon,
  Calendar01Icon,
  Clock02Icon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Consultation = {
  id: string
  patientName: string
  patientSubtext?: string
  ownerName: string
  vetName?: string
  type: string
  date: string
  time?: string
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
}

const STATUS_META = {
  scheduled: {
    label: "À venir",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: HourglassIcon,
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock02Icon,
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckmarkCircle01Icon,
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-100 text-rose-700 border-rose-200",
    icon: Activity01Icon,
  },
  no_show: {
    label: "Absent",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: UserGroupIcon,
  },
}

const TYPE_COLORS: Record<string, string> = {
  "Chirurgie": "bg-violet-100 text-violet-700 border-violet-200",
  "Vaccin": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Contrôle": "bg-blue-100 text-blue-700 border-blue-200",
  "Urgence": "bg-rose-100 text-rose-700 border-rose-200",
  "Consultation": "bg-emerald-100 text-emerald-700 border-emerald-200",
}

interface RecentConsultationsWidgetProps {
  consultations: Consultation[]
  onNavigate?: () => void
  onViewConsultation?: (id: string) => void
}

export function RecentConsultationsWidget({
  consultations,
  onNavigate,
  onViewConsultation,
}: RecentConsultationsWidgetProps) {
  const visibleConsultations = consultations.slice(0, 6)

  return (
    <Card className="relative overflow-hidden card-vibrant">
      <CardHeader className="relative border-b border-border/35 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} className="h-5 w-5 text-violet-600" />
          </div>
          <div className="grid flex-1 gap-0.5">
            <CardDescription>Registre clinique</CardDescription>
            <CardTitle className="text-lg">Activité des dossiers</CardTitle>
          </div>
        </div>
        <Badge variant="outline" className="bg-background/80">
          {consultations.length} consultation{consultations.length > 1 ? "s" : ""}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table Header */}
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.6fr)] gap-2 border-b bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={StethoscopeIcon} className="h-3.5 w-3.5" />
            Patient
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={UserGroupIcon} className="h-3.5 w-3.5" />
            Propriétaire
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Activity01Icon} className="h-3.5 w-3.5" />
            Acte
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
            Horaire
          </div>
          <div className="text-right">État</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {visibleConsultations.map((consultation) => {
            const statusMeta = STATUS_META[consultation.status]
            const typeClass = TYPE_COLORS[consultation.type] || "bg-muted text-muted-foreground"

            return (
              <div
                key={consultation.id}
                className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.6fr)] gap-2 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onViewConsultation?.(consultation.id)}
              >
                {/* Patient */}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{consultation.patientName}</p>
                  {consultation.patientSubtext && (
                    <p className="text-xs text-muted-foreground truncate">{consultation.patientSubtext}</p>
                  )}
                </div>

                {/* Propriétaire */}
                <div className="min-w-0">
                  <p className="text-sm truncate">{consultation.ownerName}</p>
                  {consultation.vetName && (
                    <p className="text-xs text-muted-foreground truncate">{consultation.vetName}</p>
                  )}
                </div>

                {/* Acte */}
                <div>
                  <Badge variant="outline" className={cn("text-xs font-normal", typeClass)}>
                    {consultation.type}
                  </Badge>
                </div>

                {/* Horaire */}
                <div className="text-sm text-muted-foreground">
                  {consultation.time ? (
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                      {consultation.time}
                    </span>
                  ) : (
                    consultation.date
                  )}
                </div>

                {/* État */}
                <div className="flex justify-end">
                  <Badge variant="outline" className={cn("text-xs gap-1", statusMeta.className)}>
                    <HugeiconsIcon icon={statusMeta.icon} className="h-3 w-3" />
                    {statusMeta.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {consultations.length > 6 && (
          <div className="border-t px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={onNavigate}
            >
              <span>Voir les {consultations.length - 6} autres consultations</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
