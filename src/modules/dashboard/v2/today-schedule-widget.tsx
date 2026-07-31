import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment, Owner, Patient } from "@/types/db";
import { buildTodaySchedule, formatTime, type ScheduleStatus } from "./model";
import { WidgetShell } from "./widget-shell";

const STATUS_COPY: Record<
  ScheduleStatus,
  { label: string; className: string; dot: string }
> = {
  scheduled: {
    label: "À venir",
    className:
      "border-sky-200/60 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  in_progress: {
    label: "En consultation",
    className:
      "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Terminé",
    className:
      "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Annulé",
    className:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/7 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  no_show: {
    label: "Absent",
    className:
      "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

const speciesEmoji = (species: string) => {
  const normalized = species.toLocaleLowerCase("fr-FR");
  if (normalized.includes("chat")) {
    return "🐈";
  }
  if (normalized.includes("chien")) {
    return "🐕";
  }
  if (normalized.includes("cheval")) {
    return "🐎";
  }
  if (normalized.includes("lapin")) {
    return "🐇";
  }
  return "🐾";
};

export function TodayScheduleWidget({
  appointments,
  owners,
  patients,
  referenceDate,
  onNavigateToPatient,
  onOpenAgenda,
}: {
  appointments: Appointment[];
  owners: Owner[];
  patients: Patient[];
  referenceDate: Date;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAgenda?: () => void;
}) {
  const schedule = useMemo(
    () =>
      buildTodaySchedule({
        appointments,
        owners,
        patients,
        referenceDate,
      }),
    [appointments, owners, patients, referenceDate]
  );
  const activeCount = schedule.filter(
    (entry) => entry.appointment.status === "in_progress"
  ).length;
  const completedCount = schedule.filter(
    (entry) => entry.appointment.status === "completed"
  ).length;
  const upcomingCount = schedule.filter(
    (entry) => entry.appointment.status === "scheduled"
  ).length;

  return (
    <WidgetShell
      action={
        <Button onClick={onOpenAgenda} size="sm" variant="ghost">
          Agenda
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      }
      className="min-h-[430px]"
      contentClassName="p-0"
      description={referenceDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      icon={CalendarDays}
      iconClassName="bg-sky-50 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300"
      title="Journée clinique"
    >
      <div className="grid grid-cols-3 divide-x divide-zinc-200/70 border-zinc-200/70 border-b bg-zinc-50/55 dark:divide-white/8 dark:border-white/8 dark:bg-white/[0.025]">
        {[
          [upcomingCount, "À venir"],
          [activeCount, "En cours"],
          [completedCount, "Terminés"],
        ].map(([value, label]) => (
          <div className="px-4 py-3.5" key={label}>
            <p className="font-semibold text-xl tabular-nums tracking-[-0.03em]">
              {value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {schedule.length ? (
        <div className="max-h-[320px] overflow-y-auto px-3 py-2">
          {schedule.map((entry, index) => {
            const status = STATUS_COPY[entry.appointment.status];
            return (
              <button
                className="group/row grid w-full grid-cols-[58px_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-zinc-100/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:hover:bg-white/6"
                key={entry.appointment.id}
                onClick={() =>
                  onNavigateToPatient?.(entry.appointment.patientId)
                }
                type="button"
              >
                <div className="relative self-stretch border-zinc-200/80 border-r pr-3 dark:border-white/10">
                  <p className="font-semibold text-[13px] tabular-nums">
                    {formatTime(entry.start)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                    {Math.max(
                      0,
                      Math.round(
                        (entry.end.getTime() - entry.start.getTime()) / 60_000
                      )
                    )}{" "}
                    min
                  </p>
                  {index < schedule.length - 1 ? (
                    <span className="absolute top-8 -right-px bottom-[-18px] w-px bg-zinc-200/80 dark:bg-white/10" />
                  ) : null}
                  <span
                    className={cn(
                      "absolute top-1 -right-1 size-2 rounded-full ring-4 ring-white dark:ring-zinc-950",
                      status.dot
                    )}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-sm dark:bg-white/7">
                      {speciesEmoji(entry.species)}
                    </span>
                    <p className="truncate font-semibold text-[13px] tracking-[-0.01em]">
                      {entry.patientName}
                    </p>
                    <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                      {entry.appointment.type}
                    </span>
                  </div>
                  <div className="mt-1.5 flex min-w-0 items-center gap-3 pl-9 text-[11px] text-muted-foreground">
                    <span className="truncate">{entry.ownerName}</span>
                    {entry.appointment.room ? (
                      <span className="hidden items-center gap-1 sm:flex">
                        <MapPin className="size-3" />
                        {entry.appointment.room}
                      </span>
                    ) : null}
                  </div>
                </div>

                <Badge
                  className={cn("hidden sm:inline-flex", status.className)}
                >
                  {status.label}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-[250px] place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="mt-3 font-semibold text-sm">
              Aucun rendez-vous prévu
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              La journée est libre pour les urgences et les consultations sans
              rendez-vous.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 text-[11px] text-muted-foreground dark:border-white/8">
        <span className="flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          {schedule.length} créneau{schedule.length > 1 ? "x" : ""} aujourd’hui
        </span>
        <span>
          {
            schedule.filter((entry) => entry.appointment.status !== "cancelled")
              .length
          }{" "}
          actifs
        </span>
      </div>
    </WidgetShell>
  );
}
