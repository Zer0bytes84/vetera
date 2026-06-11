import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dog, Cat, Bird, PawPrint, Stethoscope, CaretLeft, CaretRight, User } from "@phosphor-icons/react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { Appointment, Patient } from "@/types/db";
import { APPOINTMENT_TYPE_META, APPOINTMENT_STATUS_META } from "@/config/status-meta";
import { Button } from "@/components/ui/button";

interface AgendaListViewProps {
  selectedDate: Date;
  monthDays: Array<Date | null>;
  getAppointmentsForDate: (date: Date) => Appointment[];
  selectedAppointmentId: string | null;
  onSelectAppointment: (appointment: Appointment) => void;
  onDateClick: (date: Date) => void;
  getPatientName: (patientId: string) => string;
  getPatient: (patientId: string) => Patient | undefined;
  getOwnerName: (ownerId?: string) => string;
  formatTime: (date?: string | Date | null) => string;
  isSameDay: (d1: Date, d2: Date) => boolean;
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
      window.sessionStorage.setItem("vetera:pending-consultation-start", appt.id);
    }
    window.location.assign("#/clinique");
  };

  const getAnimalIcon = (patient?: Patient) => {
    if (!patient) return <PawPrint weight="fill" className="size-6 text-foreground/50" />;
    const species = patient.species?.toLowerCase() || "";
    if (species.includes("chien") || species.includes("dog")) return <Dog weight="fill" className="size-6 text-orange-500" />;
    if (species.includes("chat") || species.includes("cat")) return <Cat weight="fill" className="size-6 text-indigo-500" />;
    if (species.includes("oiseau") || species.includes("bird") || species.includes("nac")) return <Bird weight="fill" className="size-6 text-emerald-500" />;
    return <PawPrint weight="fill" className="size-6 text-primary" />;
  };

  return (
    <div className="bg-transparent text-card-foreground">
      <div className="mx-auto max-w-lg px-6 py-8 lg:max-w-4xl xl:max-w-6xl">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Calendar01Icon} className="size-5 text-primary" />
            {t("agenda.upcomingMeetings", { defaultValue: "Rendez-vous prévus" })}
          </h2>
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-16">
            <div className="mt-10 text-center lg:col-start-8 lg:col-end-13 lg:row-start-1 lg:mt-9 xl:col-start-9 p-6 bg-white dark:bg-zinc-900/50 rounded-3xl border border-border/50 shadow-sm">
              <div className="flex items-center text-foreground">
                <button
                  type="button"
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    const prevMonth = new Date(selectedDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    onDateClick(prevMonth);
                  }}
                >
                  <span className="sr-only">Mois précédent</span>
                  <CaretLeft weight="bold" className="size-5" />
                </button>
                <div className="flex-auto text-sm font-semibold capitalize">
                  {selectedDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </div>
                <button
                  type="button"
                  className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    const nextMonth = new Date(selectedDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    onDateClick(nextMonth);
                  }}
                >
                  <span className="sr-only">Mois suivant</span>
                  <CaretRight weight="bold" className="size-5" />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-7 text-xs/6 text-muted-foreground font-medium">
                {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 text-sm shadow-sm overflow-hidden">
                {monthDays.map((day, i) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="bg-card/30 py-1.5 text-muted-foreground"
                      />
                    );
                  }

                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const hasAppts = getAppointmentsForDate(day).length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => onDateClick(day)}
                      className={cn(
                        "py-1.5 hover:bg-muted/80 focus:z-10 transition-colors",
                        "bg-card/70 backdrop-blur-sm",
                        isSelected || isToday ? "font-semibold" : "",
                        isSelected ? "text-primary-foreground" : isToday ? "text-primary" : "text-foreground",
                      )}
                    >
                      <time
                        dateTime={day.toISOString()}
                        className={cn(
                          "mx-auto flex size-7 items-center justify-center rounded-full transition-transform",
                          isSelected && isToday ? "bg-primary shadow-md scale-110" : "",
                          isSelected && !isToday ? "bg-foreground text-background shadow-md scale-110" : "",
                          hasAppts && !isSelected ? "ring-2 ring-primary/30" : "",
                          !isSelected && !isToday && "hover:scale-110"
                        )}
                      >
                        {day.getDate()}
                      </time>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 lg:col-span-7 xl:col-span-8 flex flex-col min-h-[400px]">
              <ol className="flex-1 space-y-3 mt-2">
                {selectedAppointments.length === 0 ? (
                  <li className="py-10 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                    <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <HugeiconsIcon icon={Calendar01Icon} className="size-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-medium">Aucun rendez-vous prévu</p>
                    <p className="text-sm">Sélectionnez une autre date pour voir le planning.</p>
                  </li>
                ) : null}
                {paginatedAppointments.map((appt) => {
                  const patientName = getPatientName(appt.patientId);
                  const patient = getPatient(appt.patientId);
                  const ownerName = appt.ownerId ? getOwnerName(appt.ownerId) : "";
                  const isSelected = selectedAppointmentId === appt.id;
                  const typeMeta = APPOINTMENT_TYPE_META[appt.type];
                  
                  return (
                    <li 
                      key={appt.id} 
                      className={cn(
                        "group flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer transition-all duration-200 rounded-xl border p-4 shadow-sm",
                        isSelected 
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10" 
                          : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                      )}
                      onClick={() => onSelectAppointment(appt)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Time Box */}
                        <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 px-3 py-2 dark:bg-zinc-900 border border-border/30">
                          <span className="font-mono text-[13px] font-bold text-foreground">
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
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
                                {patient?.species || patient?.breed}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <User className="h-3.5 w-3.5 opacity-70" />
                            <span>{ownerName || "Sans propriétaire"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/50">
                        {/* Type & Status */}
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", typeMeta.badgeClassName, typeMeta.surfaceClassName)}>
                            {appt.type}
                          </span>
                          <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border", APPOINTMENT_STATUS_META[appt.status]?.className)}>
                            {APPOINTMENT_STATUS_META[appt.status]?.label || appt.status}
                          </span>
                        </div>
                        
                        {/* Action Button */}
                        {(appt.status === "scheduled" || appt.status === "in_progress") ? (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="rounded-lg h-8 px-3 ml-1 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-none transition-colors"
                            onClick={(e) => handleStartConsultation(e, appt)}
                          >
                            <Stethoscope weight="fill" className="size-3.5 mr-1.5" />
                            {appt.status === "in_progress" ? "Reprendre" : "Démarrer"}
                          </Button>
                        ) : (
                          <div className="w-[90px] hidden sm:block"></div> /* Spacer to keep layout stable when no button */
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-sm text-muted-foreground font-medium">
                    {t("agenda.showing", { defaultValue: "Affichage" })} <span className="text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, selectedAppointments.length)}</span> sur <span className="text-foreground">{selectedAppointments.length}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg h-8 px-3 text-xs font-medium hover:bg-background shadow-none"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <CaretLeft className="size-3.5 mr-1" />
                      Précédent
                    </Button>
                    <div className="flex items-center gap-1 border-x border-border/50 px-2">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          className={cn(
                            "size-7 rounded-md text-xs font-bold transition-colors",
                            currentPage === i + 1 ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-background text-muted-foreground"
                          )}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg h-8 px-3 text-xs font-medium hover:bg-background shadow-none"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                      <CaretRight className="size-3.5 ml-1" />
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
