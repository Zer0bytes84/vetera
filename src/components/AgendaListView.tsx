import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CaretLeft,
  CaretRight,
  Stethoscope,
  User,
} from "@phosphor-icons/react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  APPOINTMENT_STATUS_META,
  APPOINTMENT_TYPE_META,
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
const ITEMS_PER_PAGE = 8;

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
  const { t } = useTranslation();
  const selectedAppointments = getAppointmentsForDate(selectedDate);
  const today = new Date();

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(selectedAppointments.length / ITEMS_PER_PAGE);
  const paginatedAppointments = selectedAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when date changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  const handleStartConsultation = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation();
    onSelectAppointment(appt);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "vetera:pending-consultation-start",
        appt.id
      );
    }
    window.location.assign("#/clinique");
  };

  return (
    <div className="bg-transparent text-card-foreground">
      <div className="mx-auto max-w-lg px-6 py-8 lg:max-w-4xl xl:max-w-6xl">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-base text-foreground">
            <HugeiconsIcon
              className="size-5 text-primary"
              icon={Calendar01Icon}
            />
            {t("agenda.upcomingMeetings", {
              defaultValue: "Rendez-vous prévus",
            })}
          </h2>
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
            <div className="mt-10 rounded-3xl border border-border/50 bg-white p-6 text-center shadow-sm lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:mt-9 xl:col-start-9 dark:bg-zinc-900/50">
              <div className="flex items-center text-foreground">
                <button
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    const prevMonth = new Date(selectedDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    onDateClick(prevMonth);
                  }}
                  type="button"
                >
                  <span className="sr-only">Mois précédent</span>
                  <CaretLeft className="size-5" weight="bold" />
                </button>
                <div className="flex-auto font-semibold text-sm capitalize">
                  {selectedDate.toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    const nextMonth = new Date(selectedDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    onDateClick(nextMonth);
                  }}
                  type="button"
                >
                  <span className="sr-only">Mois suivant</span>
                  <CaretRight className="size-5" weight="bold" />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-7 font-medium text-muted-foreground text-xs/6">
                {DAY_NAMES.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="isolate mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-zinc-200/50 text-sm shadow-sm dark:bg-zinc-800/50">
                {monthDays.map((day, i) => {
                  if (!day) {
                    return (
                      <div
                        className="bg-card/30 py-1.5 text-muted-foreground"
                        key={`empty-${i}`}
                      />
                    );
                  }

                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const hasAppts = getAppointmentsForDate(day).length > 0;

                  return (
                    <button
                      className={cn(
                        "py-1.5 transition-colors hover:bg-muted/80 focus:z-10",
                        "bg-card/70 backdrop-blur-sm",
                        isSelected || isToday ? "font-semibold" : "",
                        isSelected
                          ? "text-primary-foreground"
                          : isToday
                            ? "text-primary"
                            : "text-foreground"
                      )}
                      key={day.toISOString()}
                      onClick={() => onDateClick(day)}
                      type="button"
                    >
                      <time
                        className={cn(
                          "mx-auto flex size-7 items-center justify-center rounded-full transition-transform",
                          isSelected && isToday
                            ? "scale-110 bg-primary shadow-md"
                            : "",
                          isSelected && !isToday
                            ? "scale-110 bg-foreground text-background shadow-md"
                            : "",
                          hasAppts && !isSelected
                            ? "ring-2 ring-primary/30"
                            : "",
                          !(isSelected || isToday) && "hover:scale-110"
                        )}
                        dateTime={day.toISOString()}
                      >
                        {day.getDate()}
                      </time>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex min-h-[400px] flex-col lg:col-span-7 xl:col-span-8">
              <ol className="mt-2 flex-1 space-y-3">
                {selectedAppointments.length === 0 ? (
                  <li className="flex h-full flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
                      <HugeiconsIcon
                        className="size-8 text-muted-foreground/50"
                        icon={Calendar01Icon}
                      />
                    </div>
                    <p className="font-medium text-lg">
                      Aucun rendez-vous prévu
                    </p>
                    <p className="text-sm">
                      Sélectionnez une autre date pour voir le planning.
                    </p>
                  </li>
                ) : null}
                {paginatedAppointments.map((appt) => {
                  const patientName = getPatientName(appt.patientId);
                  const patient = getPatient(appt.patientId);
                  const ownerName = appt.ownerId
                    ? getOwnerName(appt.ownerId)
                    : "";
                  const isSelected = selectedAppointmentId === appt.id;
                  const typeMeta = APPOINTMENT_TYPE_META[appt.type];

                  return (
                    <li
                      className={cn(
                        "group flex cursor-pointer flex-col rounded-xl border p-4 shadow-sm transition-all duration-200 sm:flex-row sm:items-center sm:justify-between",
                        isSelected
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10"
                          : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                      )}
                      key={appt.id}
                      onClick={() => onSelectAppointment(appt)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Time Box */}
                        <div className="flex flex-col items-center justify-center rounded-lg border border-border/30 bg-muted/50 px-3 py-2 dark:bg-zinc-900">
                          <span className="font-bold font-mono text-[13px] text-foreground">
                            {formatTime(appt.startTime)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {patientName}
                            </span>
                            {(patient?.species || patient?.breed) && (
                              <span className="rounded-md border border-border/50 bg-muted px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                                {patient?.species || patient?.breed}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground text-xs">
                            <User className="h-3.5 w-3.5 opacity-70" />
                            <span>{ownerName || "Sans propriétaire"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-border/50 border-t pt-3 sm:mt-0 sm:justify-end sm:border-0 sm:pt-0">
                        {/* Type & Status */}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 font-medium text-[11px]",
                              typeMeta.badgeClassName,
                              typeMeta.surfaceClassName
                            )}
                          >
                            {appt.type}
                          </span>
                          <span
                            className={cn(
                              "rounded-lg border px-2.5 py-0.5 font-semibold text-[11px]",
                              APPOINTMENT_STATUS_META[appt.status]?.className
                            )}
                          >
                            {APPOINTMENT_STATUS_META[appt.status]?.label ||
                              appt.status}
                          </span>
                        </div>

                        {/* Action Button */}
                        {appt.status === "scheduled" ||
                        appt.status === "in_progress" ? (
                          <Button
                            className="ml-1 h-8 rounded-lg bg-primary/10 px-3 text-primary text-xs shadow-none transition-colors hover:bg-primary hover:text-white"
                            onClick={(e) => handleStartConsultation(e, appt)}
                            size="sm"
                            variant="secondary"
                          >
                            <Stethoscope
                              className="mr-1.5 size-3.5"
                              weight="fill"
                            />
                            {appt.status === "in_progress"
                              ? "Reprendre"
                              : "Démarrer"}
                          </Button>
                        ) : (
                          <div className="hidden w-[90px] sm:block" /> /* Spacer to keep layout stable when no button */
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium text-muted-foreground text-sm">
                    {t("agenda.showing", { defaultValue: "Affichage" })}{" "}
                    <span className="text-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    -{" "}
                    <span className="text-foreground">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        selectedAppointments.length
                      )}
                    </span>{" "}
                    sur{" "}
                    <span className="text-foreground">
                      {selectedAppointments.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-1">
                    <Button
                      className="h-8 rounded-lg px-3 font-medium text-xs shadow-none hover:bg-background"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      size="sm"
                      variant="ghost"
                    >
                      <CaretLeft className="mr-1 size-3.5" />
                      Précédent
                    </Button>
                    <div className="flex items-center gap-1 border-border/50 border-x px-2">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          className={cn(
                            "size-7 rounded-md font-bold text-xs transition-colors",
                            currentPage === i + 1
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background"
                          )}
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      className="h-8 rounded-lg px-3 font-medium text-xs shadow-none hover:bg-background"
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Suivant
                      <CaretRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
