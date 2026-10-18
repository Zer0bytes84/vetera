import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import {
  Cat,
  Dog,
  Bird,
  Rabbit,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  PawPrint,
  Phone,
  Stethoscope,
  UserRound,
} from "@/lib/icons";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAppointmentTypeMeta } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
  type AgendaTableRow,
} from "@/modules/agenda/components/agenda-shared";
import type { Appointment, AppointmentStatus } from "@/types/db";
import { formatPhone } from "@/utils/display-format";

interface AgendaListViewProps {
  /** Shown when there is nothing to list. */
  emptyState: ReactNode;
  formatTime: (date?: string | Date | null) => string;
  onDeleteAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onTransitionStatus: (
    appointment: Appointment,
    nextStatus: AppointmentStatus
  ) => Promise<void>;
  /** Changes whenever the listed set changes, so paging restarts at page 1. */
  resetKey: string;
  rows: AgendaTableRow[];
  selectedAppointmentId: string | null;
  /** Lists spanning several days print each appointment's date. */
  showDate?: boolean;
}

const ITEMS_PER_PAGE = 8;

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

function SpeciesIcon({ species }: { species?: string }) {
  const normalized = species?.toLocaleLowerCase("fr") ?? "";
  const props = { "aria-hidden": true as const, className: "size-6", strokeWidth: 1.6 };
  if (normalized.includes("chien")) return <Dog {...props} />;
  if (normalized.includes("chat")) return <Cat {...props} />;
  if (normalized.includes("lapin")) return <Rabbit {...props} />;
  if (normalized.includes("oiseau")) return <Bird {...props} />;
  return <PawPrint {...props} />;
}

