import { ArrowLeft01Icon, ArrowRight01Icon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { getAppointmentTypeMeta } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/db";

const DAY_NAMES = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MAX_DOTS = 4;
/** Two lines fit a day box: two appointments, or one and the count of the rest. */
const MAX_NAMED = 2;

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function shiftMonth(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function sameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

/**
 * The Agenda's one way to move in time: a month grid where a click picks the
 * day listed below. Each day names its first appointments (time and patient),
 * then how many more it holds; on narrow screens, one dot per appointment.
 */
export function AgendaMonthCalendar({
  getAppointmentsForDate,
  getPatientName,
  monthDays,
  onSelectDate,
  selectedDate,
}: {
  getAppointmentsForDate: (date: Date) => Appointment[];
  getPatientName: (patientId: string) => string;
  monthDays: Array<Date | null>;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}) {
  const today = new Date();
  const monthLabel = selectedDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Close the last week so the grid keeps whole rows of boxes.
  const cells = [
    ...monthDays,
    ...Array.from({ length: (7 - (monthDays.length % 7)) % 7 }, () => null),
  ];

  return (
    <section
      aria-label="Calendrier des rendez-vous"
      className="agenda-month-calendar surface-card rounded-panel border border-border bg-card"
    >
      <header className="flex items-center justify-between gap-3 border-border border-b px-5 py-3 sm:px-6">
        <h2 className="font-medium text-[18px] text-foreground tracking-[-0.02em]">
          {monthLabel}
        </h2>
        {/* One place to move in time: previous, today and next sit together. */}
        <div aria-label="Navigation du mois" className="agenda-month-nav flex items-center gap-1" role="group">
          <Button
            aria-label="Mois précédent"
            onClick={() => onSelectDate(shiftMonth(selectedDate, -1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} />
          </Button>
          <Button
            disabled={sameDay(selectedDate, today)}
            onClick={() => onSelectDate(new Date())}
            size="sm"
            variant="outline"
          >
            Aujourd&apos;hui
          </Button>
          <Button
            aria-label="Mois suivant"
            onClick={() => onSelectDate(shiftMonth(selectedDate, 1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      <div className="p-3 sm:p-4">
        {/* Outlook-style month: every day sits in its own bordered box. */}
        <div className="agenda-month-grid grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {DAY_NAMES.map((day) => (
            <span
              className="bg-muted/60 px-2 py-1.5 text-[12px] text-muted-foreground"
              key={day}
            >
              {day}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) {
              return (
                <span
                  aria-hidden="true"
                  className="h-[84px] bg-muted/30"
                  key={`empty-${index}`}
                />
              );
            }

            const dayAppointments = getAppointmentsForDate(day);
            const count = dayAppointments.length;
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            const label = `${day.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}${isToday ? ", aujourd'hui" : ""}, ${count === 0 ? "aucun rendez-vous" : `${count} rendez-vous`}`;

            return (
              <button
                aria-current={isSelected ? "date" : undefined}
                aria-label={label}
                className={cn(
                  "agenda-month-day relative flex h-[84px] min-w-0 flex-col items-start justify-start gap-1 bg-card px-2 py-1.5 text-left text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  isSelected && "z-[1] shadow-[inset_0_0_0_2px_var(--foreground)]"
                )}
                data-selected={isSelected || undefined}
                data-today={isToday || undefined}
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                type="button"
              >
                <span
                  className={cn(
                    "agenda-month-day-number grid size-7 place-items-center rounded-full text-[13px] tabular-nums",
                    isSelected && !isToday && "font-semibold",
                    isToday && "font-semibold"
                  )}
                >
                  {day.getDate()}
                </span>
                {count > 0 ? (
                  <>
                    <span className="flex shrink-0 items-center gap-0.5 sm:hidden" aria-hidden="true">
                      {dayAppointments.slice(0, MAX_DOTS).map((appointment) => (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            getAppointmentTypeMeta(appointment.type).dotClassName
                          )}
                          key={appointment.id}
                        />
                      ))}
                    </span>
                    <span className="agenda-month-events hidden w-full min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                      {dayAppointments
                        .slice(0, count > MAX_NAMED ? MAX_NAMED - 1 : MAX_NAMED)
                        .map((appointment) => (
                          <span className="agenda-month-event flex min-w-0 items-center gap-1.5 text-[12px] leading-4" key={appointment.id}>
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                getAppointmentTypeMeta(appointment.type).dotClassName
                              )}
                            />
                            <span className="shrink-0 text-muted-foreground tabular-nums">
                              {formatClock(appointment.startTime)}
                            </span>
                            <span className="truncate text-foreground">
                              {getPatientName(appointment.patientId)}
                            </span>
                          </span>
                        ))}
                      {count > MAX_NAMED ? (
                        <span className="agenda-month-more ps-3 text-[12px] text-muted-foreground leading-4 tabular-nums">
                          + {count - (MAX_NAMED - 1)}
                        </span>
                      ) : null}
                    </span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
