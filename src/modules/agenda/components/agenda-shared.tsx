import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  StethoscopeIcon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { Input } from "@/components/ui/input";

import {
  APPOINTMENT_STATUS_META,
  getAppointmentTypeMeta,
} from "@/config/status-meta";

import i18n from "@/i18n/config";
import { cn } from "@/lib/utils";

import type {
  Appointment,
  User as AppUser,
  Owner,
  Patient,
  RecurrenceFrequency,
} from "@/types/db";

export const APPOINTMENT_TYPES: Appointment["type"][] = [
  "Consultation",
  "Vaccin",
  "Chirurgie",
  "Urgence",
  "Contrôle",
];

export const QUICK_TIMES = [
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

export const TIME_PERIODS: {
  id: "morning" | "afternoon" | "evening";
  label: string;
  from: string;
  to: string;
}[] = [
  { id: "morning", label: "Matin", from: "06:00", to: "12:00" },
  { id: "afternoon", label: "Après-midi", from: "12:00", to: "18:00" },
  { id: "evening", label: "Soir", from: "18:00", to: "22:00" },
];

export const STEP_MINUTES = 5;

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, total));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutesToTime(value: string, delta: number): string {
  return minutesToTime(timeToMinutes(value) + delta);
}

export interface TimePickerProps {
  durationMinutes: number;
  onChange: (value: string) => void;
  value: string;
}

export function AppointmentTimePicker({
  durationMinutes,
  value,
  onChange,
}: TimePickerProps) {
  const { t } = useTranslation();
  const valueMinutes = timeToMinutes(value);
  const endMinutes = valueMinutes + durationMinutes;
  const endLabel = minutesToTime(endMinutes);

  return (
    <div className="appointment-time-picker space-y-3">
      <div className="appointment-time-adjustments flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
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
              strokeWidth={1.5}
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
              strokeWidth={1.5}
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

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const APPOINTMENT_ROOMS = [
  { value: "consult-1", i18nKey: "scheduling.rooms.consult1" },
  { value: "consult-2", i18nKey: "scheduling.rooms.consult2" },
  { value: "surgery", i18nKey: "scheduling.rooms.surgery" },
  { value: "hospitalization", i18nKey: "scheduling.rooms.hospitalization" },
  { value: "imaging", i18nKey: "scheduling.rooms.imaging" },
] as const;

export const RECURRENCE_FREQUENCIES: {
  value: RecurrenceFrequency;
  i18nKey: string;
}[] = [
  { value: "weekly", i18nKey: "scheduling.recurrence.frequencies.weekly" },
  { value: "biweekly", i18nKey: "scheduling.recurrence.frequencies.biweekly" },
  { value: "monthly", i18nKey: "scheduling.recurrence.frequencies.monthly" },
  { value: "yearly", i18nKey: "scheduling.recurrence.frequencies.yearly" },
];

export const DAY_OF_WEEK_LABELS: { value: number; i18nKey: string }[] = [
  { value: 1, i18nKey: "scheduling.recurrence.days.mon" },
  { value: 2, i18nKey: "scheduling.recurrence.days.tue" },
  { value: 3, i18nKey: "scheduling.recurrence.days.wed" },
  { value: 4, i18nKey: "scheduling.recurrence.days.thu" },
  { value: 5, i18nKey: "scheduling.recurrence.days.fri" },
  { value: 6, i18nKey: "scheduling.recurrence.days.sat" },
  { value: 0, i18nKey: "scheduling.recurrence.days.sun" },
];

export const CALENDAR_START_HOUR = 7;

export const CALENDAR_END_HOUR = 23;

export const HOUR_BLOCKS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, index) => CALENDAR_START_HOUR + index
);

export const CALENDAR_START_MINUTES = CALENDAR_START_HOUR * 60;

export const CALENDAR_END_MINUTES = (CALENDAR_END_HOUR + 1) * 60;

export const DAY_HOUR_HEIGHT = 76;

export const WEEK_HOUR_HEIGHT = 64;

export const APPOINTMENT_VERTICAL_GAP = 2;

export const TABLE_TABS = [
  { label: "Planning", value: "planning" },
  { label: "Journée", value: "selection" },
  { label: "Terminés", value: "termine" },
  { label: "Attention", value: "attention" },
] as const;

export type ViewMode = "list" | "day" | "week" | "month";

