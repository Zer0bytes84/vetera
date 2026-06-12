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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AgendaListView } from "@/components/AgendaListView";
import MotivationalHeader from "@/components/MotivationalHeader";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_META,
} from "@/config/status-meta";
import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentRecurrencesRepository,
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useUsersRepository,
} from "@/data/repositories";
import i18n from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAudit } from "@/services/auditService";
import { generateId } from "@/services/sqlite/database";
import type {
  Appointment,
  AppointmentRecurrence,
  User as AppUser,
  Owner,
  Patient,
  RecurrenceFrequency,
} from "@/types/db";

const APPOINTMENT_TYPES: Appointment["type"][] = [
  "Consultation",
  "Vaccin",
  "Chirurgie",
  "Urgence",
  "Contrôle",
];

const QUICK_TIMES = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "19:00",
];

const TIME_PERIODS: {
  id: "morning" | "afternoon" | "evening";
  label: string;
  from: string;
  to: string;
}[] = [
  { id: "morning", label: "Matin", from: "06:00", to: "12:00" },
  { id: "afternoon", label: "Après-midi", from: "12:00", to: "18:00" },
  { id: "evening", label: "Soir", from: "18:00", to: "22:00" },
];

const STEP_MINUTES = 5;

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, total));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(value: string, delta: number): string {
  return minutesToTime(timeToMinutes(value) + delta);
}

interface TimePickerProps {
  durationMinutes: number;
  onChange: (value: string) => void;
  value: string;
}

