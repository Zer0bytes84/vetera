import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import { useRoomLabel } from "@/modules/rooms/use-rooms";
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
import "@/modules/agenda/components/agenda-cards.css";

interface AgendaListViewProps {
  /** Shown when there is nothing to list. */
  emptyState: ReactNode;
  formatTime: (date?: string | Date | null) => string;
  onDeleteAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  /** « Ouvrir » in the row menu: start the visit in Flux. */
  onOpenAppointment?: (appointment: Appointment) => void;
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
  const props = { "aria-hidden": true as const, className: "size-5", strokeWidth: 1.6 };
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
  onOpenAppointment,
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

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="agenda-appointment-list min-w-0 px-5 pt-4 pb-5 sm:px-6">
      <ol className="agenda-appt-list">
        {pageRows.map((row) => (
          <AppointmentListItem
            formatTime={formatTime}
            isSelected={selectedAppointmentId === row.appointment.id}
            key={row.appointment.id}
            onDelete={onDeleteAppointment}
            onEdit={onEditAppointment}
            onOpenAppointment={onOpenAppointment}
            onSelectAppointment={onSelectAppointment}
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
  onOpenAppointment,
  onSelectAppointment,
  onTransitionStatus,
  row,
  showDate,
}: {
  formatTime: (date?: string | Date | null) => string;
  isSelected: boolean;
  onDelete: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onOpenAppointment?: (appointment: Appointment) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onTransitionStatus: (
    appointment: Appointment,
    nextStatus: AppointmentStatus
  ) => Promise<void>;
  row: AgendaTableRow;
  showDate: boolean;
}) {
  const { appointment, patient } = row;
  const roomName = useRoomLabel()(appointment.room);
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
        className="agenda-appointment-row agenda-appt-card group"
        data-row-id={appointment.id}
        data-selected={isSelected || undefined}
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
        <span
          aria-hidden="true"
          className={cn("agenda-appt-accent", typeMeta.dotClassName)}
        />

        <div className="agenda-appt-time">
          {showDate ? <p className="agenda-appt-date">{dateLabel}</p> : null}
          <p className="agenda-appt-start">{formatTime(appointment.startTime)}</p>
          <p className="agenda-appt-range">
            {formatTime(appointment.endTime)}
            {duration ? <span> · {duration}</span> : null}
          </p>
        </div>

        <span className={cn("agenda-appt-avatar", typeMeta.surfaceClassName)}>
          <SpeciesIcon species={patient?.species} />
        </span>

        <div className="agenda-appt-main">
          <div className="agenda-appt-title-row">
            <button
              className="agenda-appt-patient"
              onClick={(event) => {
                event.stopPropagation();
                openPatientPeek(appointment.patientId);
              }}
              type="button"
            >
              {row.patientName}
            </button>
            <span className="agenda-appt-badges">
              <AppointmentTypeBadge type={appointment.type} />
              <AppointmentStatusBadge appointment={appointment} patient={patient} />
            </span>
          </div>
          <p className="agenda-appt-reason">
            {appointment.reason || appointment.title || "Motif non renseigné"}
          </p>
          <div className="agenda-appt-meta">
            <span>
              <UserRound className="size-3" />
              <span className="truncate">{row.ownerName}</span>
            </span>
            {phone ? (
              <span className="tabular-nums">
                <Phone className="size-3" />
                {phone}
              </span>
            ) : null}
            {patient?.species ? (
              <span>
                <PawPrint className="size-3" />
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </span>
            ) : null}
            <span>
              <Stethoscope className="size-3" />
              {row.vetName}
            </span>
            {roomName ? (
              <span>
                <MapPin className="size-3" />
                {roomName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="agenda-appt-actions">
          {nextAction ? (
            <Button
              className="h-8 min-w-[108px] rounded-lg px-3 text-xs shadow-none"
              onClick={(event) => {
                event.stopPropagation();
                void onTransitionStatus(appointment, nextAction.status);
              }}
              size="sm"
              variant={nextAction.primary ? "default" : "outline"}
            >
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
              <DropdownMenuItem
                onClick={() =>
                  (onOpenAppointment ?? onSelectAppointment)(appointment)
                }
              >
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

/**
 * The Agenda books visits; Flux is the one place where a visit moves on.
 * Only the owner's confirmation of a booking stays here.
 */
function getNextAppointmentAction(status: AppointmentStatus): {
  label: string;
  primary: boolean;
  status: AppointmentStatus;
} | null {
  return status === "scheduled"
    ? { label: "Confirmer", primary: false, status: "confirmed" }
    : null;
}
