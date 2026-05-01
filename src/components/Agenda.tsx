import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalCircle01Icon,
  SearchIcon,
  StethoscopeIcon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons"
import { ar, de, enUS, es, fr, pt } from "date-fns/locale"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Sparkline } from "@/components/ui/sparkline"
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories"
import i18n from "@/i18n/config"
import { cn } from "@/lib/utils"
import type { Appointment, Owner, Patient, User as AppUser } from "@/types/db"

const APPOINTMENT_TYPES: Appointment["type"][] = [
  "Consultation",
  "Vaccin",
  "Chirurgie",
  "Urgence",
  "Contrôle",
]

const QUICK_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
]

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const CALENDAR_START_HOUR = 7
const CALENDAR_END_HOUR = 21
const HOUR_BLOCKS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, index) => CALENDAR_START_HOUR + index
)
const CALENDAR_START_MINUTES = CALENDAR_START_HOUR * 60
const CALENDAR_END_MINUTES = (CALENDAR_END_HOUR + 1) * 60

const TYPE_META: Record<
  Appointment["type"],
  {
    badgeClassName: string
    surfaceClassName: string
    dotClassName: string
  }
> = {
  Consultation: {
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    surfaceClassName:
      "border-emerald-200/70 bg-emerald-500/8 dark:border-emerald-900/70 dark:bg-emerald-500/10",
    dotClassName: "bg-emerald-500",
  },
  Vaccin: {
    badgeClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClassName:
      "border-blue-200/70 bg-blue-500/8 dark:border-blue-900/70 dark:bg-blue-500/10",
    dotClassName: "bg-blue-500",
  },
  Chirurgie: {
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    surfaceClassName:
      "border-rose-200/70 bg-rose-500/8 dark:border-rose-900/70 dark:bg-rose-500/10",
    dotClassName: "bg-rose-500",
  },
  Urgence: {
    badgeClassName: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    surfaceClassName:
      "border-amber-200/70 bg-amber-500/10 dark:border-amber-900/70 dark:bg-amber-500/12",
    dotClassName: "bg-amber-500",
  },
  Contrôle: {
    badgeClassName: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    surfaceClassName:
      "border-violet-200/70 bg-violet-500/8 dark:border-violet-900/70 dark:bg-violet-500/10",
    dotClassName: "bg-violet-500",
  },
}

const STATUS_META: Record<
  Appointment["status"],
  { label: string; className: string }
