import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  PawPrint,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  APPOINTMENT_STATUS_META,
  getAppointmentTypeMeta,
} from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Appointment, Patient } from "@/types/db";

interface AgendaListViewProps {
  formatTime: (date?: string | Date | null) => string;
  getAppointmentsForDate: (date: Date) => Appointment[];
  getOwnerName: (ownerId?: string) => string;
  getPatient: (patientId: string) => Patient | undefined;
  getPatientName: (patientId: string) => string;
  isSameDay: (d1: Date, d2: Date) => boolean;
  monthDays: Array<Date | null>;
  onDateClick: (date: Date) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  selectedAppointmentId: string | null;
  selectedDate: Date;
}

const DAY_NAMES = ["L", "M", "M", "J", "V", "S", "D"];
const ITEMS_PER_PAGE = 7;

function shiftMonth(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getDurationLabel(appointment: Appointment) {
  const start = new Date(appointment.startTime).getTime();
  const end = new Date(appointment.endTime).getTime();
  const minutes = Math.max(0, Math.round((end - start) / 60_000));
  if (!Number.isFinite(minutes) || minutes === 0) {
    return null;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours} h ${remaining}` : `${hours} h`;
  }
  return `${minutes} min`;
}

function getSpeciesEmoji(species?: string) {
  const normalized = species?.toLocaleLowerCase("fr") ?? "";
  if (normalized.includes("chien")) {
    return "🐶";
  }
  if (normalized.includes("chat")) {
    return "🐱";
  }
  if (normalized.includes("lapin")) {
    return "🐰";
  }
  if (normalized.includes("oiseau")) {
    return "🐦";
  }
  return "🐾";
}

export function AgendaListView({
  selectedDate,
  monthDays,
  getAppointmentsForDate,
  selectedAppointmentId,
  onSelectAppointment,
  onDateClick,
  getPatientName,
  getPatient,
  getOwnerName,
  formatTime,
  isSameDay,
}: AgendaListViewProps) {
  const selectedDateKey = selectedDate.toDateString();
  const [pagination, setPagination] = useState({
    dateKey: selectedDateKey,
    page: 1,
  });
  const today = new Date();
  const selectedAppointments = useMemo(
    () =>
      [...getAppointmentsForDate(selectedDate)].sort(
        (left, right) =>
          new Date(left.startTime).getTime() -
          new Date(right.startTime).getTime()
      ),
    [getAppointmentsForDate, selectedDate]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(selectedAppointments.length / ITEMS_PER_PAGE)
  );
  const currentPage =
    pagination.dateKey === selectedDateKey
      ? Math.min(pagination.page, totalPages)
      : 1;
  const paginatedAppointments = selectedAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const completedCount = selectedAppointments.filter(
    (appointment) => appointment.status === "completed"
  ).length;
  const activeCount = selectedAppointments.filter((appointment) =>
    ["scheduled", "in_progress"].includes(appointment.status)
  ).length;
  const urgentCount = selectedAppointments.filter(
    (appointment) => appointment.type === "Urgence"
  ).length;

  const handleDateClick = (date: Date) => {
    setPagination({ dateKey: date.toDateString(), page: 1 });
    onDateClick(date);
  };

  const handlePageChange = (page: number) => {
    setPagination({
      dateKey: selectedDateKey,
      page: Math.max(1, Math.min(totalPages, page)),
    });
  };

  const handleStartConsultation = (
    event: React.MouseEvent,
    appointment: Appointment
  ) => {
    event.stopPropagation();
    onSelectAppointment(appointment);
    window.sessionStorage.setItem(
      "vetera:pending-consultation-start",
      appointment.id
    );
    window.location.assign("#/clinique");
  };

  return (
    <div className="grid min-h-[650px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-border/70 border-b bg-muted/15 p-5 xl:border-r xl:border-b-0">
        <div className="xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label="Mois précédent"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              onClick={() => handleDateClick(shiftMonth(selectedDate, -1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-semibold text-sm capitalize tracking-[-0.01em]">
              {selectedDate.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              aria-label="Mois suivant"
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              onClick={() => handleDateClick(shiftMonth(selectedDate, 1))}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 text-center font-medium text-[10px] text-muted-foreground">
            {DAY_NAMES.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-y-1">
            {monthDays.map((day, index) => {
              if (!day) {
                return <span className="h-9" key={`empty-${index}`} />;
              }

              const appointmentsCount = getAppointmentsForDate(day).length;
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <button
                  aria-label={day.toLocaleDateString("fr-FR")}
                  className={cn(
                    "group relative mx-auto grid size-9 place-items-center rounded-xl text-xs outline-none transition-[background-color,color,transform] hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/30",
                    isSelected
                      ? "bg-foreground font-semibold text-background shadow-sm hover:bg-foreground"
                      : "text-foreground",
                    isToday && !isSelected && "font-semibold text-primary"
                  )}
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  type="button"
                >
                  {day.getDate()}
                  {appointmentsCount > 0 ? (
                    <span
                      className={cn(
                        "absolute bottom-1 size-1 rounded-full bg-primary",
                        isSelected && "bg-background"
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" />
              <span className="font-semibold text-[10px] uppercase tracking-[0.08em]">
                Journée sélectionnée
              </span>
            </div>
            <p className="mt-3 font-semibold text-lg capitalize tracking-[-0.025em]">
              {selectedDate.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 border-border/60 border-t pt-4 text-center">
              <DayMetric label="Prévus" value={selectedAppointments.length} />
              <DayMetric label="Actifs" value={activeCount} />
              <DayMetric label="Urgents" value={urgentCount} />
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-border/60 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
              Planning du jour
            </p>
            <h3 className="mt-1 font-semibold text-xl tracking-[-0.03em]">
              {selectedAppointments.length > 0
                ? `${selectedAppointments.length} rendez-vous à coordonner`
                : "Journée disponible"}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {completedCount} terminé{completedCount > 1 ? "s" : ""} ·{" "}
              {activeCount} à suivre
            </p>
          </div>
          {selectedAppointments.length > 0 ? (
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              Tri chronologique
            </div>
          ) : null}
        </div>

        {selectedAppointments.length === 0 ? (
          <div className="flex min-h-[440px] flex-col items-center justify-center text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="mt-4 font-semibold text-lg">Aucun rendez-vous</p>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              Cette journée est libre. Sélectionnez une autre date ou ajoutez un
              nouveau rendez-vous.
            </p>
          </div>
        ) : (
          <ol className="mt-2 divide-y divide-border/60">
            {paginatedAppointments.map((appointment) => (
              <AppointmentListItem
                appointment={appointment}
                formatTime={formatTime}
                getOwnerName={getOwnerName}
                getPatient={getPatient}
                getPatientName={getPatientName}
                isSelected={selectedAppointmentId === appointment.id}
                key={appointment.id}
                onSelectAppointment={onSelectAppointment}
                onStartConsultation={handleStartConsultation}
              />
            ))}
          </ol>
        )}

        {totalPages > 1 ? (
          <div className="mt-5 flex items-center justify-between border-border/60 border-t pt-4">
            <p className="text-muted-foreground text-xs tabular-nums">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                selectedAppointments.length
              )}{" "}
              sur {selectedAppointments.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                aria-label="Page précédente"
                className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                type="button"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-16 text-center font-medium text-xs tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                aria-label="Page suivante"
                className="grid size-8 place-items-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                type="button"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-base tabular-nums">{value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function AppointmentListItem({
  appointment,
  formatTime,
  getOwnerName,
  getPatient,
  getPatientName,
  isSelected,
  onSelectAppointment,
  onStartConsultation,
}: {
  appointment: Appointment;
  formatTime: (date?: string | Date | null) => string;
  getOwnerName: (ownerId?: string) => string;
  getPatient: (patientId: string) => Patient | undefined;
  getPatientName: (patientId: string) => string;
  isSelected: boolean;
  onSelectAppointment: (appointment: Appointment) => void;
  onStartConsultation: (
    event: React.MouseEvent,
    appointment: Appointment
  ) => void;
}) {
  const patient = getPatient(appointment.patientId);
  const patientName = getPatientName(appointment.patientId);
  const ownerName = getOwnerName(appointment.ownerId) || "Sans propriétaire";
  const typeMeta = getAppointmentTypeMeta(appointment.type);
  const statusMeta = APPOINTMENT_STATUS_META[appointment.status];
  const duration = getDurationLabel(appointment);
  const canStart = ["scheduled", "in_progress"].includes(appointment.status);

  return (
    <li>
      <button
        aria-pressed={isSelected}
        className={cn(
          "group grid w-full min-w-0 grid-cols-[68px_minmax(0,1fr)] gap-4 px-2 py-4 text-left outline-none transition-colors sm:grid-cols-[78px_48px_minmax(0,1fr)_auto] sm:items-center sm:px-3",
          isSelected
            ? "bg-primary/[0.055]"
            : "hover:bg-muted/35 focus-visible:bg-muted/35"
        )}
        onClick={() => onSelectAppointment(appointment)}
        type="button"
      >
        <div className="self-start pt-0.5 sm:self-center sm:pt-0">
          <p className="font-semibold text-sm tabular-nums">
            {formatTime(appointment.startTime)}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
            {formatTime(appointment.endTime)}
          </p>
          {duration ? (
            <p className="mt-1 text-[9px] text-muted-foreground">{duration}</p>
          ) : null}
        </div>

        <span
          className={cn(
            "hidden size-11 place-items-center rounded-xl text-xl ring-1 ring-inset sm:grid",
            typeMeta.surfaceClassName
          )}
        >
          {getSpeciesEmoji(patient?.species)}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-sm tracking-[-0.01em]">
              {patientName}
            </p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium text-[10px]",
                typeMeta.badgeClassName
              )}
            >
              {appointment.type}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium text-[10px]",
                statusMeta?.className
              )}
            >
              {statusMeta?.label ?? appointment.status}
            </span>
          </div>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {appointment.reason || appointment.title || "Consultation"}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3" />
              <span className="truncate">{ownerName}</span>
            </span>
            {patient?.species ? (
              <span className="inline-flex items-center gap-1.5">
                <PawPrint className="size-3" />
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </span>
            ) : null}
            {appointment.room ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" />
                {appointment.room}
              </span>
            ) : null}
          </div>
        </div>

        <div className="col-start-2 mt-1 flex items-center justify-end sm:col-start-auto sm:mt-0">
          {canStart ? (
            <Button
              className="h-8 rounded-lg px-3 text-xs shadow-none"
              onClick={(event) => onStartConsultation(event, appointment)}
              size="sm"
              variant={appointment.status === "in_progress" ? "default" : "outline"}
            >
              <Stethoscope className="size-3.5" />
              {appointment.status === "in_progress" ? "Reprendre" : "Démarrer"}
            </Button>
          ) : (
            <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      </button>
    </li>
  );
}
