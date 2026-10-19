import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppointmentTypeMeta } from "@/config/status-meta";
import { Add01Icon, Calendar01Icon } from "@/lib/hugeicons";
import { cn } from "@/lib/utils";
import type { Appointment, User as AppUser } from "@/types/db";
import { formatPersonName } from "@/utils/display-format";

import { buildWeekLoad } from "./agenda-day-load-model";
import {
  AppointmentTypeBadge,
  DAY_NAMES,
  formatDateLabel,
  formatDuration,
  formatTimeCompact,
  isSameDay,
} from "./agenda-shared";
import "./agenda-cards.css";

export interface AgendaDayLoadCardProps {
  dayLoadSummary: { count: number; vet: AppUser }[];
  engagedVetsCount: number;
  /** Nombre de rendez-vous d'un jour donné (même source que le calendrier). */
  getAppointmentCount?: (date: Date) => number;
  /** Prochain rendez-vous maintenu après la journée affichée. */
  nextAppointment?: { appointment: Appointment; patientName: string } | null;
  onCreateAppointment?: () => void;
  onSelectDate?: (date: Date) => void;
  selectedDate: Date;
  totalPlannedMinutes: number;
  typeSummary: { count: number; type: Appointment["type"] }[];
  urgentOpenCount: number;
  /** Jours de la semaine affichée (lundi à dimanche). */
  weekDays?: Date[];
}

/** Panneau « Charge de la journée » de l'Agenda. */
export function AgendaDayLoadCard({
  dayLoadSummary,
  engagedVetsCount,
  getAppointmentCount,
  nextAppointment,
  onCreateAppointment,
  onSelectDate,
  selectedDate,
  totalPlannedMinutes,
  typeSummary,
  urgentOpenCount,
  weekDays,
}: AgendaDayLoadCardProps) {
  const dayCount = typeSummary.reduce((sum, entry) => sum + entry.count, 0);
  const maxVetCount = Math.max(1, ...dayLoadSummary.map((entry) => entry.count));

  return (
    <Card className="agenda-load-card agenda-side-panel board-frame">
      <CardHeader className="border-border border-b px-5 py-4">
        <CardDescription>Charge de la journée</CardDescription>
        <CardTitle className="font-medium text-[18px] tracking-[-0.02em]">
          {formatDateLabel(selectedDate)}
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-5 px-5 py-5">
        {dayCount > 0 ? (
          <>
            <div className="agenda-load-hero">
              <p className="agenda-load-figure">
                {formatDuration(totalPlannedMinutes)}
              </p>
              <p className="agenda-load-caption">
                planifiées · {dayCount} rendez-vous
              </p>
            </div>

            <div className="grid gap-2.5">
              <div
                aria-hidden="true"
                className="agenda-load-bar"
              >
                {typeSummary.map((entry) => (
                  <span
                    className={cn(
                      "agenda-load-bar-segment",
                      getAppointmentTypeMeta(entry.type).dotClassName
                    )}
                    key={entry.type}
                    style={{ flexGrow: entry.count }}
                  />
                ))}
              </div>
              <ul className="grid gap-1.5" aria-label="Rendez-vous par type">
                {typeSummary.map((entry) => (
                  <li className="agenda-load-legend" key={entry.type}>
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          getAppointmentTypeMeta(entry.type).dotClassName
                        )}
                      />
                      <span>{entry.type}</span>
                    </span>
                    <span className="agenda-load-count">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            {dayLoadSummary.length > 0 ? (
              <ul className="agenda-load-section grid gap-3" aria-label="Rendez-vous par vétérinaire">
                {dayLoadSummary.map((entry) => (
                  <li className="grid gap-1.5" key={entry.vet.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="agenda-load-name truncate">
                          {formatPersonName(entry.vet.displayName)}
                        </p>
                        <p className="agenda-load-muted">
                          {entry.vet.specialty || "Consultation générale"}
                        </p>
                      </div>
                      <span className="agenda-load-count">{entry.count}</span>
                    </div>
                    <span aria-hidden="true" className="agenda-load-meter">
                      <span style={{ width: `${(entry.count / maxVetCount) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <dl className="agenda-load-section agenda-load-stats">
              <div>
                <dt>Urgences</dt>
                <dd>{urgentOpenCount}</dd>
              </div>
              <div>
                <dt>Mobilisés</dt>
                <dd>{engagedVetsCount}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="agenda-load-empty">
              <span className="agenda-load-empty-icon">
                <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={1.5} />
              </span>
              <p className="agenda-load-empty-title">Journée libre</p>
              <p className="agenda-load-caption">
                Aucun rendez-vous planifié ce jour-là.
              </p>
              {onCreateAppointment ? (
                <Button
                  className="mt-1"
                  onClick={onCreateAppointment}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon
                    data-icon="inline-start"
                    icon={Add01Icon}
                    strokeWidth={1.5}
                  />
                  Planifier un rendez-vous
                </Button>
              ) : null}
            </div>

            {nextAppointment !== undefined ? (
              <div className="agenda-load-section grid gap-2.5">
                <p className="agenda-load-label">Prochain rendez-vous</p>
                {nextAppointment ? (
                  <div className="agenda-load-next">
                    <div className="min-w-0">
                      <p className="agenda-load-name truncate">
                        {nextAppointment.patientName}
                      </p>
                      <p className="agenda-load-muted">
                        {formatDateLabel(new Date(nextAppointment.appointment.startTime), {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}{" "}
                        · {formatTimeCompact(nextAppointment.appointment.startTime)}
                      </p>
                    </div>
                    <AppointmentTypeBadge type={nextAppointment.appointment.type} />
                    {onSelectDate ? (
                      <Button
                        className="agenda-load-next-action"
                        onClick={() =>
                          onSelectDate(new Date(nextAppointment.appointment.startTime))
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Voir la journée
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="agenda-load-muted">
                    Aucun rendez-vous planifié après cette date.
                  </p>
                )}
              </div>
            ) : null}
          </>
        )}

        {weekDays && getAppointmentCount ? (
          <WeekStrip
            days={buildWeekLoad(weekDays, getAppointmentCount)}
            onSelectDate={onSelectDate}
            selectedDate={selectedDate}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function WeekStrip({
  days,
  onSelectDate,
  selectedDate,
}: {
  days: ReturnType<typeof buildWeekLoad>;
  onSelectDate?: (date: Date) => void;
  selectedDate: Date;
}) {
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return (
    <div className="agenda-load-section grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="agenda-load-label">Semaine</p>
        <p className="agenda-load-muted tabular-nums">
          {total} rendez-vous
        </p>
      </div>
      <ol className="agenda-week-strip">
        {days.map((day, index) => {
          const selected = isSameDay(day.date, selectedDate);
          const label = `${formatDateLabel(day.date, { weekday: "long", day: "numeric", month: "long" })} : ${day.count} rendez-vous`;
          return (
            <li key={day.date.toISOString()}>
              <button
                aria-current={selected ? "date" : undefined}
                aria-label={label}
                className="agenda-week-day"
                data-selected={selected || undefined}
                disabled={!onSelectDate}
                onClick={() => onSelectDate?.(day.date)}
                title={label}
                type="button"
              >
                <span className="agenda-week-count">{day.count}</span>
                <span className="agenda-week-track" aria-hidden="true">
                  <span style={{ height: `${Math.max(day.ratio * 100, day.count > 0 ? 12 : 0)}%` }} />
                </span>
                <span className="agenda-week-name">{DAY_NAMES[index]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