export type TableTab = (typeof TABLE_TABS)[number]["value"];

export type AgendaTableRow = {
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

export function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value?: string | null) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return null;
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

export function getCurrentLocale() {
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

export function getDateFnsLocale() {
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

export function formatTime(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--:--";
  }
  return date.toLocaleTimeString(getCurrentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeCompact(value?: string | Date | null) {
  const date = normalizeDate(value);
  if (!date) {
    return "--h--";
  }
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}h${minutes}`;
}

export function formatDateLabel(
  value: Date,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  }
) {
  return value.toLocaleDateString(getCurrentLocale(), options);
}

export function formatDateTimeLabel(value?: string | Date | null) {
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

export function formatDuration(minutes: number) {
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

export function getTimePosition(time: Date, pixelsPerHour: number) {
  const minutesFromStart =
    (time.getHours() - CALENDAR_START_HOUR) * 60 + time.getMinutes();
  return (minutesFromStart / 60) * pixelsPerHour;
}

export function getMinutesFromDayStart(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export function getAppointmentFrame(
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

  const top =
    ((clippedStart - CALENDAR_START_MINUTES) / 60) * pixelsPerHour +
    APPOINTMENT_VERTICAL_GAP / 2;
  const rawHeight = ((clippedEnd - clippedStart) / 60) * pixelsPerHour;
  const height = Math.max(minHeight, rawHeight - APPOINTMENT_VERTICAL_GAP);

  return {
    top,
    height,
    durationMinutes: clippedEnd - clippedStart,
  };
}

export function getWeekDays(date: Date) {
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

export function getMonthDays(date: Date) {
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

export function formatOwnerName(owner?: Owner) {
  if (!owner) {
    return "Propriétaire non lié";
  }
  return (
    `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
    "Propriétaire non lié"
  );
}

export function getPatientProfile(patient?: Patient) {
  if (!patient) {
    return "Patient local";
  }
  return patient.breed
    ? `${patient.species} · ${patient.breed}`
    : patient.species;
}

export function normalizeEntityId(value?: string | null) {
  return String(value ?? "").trim();
}

export function getAgeLabel(dateOfBirth?: string) {
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

export function getAppointmentPresentation(
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

export function AppointmentTypeBadge({
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
        getAppointmentTypeMeta(type).badgeClassName,
        className
      )}
      variant="outline"
    >
      {type}
    </Badge>
  );
}

export function AppointmentStatusBadge({
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

export interface AppointmentLayout {
  column: number;
  columnSpan: number;
  totalColumns: number;
}

export function appointmentsOverlap(left: Appointment, right: Appointment) {
  const leftStart = new Date(left.startTime).getTime();
  const leftEnd = new Date(left.endTime).getTime();
  const rightStart = new Date(right.startTime).getTime();
  const rightEnd = new Date(right.endTime).getTime();

  return leftStart < rightEnd && rightStart < leftEnd;
}

export function findAvailableColumn(
  appointment: Appointment,
  columns: Appointment[][]
) {
  const start = new Date(appointment.startTime).getTime();
  return columns.findIndex((column) => {
    const lastAppointment = column.at(-1);
    return (
      lastAppointment && start >= new Date(lastAppointment.endTime).getTime()
    );
  });
}

export function getAvailableColumnSpan(
  appointment: Appointment,
  startColumn: number,
  columns: Appointment[][]
) {
  let span = 1;
  for (
    let candidateColumn = startColumn + 1;
    candidateColumn < columns.length;
    candidateColumn += 1
  ) {
    const hasConflict = columns[candidateColumn].some((candidate) =>
      appointmentsOverlap(appointment, candidate)
    );
    if (hasConflict) {
      break;
    }
    span += 1;
  }
  return span;
}

export function layoutAppointmentGroup(
  group: Appointment[],
  layout: Map<string, AppointmentLayout>
) {
  const columns: Appointment[][] = [];

  for (const appointment of group) {
    const availableColumn = findAvailableColumn(appointment, columns);
    const column =
      availableColumn >= 0 ? availableColumn : columns.push([]) - 1;
    columns[column].push(appointment);
    layout.set(appointment.id, {
      column,
      columnSpan: 1,
      totalColumns: 0,
    });
  }

  for (const appointment of group) {
    const info = layout.get(appointment.id);
    if (!info) {
      continue;
    }
    info.totalColumns = columns.length;
    info.columnSpan = getAvailableColumnSpan(appointment, info.column, columns);
  }
}

export function calculateOverlapMap(appointments: Appointment[]) {
  const layout = new Map<string, AppointmentLayout>();

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

  for (const appt of sorted) {
    const start = new Date(appt.startTime).getTime();
    const end = new Date(appt.endTime).getTime();

    if (currentGroup.length > 0 && start >= groupEnd) {
      layoutAppointmentGroup(currentGroup, layout);
      currentGroup = [];
      groupEnd = 0;
    }

    currentGroup.push(appt);
    groupEnd = Math.max(groupEnd, end);
  }

  if (currentGroup.length > 0) {
    layoutAppointmentGroup(currentGroup, layout);
  }

  return layout;
}

export function getCalendarBlockPresentation(
  frameHeight: number,
  totalColumns: number,
  variant: "day" | "week",
  hasReason: boolean
) {
  const isTiny = frameHeight < 22;
  const isDense = frameHeight < 42 || totalColumns >= 3 || variant === "week";
  let paddingClassName = "px-2.5 py-1.5";
  if (isDense) {
    paddingClassName = "px-2 py-1";
  }
  if (isTiny) {
    paddingClassName = "px-2 py-0";
  }

  return {
    isDense,
    isTiny,
    paddingClassName,
    showReason:
      variant === "day" && frameHeight >= 64 && totalColumns <= 2 && hasReason,
    showSecondaryLine: frameHeight >= 27,
  };
}

export function CalendarAppointmentContent({
  appointment,
  isDense,
  isTiny,
  patientName,
  showReason,
  showSecondaryLine,
  start,
  timeRange,
  totalColumns,
}: {
  appointment: Appointment;
  isDense: boolean;
  isTiny: boolean;
  patientName: string;
  showReason: boolean;
  showSecondaryLine: boolean;
  start: Date;
  timeRange: string;
  totalColumns: number;
}) {
  if (isTiny) {
    return (
      <div className="flex min-w-0 items-center gap-1.5 pl-1 font-medium text-[10px] leading-[12px]">
        <span className="shrink-0 tabular-nums">{formatTime(start)}</span>
        <span className="truncate">{patientName}</span>
      </div>
    );
  }

  return (
    <div className="min-w-0 pl-1">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <p
          className={cn(
            "truncate font-semibold text-foreground",
            isDense ? "text-[11px] leading-4" : "text-xs leading-4"
          )}
        >
          {patientName}
        </p>
        {appointment.status === "in_progress" ? (
          <span className="size-1.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/15" />
        ) : null}
      </div>

      {showSecondaryLine ? (
        <p
          className={cn(
            "truncate text-muted-foreground tabular-nums",
            isDense ? "text-[9px] leading-3" : "text-[10px] leading-4"
          )}
        >
          {timeRange}
          {totalColumns <= 2 ? ` · ${appointment.type}` : ""}
        </p>
      ) : null}

      {showReason ? (
        <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground leading-3.5">
          {appointment.reason}
        </p>
      ) : null}
    </div>
  );
}

export function CalendarAppointmentBlock({
  appointment,
  frameHeight,
  frameTop,
  getPatientName,
  layout,
  onSelectAppointment,
  selected,
  variant,
}: {
  appointment: Appointment;
  frameHeight: number;
  frameTop: number;
  getPatientName: (patientId: string) => string;
  layout: AppointmentLayout;
  onSelectAppointment: (appointment: Appointment) => void;
  selected: boolean;
  variant: "day" | "week";
}) {
  const start = normalizeDate(appointment.startTime);
  const end = normalizeDate(appointment.endTime);
  if (!(start && end)) {
    return null;
  }

  const patientName = getPatientName(appointment.patientId);
  const presentation = getCalendarBlockPresentation(
    frameHeight,
    layout.totalColumns,
    variant,
    Boolean(appointment.reason)
  );
  const isMuted = ["cancelled", "no_show"].includes(appointment.status);
  const widthPercent =
    (layout.columnSpan / Math.max(1, layout.totalColumns)) * 100;
  const leftPercent = (layout.column / Math.max(1, layout.totalColumns)) * 100;
  const timeRange = `${formatTime(start)} – ${formatTime(end)}`;

  return (
    <button
      aria-label={`${patientName}, ${appointment.type}, ${timeRange}`}
      className={cn(
        "group/event absolute overflow-hidden rounded-[10px] border text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-[box-shadow,filter,transform] hover:z-30 hover:shadow-lg hover:brightness-[0.985] focus-visible:z-30 focus-visible:ring-2 focus-visible:ring-primary/55",
        getAppointmentTypeMeta(appointment.type).surfaceClassName,
        presentation.paddingClassName,
        selected && "z-20 ring-2 ring-primary/55 ring-offset-1",
        isMuted && "opacity-60 saturate-50"
      )}
      onClick={() => onSelectAppointment(appointment)}
      style={{
        top: frameTop,
        height: frameHeight,
        left: `calc(${leftPercent}% + 3px)`,
        width: `calc(${widthPercent}% - 6px)`,
      }}
      title={`${patientName} · ${appointment.type}\n${timeRange}${appointment.room ? ` · ${appointment.room}` : ""}${appointment.reason ? `\n${appointment.reason}` : ""}`}
      type="button"
    >
      <span
        className={cn(
          "absolute inset-y-1 left-0.5 w-[3px] rounded-full",
          getAppointmentTypeMeta(appointment.type).dotClassName
        )}
      />

      <CalendarAppointmentContent
        appointment={appointment}
        isDense={presentation.isDense}
        isTiny={presentation.isTiny}
        patientName={patientName}
        showReason={presentation.showReason}
        showSecondaryLine={presentation.showSecondaryLine}
        start={start}
        timeRange={timeRange}
        totalColumns={layout.totalColumns}
      />
    </button>
  );
}

export function AgendaDayView({
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
              <div
                className="relative pr-4 text-right"
                key={hour}
                style={{ height: DAY_HOUR_HEIGHT }}
              >
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
                      className="relative border-border/60 border-b after:absolute after:inset-x-0 after:top-1/2 after:border-border/35 after:border-t after:border-dashed last:border-b-0"
                      key={hour}
                      style={{ height: DAY_HOUR_HEIGHT }}
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

                      const frame = getAppointmentFrame(
                        start,
                        end,
                        DAY_HOUR_HEIGHT,
                        10
                      );
                      if (!frame) {
                        return null;
                      }

                      const layout = layoutMap.get(appointment.id) || {
                        column: 0,
                        columnSpan: 1,
                        totalColumns: 1,
                      };

                      return (
                        <CalendarAppointmentBlock
                          appointment={appointment}
                          frameHeight={frame.height}
                          frameTop={frame.top}
                          getPatientName={getPatientName}
                          key={appointment.id}
                          layout={layout}
                          onSelectAppointment={onSelectAppointment}
                          selected={selectedAppointmentId === appointment.id}
                          variant="day"
                        />
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

export function AgendaWeekView({
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
              <div
                className="relative pr-2 text-right"
                key={hour}
                style={{ height: WEEK_HOUR_HEIGHT }}
              >
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
                      className="relative border-border/60 border-b after:absolute after:inset-x-0 after:top-1/2 after:border-border/30 after:border-t after:border-dashed last:border-b-0"
                      key={hour}
                      style={{ height: WEEK_HOUR_HEIGHT }}
                    />
                  ))}

                  <div className="absolute inset-0">
                    {appointments.map((appointment) => {
                      const start = normalizeDate(appointment.startTime);
                      const end = normalizeDate(appointment.endTime);

                      if (!(start && end)) {
                        return null;
                      }

                      const frame = getAppointmentFrame(
                        start,
                        end,
                        WEEK_HOUR_HEIGHT,
                        10
                      );
                      if (!frame) {
                        return null;
                      }

                      const layout = layoutMap.get(appointment.id) || {
                        column: 0,
                        columnSpan: 1,
                        totalColumns: 1,
                      };

                      return (
                        <CalendarAppointmentBlock
                          appointment={appointment}
                          frameHeight={frame.height}
                          frameTop={frame.top}
                          getPatientName={getPatientName}
                          key={appointment.id}
                          layout={layout}
                          onSelectAppointment={onSelectAppointment}
                          selected={selectedAppointmentId === appointment.id}
                          variant="week"
                        />
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

export function AgendaMonthView({
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
                  "min-h-[146px] rounded-panel border p-4 text-left transition hover:border-border hover:bg-muted/20",
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
                        getAppointmentTypeMeta(appointment.type)
                          .surfaceClassName
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