function AppointmentTimePicker({
  durationMinutes,
  value,
  onChange,
}: TimePickerProps) {
  const { t } = useTranslation();
  const valueMinutes = timeToMinutes(value);
  const endMinutes = valueMinutes + durationMinutes;
  const endLabel = minutesToTime(endMinutes);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Heure précédente"
            className="h-8 w-8"
            onClick={() => onChange(addMinutesToTime(value, -60))}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              size={14}
              strokeWidth={1.75}
            />
          </Button>
          <Button
            aria-label="-15 minutes"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(addMinutesToTime(value, -15))}
            size="sm"
            type="button"
            variant="ghost"
          >
            −15
          </Button>
          <Button
            aria-label="-5 minutes"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(addMinutesToTime(value, -STEP_MINUTES))}
            size="sm"
            type="button"
            variant="ghost"
          >
            −5
          </Button>
        </div>
        <div className="flex flex-col items-center">
          <Input
            className="w-24 text-center font-semibold text-base tabular-nums"
            onChange={(event) => {
              const next = event.target.value;
              if (/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(next)) {
                onChange(next);
              }
            }}
            type="time"
            value={value}
          />
          <span className="mt-0.5 text-[10px] text-muted-foreground/80">
            {t("appointment.time.endsAt", {
              defaultValue: "Fin",
            })}{" "}
            {endLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="+5 minutes"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(addMinutesToTime(value, STEP_MINUTES))}
            size="sm"
            type="button"
            variant="ghost"
          >
            +5
          </Button>
          <Button
            aria-label="+15 minutes"
            className="h-8 px-2 text-xs"
            onClick={() => onChange(addMinutesToTime(value, 15))}
            size="sm"
            type="button"
            variant="ghost"
          >
            +15
          </Button>
          <Button
            aria-label="Heure suivante"
            className="h-8 w-8"
            onClick={() => onChange(addMinutesToTime(value, 60))}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              strokeWidth={1.75}
            />
          </Button>
        </div>
      </div>

      {TIME_PERIODS.map((period) => {
        const slots = QUICK_TIMES.filter(
          (time) =>
            timeToMinutes(time) >= timeToMinutes(period.from) &&
            timeToMinutes(time) <= timeToMinutes(period.to)
        );
        if (slots.length === 0) {
          return null;
        }
        return (
          <div className="space-y-1.5" key={period.id}>
            <p className="font-bold text-[10px] text-muted-foreground/80 uppercase tracking-wider">
              {period.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((time) => {
                const active = value === time;
                return (
                  <Button
                    className="tabular-nums"
                    key={time}
                    onClick={() => onChange(time)}
                    size="xs"
                    type="button"
                    variant={active ? "default" : "outline"}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const APPOINTMENT_ROOMS = [
  { value: "consult-1", i18nKey: "scheduling.rooms.consult1" },
  { value: "consult-2", i18nKey: "scheduling.rooms.consult2" },
  { value: "surgery", i18nKey: "scheduling.rooms.surgery" },
  { value: "hospitalization", i18nKey: "scheduling.rooms.hospitalization" },
  { value: "imaging", i18nKey: "scheduling.rooms.imaging" },
] as const;

const RECURRENCE_FREQUENCIES: {
  value: RecurrenceFrequency;
  i18nKey: string;
}[] = [
  { value: "weekly", i18nKey: "scheduling.recurrence.frequencies.weekly" },
  { value: "biweekly", i18nKey: "scheduling.recurrence.frequencies.biweekly" },
  { value: "monthly", i18nKey: "scheduling.recurrence.frequencies.monthly" },
  { value: "yearly", i18nKey: "scheduling.recurrence.frequencies.yearly" },
];

const DAY_OF_WEEK_LABELS: { value: number; i18nKey: string }[] = [
  { value: 1, i18nKey: "scheduling.recurrence.days.mon" },
  { value: 2, i18nKey: "scheduling.recurrence.days.tue" },
  { value: 3, i18nKey: "scheduling.recurrence.days.wed" },
  { value: 4, i18nKey: "scheduling.recurrence.days.thu" },
  { value: 5, i18nKey: "scheduling.recurrence.days.fri" },
  { value: 6, i18nKey: "scheduling.recurrence.days.sat" },
  { value: 0, i18nKey: "scheduling.recurrence.days.sun" },
];
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 23;
const HOUR_BLOCKS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, index) => CALENDAR_START_HOUR + index
);
const CALENDAR_START_MINUTES = CALENDAR_START_HOUR * 60;
const CALENDAR_END_MINUTES = (CALENDAR_END_HOUR + 1) * 60;

const TABLE_TABS = [
  { label: "Planning", value: "planning" },
  { label: "Journée", value: "selection" },
  { label: "Terminés", value: "termine" },
  { label: "Attention", value: "attention" },
] as const;

type ViewMode = "list" | "day" | "week" | "month";
type TableTab = (typeof TABLE_TABS)[number]["value"];

type AgendaTableRow = {
  appointment: Appointment;
  patient?: Patient;
  owner?: Owner;
  vet?: AppUser;
  patientName: string;
  ownerName: string;
  vetName: string;
  appointmentAt: string;
  statusLabel: string;
  statusClassName: string;
  tab: TableTab;
  searchIndex: string;
};

function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value?: string | null) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return null;
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function getCurrentLocale() {
  if (i18n.language.startsWith("ar")) {
    return "ar";
  }
  if (i18n.language.startsWith("en")) {
    return "en-US";
  }
  if (i18n.language.startsWith("es")) {
    return "es-ES";
  }
  if (i18n.language.startsWith("pt")) {
    return "pt-PT";
  }
  if (i18n.language.startsWith("de")) {
    return "de-DE";
  }
  return "fr-FR";
}

function getDateFnsLocale() {
  if (i18n.language.startsWith("ar")) {
    return ar;
  }
  if (i18n.language.startsWith("en")) {
    return enUS;
  }
  if (i18n.language.startsWith("es")) {
    return es;
  }
  if (i18n.language.startsWith("pt")) {
    return pt;
  }
  if (i18n.language.startsWith("de")) {
    return de;
  }
  return fr;
}

function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--:--";
  }
  return date.toLocaleTimeString(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeCompact(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--h--";
  }
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}h${minutes}`;
}

function formatDateLabel(
  value: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  }
) {
  return value.toLocaleDateString(getCurrentLocale(), options);
}

function formatDateTimeLabel(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "Slot undefined";
  }
  return `${date.toLocaleDateString(getCurrentLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })} · ${formatTimeCompact(date)}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainder}`;
}

function getTimePosition(time: Date) {
  return (time.getHours() - CALENDAR_START_HOUR) * 60 + time.getMinutes();
}

function getMinutesFromDayStart(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function getAppointmentFrame(
  start: Date,
  end: Date,
  pixelsPerHour: number,
  minHeight: number
) {
  const rawStart = getMinutesFromDayStart(start);
  const rawEnd = getMinutesFromDayStart(end);
  if (rawEnd <= rawStart) {
    return null;
  }

  const clippedStart = Math.max(rawStart, CALENDAR_START_MINUTES);
  const clippedEnd = Math.min(rawEnd, CALENDAR_END_MINUTES);
  if (clippedEnd <= clippedStart) {
    return null;
  }

  const top = ((clippedStart - CALENDAR_START_MINUTES) / 60) * pixelsPerHour;
  const height = Math.max(
    minHeight,
    ((clippedEnd - clippedStart) / 60) * pixelsPerHour
  );

  return { top, height };
}

function getWeekDays(date: Date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(base.setDate(diff));

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return current;
  });
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) {
    startDay = 6;
  }

  const days: Array<Date | null> = [];

  for (let index = 0; index < startDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire non lié";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  );
}

function getPatientProfile(patient?: Patient) {
  if (!patient) {
    return "Patient local";
  }
  return patient.breed
    ? `${patient.species} · ${patient.breed}`
    : patient.species;
}

function normalizeEntityId(value?: string | null) {
  return String(value ?? "").trim();
}

function getAgeLabel(dateOfBirth?: string) {
  const birthday = normalizeDate(dateOfBirth);
  if (!birthday) {
    return "Âge non renseigné";
  }

  const today = new Date();
  let years = today.getFullYear() - birthday.getFullYear();
  const monthDelta = today.getMonth() - birthday.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthday.getDate())
  ) {
    years -= 1;
  }

  if (years <= 0) {
    return "Moins d'un an";
  }
  return `${years} an${years > 1 ? "s" : ""}`;
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
    };
  }

  if (
    appointment.type === "Urgence" &&
    !["completed", "cancelled"].includes(appointment.status)
  ) {
    return {
      label: "Urgence",
      className: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
      attention: true,
    };
  }

  const status = APPOINTMENT_STATUS_META[appointment.status];

  return {
    label: status.label,
    className: status.className,
    attention:
      appointment.status === "cancelled" || appointment.status === "no_show",
  };
}

function AppointmentTypeBadge({
  type,
  className,
}: {
  type: Appointment["type"];
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        APPOINTMENT_TYPE_META[type].badgeClassName,
        className
      )}
      variant="outline"
    >
      {type}
    </Badge>
  );
}

function AppointmentStatusBadge({
  appointment,
  patient,
  className,
}: {
  appointment: Appointment;
  patient?: Patient;
  className?: string;
}) {
  const presentation = getAppointmentPresentation(appointment, patient);

  return (
    <Badge
      className={cn("border-transparent", presentation.className, className)}
      variant="outline"
    >
      {presentation.label}
    </Badge>
  );
}

function calculateOverlapMap(appointments: Appointment[]) {
  const layout = new Map<string, { column: number; totalColumns: number }>();

  const sorted = [...appointments].sort((a, b) => {
    const startA = new Date(a.startTime).getTime();
    const startB = new Date(b.startTime).getTime();
    if (startA !== startB) {
      return startA - startB;
    }
    return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
  });

  let currentGroup: Appointment[] = [];
  let groupEnd = 0;

  const layoutGroup = (group: Appointment[]) => {
    const columns: Appointment[][] = [];
    for (const appt of group) {
      const start = new Date(appt.startTime).getTime();
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const lastAppt = columns[i][columns[i].length - 1];
        if (start >= new Date(lastAppt.endTime).getTime()) {
          columns[i].push(appt);
          layout.set(appt.id, { column: i, totalColumns: 0 });
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([appt]);
        layout.set(appt.id, { column: columns.length - 1, totalColumns: 0 });
      }
    }

    const totalCols = columns.length;
    for (const appt of group) {
      const info = layout.get(appt.id);
      if (info) {
        info.totalColumns = totalCols;
      }
    }
  };

  for (const appt of sorted) {
    const start = new Date(appt.startTime).getTime();
    const end = new Date(appt.endTime).getTime();

    if (currentGroup.length > 0 && start >= groupEnd) {
      layoutGroup(currentGroup);
      currentGroup = [];
      groupEnd = 0;
    }

    currentGroup.push(appt);
    groupEnd = Math.max(groupEnd, end);
  }

  if (currentGroup.length > 0) {
    layoutGroup(currentGroup);
  }

  return layout;
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
  vets: AppUser[];
  appointmentsByVet: Map<string, Appointment[]>;
  selectedDate: Date;
  selectedAppointmentId: string | null;
  currentTimePosition: number | null;
  currentTimeLabel: string;
  onSelectAppointment: (appointment: Appointment) => void;
  getPatientName: (patientId: string) => string;
}) {
  if (vets.length === 0) {
    return (
      <div className="flex flex-1 px-6 pb-6">
        <Empty className="border border-border/80 border-dashed bg-muted/20">
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
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[980px] overflow-hidden rounded-lg border">
        <div className="flex">
          <div className="w-20 shrink-0 border-border/70 border-r bg-muted/20 pt-[4.5rem]">
            {HOUR_BLOCKS.map((hour) => (
              <div className="relative h-[60px] pr-4 text-right" key={hour}>
                <span className="-translate-y-1/2 font-medium text-muted-foreground text-xs">
                  {`${hour.toString().padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {vets.map((vet) => {
            const vetAppointments = appointmentsByVet.get(vet.id) ?? [];
            const layoutMap = calculateOverlapMap(vetAppointments);

            return (
              <div
                className="min-w-[260px] flex-1 border-border/70 border-r last:border-r-0"
                key={vet.id}
              >
                <div className="sticky top-0 z-10 border-border/70 border-b bg-card/95 px-4 py-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                      {(vet.displayName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {vet.displayName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {vetAppointments.length} rendez-vous
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  {HOUR_BLOCKS.map((hour) => (
                    <div
                      className="h-[60px] border-border/60 border-b last:border-b-0"
                      key={hour}
                    />
                  ))}

                  {isSameDay(selectedDate, new Date()) &&
                  currentTimePosition !== null ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="rounded-full bg-primary px-2 py-1 font-medium text-[11px] text-primary-foreground shadow-sm">
                        {currentTimeLabel}
                      </div>
                      <div className="h-px flex-1 bg-primary/70" />
                    </div>
                  ) : null}

                  <div className="absolute inset-0">
                    {vetAppointments.map((appointment) => {
                      const start = normalizeDate(appointment.startTime);
                      const end = normalizeDate(appointment.endTime);

                      if (!(start && end)) {
                        return null;
                      }

                      const frame = getAppointmentFrame(start, end, 60, 24);
                      if (!frame) {
                        return null;
                      }
                      const patientName = getPatientName(appointment.patientId);

                      const layout = layoutMap.get(appointment.id) || {
                        column: 0,
                        totalColumns: 1,
                      };
                      const widthPercent =
                        100 / Math.max(1, layout.totalColumns);
                      const leftPercent = layout.column * widthPercent;

                      return (
                        <button
                          className={cn(
                            "absolute overflow-hidden rounded-3xl border p-3 text-left shadow-sm transition hover:shadow-md",
                            APPOINTMENT_TYPE_META[appointment.type]
                              .surfaceClassName,
                            selectedAppointmentId === appointment.id
                              ? "z-10 ring-2 ring-primary/55 ring-offset-1"
                              : "ring-0"
                          )}
                          key={appointment.id}
                          onClick={() => onSelectAppointment(appointment)}
                          style={{
                            top: frame.top,
                            height: frame.height,
                            left: `calc(${leftPercent}% + 4px)`,
                            width: `calc(${widthPercent}% - 8px)`,
                          }}
                          type="button"
                        >
                          <div className="flex h-full gap-3">
                            <span
                              className={cn(
                                "mt-1 size-2.5 shrink-0 rounded-full",
                                APPOINTMENT_TYPE_META[appointment.type]
                                  .dotClassName
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {patientName}
                              </p>
                              <p className="truncate text-muted-foreground text-sm">
                                {appointment.type}
                              </p>
                              <p className="truncate text-muted-foreground text-xs">
                                {formatTime(start)} - {formatTime(end)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaWeekView({
  weekDays,
  getAppointmentsForDate,
  selectedAppointmentId,
  onSelectAppointment,
  getPatientName,
}: {
  weekDays: Date[];
  getAppointmentsForDate: (date: Date) => Appointment[];
  selectedAppointmentId: string | null;
  onSelectAppointment: (appointment: Appointment) => void;
  getPatientName: (patientId: string) => string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[980px] overflow-hidden rounded-lg border">
        <div className="flex">
          <div className="w-16 shrink-0 border-border/70 border-r bg-muted/20 pt-[4.5rem]">
            {HOUR_BLOCKS.map((hour) => (
              <div className="relative h-[50px] pr-2 text-right" key={hour}>
                <span className="-translate-y-1/2 font-medium text-muted-foreground text-xs">
                  {`${hour.toString().padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {weekDays.map((day) => {
            const appointments = getAppointmentsForDate(day);
            const layoutMap = calculateOverlapMap(appointments);
            const isTodayColumn = isSameDay(day, new Date());

            return (
              <div
                className="min-w-[140px] flex-1 border-border/70 border-r last:border-r-0"
                key={day.toISOString()}
              >
                <div
                  className={cn(
                    "sticky top-0 z-10 border-border/70 border-b px-3 py-4 text-center backdrop-blur",
                    isTodayColumn ? "bg-primary/6" : "bg-card/95"
                  )}
                >
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                    {DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </p>
                  <p className="font-medium text-foreground text-lg">
                    {day.getDate()}
                  </p>
                </div>

                <div className="relative">
                  {HOUR_BLOCKS.map((hour) => (
                    <div
                      className="h-[50px] border-border/60 border-b last:border-b-0"
                      key={hour}
                    />
                  ))}

                  <div className="absolute inset-0">
                    {appointments.map((appointment) => {
                      const start = normalizeDate(appointment.startTime);
                      const end = normalizeDate(appointment.endTime);

                      if (!(start && end)) {
                        return null;
                      }

                      const frame = getAppointmentFrame(start, end, 50, 18);
                      if (!frame) {
                        return null;
                      }

                      const layout = layoutMap.get(appointment.id) || {
                        column: 0,
                        totalColumns: 1,
                      };
                      const widthPercent =
                        100 / Math.max(1, layout.totalColumns);
                      const leftPercent = layout.column * widthPercent;

                      return (
                        <button
                          className={cn(
                            "absolute rounded-2xl border px-2.5 py-2 text-left shadow-sm transition hover:shadow-md",
                            APPOINTMENT_TYPE_META[appointment.type]
                              .surfaceClassName,
                            selectedAppointmentId === appointment.id
                              ? "z-10 ring-2 ring-primary/55 ring-offset-1"
                              : "ring-0"
                          )}
                          key={appointment.id}
                          onClick={() => onSelectAppointment(appointment)}
                          style={{
                            top: frame.top,
                            height: frame.height,
                            left: `calc(${leftPercent}% + 3px)`,
                            width: `calc(${widthPercent}% - 6px)`,
                          }}
                          type="button"
                        >
                          <p className="truncate font-medium text-foreground text-xs">
                            {getPatientName(appointment.patientId)}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {formatTime(start)} · {appointment.type}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaMonthView({
  monthDays,
  selectedDate,
  getAppointmentsForDate,
  getPatientName,
  onPickDate,
}: {
  monthDays: Array<Date | null>;
  selectedDate: Date;
  getAppointmentsForDate: (date: Date) => Appointment[];
  getPatientName: (patientId: string) => string;
  onPickDate: (date: Date) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day) => (
            <div
              className="px-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]"
              key={day}
            >
              {day}
            </div>
          ))}

          {monthDays.map((day, index) => {
            if (!day) {
              return <div className="min-h-[146px]" key={`empty-${index}`} />;
            }

            const appointments = getAppointmentsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayCell = isSameDay(day, new Date());

            return (
              <button
                className={cn(
                  "min-h-[146px] rounded-4xl border p-4 text-left transition hover:border-border hover:bg-muted/20",
                  isSelected
                    ? "border-primary/50 bg-primary/6"
                    : "border-border/70 bg-card",
                  isTodayCell && !isSelected
                    ? "ring-1 ring-primary/20"
                    : "ring-0"
                )}
                key={day.toISOString()}
                onClick={() => onPickDate(day)}
                type="button"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground text-lg">
                    {day.getDate()}
                  </span>
                  {isTodayCell ? (
                    <Badge
                      className="border-transparent bg-primary/10 text-primary"
                      variant="outline"
                    >
                      Aujourd&apos;hui
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-xs",
                        APPOINTMENT_TYPE_META[appointment.type].surfaceClassName
                      )}
                      key={appointment.id}
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
                    <p className="text-muted-foreground text-xs">
                      +{appointments.length - 3} autres rendez-vous
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const Agenda: React.FC = () => {
  const { t } = useTranslation();
  const { focus, clearFocus } = useFocus();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [personSearchTerm, setPersonSearchTerm] = useState("");
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedVetId, setSelectedVetId] = useState("");
  const [selectedType, setSelectedType] =
    useState<Appointment["type"]>("Consultation");
  const [formDate, setFormDate] = useState(formatDateInput(new Date()));
  const [formTime, setFormTime] = useState("09:00");
  const [duration, setDuration] = useState(15);
  const [reason, setReason] = useState("");
  const [formRoom, setFormRoom] = useState("consult-1");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<
    number | null
  >(null);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [vetFilter, setVetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableTab, setTableTab] = useState<TableTab>("planning");

  const {
    data: appointments,
    loading: loadingAppointments,
    saveAppointment,
    remove,
  } = useAppointmentsRepository();

  useEffect(() => {
    if (focus) {
      if (focus.kind === "appointment") {
        setSelectedAppointmentId(focus.id);
        const appt = appointments.find((a) => a.id === focus.id);
        if (appt) {
          setSelectedDate(new Date(appt.startTime));
        }
        clearFocus();
      } else if (focus.kind === "patient") {
        const patientAppts = appointments
          .filter((a) => a.patientId === focus.id)
          .sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        if (patientAppts.length > 0) {
          setSelectedAppointmentId(patientAppts[0].id);
          setSelectedDate(new Date(patientAppts[0].startTime));
        }
        clearFocus();
      }
    }
  }, [focus, appointments, clearFocus]);
  const recurrencesStore = useAppointmentRecurrencesRepository();
  const { data: patients } = usePatientsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: users } = useUsersRepository();
  const audit = useAudit();

  useEffect(() => {
    const interval = window.setInterval(
      () => setCurrentTime(new Date()),
      60_000
    );
    return () => window.clearInterval(interval);
  }, []);

  const vets = useMemo(
    () =>
      users.filter(
        (user) =>
          user.status === "active" &&
          (user.role === "vet_principal" || user.role === "vet_adjoint")
      ),
    [users]
  );

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const ownersById = useMemo(
    () => new Map(owners.map((owner) => [owner.id, owner])),
    [owners]
  );
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );
  const filteredOwners = useMemo(() => {
    const query = ownerSearchTerm.trim().toLowerCase();
    if (!query) {
      return owners;
    }

    return owners.filter((owner) =>
      [owner.firstName, owner.lastName, owner.phone, owner.email, owner.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [ownerSearchTerm, owners]);

  const patientsForSelectedOwner = useMemo(() => {
    const ownerId = normalizeEntityId(selectedOwnerId);
    if (!ownerId) {
      return patients;
    }

    return patients.filter(
      (patient) => normalizeEntityId(patient.ownerId) === ownerId
    );
  }, [patients, selectedOwnerId]);

  const filteredPatientsForForm = useMemo(() => {
    const query = patientSearchTerm.trim().toLowerCase();
    if (!query) {
      return patientsForSelectedOwner;
    }

    return patientsForSelectedOwner.filter((patient) => {
      const owner = ownersById.get(patient.ownerId);
      const searchIndex = [
        patient.name,
        patient.species,
        patient.breed,
        owner?.firstName,
        owner?.lastName,
        owner?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchIndex.includes(query);
    });
  }, [ownersById, patientSearchTerm, patientsForSelectedOwner]);

  const unifiedAppointmentMatches = useMemo(() => {
    const query = personSearchTerm.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return patients
      .map((patient) => {
        const owner = ownersById.get(patient.ownerId);
        const searchIndex = [
          patient.name,
          patient.species,
          patient.breed,
          owner?.firstName,
          owner?.lastName,
          owner?.phone,
          owner?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return { owner, patient, searchIndex };
      })
      .filter((entry) => entry.searchIndex.includes(query))
      .slice(0, 8);
  }, [ownersById, patients, personSearchTerm]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    appointments.forEach((appointment) => {
      const start = normalizeDate(appointment.startTime);
      if (!start) {
        return;
      }

      const key = formatDateInput(start);
      const current = map.get(key) ?? [];
      current.push(appointment);
      map.set(key, current);
    });

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
      );
    });

    return map;
  }, [appointments]);

  const getAppointmentsForDate = (date: Date) =>
    appointmentsByDate.get(formatDateInput(date)) ?? [];

  const dailyAppointments = useMemo(
    () => getAppointmentsForDate(selectedDate),
    [appointmentsByDate, selectedDate]
  );

  const appointmentsByVet = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    dailyAppointments.forEach((appointment) => {
      const current = map.get(appointment.vetId) ?? [];
      current.push(appointment);
      map.set(appointment.vetId, current);
    });
    return map;
  }, [dailyAppointments]);

  const selectedAppointment = useMemo(
    () =>
      selectedAppointmentId
        ? (appointments.find(
            (appointment) => appointment.id === selectedAppointmentId
          ) ?? null)
        : null,
    [appointments, selectedAppointmentId]
  );

  const selectedPatient = selectedAppointment
    ? patientsById.get(selectedAppointment.patientId)
    : undefined;
  const selectedOwner = selectedAppointment
    ? ownersById.get(
        selectedAppointment.ownerId || selectedPatient?.ownerId || ""
      )
    : undefined;
  const selectedVet = selectedAppointment
    ? usersById.get(selectedAppointment.vetId)
    : undefined;

  useEffect(() => {
    if (
      selectedAppointmentId &&
      !appointments.some((item) => item.id === selectedAppointmentId)
    ) {
      setSelectedAppointmentId(null);
    }
  }, [appointments, selectedAppointmentId]);

  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    if (hours < CALENDAR_START_HOUR || hours >= CALENDAR_END_HOUR + 1) {
      return null;
    }
    return getTimePosition(currentTime);
  }, [currentTime]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);

  const previousDayAppointments = useMemo(() => {
    const previous = new Date(selectedDate);
    previous.setDate(previous.getDate() - 1);
    return getAppointmentsForDate(previous);
  }, [appointmentsByDate, selectedDate]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((appointment) => {
        const start = normalizeDate(appointment.startTime);
        return (
          start &&
          start.getTime() >= now.getTime() &&
          !["cancelled", "no_show", "completed"].includes(appointment.status)
        );
      })
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      );
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0];
  const urgentOpenCount = appointments.filter(
    (appointment) =>
      appointment.type === "Urgence" &&
      !["completed", "cancelled"].includes(appointment.status)
  ).length;

  const totalPlannedMinutes = dailyAppointments.reduce((sum, appointment) => {
    const start = normalizeDate(appointment.startTime);
    const end = normalizeDate(appointment.endTime);
    if (!(start && end)) {
      return sum;
    }
    return (
      sum + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
    );
  }, 0);

  const engagedVetsCount = vets.filter(
    (vet) => (appointmentsByVet.get(vet.id) ?? []).length > 0
  ).length;

  const sectionCards = useMemo<SectionCardItem[]>(() => {
    const delta = dailyAppointments.length - previousDayAppointments.length;
    const deltaPrefix = delta > 0 ? "+" : "";
    const closedCount = dailyAppointments.filter(
      (item) => item.status === "completed"
    ).length;
    const occupancyTarget = Math.max(1, vets.length) * 8 * 60;
    const occupancy = Math.round((totalPlannedMinutes / occupancyTarget) * 100);

    return [
      {
        title: t("agenda.overview.slotsTitle", { defaultValue: "Créneaux" }),
        value: String(dailyAppointments.length),
        badge: delta === 0 ? "stable" : `${deltaPrefix}${delta}`,
        trend: delta > 0 ? "up" : delta < 0 ? "down" : "neutral",
        footerTitle: `${closedCount} clôturée${closedCount > 1 ? "s" : ""}`,
        footerDescription: t("agenda.overview.closedConsultations", {
          count: closedCount,
          defaultValue_one: "{{count}} consultation clôturée",
          defaultValue_other: "{{count}} consultations clôturées",
        }),
      },
      {
        title: t("agenda.overview.openEmergencies", {
          defaultValue: "Urgences ouvertes",
        }),
        value: String(urgentOpenCount),
        badge:
          urgentOpenCount === 0
            ? "stable"
            : t("agenda.overview.alerts", {
                count: urgentOpenCount,
                defaultValue_one: "{{count}} alerte",
                defaultValue_other: "{{count}} alertes",
              }),
        trend: urgentOpenCount > 0 ? "up" : "neutral",
        footerTitle: "Cas à surveiller",
        footerDescription: t("agenda.overview.priorityCases", {
          defaultValue: "Cas à surveiller en priorité",
        }),
      },
      {
        title: t("agenda.overview.plannedTime", {
          defaultValue: "Temps planifié",
        }),
        value: formatDuration(totalPlannedMinutes),
        badge:
          totalPlannedMinutes === 0
            ? "0%"
            : `${Number.isFinite(occupancy) ? occupancy : 0}%`,
        trend: "neutral",
        footerTitle: t("agenda.overview.engagedVets", {
          count: engagedVetsCount,
          defaultValue_one: "{{count}} praticien mobilisé",
          defaultValue_other: "{{count}} praticiens mobilisés",
        }),
        footerDescription: "Occupation planning",
      },
      {
        title: t("agenda.overview.nextAppointment", {
          defaultValue: "Prochain rendez-vous",
        }),
        value: nextAppointment
          ? formatTimeCompact(nextAppointment.startTime)
          : t("agenda.overview.free", { defaultValue: "Libre" }),
        badge: nextAppointment ? nextAppointment.type : "aucun",
        trend: "neutral",
        footerTitle: nextAppointment
          ? patientsById.get(nextAppointment.patientId)?.name ||
            nextAppointment.title
          : t("agenda.overview.noUpcomingSlot", {
              defaultValue: "Aucun créneau imminent",
            }),
        footerDescription: "Prochain passage",
      },
    ];
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
  ]);

  const periodLabel = useMemo(() => {
    if (viewMode === "month") {
      return formatDateLabel(selectedDate, { month: "long", year: "numeric" });
    }

    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[weekDays.length - 1];
      return `${formatDateLabel(start, { day: "numeric", month: "long" })} - ${formatDateLabel(
        end,
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )}`;
    }

    return formatDateLabel(selectedDate, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, viewMode, weekDays]);

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
  );

  const typeSummary = useMemo(
    () =>
      APPOINTMENT_TYPES.map((type) => ({
        type,
        count: dailyAppointments.filter(
          (appointment) => appointment.type === type
        ).length,
      })).filter((item) => item.count > 0),
    [dailyAppointments]
  );

  const getPatientName = (patientId: string) =>
    patientsById.get(patientId)?.name || "Patient local";

  const resetForm = (date = selectedDate) => {
    setEditingAppointmentId(null);
    setSelectedOwnerId("");
    setPersonSearchTerm("");
    setOwnerSearchTerm("");
    setPatientSearchTerm("");
    setSelectedPatientId("");
    setSelectedVetId(vets[0]?.id ?? "");
    setSelectedType("Consultation");
    setFormDate(formatDateInput(date));
    setFormTime("09:00");
    setDuration(15);
    setReason("");
    setFormRoom("consult-1");
    setRecurrenceEnabled(false);
    setRecurrenceFrequency("weekly");
    setRecurrenceEndDate("");
    setRecurrenceMaxOccurrences(null);
    setRecurrenceDaysOfWeek([]);
    setIsSubmitting(false);
    setFormError("");
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm(selectedDate);
  };

  const handleOpenCreate = (date = selectedDate, time?: string) => {
    resetForm(date);
    if (time) {
      setFormTime(time);
    }
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (appointment: Appointment) => {
    const start = normalizeDate(appointment.startTime);
    const end = normalizeDate(appointment.endTime);

    setEditingAppointmentId(appointment.id);
    setSelectedOwnerId(appointment.ownerId);
    setOwnerSearchTerm("");
    setSelectedPatientId(appointment.patientId);
    setSelectedVetId(appointment.vetId);
    setSelectedType(appointment.type);
    setFormDate(formatDateInput(start ?? new Date()));
    setFormTime(formatTime(start));
    setDuration(
      start && end
        ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000))
        : 15
    );
    setReason(appointment.reason || "");
    setIsDialogOpen(true);
  };

  const handleOwnerSelect = (ownerId: string) => {
    const normalizedOwnerId = normalizeEntityId(ownerId);
    setSelectedOwnerId(normalizedOwnerId);
    const owner = ownersById.get(normalizedOwnerId);
    setOwnerSearchTerm(
      owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
    );

    const ownerPatients = patients.filter(
      (patient) => normalizeEntityId(patient.ownerId) === normalizedOwnerId
    );
    if (ownerPatients.length === 1) {
      setSelectedPatientId(ownerPatients[0].id);
      setPatientSearchTerm("");
      return;
    }

    const selectedPatient = patientsById.get(selectedPatientId);
    if (
      !selectedPatient ||
      normalizeEntityId(selectedPatient.ownerId) !== normalizedOwnerId
    ) {
      setSelectedPatientId("");
    }
    setPatientSearchTerm("");
  };

  const handlePatientSelect = (patientId: string) => {
    setFormError("");
    const normalizedPatientId = normalizeEntityId(patientId);
    setSelectedPatientId(normalizedPatientId);
    const patient = patientsById.get(normalizedPatientId);
    if (patient?.ownerId) {
      const normalizedOwnerId = normalizeEntityId(patient.ownerId);
      setSelectedOwnerId(normalizedOwnerId);
      const owner = ownersById.get(normalizedOwnerId);
      setOwnerSearchTerm(
        owner ? `${owner.firstName} ${owner.lastName}`.trim() : ""
      );
    }
    if (patient) {
      setPatientSearchTerm(patient.name);
      const owner = ownersById.get(patient.ownerId);
      setPersonSearchTerm(
        `${patient.name} ${owner ? formatOwnerName(owner) : ""}`.trim()
      );
    }
  };

  const handleOpenCreateForPatient = (patientId: string) => {
    const normalizedPatientId = normalizeEntityId(patientId);
    const patient = patientsById.get(normalizedPatientId);
    if (!patient) {
      return false;
    }

    resetForm(selectedDate);
    setIsDialogOpen(true);
    window.setTimeout(() => {
      handlePatientSelect(normalizedPatientId);
    }, 0);
    return true;
  };

  useEffect(() => {
    const consumePendingAppointment = () => {
      if (typeof window === "undefined") {
        return false;
      }

      const raw = window.sessionStorage.getItem("vetera:pending-appointment");
      if (!raw) {
        return false;
      }

      try {
        const pending = JSON.parse(raw) as { patientId?: string };
        if (!pending.patientId) {
          window.sessionStorage.removeItem("vetera:pending-appointment");
          return false;
        }

        const opened = handleOpenCreateForPatient(pending.patientId);
        if (opened) {
          window.sessionStorage.removeItem("vetera:pending-appointment");
        }
        return opened;
      } catch {
        window.sessionStorage.removeItem("vetera:pending-appointment");
        return false;
      }
    };

    const handleNewAppointment = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (detail?.patientId && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "vetera:pending-appointment",
          JSON.stringify(detail)
        );
      }

      window.setTimeout(() => {
        if (!consumePendingAppointment()) {
          handleOpenCreate();
        }
      }, 0);
    };

    consumePendingAppointment();
    window.addEventListener("vetera:new-appointment", handleNewAppointment);
    return () => {
      window.removeEventListener(
        "vetera:new-appointment",
        handleNewAppointment
      );
    };
  }, [patientsById, ownersById, selectedDate]);

  const selectAppointment = (appointment: Appointment, syncDate = false) => {
    setSelectedAppointmentId(appointment.id);

    if (syncDate) {
      const start = normalizeDate(appointment.startTime);
      if (start) {
        setSelectedDate(start);
      }
    }
  };

  const deleteAppointment = async (appointment: Appointment) => {
    const confirmed = window.confirm(
      "Supprimer ce rendez-vous du planning ? Cette action est immédiate."
    );

    if (!confirmed) {
      return;
    }

    try {
      const removed = await remove(appointment.id);
      if (!removed) {
        toast.error("Le rendez-vous n'a pas pu être supprimé.");
        return;
      }
      await audit.log({
        action: "delete",
        entity: "appointment",
        entityId: appointment.id,
        payload: {
          patientId: appointment.patientId,
          startTime: appointment.startTime,
        },
      });
      toast.success("Le rendez-vous a été supprimé du planning.");

      if (selectedAppointmentId === appointment.id) {
        setSelectedAppointmentId(null);
      }

      if (editingAppointmentId === appointment.id) {
        closeDialog();
      }
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer ce rendez-vous.");
    }
  };

  const handleSave = async () => {
    setFormError("");

    if (!selectedPatientId) {
      const message = "Sélectionnez un patient pour créer le rendez-vous.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const effectiveVetId =
      selectedVetId || selectedAppointment?.vetId || vets[0]?.id || "";

    if (!effectiveVetId) {
      const message =
        "Aucun vétérinaire actif n’est disponible pour ce créneau.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const [year, month, day] = formDate.split("-").map(Number);
    const [hours, minutes] = formTime.split(":").map(Number);

    if (
      !(year && month && day) ||
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      const message = "La date ou l’heure du rendez-vous est invalide.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const end = new Date(start.getTime() + duration * 60_000);
    const patient = patientsById.get(selectedPatientId);

    const hasVetConflict = appointments.some((appointment) => {
      if (appointment.id === editingAppointmentId) {
        return false;
      }
      if (appointment.vetId !== effectiveVetId) {
        return false;
      }
      if (
        appointment.status === "cancelled" ||
        appointment.status === "no_show"
      ) {
        return false;
      }

      const appointmentStart = normalizeDate(appointment.startTime);
      const appointmentEnd = normalizeDate(appointment.endTime);
      if (!(appointmentStart && appointmentEnd)) {
        return false;
      }

      return start < appointmentEnd && end > appointmentStart;
    });

    if (hasVetConflict) {
      const message =
        "Ce créneau est déjà occupé pour le vétérinaire sélectionné. Choisissez un autre horaire ou un autre vétérinaire.";
      setFormError(message);
      toast.error(message);
      return;
    }

    const roomConflict = appointments.find((appointment) => {
      if (appointment.id === editingAppointmentId) {
        return;
      }
      if ((appointment.room ?? "consult-1") !== formRoom) {
        return;
      }
      if (
        appointment.status === "cancelled" ||
        appointment.status === "no_show"
      ) {
        return;
      }
      const appointmentStart = normalizeDate(appointment.startTime);
      const appointmentEnd = normalizeDate(appointment.endTime);
      if (!(appointmentStart && appointmentEnd)) {
        return;
      }
      return start < appointmentEnd && end > appointmentStart
        ? appointment
        : undefined;
    });

    if (roomConflict) {
      const roomLabel =
        APPOINTMENT_ROOMS.find((r) => r.value === formRoom)?.i18nKey ??
        "scheduling.room";
      const conflictPatient = patientsById.get(roomConflict.patientId);
      const conflictPatientName = conflictPatient?.name ?? "Patient local";
      const message = t("scheduling.conflict.message", {
        room: t(roomLabel),
        start: new Date(roomConflict.startTime).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        end: new Date(roomConflict.endTime).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        patient: conflictPatientName,
        defaultValue:
          "La salle « {{room}} » est déjà réservée entre {{start}} et {{end}} pour {{patient}}.",
      });
      setFormError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);

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
        room: formRoom,
      });

      if (!saved) {
        throw new Error("Le rendez-vous n’a pas pu être enregistré.");
      }

      await audit.log({
        action: editingAppointmentId ? "update" : "create",
        entity: "appointment",
        entityId: saved.id,
        payload: {
          patientId: saved.patientId,
          startTime: saved.startTime,
          room: saved.room,
          type: saved.type,
        },
      });

      if (recurrenceEnabled && !editingAppointmentId) {
        const recurrence: Omit<
          AppointmentRecurrence,
          "createdAt" | "updatedAt"
        > = {
          id: generateId(),
          parentAppointmentId: saved.id,
          frequency: recurrenceFrequency,
          intervalCount: 1,
          daysOfWeek:
            recurrenceFrequency === "weekly" && recurrenceDaysOfWeek.length > 0
              ? JSON.stringify(recurrenceDaysOfWeek)
              : null,
          endDate: recurrenceEndDate || null,
          maxOccurrences: recurrenceMaxOccurrences,
          generatedCount: 1,
        };
        await recurrencesStore.add(recurrence);
      }

      toast.success(
        editingAppointmentId
          ? "Le rendez-vous a été mis à jour."
          : "Le rendez-vous a été ajouté à l’agenda."
      );

      setSelectedAppointmentId(saved.id);
      setSelectedDate(start);
      setViewMode("list");
      closeDialog();
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Erreur inconnue";
      if (
        message.toLowerCase().includes("database is locked") ||
        message.toLowerCase().includes("code: 5")
      ) {
        const userMessage = "Base occupée, réessayez dans quelques secondes.";
        setFormError(userMessage);
        toast.error(userMessage);
      } else {
        const userMessage = `Impossible d’enregistrer ce rendez-vous: ${message}`;
        setFormError(userMessage);
        toast.error(userMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const tableRowsByTab = useMemo<Record<TableTab, AgendaTableRow[]>>(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    const rows = appointments
      .map<AgendaTableRow>((appointment) => {
        const patient = patientsById.get(appointment.patientId);
        const owner = ownersById.get(
          appointment.ownerId || patient?.ownerId || ""
        );
        const vet = usersById.get(appointment.vetId);
        const presentation = getAppointmentPresentation(appointment, patient);
        const start = normalizeDate(appointment.startTime);

        let tab: TableTab = "planning";
        if (presentation.attention) {
          tab = "attention";
        } else if (appointment.status === "completed") {
          tab = "termine";
        } else if (start && isSameDay(start, selectedDate)) {
          tab = "selection";
        }

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
        };
      })
      .filter((row) => {
        if (vetFilter !== "all" && row.appointment.vetId !== vetFilter) {
          return false;
        }
        if (statusFilter !== "all" && row.appointment.status !== statusFilter) {
          return false;
        }
        if (query && !row.searchIndex.includes(query)) {
          return false;
        }
        return true;
      });

    return TABLE_TABS.reduce<Record<TableTab, AgendaTableRow[]>>(
      (accumulator, tab) => {
        accumulator[tab.value] = rows
          .filter((row) => row.tab === tab.value)
          .sort((left, right) => {
            const leftTime = new Date(left.appointment.startTime).getTime();
            const rightTime = new Date(right.appointment.startTime).getTime();
            return tab.value === "termine"
              ? rightTime - leftTime
              : leftTime - rightTime;
          });
        return accumulator;
      },
      {
        planning: [],
        selection: [],
        termine: [],
        attention: [],
      }
    );
  }, [
    appointments,
    deferredSearchTerm,
    ownersById,
    patientsById,
    selectedDate,
    statusFilter,
    usersById,
    vetFilter,
  ]);

  const visibleRowsCount = tableRowsByTab[tableTab].length;

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 pt-16 pb-8 md:pt-28 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <MotivationalHeader section="agenda" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            className="h-10 rounded-full px-5"
            onClick={() => setSelectedDate(new Date())}
            variant="outline"
          >
            {t("agenda.today")}
          </Button>
          <Button
            className="h-10 rounded-full px-5"
            onClick={() => handleOpenCreate()}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={Add01Icon}
              strokeWidth={1.5}
            />
            {t("agenda.newAppointment")}
          </Button>
        </div>
      </div>

      <SectionCards items={sectionCards} />

      <div className="grid gap-4">
        <Card className="card-vibrant card-hover-lift min-h-[780px] rounded-[24px] border border-border bg-card shadow-none">
          <CardHeader className="border-border border-b px-6 py-5">
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              {t("agenda.planning")}
            </CardDescription>
            <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
              {t("agenda.consultationsAgenda")}
            </CardTitle>
            <CardAction>
              <Badge className="rounded-full px-3 py-1" variant="outline">
                {t("agenda.slot", { count: dailyAppointments.length })}
              </Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col px-0 pb-0">
            <Tabs
              className="flex min-h-0 flex-1 gap-4"
              onValueChange={(value) => setViewMode(value as ViewMode)}
              value={viewMode}
            >
              <div className="flex flex-col gap-3 border-border border-b px-6 pt-5 pb-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          className="h-10 gap-2 rounded-xl"
                          variant="outline"
                        >
                          <HugeiconsIcon
                            icon={Calendar01Icon}
                            strokeWidth={1.5}
                          />
                          {periodLabel}
                        </Button>
                      }
                    />
                    <PopoverContent
                      align="start"
                      className="w-auto rounded-[1.75rem] p-2"
                      sideOffset={10}
                    >
                      <Calendar
                        className="rounded-[1.4rem]"
                        locale={getDateFnsLocale()}
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                          }
                        }}
                        selected={selectedDate}
                      />
                    </PopoverContent>
                  </Popover>

                  {isSameDay(selectedDate, new Date()) ? (
                    <Badge
                      className="rounded-full border-transparent bg-primary/10 text-primary"
                      variant="outline"
                    >
                      {t("agenda.today")}
                    </Badge>
                  ) : null}
                </div>

                <TabsList>
                  <TabsTrigger value="list">
                    {t("agenda.list", { defaultValue: "Vue liste" })}
                  </TabsTrigger>
                  <TabsTrigger value="day">{t("agenda.day")}</TabsTrigger>
                  <TabsTrigger value="week">{t("agenda.week")}</TabsTrigger>
                  <TabsTrigger value="month">{t("agenda.month")}</TabsTrigger>
                </TabsList>
              </div>

              {loadingAppointments ? (
                <div className="flex items-center justify-center p-6">
                  <Spinner />
                </div>
              ) : (
                <>
                  <TabsContent className="min-h-0 flex-1" value="list">
                    <AgendaListView
                      formatTime={formatTime}
                      getAppointmentsForDate={getAppointmentsForDate}
                      getOwnerName={(ownerId) =>
                        ownerId ? ownersById.get(ownerId)?.lastName || "" : ""
                      }
                      getPatient={(id) => patientsById.get(id)}
                      getPatientName={getPatientName}
                      isSameDay={isSameDay}
                      monthDays={monthDays}
                      onDateClick={(date) => setSelectedDate(date)}
                      onSelectAppointment={selectAppointment}
                      selectedAppointmentId={selectedAppointmentId}
                      selectedDate={selectedDate}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="day">
                    <AgendaDayView
                      appointmentsByVet={appointmentsByVet}
                      currentTimeLabel={formatTime(currentTime)}
                      currentTimePosition={currentTimePosition}
                      getPatientName={getPatientName}
                      onSelectAppointment={selectAppointment}
                      selectedAppointmentId={selectedAppointmentId}
                      selectedDate={selectedDate}
                      vets={vets}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="week">
                    <AgendaWeekView
                      getAppointmentsForDate={getAppointmentsForDate}
                      getPatientName={getPatientName}
                      onSelectAppointment={selectAppointment}
                      selectedAppointmentId={selectedAppointmentId}
                      weekDays={weekDays}
                    />
                  </TabsContent>

                  <TabsContent className="min-h-0 flex-1" value="month">
                    <AgendaMonthView
                      getAppointmentsForDate={getAppointmentsForDate}
                      getPatientName={getPatientName}
                      monthDays={monthDays}
                      onPickDate={(date) => {
                        setSelectedDate(date);
                        setViewMode("day");
                      }}
                      selectedDate={selectedDate}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
          {selectedAppointment ? (
            <Card className="min-h-[420px]">
              <CardHeader className="border-border border-b px-6 py-5">
                <CardDescription>Détail de la sélection</CardDescription>
                <CardTitle className="text-xl tracking-[-0.04em]">
                  {patientsById.get(selectedAppointment.patientId)?.name ||
                    selectedAppointment.title}
                </CardTitle>
                <CardAction>
                  <AppointmentStatusBadge
                    appointment={selectedAppointment}
                    patient={selectedPatient}
                  />
                </CardAction>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
                <div
                  className={cn(
                    "rounded-2xl border p-4",
                    APPOINTMENT_TYPE_META[selectedAppointment.type]
                      .surfaceClassName
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Acte clinique
                      </p>
                      <p className="mt-1 font-medium text-foreground text-lg">
                        {selectedAppointment.type}
                      </p>
                    </div>
                    <AppointmentTypeBadge type={selectedAppointment.type} />
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Créneau</span>
                    <span className="text-right font-medium text-foreground">
                      {formatTimeCompact(selectedAppointment.startTime)} -{" "}
                      {formatTimeCompact(selectedAppointment.endTime)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Date</span>
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
                    <span className="text-muted-foreground">Vétérinaire</span>
                    <span className="text-right font-medium text-foreground">
                      {selectedVet?.displayName || "Vétérinaire local"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Propriétaire</span>
                    <span className="text-right font-medium text-foreground">
                      {formatOwnerName(selectedOwner)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-200 ease-out hover:border-border/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="size-4 text-muted-foreground"
                      icon={StethoscopeIcon}
                      strokeWidth={1.5}
                    />
                    <p className="font-medium text-foreground">Patient</p>
                  </div>
                  <div className="grid gap-1">
                    <p className="font-medium text-foreground">
                      {selectedPatient?.name || "Patient local"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {getPatientProfile(selectedPatient)} ·{" "}
                      {getAgeLabel(selectedPatient?.dateOfBirth)}
                    </p>
                  </div>
                  {selectedAppointment.reason ? (
                    <p className="text-muted-foreground text-sm leading-6">
                      {selectedAppointment.reason}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aucun motif détaillé n&apos;a encore été saisi.
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="gap-2 border-t px-6 py-4">
                <Button
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => handleOpenEdit(selectedAppointment)}
                  variant="outline"
                >
                  Modifier
                </Button>
                <Button
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => handleOpenCreate(selectedDate)}
                >
                  Nouveau RDV
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-border/80 border-dashed bg-muted/5 p-8 text-center shadow-none transition-all duration-200">
              <div className="mb-4 flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/10 dark:bg-white/5 dark:ring-white/10">
                <HugeiconsIcon
                  className="size-6 text-muted-foreground opacity-80"
                  icon={Calendar01Icon}
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-medium text-foreground text-lg tracking-tight">
                Aucun rendez-vous sélectionné
              </h3>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm leading-6">
                Cliquez sur un créneau dans le planning ou dans le tableau
                ci-dessous pour afficher les détails contextuels.
              </p>
              <Button
                className="mt-6 h-10 gap-2 rounded-full px-5"
                onClick={() => handleOpenCreate()}
              >
                <HugeiconsIcon
                  className="size-4"
                  data-icon="inline-start"
                  icon={Add01Icon}
                  strokeWidth={1.5}
                />
                Nouveau rendez-vous
              </Button>
            </div>
          )}

          <Card className="flex h-full flex-col justify-between rounded-[24px] border border-border bg-card shadow-none">
            <div>
              <CardHeader className="border-border border-b px-6 py-5">
                <CardDescription>Cadence de la journée</CardDescription>
                <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
                  {formatDateLabel(selectedDate)}
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 py-5">
                <div className="grid gap-2">
                  {typeSummary.length > 0 ? (
                    typeSummary.map((entry) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-4 py-3 text-sm"
                        key={entry.type}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              APPOINTMENT_TYPE_META[entry.type].dotClassName
                            )}
                          />
                          <span className="font-medium text-foreground">
                            {entry.type}
                          </span>
                        </div>
                        <Badge className="rounded-lg" variant="outline">
                          {entry.count}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                      <HugeiconsIcon
                        className="mb-2 size-8 opacity-30"
                        icon={Calendar01Icon}
                        strokeWidth={1.5}
                      />
                      <p className="text-sm">
                        Aucun rendez-vous programmé aujourd'hui
                      </p>
                    </div>
                  )}
                </div>

                {dayLoadSummary.length > 0 ? (
                  <div className="grid gap-2 border-border/40 border-t pt-4">
                    {dayLoadSummary.map((entry) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl bg-muted/20 px-4 py-2.5 text-sm"
                        key={entry.vet.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {entry.vet.displayName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {entry.vet.specialty || "Consultation générale"}
                          </p>
                        </div>
                        <Badge className="rounded-lg" variant="outline">
                          {entry.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </div>

            <CardContent className="mt-auto px-6 pt-0 pb-5">
              <div className="grid grid-cols-3 gap-3 border-border/40 border-t pt-5">
                <div className="text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Charge
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground tracking-tight">
                    {formatDuration(totalPlannedMinutes)}
                  </p>
                </div>
                <div className="border-border/40 border-x px-1 text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Urgences
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground">
                    {urgentOpenCount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Mobilisés
                  </p>
                  <p className="mt-1 font-semibold text-base text-foreground">
                    {engagedVetsCount}
                  </p>
                </div>
              </div>
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
            className="gap-4"
            onValueChange={(value) => setTableTab(value as TableTab)}
            value={tableTab}
          >
            <div className="flex flex-col gap-3 border-b px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
              <TabsList className="group-data-horizontal/tabs:!h-9 rounded-xl">
                {TABLE_TABS.map((tab) => (
                  <TabsTrigger
                    className="rounded-lg"
                    key={tab.value}
                    value={tab.value}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px] xl:ml-auto xl:max-w-4xl xl:flex-1">
                <div className="relative">
                  <HugeiconsIcon
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    icon={SearchIcon}
                    strokeWidth={1.5}
                  />
                  <Input
                    className="h-9 rounded-xl border-border/60 bg-muted/40 pl-10 text-sm focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Rechercher un patient, un motif..."
                    value={searchTerm}
                  />
                </div>

                <NativeSelect
                  className="w-full [&>select]:border-border/60 [&>select]:bg-muted/40 [&>select]:focus-visible:border-emerald-500 [&>select]:focus-visible:ring-emerald-500/20"
                  onChange={(event) => setVetFilter(event.target.value)}
                  value={vetFilter}
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
                  className="w-full [&>select]:border-border/60 [&>select]:bg-muted/40 [&>select]:focus-visible:border-emerald-500 [&>select]:focus-visible:ring-emerald-500/20"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <NativeSelectOption value="all">
                    Tous les statuts
                  </NativeSelectOption>
                  {Object.entries(APPOINTMENT_STATUS_META).map(
                    ([status, meta]) => (
                      <NativeSelectOption key={status} value={status}>
                        {meta.label}
                      </NativeSelectOption>
                    )
                  )}
                </NativeSelect>
              </div>
            </div>

            {TABLE_TABS.map((tab) => {
              const rows = tableRowsByTab[tab.value];

              return (
                <TabsContent
                  className="px-0 pb-6"
                  key={tab.value}
                  value={tab.value}
                >
                  {rows.length === 0 ? (
                    <Empty className="mx-6 border border-border/80 border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          {tab.value === "attention" ? (
                            <HugeiconsIcon
                              icon={Alert02Icon}
                              strokeWidth={1.5}
                            />
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
                          onClick={() => {
                            setSearchTerm("");
                            setVetFilter("all");
                            setStatusFilter("all");
                          }}
                          variant="outline"
                        >
                          Réinitialiser
                        </Button>
                        <Button onClick={() => handleOpenCreate()}>
                          <HugeiconsIcon
                            data-icon="inline-start"
                            icon={Add01Icon}
                            strokeWidth={1.5}
                          />
                          Nouveau rendez-vous
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[22%] min-w-[130px] py-3.5 pl-6 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Dossier
                          </TableHead>
                          <TableHead className="w-[18%] min-w-[110px] py-3.5 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Propriétaire
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[80px] py-3.5 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Acte
                          </TableHead>
                          <TableHead className="w-[20%] min-w-[130px] py-3.5 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Créneau
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[80px] py-3.5 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Statut
                          </TableHead>
                          <TableHead className="w-[12%] min-w-[100px] py-3.5 font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Vétérinaire
                          </TableHead>
                          <TableHead className="w-[4%] min-w-[40px] py-3.5 pr-6 text-right font-bold text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                            Action
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const timePart = row.appointmentAt.includes(" · ")
                            ? row.appointmentAt.split(" · ")[1]
                            : row.appointmentAt;
                          const datePart = row.appointmentAt.includes(" · ")
                            ? row.appointmentAt.split(" · ")[0]
                            : "";
                          return (
                            <TableRow
                              className="cursor-pointer transition-colors hover:bg-muted/10"
                              key={row.appointment.id}
                              onClick={() =>
                                selectAppointment(row.appointment, true)
                              }
                            >
                              <TableCell className="w-[22%] min-w-[130px] pl-6">
                                <div className="flex items-center gap-3.5">
                                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 font-semibold text-emerald-600 text-sm ring-1 ring-emerald-500/20 dark:text-emerald-400">
                                    {(row.patientName || "?")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground text-sm tracking-tight">
                                      {row.patientName}
                                    </p>
                                    <p className="mt-0.5 truncate font-medium text-muted-foreground text-xs">
                                      {getPatientProfile(row.patient)}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="w-[18%] min-w-[110px]">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground text-sm tracking-tight">
                                    {row.ownerName}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1 truncate font-medium text-muted-foreground text-xs">
                                    <span className="text-[10px] opacity-60">
                                      📞
                                    </span>{" "}
                                    {row.owner?.phone || "Non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[80px]">
                                <div className="flex items-center">
                                  <AppointmentTypeBadge
                                    className="rounded-lg border px-2.5 py-0.5 font-semibold text-xs tracking-tight"
                                    type={row.appointment.type}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="w-[20%] min-w-[130px]">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-semibold text-foreground text-sm tracking-tight">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {timePart}
                                    </span>
                                    {datePart && (
                                      <>
                                        <span className="text-muted-foreground/40 text-xs">
                                          |
                                        </span>
                                        <span className="font-normal text-muted-foreground/80 text-xs">
                                          {datePart}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                  <p className="mt-0.5 truncate font-medium font-serif text-muted-foreground/80 text-xs italic">
                                    {row.appointment.reason ||
                                      "Motif non renseigné"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[80px]">
                                <div className="flex items-center">
                                  <AppointmentStatusBadge
                                    appointment={row.appointment}
                                    patient={row.patient}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="w-[12%] min-w-[100px]">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 truncate font-semibold text-foreground text-sm tracking-tight">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[10px] text-muted-foreground">
                                      {row.vetName
                                        .split(" ")
                                        .pop()
                                        ?.slice(0, 1)
                                        .toUpperCase() || "V"}
                                    </span>
                                    {row.vetName}
                                  </p>
                                  <p className="mt-0.5 truncate pl-[26px] font-medium text-muted-foreground text-xs">
                                    {row.vet?.specialty || "Pratique générale"}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell
                                className="w-[4%] min-w-[40px] pr-6 text-right"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        className="ml-auto"
                                        size="icon-sm"
                                        variant="ghost"
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
                                      onClick={() =>
                                        deleteAppointment(row.appointment)
                                      }
                                      variant="destructive"
                                    >
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm(selectedDate);
          }
        }}
        open={isDialogOpen}
      >
        <DialogContent className="modal-medical-shell max-h-[calc(100dvh-2rem)] max-w-[min(940px,calc(100%-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[min(940px,calc(100%-2rem))]">
          <DialogHeader className="modal-medical-header border-b px-6 py-5">
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

          <div className="modal-medical-body min-h-0 overflow-y-auto p-6">
            <FieldGroup className="grid gap-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <Field className="lg:col-span-2">
                  <FieldLabel>
                    Recherche rapide patient / propriétaire
                  </FieldLabel>
                  <Input
                    onChange={(event) =>
                      setPersonSearchTerm(event.target.value)
                    }
                    placeholder="Tapez Lisa, Hadji, un téléphone, une espèce..."
                    value={personSearchTerm}
                  />
                  <FieldDescription>
                    Sélectionnez directement le bon dossier. Le propriétaire et
                    le patient seront remplis ensemble.
                  </FieldDescription>
                  {personSearchTerm.trim() ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {unifiedAppointmentMatches.length > 0 ? (
                        unifiedAppointmentMatches.map(({ owner, patient }) => (
                          <button
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                              selectedPatientId === patient.id
                                ? "border-primary bg-primary/10"
                                : "border-border/80 bg-background/70"
                            )}
                            key={patient.id}
                            onClick={() => handlePatientSelect(patient.id)}
                            type="button"
                          >
                            <span className="block font-medium text-foreground">
                              {patient.name}
                            </span>
                            <span className="mt-1 block text-muted-foreground text-sm">
                              {patient.species}
                              {patient.breed ? ` · ${patient.breed}` : ""} ·{" "}
                              {formatOwnerName(owner)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed p-4 text-muted-foreground text-sm sm:col-span-2">
                          Aucun dossier trouvé. Créez d’abord le patient dans le
                          module Patients, puis revenez ici.
                        </div>
                      )}
                    </div>
                  ) : null}
                </Field>

                <Field className="lg:col-span-2">
                  <FieldLabel>Client existant</FieldLabel>
                  <Input
                    onChange={(event) => {
                      setOwnerSearchTerm(event.target.value);
                      if (!event.target.value.trim()) {
                        setSelectedOwnerId("");
                      }
                    }}
                    placeholder="Rechercher un propriétaire par nom, téléphone ou email..."
                    value={ownerSearchTerm}
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
                          onClick={() => handleOwnerSelect(owner.id)}
                          size="sm"
                          type="button"
                          variant={
                            normalizeEntityId(selectedOwnerId) ===
                            normalizeEntityId(owner.id)
                              ? "default"
                              : "outline"
                          }
                        >
                          {formatOwnerName(owner)}
                        </Button>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Aucun client existant ne correspond à cette recherche.
                      </div>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Patient</FieldLabel>
                  <Input
                    onChange={(event) =>
                      setPatientSearchTerm(event.target.value)
                    }
                    placeholder="Rechercher un patient par nom, espèce ou propriétaire..."
                    value={patientSearchTerm}
                  />
                  <NativeSelect
                    className="w-full"
                    onChange={(event) =>
                      handlePatientSelect(event.target.value)
                    }
                    value={selectedPatientId}
                  >
                    <NativeSelectOption disabled value="">
                      {selectedOwnerId
                        ? "Sélectionner un dossier du client"
                        : "Sélectionner un dossier"}
                    </NativeSelectOption>
                    {filteredPatientsForForm.map((patient) => {
                      const owner = ownersById.get(patient.ownerId);
                      return (
                        <NativeSelectOption key={patient.id} value={patient.id}>
                          {patient.name} · {patient.species} ·{" "}
                          {formatOwnerName(owner)}
                        </NativeSelectOption>
                      );
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
                    className="w-full"
                    onChange={(event) => setSelectedVetId(event.target.value)}
                    value={selectedVetId}
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

                <Field>
                  <FieldLabel>
                    {t("scheduling.room", { defaultValue: "Salle" })}
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    onChange={(event) => setFormRoom(event.target.value)}
                    value={formRoom}
                  >
                    {APPOINTMENT_ROOMS.map((room) => (
                      <NativeSelectOption key={room.value} value={room.value}>
                        {t(room.i18nKey)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    {t("scheduling.roomDescription", {
                      defaultValue:
                        "Salles physiques de la clinique. Un conflit de salle empêchera l'enregistrement.",
                    })}
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel>Type d&apos;acte</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {APPOINTMENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      size="sm"
                      type="button"
                      variant={selectedType === type ? "default" : "outline"}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </Field>

              <div className="space-y-4 rounded-lg border border-border/50 bg-muted/20 p-4">
                <Field className="items-center gap-3" orientation="horizontal">
                  <Checkbox
                    checked={recurrenceEnabled}
                    disabled={!!editingAppointmentId}
                    id="recurrence-enabled"
                    onCheckedChange={(value) =>
                      setRecurrenceEnabled(value === true)
                    }
                  />
                  <div className="space-y-0.5 leading-none">
                    <FieldLabel htmlFor="recurrence-enabled">
                      {t("scheduling.recurrence.enable", {
                        defaultValue: "Rendez-vous récurrent",
                      })}
                    </FieldLabel>
                    <FieldDescription>
                      {t("scheduling.recurrence.enableDescription", {
                        defaultValue:
                          "Crée automatiquement la suite de rendez-vous (hebdomadaire, bimensuel, mensuel ou annuel).",
                      })}
                    </FieldDescription>
                  </div>
                </Field>

                {recurrenceEnabled ? (
                  <>
                    <Field>
                      <FieldLabel>
                        {t("scheduling.recurrence.frequency", {
                          defaultValue: "Fréquence",
                        })}
                      </FieldLabel>
                      <RadioGroup
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                        onValueChange={(value) =>
                          setRecurrenceFrequency(value as RecurrenceFrequency)
                        }
                        value={recurrenceFrequency}
                      >
                        {RECURRENCE_FREQUENCIES.map((freq) => (
                          <label
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-muted/40"
                            key={freq.value}
                          >
                            <RadioGroupItem
                              id={`freq-${freq.value}`}
                              value={freq.value}
                            />
                            <span>
                              {t(
                                `scheduling.recurrence.frequencies.${freq.value}`
                              )}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </Field>

                    {recurrenceFrequency === "weekly" ? (
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.daysOfWeek", {
                            defaultValue: "Jours de la semaine",
                          })}
                        </FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {DAY_OF_WEEK_LABELS.map((day) => {
                            const checked = recurrenceDaysOfWeek.includes(
                              day.value
                            );
                            return (
                              <Button
                                key={day.value}
                                onClick={() => {
                                  setRecurrenceDaysOfWeek((current) =>
                                    checked
                                      ? current.filter((d) => d !== day.value)
                                      : [...current, day.value].sort()
                                  );
                                }}
                                size="sm"
                                type="button"
                                variant={checked ? "default" : "outline"}
                              >
                                {t(day.i18nKey)}
                              </Button>
                            );
                          })}
                        </div>
                      </Field>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.endDate", {
                            defaultValue: "Date de fin (optionnelle)",
                          })}
                        </FieldLabel>
                        <Input
                          onChange={(event) =>
                            setRecurrenceEndDate(event.target.value)
                          }
                          type="date"
                          value={recurrenceEndDate}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>
                          {t("scheduling.recurrence.maxOccurrences", {
                            defaultValue: "Nombre max d'occurrences",
                          })}
                        </FieldLabel>
                        <Input
                          min={1}
                          onChange={(event) => {
                            const raw = event.target.value.trim();
                            setRecurrenceMaxOccurrences(
                              raw === "" ? null : Math.max(1, Number(raw))
                            );
                          }}
                          type="number"
                          value={recurrenceMaxOccurrences ?? ""}
                        />
                        <FieldDescription>
                          {t(
                            "scheduling.recurrence.maxOccurrencesDescription",
                            {
                              defaultValue:
                                "Laissez vide pour une récurrence sans limite (jusqu'à la date de fin).",
                            }
                          )}
                        </FieldDescription>
                      </Field>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="grid gap-5 lg:grid-cols-[1fr_1fr_200px]">
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          className="w-full justify-between"
                          variant="outline"
                        />
                      }
                    >
                      <span>{formDate.split("-").reverse().join("/")}</span>
                      <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto rounded-[1.75rem] p-2"
                      sideOffset={10}
                    >
                      <Calendar
                        className="rounded-[1.4rem]"
                        locale={fr}
                        mode="single"
                        onSelect={(date) => {
                          if (date) {
                            setFormDate(formatDateInput(date));
                          }
                        }}
                        selected={parseDateInput(formDate) ?? new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldDescription>
                    Format français : JJ/MM/AAAA.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Heure</FieldLabel>
                  <AppointmentTimePicker
                    durationMinutes={duration}
                    onChange={setFormTime}
                    value={formTime}
                  />
                </Field>

                <Field>
                  <FieldLabel>Durée</FieldLabel>
                  <NativeSelect
                    className="w-full"
                    onChange={(event) =>
                      setDuration(Number(event.target.value))
                    }
                    value={String(duration)}
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
                <FieldLabel>Motif clinique</FieldLabel>
                <Textarea
                  className="min-h-28"
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Décrivez la demande, les signes cliniques ou le contexte du rendez-vous."
                  value={reason}
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
                    <p className="text-muted-foreground text-sm">
                      {selectedPatientId
                        ? getPatientProfile(patientsById.get(selectedPatientId))
                        : "Le résumé patient et propriétaire s’actualise ici pendant la saisie."}
                    </p>
                  </div>
                </div>
              </div>
            </FieldGroup>
          </div>

          <div className="modal-medical-footer flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editingAppointmentId ? (
                <Button
                  onClick={() => {
                    const current = appointments.find(
                      (appointment) => appointment.id === editingAppointmentId
                    );
                    if (current) {
                      void deleteAppointment(current);
                    }
                  }}
                  variant="destructive"
                >
                  Supprimer
                </Button>
              ) : null}
            </div>

            <div className="modal-medical-actions">
              <Button
                className="min-w-[120px]"
                onClick={closeDialog}
                variant="outline"
              >
                Annuler
              </Button>
              {formError ? (
                <div className="max-w-[360px] rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                  {formError}
                </div>
              ) : null}
              <Button
                className="min-w-[170px]"
                disabled={isSubmitting || !selectedPatientId}
                onClick={handleSave}
              >
                {isSubmitting ? null : (
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                  />
                )}
                {isSubmitting ? <Spinner className="size-4" /> : null}
                {editingAppointmentId ? "Enregistrer" : "Ajouter au planning"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(Agenda);
