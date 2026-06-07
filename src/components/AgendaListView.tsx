import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dog, Cat, Bird, PawPrint, Stethoscope, CaretLeft, CaretRight } from "@phosphor-icons/react";
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
const ITEMS_PER_PAGE = 5;

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
              <ol className="divide-y divide-border/50 text-sm/6 flex-1">
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
                        "group relative flex gap-x-6 py-5 xl:static cursor-pointer transition-all duration-200 rounded-2xl px-5 mb-2",
                        "hover:bg-muted/40",
                        isSelected ? "bg-muted/50" : "bg-transparent"
                      )}
                      onClick={() => onSelectAppointment(appt)}
                    >
                      <div className="flex size-14 flex-none items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {getAnimalIcon(patient)}
                      </div>
                      <div className="flex-auto min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground text-base truncate">
                            {patientName}
                          </h3>
                          {patient?.breed && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/50 truncate max-w-[120px]">
                              {patient.breed}
                            </span>
                          )}
                        </div>
                        <dl className="mt-1.5 flex flex-col text-muted-foreground xl:flex-row xl:flex-wrap gap-y-1">
                          <div className="flex items-center gap-x-2 w-full xl:w-auto">
                            <dt>
                              <span className="sr-only">Date</span>
                              <div className="p-1 rounded bg-muted/50 text-muted-foreground/80">
                                <HugeiconsIcon icon={Calendar01Icon} className="size-3.5" />
                              </div>
                            </dt>
                            <dd className="font-medium">
                              <time dateTime={appt.startTime}>
                                <span className="text-foreground/80">{formatTime(appt.startTime)}</span> 
                                <span className="mx-1 opacity-50">-</span> 
                                <span>{formatTime(appt.endTime)}</span>
                              </time>
                            </dd>
                          </div>
                          <div className="flex items-center gap-x-2 xl:ml-4 xl:border-l xl:border-border/50 xl:pl-4 w-full xl:w-auto">
                            <dt className="flex shrink-0 items-center">
                              <span className="sr-only">Propriétaire</span>
                              <div className={cn("size-2 rounded-full", typeMeta.dotClassName)} />
                            </dt>
                            <dd className="truncate text-sm flex items-center gap-1.5">
                              <span className="text-foreground/70 font-medium">{ownerName}</span>
                              <span className={cn("px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold border", typeMeta.badgeClassName)}>
                                {appt.type}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                      
                      {(appt.status === "scheduled" || appt.status === "in_progress") ? (
                        <div className="flex flex-col items-end gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute right-4 top-1/2 -translate-y-1/2">
                          <Button 
                            size="sm" 
                            className="rounded-xl shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-9"
                            onClick={(e) => handleStartConsultation(e, appt)}
                          >
                            <Stethoscope weight="fill" className="size-4" />
                            <span>{appt.status === "in_progress" ? "Reprendre" : "Démarrer"}</span>
                          </Button>
                        </div>
                      ) : null}
                      
                      {/* Default status badge, hides on hover to make room for button (only for actionable statuses) */}
                      <div className={cn(
                        "absolute right-5 top-1/2 -translate-y-1/2 transition-opacity duration-300",
                        (appt.status === "scheduled" || appt.status === "in_progress") && "group-hover:opacity-0"
                      )}>
                        <div className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border", APPOINTMENT_STATUS_META[appt.status]?.className)}>
                          {APPOINTMENT_STATUS_META[appt.status]?.label || appt.status}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground font-medium">
                    {t("agenda.showing", { defaultValue: "Affichage" })} <span className="text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, selectedAppointments.length)}</span> sur <span className="text-foreground">{selectedAppointments.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <CaretLeft className="size-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          className={cn(
                            "size-7 rounded-md text-xs font-medium transition-colors",
                            currentPage === i + 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                          )}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <CaretRight className="size-4" />
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