> = {
  scheduled: {
    label: "Planifié",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "En cours",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  completed: {
    label: "Terminé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  no_show: {
    label: "Absent",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
}

const TABLE_TABS = [
  { label: "Planning", value: "planning" },
  { label: "Journée", value: "selection" },
  { label: "Terminés", value: "termine" },
  { label: "Attention", value: "attention" },
] as const

type ViewMode = "day" | "week" | "month"
type TableTab = (typeof TABLE_TABS)[number]["value"]

type AgendaTableRow = {
  appointment: Appointment
  patient?: Patient
  owner?: Owner
  vet?: AppUser
  patientName: string
  ownerName: string
  vetName: string
  appointmentAt: string
  statusLabel: string
  statusClassName: string
  tab: TableTab
  searchIndex: string
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateInput(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateInput(value?: string | null) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function startOfDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

function getCurrentLocale() {
  if (i18n.language.startsWith("ar")) return "ar"
  if (i18n.language.startsWith("en")) return "en-US"
  if (i18n.language.startsWith("es")) return "es-ES"
  if (i18n.language.startsWith("pt")) return "pt-PT"
  if (i18n.language.startsWith("de")) return "de-DE"
  return "fr-FR"
}

function getDateFnsLocale() {
  if (i18n.language.startsWith("ar")) return ar
  if (i18n.language.startsWith("en")) return enUS
  if (i18n.language.startsWith("es")) return es
  if (i18n.language.startsWith("pt")) return pt
  if (i18n.language.startsWith("de")) return de
  return fr
}

function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "--:--"
  return date.toLocaleTimeString(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTimeCompact(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "--h--"
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  return `${hours}h${minutes}`
}

function formatDateLabel(
  value: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  }
) {
  return value.toLocaleDateString(getCurrentLocale(), options)
}

function formatDateTimeLabel(value?: string | Date | null) {
  const date = normalizeDate(value)
  if (!date) return "Slot undefined"
  return `${date.toLocaleDateString(getCurrentLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} · ${formatTimeCompact(date)}`
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours} h`
  return `${hours} h ${remainder}`
}

function getTimePosition(time: Date) {
  return (time.getHours() - CALENDAR_START_HOUR) * 60 + time.getMinutes()
}

function getDurationHeight(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime()
  return Math.max(18, diffMs / 60000)
}

function getMinutesFromDayStart(value: Date) {
  return value.getHours() * 60 + value.getMinutes()
}

function getAppointmentFrame(
  start: Date,
  end: Date,
  pixelsPerHour: number,
  minHeight: number
) {
  const rawStart = getMinutesFromDayStart(start)
  const rawEnd = getMinutesFromDayStart(end)
  if (rawEnd <= rawStart) return null

  const clippedStart = Math.max(rawStart, CALENDAR_START_MINUTES)
  const clippedEnd = Math.min(rawEnd, CALENDAR_END_MINUTES)
  if (clippedEnd <= clippedStart) return null

  const top = ((clippedStart - CALENDAR_START_MINUTES) / 60) * pixelsPerHour
  const height = Math.max(
    minHeight,
    ((clippedEnd - clippedStart) / 60) * pixelsPerHour
  )

  return { top, height }
}

function getWeekDays(date: Date) {
  const base = new Date(date)
  const day = base.getDay()
  const diff = base.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(base.setDate(diff))

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday)
    current.setDate(monday.getDate() + index)
    return current
  })
}

function getMonthDays(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const days: Array<Date | null> = []

  for (let index = 0; index < startDay; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day))
  }

  return days
}

function formatOwnerName(owner?: Owner) {
  if (!owner) return "Propriétaire non lié"
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  )
}

function getPatientProfile(patient?: Patient) {
  if (!patient) return "Patient local"
  return patient.breed
    ? `${patient.species} · ${patient.breed}`
    : patient.species
}

function getAgeLabel(dateOfBirth?: string) {
  const birthday = normalizeDate(dateOfBirth)
  if (!birthday) return "Âge non renseigné"

  const today = new Date()
  let years = today.getFullYear() - birthday.getFullYear()
  const monthDelta = today.getMonth() - birthday.getMonth()
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthday.getDate())
  ) {
    years -= 1
  }

  if (years <= 0) return "Moins d'un an"
  return `${years} an${years > 1 ? "s" : ""}`
}

function getAppointmentPresentation(
  appointment: Appointment,
  patient?: Patient
) {
  if (patient?.status === "hospitalise" && appointment.status !== "completed") {
    return {
      label: "Hospitalisé",
      className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
      attention: true,
    }
  }

  if (
    appointment.type === "Urgence" &&
    !["completed", "cancelled"].includes(appointment.status)
  ) {
    return {
      label: "Urgence",
      className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
      attention: true,
    }
  }

  const status = STATUS_META[appointment.status]

  return {
    label: status.label,
    className: status.className,
    attention:
      appointment.status === "cancelled" || appointment.status === "no_show",
  }
}

function AppointmentTypeBadge({
  type,
  className,
}: {
  type: Appointment["type"]
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent",
        TYPE_META[type].badgeClassName,
        className
      )}
    >
      {type}
    </Badge>
  )
}

function AppointmentStatusBadge({
  appointment,
  patient,
  className,
}: {
  appointment: Appointment
  patient?: Patient
  className?: string
}) {
  const presentation = getAppointmentPresentation(appointment, patient)

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", presentation.className, className)}
    >
      {presentation.label}
    </Badge>
  )
}

type AgendaOverviewCard = {
  label: string
  value: string
  meta: string
  note: string
  icon: typeof Calendar01Icon
  tone: "blue" | "orange" | "emerald" | "slate"
  sparklineData: number[]
}

const agendaToneMap: Record<AgendaOverviewCard["tone"], { bg: string; text: string; spark: string }> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    spark: "#3b82f6",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    spark: "#f97316",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    spark: "#10b981",
  },
  slate: {
    bg: "bg-slate-500/10",
    text: "text-slate-600",
    spark: "#64748b",
  },
}

function buildAgendaSparkline(
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) {
  const deltas = {
    steady: [-2, -1, 0, 1, 0, 1, 1, 2],
    rise: [-3, -2, -1, 0, 1, 2, 2, 3],
    watch: [2, 3, 4, 5, 3, 4, 5, 6],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern]

  return deltas.map((delta) => Math.max(base + delta, 0))
}

function AgendaOverviewStrip({ items }: { items: AgendaOverviewCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const tone = agendaToneMap[item.tone]

        return (
          <Card key={item.label} className={cn("overflow-hidden rounded-[24px] border border-border bg-card shadow-none card-vibrant", `metric-glow-${item.tone}`)}>
            <CardContent className="flex min-h-[154px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                  <p className="text-[24px] font-medium tracking-[-0.04em] text-foreground">{item.value}</p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-foreground/70">{item.meta}</span>
                    <span className="font-mono uppercase tracking-[0.04em] text-muted-foreground">{item.note}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-xl border border-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                    tone.bg
                  )}
                >
                  <HugeiconsIcon icon={item.icon} strokeWidth={1.5} className={cn("size-[18px]", tone.text)} />
                </div>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="max-w-[20ch] text-[12px] leading-[1.45] text-muted-foreground">{item.note}</p>
                <Sparkline
                  data={item.sparklineData}
                  width={74}
                  height={28}
                  color={tone.spark}
                  strokeWidth={1.5}
                  fillOpacity={0.08}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function calculateOverlapMap(appointments: Appointment[]) {
  const layout = new Map<string, { column: number; totalColumns: number }>()

  const sorted = [...appointments].sort((a, b) => {
    const startA = new Date(a.startTime).getTime()
    const startB = new Date(b.startTime).getTime()
    if (startA !== startB) return startA - startB
    return new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
  })

  let currentGroup: Appointment[] = []
  let groupEnd = 0

  const layoutGroup = (group: Appointment[]) => {
    const columns: Appointment[][] = []
    for (const appt of group) {
      const start = new Date(appt.startTime).getTime()
      let placed = false

      for (let i = 0; i < columns.length; i++) {
        const lastAppt = columns[i][columns[i].length - 1]
        if (start >= new Date(lastAppt.endTime).getTime()) {
          columns[i].push(appt)
          layout.set(appt.id, { column: i, totalColumns: 0 })
          placed = true
          break
        }
      }

      if (!placed) {
        columns.push([appt])
        layout.set(appt.id, { column: columns.length - 1, totalColumns: 0 })
      }
    }

    const totalCols = columns.length
    for (const appt of group) {
      const info = layout.get(appt.id)
      if (info) info.totalColumns = totalCols
    }
  }

  for (const appt of sorted) {
    const start = new Date(appt.startTime).getTime()
    const end = new Date(appt.endTime).getTime()

    if (currentGroup.length > 0 && start >= groupEnd) {
      layoutGroup(currentGroup)
      currentGroup = []
      groupEnd = 0
    }

    currentGroup.push(appt)
    groupEnd = Math.max(groupEnd, end)
  }

  if (currentGroup.length > 0) {
    layoutGroup(currentGroup)
  }

  return layout
}

function AgendaDayView({
  vets,
  appointmentsByVet,
  selectedDate,
  selectedAppointmentId,
  currentTimePosition,
  currentTimeLabel,
  onSelectAppointment,
  getPatientName,
}: {
  vets: AppUser[]
  appointmentsByVet: Map<string, Appointment[]>
  selectedDate: Date
  selectedAppointmentId: string | null
  currentTimePosition: number | null
  currentTimeLabel: string
  onSelectAppointment: (appointment: Appointment) => void
  getPatientName: (patientId: string) => string
}) {
  if (vets.length === 0) {
    return (
      <div className="flex flex-1 px-6 pb-6">
        <Empty className="border border-dashed border-border/80 bg-muted/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={1.5} />
            </EmptyMedia>
            <EmptyTitle>Aucun vétérinaire actif</EmptyTitle>
            <EmptyDescription>
              Ajoutez un membre de l&apos;équipe pour répartir les rendez-vous
              dans le planning.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[980px] overflow-hidden rounded-lg border">
        <div className="flex">
          <div className="w-20 shrink-0 border-r border-border/70 bg-muted/20 pt-[4.5rem]">
            {HOUR_BLOCKS.map((hour) => (
              <div key={hour} className="relative h-[60px] pr-4 text-right">
                <span className="-translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {`${hour.toString().padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {vets.map((vet) => {
            const vetAppointments = appointmentsByVet.get(vet.id) ?? []
            const layoutMap = calculateOverlapMap(vetAppointments)

            return (
              <div
                key={vet.id}
                className="min-w-[260px] flex-1 border-r border-border/70 last:border-r-0"
              >
                <div className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-4 py-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                      {(vet.displayName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {vet.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vetAppointments.length} rendez-vous
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  {HOUR_BLOCKS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[60px] border-b border-border/60 last:border-b-0"
                    />
                  ))}

                  {isSameDay(selectedDate, new Date()) &&
                  currentTimePosition !== null ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                        {currentTimeLabel}
                      </div>
                      <div className="h-px flex-1 bg-primary/70" />
                    </div>
                  ) : null}

                  <div className="absolute inset-0">
                    {vetAppointments.map((appointment) => {
                      const start = normalizeDate(appointment.startTime)
                      const end = normalizeDate(appointment.endTime)

                      if (!start || !end) return null

                      const frame = getAppointmentFrame(start, end, 60, 24)
                      if (!frame) return null
                      const patientName = getPatientName(appointment.patientId)

                      const layout = layoutMap.get(appointment.id) || { column: 0, totalColumns: 1 }
                      const widthPercent = 100 / Math.max(1, layout.totalColumns)
                      const leftPercent = layout.column * widthPercent

                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => onSelectAppointment(appointment)}
                          className={cn(
                            "absolute overflow-hidden rounded-3xl border p-3 text-left shadow-sm transition hover:shadow-md",
                            TYPE_META[appointment.type].surfaceClassName,
                            selectedAppointmentId === appointment.id
                              ? "ring-2 ring-primary/55 ring-offset-1 z-10"
                              : "ring-0"
                          )}
                          style={{
                            top: frame.top,
                            height: frame.height,
                            left: `calc(${leftPercent}% + 4px)`,
                            width: `calc(${widthPercent}% - 8px)`,
                          }}
                        >
                          <div className="flex h-full gap-3">
                            <span
                              className={cn(
                                "mt-1 size-2.5 shrink-0 rounded-full",
                                TYPE_META[appointment.type].dotClassName
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {patientName}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {appointment.type}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatTime(start)} - {formatTime(end)}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AgendaWeekView({
  weekDays,
  getAppointmentsForDate,
  selectedAppointmentId,
  onSelectAppointment,
  getPatientName,
}: {
  weekDays: Date[]
  getAppointmentsForDate: (date: Date) => Appointment[]
  selectedAppointmentId: string | null
  onSelectAppointment: (appointment: Appointment) => void
  getPatientName: (patientId: string) => string
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[980px] overflow-hidden rounded-lg border">
        <div className="flex">
          <div className="w-16 shrink-0 border-r border-border/70 bg-muted/20 pt-[4.5rem]">
            {HOUR_BLOCKS.map((hour) => (
              <div key={hour} className="relative h-[50px] pr-2 text-right">
                <span className="-translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {`${hour.toString().padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const appointments = getAppointmentsForDate(day)
            const layoutMap = calculateOverlapMap(appointments)
            const isTodayColumn = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className="min-w-[140px] flex-1 border-r border-border/70 last:border-r-0"
              >
                <div
                  className={cn(
                    "sticky top-0 z-10 border-b border-border/70 px-3 py-4 text-center backdrop-blur",
                    isTodayColumn ? "bg-primary/6" : "bg-card/95"
                  )}
                >
                  <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {day.getDate()}
                  </p>
                </div>

                <div className="relative">
                  {HOUR_BLOCKS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[50px] border-b border-border/60 last:border-b-0"
                    />
                  ))}

                  <div className="absolute inset-0">
                    {appointments.map((appointment) => {
                      const start = normalizeDate(appointment.startTime)
                      const end = normalizeDate(appointment.endTime)

                      if (!start || !end) return null

                      const frame = getAppointmentFrame(start, end, 50, 18)
                      if (!frame) return null

                      const layout = layoutMap.get(appointment.id) || { column: 0, totalColumns: 1 }
                      const widthPercent = 100 / Math.max(1, layout.totalColumns)
                      const leftPercent = layout.column * widthPercent

                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => onSelectAppointment(appointment)}
                          className={cn(
                            "absolute rounded-2xl border px-2.5 py-2 text-left shadow-sm transition hover:shadow-md",
                            TYPE_META[appointment.type].surfaceClassName,
                            selectedAppointmentId === appointment.id
                              ? "ring-2 ring-primary/55 ring-offset-1 z-10"
                              : "ring-0"
                          )}
                          style={{
                            top: frame.top,
                            height: frame.height,
                            left: `calc(${leftPercent}% + 3px)`,
                            width: `calc(${widthPercent}% - 6px)`,
                          }}
                        >
                          <p className="truncate text-xs font-medium text-foreground">
                            {getPatientName(appointment.patientId)}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {formatTime(start)} · {appointment.type}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AgendaMonthView({
  monthDays,
  selectedDate,
  getAppointmentsForDate,
  getPatientName,
  onPickDate,
}: {
  monthDays: Array<Date | null>
  selectedDate: Date
  getAppointmentsForDate: (date: Date) => Appointment[]
  getPatientName: (patientId: string) => string
  onPickDate: (date: Date) => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="px-2 pb-1 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}

          {monthDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-[146px]" />
            }

            const appointments = getAppointmentsForDate(day)
            const isSelected = isSameDay(day, selectedDate)
            const isTodayCell = isSameDay(day, new Date())

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onPickDate(day)}
                className={cn(
                  "min-h-[146px] rounded-4xl border p-4 text-left transition hover:border-border hover:bg-muted/20",
                  isSelected
                    ? "border-primary/50 bg-primary/6"
                    : "border-border/70 bg-card",
                  isTodayCell && !isSelected
                    ? "ring-1 ring-primary/20"
                    : "ring-0"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-medium text-foreground">
                    {day.getDate()}
                  </span>
                  {isTodayCell ? (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-primary/10 text-primary"
                    >
                      Aujourd&apos;hui
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-xs",
                        TYPE_META[appointment.type].surfaceClassName
                      )}
                    >
                      <p className="truncate font-medium text-foreground">
                        {formatTime(appointment.startTime)} · {appointment.type}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {getPatientName(appointment.patientId)}
                      </p>
                    </div>
                  ))}

                  {appointments.length > 3 ? (
                    <p className="text-xs text-muted-foreground">
                      +{appointments.length - 3} autres rendez-vous
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const Agenda: React.FC = () => {
  const { t } = useTranslation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState("")
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [selectedVetId, setSelectedVetId] = useState("")
  const [selectedType, setSelectedType] =
    useState<Appointment["type"]>("Consultation")
  const [formDate, setFormDate] = useState(formatDateInput(new Date()))
  const [formTime, setFormTime] = useState("09:00")
  const [duration, setDuration] = useState(30)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [vetFilter, setVetFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tableTab, setTableTab] = useState<TableTab>("planning")

  const {
    data: appointments,
    loading: loadingAppointments,
    saveAppointment,
    remove,
  } = useAppointmentsRepository()
  const { data: patients } = usePatientsRepository()
  const { data: owners } = useOwnersRepository()
  const { data: users } = useUsersRepository()

  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentTime(new Date()),
      60_000
    )
    return () => window.clearInterval(interval)
  }, [])

  const vets = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === "active" &&
          (user.role === "vet_principal" || user.role === "vet_adjoint")
      ),
    [users]
  )

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  )
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  )
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  )
  const filteredOwners = useMemo(() => {
    const query = ownerSearchTerm.trim().toLowerCase()
    if (!query) return owners.slice(0, 8)

    return owners
      .filter((owner) =>
        [
          owner.firstName,
          owner.lastName,
          owner.phone,
          owner.email,
          owner.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 8)
  }, [ownerSearchTerm, owners])

  const patientsForSelectedOwner = useMemo(() => {
    if (!selectedOwnerId) return patients
    return patients.filter((patient) => patient.ownerId === selectedOwnerId)
  }, [patients, selectedOwnerId])

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()

    appointments.forEach((appointment) => {
      const start = normalizeDate(appointment.startTime)
      if (!start) return

      const key = formatDateInput(start)
      const current = map.get(key) ?? []
      current.push(appointment)
      map.set(key, current)
    })

    map.forEach((value, key) => {
      map.set(
        key,
        value
          .slice()
          .sort(
            (left, right) =>
              new Date(left.startTime).getTime() -
              new Date(right.startTime).getTime()
          )
      )
    })

    return map
  }, [appointments])

  const getAppointmentsForDate = (date: Date) =>
    appointmentsByDate.get(formatDateInput(date)) ?? []

  const dailyAppointments = useMemo(
    () => getAppointmentsForDate(selectedDate),
    [appointmentsByDate, selectedDate]
  )

  const appointmentsByVet = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    dailyAppointments.forEach((appointment) => {
      const current = map.get(appointment.vetId) ?? []
      current.push(appointment)
      map.set(appointment.vetId, current)
    })
    return map
  }, [dailyAppointments])

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  )

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined
  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined
  const selectedVet = selectedAppointment
    ? usersById.get(selectedAppointment.vetId)
    : undefined

  useEffect(() => {
    if (
      selectedAppointmentId &&
      !appointments.some((item) => item.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(null)
    }
  }, [appointments, selectedAppointmentId])

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours()
    if (hours < CALENDAR_START_HOUR || hours >= CALENDAR_END_HOUR + 1) {
      return null
    }
    return getTimePosition(currentTime)
  }, [currentTime])

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate])

  const previousDayAppointments = useMemo(() => {
    const previous = new Date(selectedDate)
    previous.setDate(previous.getDate() - 1)
    return getAppointmentsForDate(previous)
  }, [appointmentsByDate, selectedDate])

  const upcomingAppointments = useMemo(() => {
    const now = new Date()

    return appointments
      .filter((appointment) => {
        const start = normalizeDate(appointment.startTime)
        return (
          start &&
          start.getTime() >= now.getTime() &&
          !["cancelled", "no_show", "completed"].includes(appointment.status)
        )
      })
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      )
  }, [appointments])

  const nextAppointment = upcomingAppointments[0]
  const urgentOpenCount = appointments.filter(
    (appointment) =>
      appointment.type === "Urgence" &&
      !["completed", "cancelled"].includes(appointment.status)
  ).length

  const totalPlannedMinutes = dailyAppointments.reduce((sum, appointment) => {
    const start = normalizeDate(appointment.startTime)
    const end = normalizeDate(appointment.endTime)
    if (!start || !end) return sum
    return (
      sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
    )
  }, 0)

  const engagedVetsCount = vets.filter(
    (vet) => (appointmentsByVet.get(vet.id) ?? []).length > 0
  ).length

  const overviewCards = useMemo<AgendaOverviewCard[]>(() => {
    const delta = dailyAppointments.length - previousDayAppointments.length
    const deltaPrefix = delta > 0 ? "+" : ""
    const occupancyTarget = Math.max(1, vets.length) * 8 * 60
    const occupancy = Math.round((totalPlannedMinutes / occupancyTarget) * 100)

    return [
      {
        label: t("agenda.overview.slotsTitle", { defaultValue: "Créneaux" }),
        value: String(dailyAppointments.length),
        meta: delta === 0 ? "stable" : `${deltaPrefix}${delta}`,
        note: t("agenda.overview.closedConsultations", {
          count: dailyAppointments.filter((item) => item.status === "completed").length,
          defaultValue_one: "{{count}} clôturée",
          defaultValue_other: "{{count}} clôturées",
        }),
        icon: Calendar01Icon,
        sparklineData: buildAgendaSparkline(dailyAppointments.length, "steady"),
        tone: "blue",
      },
      {
        label: t("agenda.overview.openEmergencies", { defaultValue: "Urgences ouvertes" }),
        value: String(urgentOpenCount),
        meta:
          urgentOpenCount === 0
            ? "stable"
            : t("agenda.overview.alerts", {
                count: urgentOpenCount,
                defaultValue_one: "{{count}} alerte",
                defaultValue_other: "{{count}} alertes",
              }),
        note: t("agenda.overview.priorityCases", {
          defaultValue: "Cas à surveiller en priorité",
        }),
        icon: Alert02Icon,
        sparklineData: buildAgendaSparkline(urgentOpenCount, "watch"),
        tone: "orange",
      },
      {
        label: t("agenda.overview.plannedTime", { defaultValue: "Temps planifié" }),
        value: formatDuration(totalPlannedMinutes),
        meta:
          totalPlannedMinutes === 0
            ? "0%"
            : `${Number.isFinite(occupancy) ? occupancy : 0}%`,
        note: t("agenda.overview.engagedVets", {
          count: engagedVetsCount,
          defaultValue_one: "{{count}} praticien mobilisé",
          defaultValue_other: "{{count}} praticiens mobilisés",
        }),
        icon: StethoscopeIcon,
        sparklineData: buildAgendaSparkline(Math.round(totalPlannedMinutes / 60), "rise"),
        tone: "emerald",
      },
      {
        label: t("agenda.overview.nextAppointment", { defaultValue: "Prochain rendez-vous" }),
        value: nextAppointment
          ? formatTimeCompact(nextAppointment.startTime)
          : t("agenda.overview.free", { defaultValue: "Libre" }),
        meta: nextAppointment ? nextAppointment.type : "aucun",
        note: nextAppointment
          ? patientsById.get(nextAppointment.patientId)?.name ||
            nextAppointment.title
          : t("agenda.overview.noUpcomingSlot", { defaultValue: "Aucun créneau imminent" }),
        icon: UserCircle02Icon,
        sparklineData: buildAgendaSparkline(nextAppointment ? 2 : 0, "stable"),
        tone: "slate",
      },
    ]
  }, [
    dailyAppointments,
    engagedVetsCount,
    nextAppointment,
    patientsById,
    previousDayAppointments.length,
    totalPlannedMinutes,
    urgentOpenCount,
    vets.length,
    t,
  ])

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return formatDateLabel(selectedDate, { month: "long", year: "numeric" })
    }

    if (viewMode === "week") {
      const start = weekDays[0]
      const end = weekDays[weekDays.length - 1]
      return `${formatDateLabel(start, { day: "numeric", month: "long" })} - ${formatDateLabel(
        end,
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )}`
    }

    return formatDateLabel(selectedDate, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }, [selectedDate, viewMode, weekDays])

  const dayLoadSummary = useMemo(
    () =>
      vets
        .map((vet) => ({
          vet,
          count: (appointmentsByVet.get(vet.id) ?? []).length,
        }))
        .filter((entry) => entry.count > 0)
        .sort((left, right) => right.count - left.count),
    [appointmentsByVet, vets]
  )

  const typeSummary = useMemo(
    () =>
      APPOINTMENT_TYPES.map((type) => ({
        type,
        count: dailyAppointments.filter(
          (appointment) => appointment.type === type
        ).length,
      })).filter((item) => item.count > 0),
    [dailyAppointments]
  )

  const getPatientName = (patientId: string) =>
    patientsById.get(patientId)?.name || "Patient local"

  const resetForm = (date = selectedDate) => {
    setEditingAppointmentId(null)
    setSelectedOwnerId("")
    setOwnerSearchTerm("")
    setSelectedPatientId("")
    setSelectedVetId(vets[0]?.id ?? "")
    setSelectedType("Consultation")
    setFormDate(formatDateInput(date))
    setFormTime("09:00")
    setDuration(30)
    setReason("")
    setIsSubmitting(false)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    resetForm(selectedDate)
  }

  const handleOpenCreate = (date = selectedDate, time?: string) => {
    resetForm(date)
    if (time) setFormTime(time)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (appointment: Appointment) => {
    const start = normalizeDate(appointment.startTime)
    const end = normalizeDate(appointment.endTime)

    setEditingAppointmentId(appointment.id)
    setSelectedOwnerId(appointment.ownerId)
    setOwnerSearchTerm("")
    setSelectedPatientId(appointment.patientId)
    setSelectedVetId(appointment.vetId)
    setSelectedType(appointment.type)
    setFormDate(formatDateInput(start ?? new Date()))
    setFormTime(formatTime(start))
    setDuration(
      start && end
        ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000))
        : 30
    )
    setReason(appointment.reason || "")
    setIsDialogOpen(true)
  }

  const handleOwnerSelect = (ownerId: string) => {
    setSelectedOwnerId(ownerId)
    const owner = ownersById.get(ownerId)
    setOwnerSearchTerm(
      owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
    )

    const ownerPatients = patients.filter((patient) => patient.ownerId === ownerId)
    if (ownerPatients.length === 1) {
      setSelectedPatientId(ownerPatients[0].id)
      return
    }

    const selectedPatient = patientsById.get(selectedPatientId)
    if (!selectedPatient || selectedPatient.ownerId !== ownerId) {
      setSelectedPatientId("")
    }
  }

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId)
    const patient = patientsById.get(patientId)
    if (patient?.ownerId) {
      setSelectedOwnerId(patient.ownerId)
      const owner = ownersById.get(patient.ownerId)
      setOwnerSearchTerm(
        owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
      )
    }
  }

  const selectAppointment = (appointment: Appointment, syncDate = false) => {
    setSelectedAppointmentId(appointment.id)

    if (syncDate) {
      const start = normalizeDate(appointment.startTime)
      if (start) {
        setSelectedDate(start)
      }
    }
  }

  const navigate = (direction: number) => {
    const next = new Date(selectedDate)

    if (viewMode === "day") next.setDate(next.getDate() + direction)
    if (viewMode === "week") next.setDate(next.getDate() + direction * 7)
    if (viewMode === "month") next.setMonth(next.getMonth() + direction)

    setSelectedDate(next)
  }

  const deleteAppointment = async (appointment: Appointment) => {
    const confirmed = window.confirm(
      "Supprimer ce rendez-vous du planning ? Cette action est immédiate."
    )

    if (!confirmed) return

    try {
      const removed = await remove(appointment.id)
      if (!removed) {
        toast.error("Le rendez-vous n'a pas pu être supprimé.")
        return
      }
      toast.success("Le rendez-vous a été supprimé du planning.")

      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null)
      }

      if (editingAppointmentId === appointment.id) {
        closeDialog()
      }
    } catch (error) {
      console.error(error)
      toast.error("Impossible de supprimer ce rendez-vous.")
    }
  }

  const handleSave = async () => {
    if (!selectedPatientId) {
      toast.error("Sélectionnez un patient pour créer le rendez-vous.")
      return
    }

    const effectiveVetId =
      selectedVetId || selectedAppointment?.vetId || vets[0]?.id || ""

    if (!effectiveVetId) {
      toast.error("Aucun vétérinaire actif n’est disponible pour ce créneau.")
      return
    }

    const [year, month, day] = formDate.split("-").map(Number)
    const [hours, minutes] = formTime.split(":").map(Number)

    if (
      !year ||
      !month ||
      !day ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      toast.error("La date ou l’heure du rendez-vous est invalide.")
      return
    }

    const start = new Date(year, month - 1, day, hours, minutes, 0, 0)
    const end = new Date(start.getTime() + duration * 60_000)
    const patient = patientsById.get(selectedPatientId)

    const hasConflict = appointments.some((appointment) => {
      if (appointment.id === editingAppointmentId) return false
      if (appointment.vetId !== effectiveVetId) return false
      if (
        appointment.status === "cancelled" ||
        appointment.status === "no_show"
      )
        return false

      const appointmentStart = normalizeDate(appointment.startTime)
      const appointmentEnd = normalizeDate(appointment.endTime)
      if (!appointmentStart || !appointmentEnd) return false

      return start < appointmentEnd && end > appointmentStart
    })

    if (hasConflict) {
      toast.error("Ce créneau est déjà occupé pour le vétérinaire sélectionné.")
      return
    }

    setIsSubmitting(true)

    try {
      const saved = await saveAppointment({
        ...(editingAppointmentId ? { id: editingAppointmentId } : {}),
        patientId: selectedPatientId,
        ownerId: patient?.ownerId,
        vetId: effectiveVetId,
        title: `${patient?.name || "Patient"} - ${selectedType}`,
        type: selectedType,
        startTime: start,
        endTime: end,
        status: "scheduled",
        reason,
      })

      if (!saved) {
        throw new Error("Le rendez-vous n’a pas pu être enregistré.")
      }

      toast.success(
        editingAppointmentId
          ? "Le rendez-vous a été mis à jour."
          : "Le rendez-vous a été ajouté à l’agenda."
      )

      setSelectedAppointmentId(saved.id)
      setSelectedDate(start)
      setViewMode("day")
      closeDialog()
    } catch (error) {
      console.error(error)
      toast.error("Impossible d’enregistrer ce rendez-vous.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const tableRowsByTab = useMemo<Record<TableTab, AgendaTableRow[]>>(() => {
    const query = deferredSearchTerm.trim().toLowerCase()

    const rows = appointments
      .map<AgendaTableRow>((appointment) => {
        const patient = patientsById.get(appointment.patientId)
        const owner = ownersById.get(
          appointment.ownerId || patient?.ownerId || ""
        )
        const vet = usersById.get(appointment.vetId)
        const presentation = getAppointmentPresentation(appointment, patient)
        const start = normalizeDate(appointment.startTime)

        let tab: TableTab = "planning"
        if (presentation.attention) tab = "attention"
        else if (appointment.status === "completed") tab = "termine"
        else if (start && isSameDay(start, selectedDate)) tab = "selection"

        return {
          appointment,
          patient,
          owner,
          vet,
          patientName: patient?.name || appointment.title,
          ownerName: formatOwnerName(owner),
          vetName: vet?.displayName || "Vétérinaire local",
          appointmentAt: formatDateTimeLabel(appointment.startTime),
          statusLabel: presentation.label,
          statusClassName: presentation.className,
          tab,
          searchIndex: [
            patient?.name,
            patient?.species,
            patient?.breed,
            owner?.firstName,
            owner?.lastName,
            owner?.phone,
            vet?.displayName,
            appointment.type,
            appointment.reason,
            appointment.title,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        }
      })
      .filter((row) => {
        if (vetFilter !== "all" && row.appointment.vetId !== vetFilter)
          return false
        if (statusFilter !== "all" && row.appointment.status !== statusFilter)
          return false
        if (query && !row.searchIndex.includes(query)) return false
        return true
      })

    return TABLE_TABS.reduce<Record<TableTab, AgendaTableRow[]>>(
      (accumulator, tab) => {
        accumulator[tab.value] = rows
          .filter((row) => row.tab === tab.value)
          .sort((left, right) => {
            const leftTime = new Date(left.appointment.startTime).getTime()
            const rightTime = new Date(right.appointment.startTime).getTime()
            return tab.value === "termine"
              ? rightTime - leftTime
              : leftTime - rightTime
          })
        return accumulator
      },
      {
        planning: [],
        selection: [],
        termine: [],
        attention: [],
      }
    )
  }, [
    appointments,
    deferredSearchTerm,
    ownersById,
    patientsById,
    selectedDate,
    statusFilter,
    usersById,
    vetFilter,
  ])

  const visibleRowsCount = tableRowsByTab[tableTab].length

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="h-10 rounded-xl px-4" onClick={() => setSelectedDate(new Date())}>
            {t("agenda.today")}
          </Button>
          <Button className="h-10 rounded-xl px-4" onClick={() => handleOpenCreate()}>
            <HugeiconsIcon
              icon={Add01Icon}
              strokeWidth={1.5}
              data-icon="inline-start"
            />
            {t("agenda.newAppointment")}
          </Button>
        </div>
      </div>

      <AgendaOverviewStrip items={overviewCards} />

      <div className="grid gap-4">
        <Card className="card-vibrant card-hover-lift min-h-[780px] rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-b border-border px-6 py-5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">{t("agenda.planning")}</CardDescription>
            <CardTitle className="text-[22px] font-normal tracking-[-0.04em]">
              {t("agenda.consultationsAgenda")}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {t("agenda.slot", { count: dailyAppointments.length })}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
              className="flex min-h-0 flex-1 gap-4"
            >
              <div className="flex flex-col gap-3 border-b border-border px-6 pt-5 pb-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger>
                      <div className="inline-flex items-center rounded-full bg-[var(--color-surface-soft)] p-1">
                        <Button variant="outline" className="h-10 gap-2 rounded-xl">
                          <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
                          {periodLabel}
                        </Button>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={10}
                      className="w-auto rounded-[1.75rem] p-2"
                    >
                      <Calendar
                        mode="single"
                        locale={getDateFnsLocale()}
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) setSelectedDate(date)
                        }}
                        className="rounded-[1.4rem]"
                      />
                    </PopoverContent>
                  </Popover>

                  {isSameDay(selectedDate, new Date()) ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-transparent bg-primary/10 text-primary"
                    >
                      {t("agenda.today")}
                    </Badge>
                  ) : null}
                </div>

                <TabsList>
                  <TabsTrigger value="day">{t("agenda.day")}</TabsTrigger>
                  <TabsTrigger value="week">{t("agenda.week")}</TabsTrigger>
                  <TabsTrigger value="month">{t("agenda.month")}</TabsTrigger>
                </TabsList>
              </div>

              {loadingAppointments ? (
                <div className="flex flex-1 flex-col gap-3 px-6 pb-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-24 rounded-3xl" />
                  </div>
                  <Skeleton className="h-[460px] w-full rounded-3xl" />
                </div>
              ) : (
                <>
                  <TabsContent value="day" className="min-h-0 flex-1">
                    <AgendaDayView
                      vets={vets}
                      appointmentsByVet={appointmentsByVet}
                      selectedDate={selectedDate}
                      selectedAppointmentId={selectedAppointmentId}
                      currentTimePosition={currentTimePosition}
                      currentTimeLabel={formatTime(currentTime)}
                      onSelectAppointment={selectAppointment}
                      getPatientName={getPatientName}
                    />
                  </TabsContent>

                  <TabsContent value="week" className="min-h-0 flex-1">
                    <AgendaWeekView
                      weekDays={weekDays}
                      getAppointmentsForDate={getAppointmentsForDate}
                      selectedAppointmentId={selectedAppointmentId}
                      onSelectAppointment={selectAppointment}
                      getPatientName={getPatientName}
                    />
                  </TabsContent>

                  <TabsContent value="month" className="min-h-0 flex-1">
                    <AgendaMonthView
                      monthDays={monthDays}
                      selectedDate={selectedDate}
                      getAppointmentsForDate={getAppointmentsForDate}
                      getPatientName={getPatientName}
                      onPickDate={(date) => {
                        setSelectedDate(date)
                        setViewMode("day")
                      }}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          <Card className="min-h-[420px]">
            <CardHeader className="border-b">
              <CardDescription>Détail de la sélection</CardDescription>
              <CardTitle className="text-xl tracking-[-0.04em]">
                {selectedAppointment
                  ? patientsById.get(selectedAppointment.patientId)?.name ||
                    selectedAppointment.title
                  : "Aucun rendez-vous sélectionné"}
              </CardTitle>
              {selectedAppointment ? (
                <CardAction>
                  <AppointmentStatusBadge
                    appointment={selectedAppointment}
                    patient={selectedPatient}
                  />
                </CardAction>
              ) : null}
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
              {selectedAppointment ? (
                <>
                  <div
                    className={cn(
                      "rounded-4xl border p-4",
                      TYPE_META[selectedAppointment.type].surfaceClassName
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Acte clinique
                        </p>
                        <p className="mt-1 text-lg font-medium text-foreground">
                          {selectedAppointment.type}
                        </p>
                      </div>
                      <AppointmentTypeBadge type={selectedAppointment.type} />
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-4xl border border-border/80 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Créneau
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {formatTimeCompact(selectedAppointment.startTime)} -{" "}
                        {formatTimeCompact(selectedAppointment.endTime)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Date
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {formatDateLabel(
                          normalizeDate(selectedAppointment.startTime) ??
                            selectedDate,
                          {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Vétérinaire
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {selectedVet?.displayName || "Vétérinaire local"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Propriétaire
                      </span>
                      <span className="text-right font-medium text-foreground">
                        {formatOwnerName(selectedOwner)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-4xl border border-border/80 bg-card p-4 transition-all duration-200 ease-out hover:border-border/60 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={StethoscopeIcon}
                        strokeWidth={1.5}
                        className="size-4 text-muted-foreground"
                      />
                      <p className="font-medium text-foreground">Patient</p>
                    </div>
                    <div className="grid gap-1">
                      <p className="font-medium text-foreground">
                        {selectedPatient?.name || "Patient local"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getPatientProfile(selectedPatient)} ·{" "}
                        {getAgeLabel(selectedPatient?.dateOfBirth)}
                      </p>
                    </div>
                    {selectedAppointment.reason ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {selectedAppointment.reason}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucun motif détaillé n&apos;a encore été saisi.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <Empty className="border border-dashed border-border/80 bg-muted/20 p-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle>Sélectionnez un rendez-vous</EmptyTitle>
                    <EmptyDescription>
                      Cliquez sur un créneau dans le planning ou dans le tableau
                      ci-dessous pour afficher la fiche contextuelle.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent className="sm:flex-row justify-center">
                    <Button onClick={() => handleOpenCreate()}>
                      <HugeiconsIcon
                        icon={Add01Icon}
                        strokeWidth={1.5}
                        data-icon="inline-start"
                      />
                      Nouveau rendez-vous
                    </Button>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>

            {selectedAppointment ? (
              <CardFooter className="gap-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenEdit(selectedAppointment)}
                >
                  Modifier
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleOpenCreate(selectedDate)}
                >
                  Nouveau RDV
                </Button>
              </CardFooter>
            ) : null}
          </Card>

          <Card size="sm" className="h-fit">
            <CardHeader>
              <CardDescription>Cadence de la journée</CardDescription>
              <CardTitle>{formatDateLabel(selectedDate)}</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                {typeSummary.length > 0 ? (
                  typeSummary.map((entry) => (
                    <div
                      key={entry.type}
                      className="flex items-center justify-between gap-3 rounded-3xl bg-muted/30 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            TYPE_META[entry.type].dotClassName
                          )}
                        />
                        <span className="font-medium text-foreground">
                          {entry.type}
                        </span>
                      </div>
                      <Badge variant="outline">{entry.count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Aucun rendez-vous n&apos;est encore programmé sur cette
                    journée.
                  </div>
                )}
              </div>

              <div className="grid gap-2 rounded-4xl border border-border/80 bg-card p-4 transition-all duration-200 ease-out hover:border-border/60 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Charge planifiée
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDuration(totalPlannedMinutes)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Urgences en cours
                  </span>
                  <span className="font-medium text-foreground">
                    {urgentOpenCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Vétérinaires mobilisés
                  </span>
                  <span className="font-medium text-foreground">
                    {engagedVetsCount}
                  </span>
                </div>
              </div>

              {dayLoadSummary.length > 0 ? (
                <div className="grid gap-2">
                  {dayLoadSummary.map((entry) => (
                    <div
                      key={entry.vet.id}
                      className="flex items-center justify-between gap-3 rounded-3xl bg-muted/30 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {entry.vet.displayName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.vet.specialty || "Consultation générale"}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardDescription>Liste opérationnelle</CardDescription>
          <CardTitle className="text-2xl tracking-[-0.04em]">
            Tableau du planning
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {visibleRowsCount} visible{visibleRowsCount > 1 ? "s" : ""}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
          <Tabs
            value={tableTab}
            onValueChange={(value) => setTableTab(value as TableTab)}
            className="gap-4"
          >
            <div className="flex flex-col gap-3 border-b px-6 pt-1 pb-4 xl:flex-row xl:items-center xl:justify-between">
              <TabsList>
                {TABLE_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="relative">
                  <HugeiconsIcon
                    icon={SearchIcon}
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Rechercher un patient, un motif ou un vétérinaire..."
                    className="h-11 rounded-3xl bg-input/50 pl-11"
                  />
                </div>

                <NativeSelect
                  value={vetFilter}
                  onChange={(event) => setVetFilter(event.target.value)}
                  className="w-full"
                >
                  <NativeSelectOption value="all">
                    Tous les vétérinaires
                  </NativeSelectOption>
                  {vets.map((vet) => (
                    <NativeSelectOption key={vet.id} value={vet.id}>
                      {vet.displayName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full"
                >
                  <NativeSelectOption value="all">
                    Tous les statuts
                  </NativeSelectOption>
                  {Object.entries(STATUS_META).map(([status, meta]) => (
                    <NativeSelectOption key={status} value={status}>
                      {meta.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {TABLE_TABS.map((tab) => {
              const rows = tableRowsByTab[tab.value]

              return (
                <TabsContent
                  key={tab.value}
                  value={tab.value}
                  className="px-6 pb-6"
                >
                  {rows.length === 0 ? (
                    <Empty className="border border-dashed border-border/80 bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          {tab.value === "attention" ? (
                            <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} />
                          ) : (
                            <HugeiconsIcon
                              icon={Calendar01Icon}
                              strokeWidth={1.5}
                            />
                          )}
                        </EmptyMedia>
                        <EmptyTitle>
                          Aucun rendez-vous dans cette vue
                        </EmptyTitle>
                        <EmptyDescription>
                          Ajustez les filtres ou créez un nouveau créneau pour
                          enrichir le planning.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent className="sm:flex-row">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm("")
                            setVetFilter("all")
                            setStatusFilter("all")
                          }}
                        >
                          Réinitialiser
                        </Button>
                        <Button onClick={() => handleOpenCreate()}>
                          <HugeiconsIcon
                            icon={Add01Icon}
                            strokeWidth={1.5}
                            data-icon="inline-start"
                          />
                          Nouveau rendez-vous
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dossier</TableHead>
                            <TableHead>Propriétaire</TableHead>
                            <TableHead>Acte</TableHead>
                            <TableHead>Créneau</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Vétérinaire</TableHead>
                            <TableHead className="pr-8 text-right">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow
                              key={row.appointment.id}
                              className="cursor-pointer"
                              onClick={() =>
                                selectAppointment(row.appointment, true)
                              }
                            >
                              <TableCell className="min-w-[220px] pl-10">
                                <div className="flex items-center gap-3">
                                  <div className="flex size-10 items-center justify-center rounded-2xl bg-muted text-foreground">
                                    {(row.patientName || "?")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                      {row.patientName}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                      {getPatientProfile(row.patient)}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="min-w-[180px]">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {row.ownerName}
                                  </p>
                                  <p className="truncate text-sm text-muted-foreground">
                                    {row.owner?.phone ||
                                      "Téléphone non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <AppointmentTypeBadge
                                  type={row.appointment.type}
                                />
                              </TableCell>

                              <TableCell className="min-w-[200px]">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {row.appointmentAt}
                                  </p>
                                  <p className="truncate text-sm text-muted-foreground">
                                    {row.appointment.reason ||
                                      "Motif non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <AppointmentStatusBadge
                                  appointment={row.appointment}
                                  patient={row.patient}
                                />
                              </TableCell>

                              <TableCell className="min-w-[180px]">
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">
                                    {row.vetName}
                                  </p>
                                  <p className="truncate text-sm text-muted-foreground">
                                    {row.vet?.specialty || "Pratique générale"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell
                                className="pr-8 text-right"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="ml-auto"
                                      />
                                    }
                                  >
                                    <HugeiconsIcon
                                      icon={MoreVerticalCircle01Icon}
                                      strokeWidth={2}
                                    />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-44"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        selectAppointment(row.appointment, true)
                                      }
                                    >
                                      Ouvrir
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleOpenEdit(row.appointment)
                                      }
                                    >
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        deleteAppointment(row.appointment)
                                      }
                                    >
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm(selectedDate)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl tracking-[-0.04em]">
              {editingAppointmentId
                ? "Modifier le rendez-vous"
                : "Nouveau rendez-vous"}
            </DialogTitle>
            <DialogDescription>
              Réservez un créneau propre au planning Luma, sans quitter la
              logique clinique locale.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto p-6">
            <FieldGroup className="grid gap-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <Field className="lg:col-span-2">
                  <FieldLabel>Client existant</FieldLabel>
                  <Input
                    value={ownerSearchTerm}
                    onChange={(event) => {
                      setOwnerSearchTerm(event.target.value)
                      if (!event.target.value.trim()) {
                        setSelectedOwnerId("")
                      }
                    }}
                    placeholder="Rechercher un propriétaire par nom, téléphone ou email..."
                  />
                  <FieldDescription>
                    Sélectionnez d’abord le client pour filtrer automatiquement
                    ses dossiers patients.
                  </FieldDescription>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filteredOwners.length > 0 ? (
                      filteredOwners.map((owner) => (
                        <Button
                          key={owner.id}
                          type="button"
                          variant={
                            selectedOwnerId === owner.id ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handleOwnerSelect(owner.id)}
                        >
                          {formatOwnerName(owner)}
                        </Button>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Aucun client existant ne correspond à cette recherche.
                      </div>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Patient</FieldLabel>
                  <NativeSelect
                    value={selectedPatientId}
                    onChange={(event) => handlePatientSelect(event.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="" disabled>
                      {selectedOwnerId
                        ? "Sélectionner un dossier du client"
                        : "Sélectionner un dossier"}
                    </NativeSelectOption>
                    {patientsForSelectedOwner.map((patient) => {
                      const owner = ownersById.get(patient.ownerId)
                      return (
                        <NativeSelectOption key={patient.id} value={patient.id}>
                          {patient.name} · {patient.species} ·{" "}
                          {formatOwnerName(owner)}
                        </NativeSelectOption>
                      )
                    })}
                  </NativeSelect>
                  <FieldDescription>
                    {selectedOwnerId
                      ? "Seuls les patients liés au client choisi sont affichés."
                      : "Le propriétaire sera lié automatiquement depuis le dossier choisi."}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Vétérinaire</FieldLabel>
                  <NativeSelect
                    value={selectedVetId}
                    onChange={(event) => setSelectedVetId(event.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="">
                      Affectation automatique
                    </NativeSelectOption>
                    {vets.map((vet) => (
                      <NativeSelectOption key={vet.id} value={vet.id}>
                        {vet.displayName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    Laissez vide pour utiliser le vétérinaire local disponible
                    par défaut.
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel>Type d&apos;acte</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {APPOINTMENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </Field>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr_200px]">
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={<Button variant="outline" className="w-full justify-between" />}
                    >
                      <span>{formDate.split("-").reverse().join("/")}</span>
                      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={10}
                      className="w-auto rounded-[1.75rem] p-2"
                    >
                      <Calendar
                        mode="single"
                        locale={fr}
                        selected={parseDateInput(formDate) ?? new Date()}
                        onSelect={(date) => {
                          if (date) setFormDate(formatDateInput(date))
                        }}
                        className="rounded-[1.4rem]"
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>Format français : JJ/MM/AAAA.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Heure</FieldLabel>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(event) => setFormTime(event.target.value)}
                  />
                  <FieldDescription>
                    Format 24h, par exemple 20:45.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Durée</FieldLabel>
                  <NativeSelect
                    value={String(duration)}
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                    className="w-full"
                  >
                    {DURATION_OPTIONS.map((value) => (
                      <NativeSelectOption key={value} value={String(value)}>
                        {formatDuration(value)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <Field>
                <FieldLabel>Créneaux rapides</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TIMES.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={formTime === time ? "default" : "outline"}
                      size="xs"
                      onClick={() => setFormTime(time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel>Motif clinique</FieldLabel>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Décrivez la demande, les signes cliniques ou le contexte du rendez-vous."
                  className="min-h-28"
                />
                <FieldDescription>
                  Ce texte alimente aussi la lecture rapide dans le tableau du
                  planning.
                </FieldDescription>
              </Field>

              <div className="rounded-4xl border border-border/80 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-background text-foreground">
                    <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {selectedPatientId
                        ? patientsById.get(selectedPatientId)?.name ||
                          "Patient local"
                        : "Sélectionnez un dossier patient"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatientId
                        ? getPatientProfile(patientsById.get(selectedPatientId))
                        : "Le résumé patient et propriétaire s’actualise ici pendant la saisie."}
                    </p>
                  </div>
                </div>
              </div>
            </FieldGroup>
          </div>

          <div className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editingAppointmentId ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    const current = appointments.find(
                      (appointment) => appointment.id === editingAppointmentId
                    )
                    if (current) {
                      void deleteAppointment(current)
                    }
                  }}
                >
                  Supprimer
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={closeDialog}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting || !selectedPatientId}
              >
                {!isSubmitting ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                ) : null}
                {isSubmitting ? <Spinner className="size-4" /> : null}
                {editingAppointmentId ? "Enregistrer" : "Ajouter au planning"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default React.memo(Agenda)
