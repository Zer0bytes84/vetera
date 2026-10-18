import { ArrowLeft01Icon, ArrowRight01Icon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { getAppointmentTypeMeta } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/db";

const DAY_NAMES = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MAX_DOTS = 4;

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
 * day listed below. Each day shows how many appointments it holds.
 */
export function AgendaMonthCalendar({
  getAppointmentsForDate,
  monthDays,
  onSelectDate,
  selectedDate,
}: {
  getAppointmentsForDate: (date: Date) => Appointment[];
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
        <div className="flex items-center gap-1">
          <Button
            aria-label="Mois précédent"
            onClick={() => onSelectDate(shiftMonth(selectedDate, -1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} />
          </Button>
          <h2 className="min-w-40 text-center font-medium text-[18px] text-foreground tracking-[-0.02em]">
            {monthLabel}
          </h2>
          <Button
            aria-label="Mois suivant"
            onClick={() => onSelectDate(shiftMonth(selectedDate, 1))}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} />
          </Button>
        </div>
        <Button
          disabled={sameDay(selectedDate, today)}
          onClick={() => onSelectDate(new Date())}
          size="sm"
          variant="outline"
        >
          Aujourd&apos;hui
        </Button>
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
                  className="h-[72px] bg-muted/30"
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
                  "agenda-month-day relative flex h-[72px] min-w-0 flex-col items-start justify-between bg-card px-2 py-1.5 text-left text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
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
                  <span className="flex w-full min-w-0 items-center gap-1">
                    <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
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
                    <span className="hidden truncate text-[12px] text-muted-foreground tabular-nums sm:inline">
                      {count} RDV
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