/** The Agenda's single appointment list: one row per appointment, every action on the row. */
export function AgendaListView({
  emptyState,
  formatTime,
  onDeleteAppointment,
  onEditAppointment,
  onSelectAppointment,
  onTransitionStatus,
  resetKey,
  rows,
  selectedAppointmentId,
  showDate = false,
}: AgendaListViewProps) {
  const [pagination, setPagination] = useState({ key: resetKey, page: 1 });
  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
  const currentPage =
    pagination.key === resetKey ? Math.min(pagination.page, totalPages) : 1;
  const pageRows = rows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setPagination({
      key: resetKey,
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

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="agenda-appointment-list min-w-0 px-5 pt-4 pb-5 sm:px-6">
      <ol className="space-y-2">
        {pageRows.map((row) => (
          <AppointmentListItem
            formatTime={formatTime}
            isSelected={selectedAppointmentId === row.appointment.id}
            key={row.appointment.id}
            onDelete={onDeleteAppointment}
            onEdit={onEditAppointment}
            onSelectAppointment={onSelectAppointment}
            onStartConsultation={handleStartConsultation}
            onTransitionStatus={onTransitionStatus}
            row={row}
            showDate={showDate}
          />
        ))}
      </ol>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-border/60 border-t pt-4">
          <p className="text-muted-foreground text-xs tabular-nums">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1} à{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, rows.length)} sur{" "}
            {rows.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              aria-label="Page précédente"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center font-medium text-xs tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              aria-label="Page suivante"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AppointmentListItem({
  formatTime,
  isSelected,
  onDelete,
  onEdit,
  onSelectAppointment,
  onStartConsultation,
  onTransitionStatus,
  row,
  showDate,
}: {
  formatTime: (date?: string | Date | null) => string;
  isSelected: boolean;
  onDelete: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onStartConsultation: (
    event: React.MouseEvent,
    appointment: Appointment
  ) => void;
  onTransitionStatus: (
    appointment: Appointment,
    nextStatus: AppointmentStatus
  ) => Promise<void>;
  row: AgendaTableRow;
  showDate: boolean;
}) {
  const { appointment, patient } = row;
  const typeMeta = getAppointmentTypeMeta(appointment.type);
  const duration = getDurationLabel(appointment);
  const nextAction = getNextAppointmentAction(appointment.status);
  const phone = formatPhone(row.owner?.phone);
  const dateLabel = new Date(appointment.startTime).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <li>
      <div
        aria-pressed={isSelected}
        className={cn(
          "agenda-appointment-row group grid w-full min-w-0 grid-cols-[68px_minmax(0,1fr)] gap-4 rounded-xl border border-border/60 px-2 py-4 text-left outline-none transition-colors sm:grid-cols-[78px_48px_minmax(0,1fr)_auto] sm:items-center sm:px-3",
          isSelected
            ? "border-foreground/30 bg-muted/60"
            : "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
        data-row-id={appointment.id}
        onClick={() => onSelectAppointment(appointment)}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onSelectAppointment(appointment);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="self-start pt-0.5 sm:self-center sm:pt-0">
          {showDate ? (
            <p className="mb-0.5 text-[12px] text-muted-foreground">
              {dateLabel}
            </p>
          ) : null}
          <p className="font-semibold text-sm tabular-nums">
            {formatTime(appointment.startTime)}
          </p>
          <p className="mt-0.5 t-12 text-muted-foreground tabular-nums">
            {formatTime(appointment.endTime)}
          </p>
          {duration ? (
            <p className="mt-1 t-12 text-muted-foreground">{duration}</p>
          ) : null}
        </div>

        <span
          className={cn(
            "hidden size-11 place-items-center rounded-xl text-xl ring-1 ring-inset sm:grid",
            typeMeta.surfaceClassName
          )}
        >
          <SpeciesIcon species={patient?.species} />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              className="truncate rounded font-semibold text-sm tracking-[-0.01em] hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                openPatientPeek(appointment.patientId);
              }}
              type="button"
            >
              {row.patientName}
            </button>
            <AppointmentTypeBadge type={appointment.type} />
            <AppointmentStatusBadge appointment={appointment} patient={patient} />
          </div>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {appointment.reason || appointment.title || "Motif non renseigné"}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 t-12 text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserRound className="size-3" />
              <span className="truncate">{row.ownerName}</span>
            </span>
            {phone ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Phone className="size-3" />
                {phone}
              </span>
            ) : null}
            {patient?.species ? (
              <span className="inline-flex items-center gap-1.5">
                <PawPrint className="size-3" />
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope className="size-3" />
              {row.vetName}
            </span>
            {appointment.room ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" />
                {appointment.room}
              </span>
            ) : null}
          </div>
        </div>

        <div className="col-start-2 mt-1 flex items-center justify-end gap-1 sm:col-start-auto sm:mt-0">
          {nextAction ? (
            <Button
              className="h-8 min-w-[108px] rounded-lg px-3 text-xs shadow-none"
              onClick={(event) => {
                if (nextAction.status === "in_progress") {
                  onStartConsultation(event, appointment);
                  return;
                }
                event.stopPropagation();
                void onTransitionStatus(appointment, nextAction.status);
              }}
              size="sm"
              variant={nextAction.primary ? "default" : "outline"}
            >
              {nextAction.status === "in_progress" ? (
                <Stethoscope className="size-3.5" />
              ) : null}
              {nextAction.label}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={`Actions pour ${row.patientName}`}
                  onClick={(event) => event.stopPropagation()}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onSelectAppointment(appointment)}>
                Ouvrir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(appointment)}>
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(appointment)}
                variant="destructive"
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

function getNextAppointmentAction(status: AppointmentStatus): {
  label: string;
  primary: boolean;
  status: AppointmentStatus;
} | null {
  switch (status) {
    case "scheduled":
      return { label: "Confirmer", primary: false, status: "confirmed" };
    case "confirmed":
      return { label: "Patient arrivé", primary: false, status: "arrived" };
    case "arrived":
      return { label: "Mettre en attente", primary: false, status: "waiting" };
    case "waiting":
      return { label: "Démarrer", primary: true, status: "in_progress" };
    case "in_progress":
      return { label: "Reprendre", primary: true, status: "in_progress" };
    default:
      return null;
  }
}
