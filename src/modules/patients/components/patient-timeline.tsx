import {
  CalendarBlank,
  Stethoscope,
  Syringe,
  TrendUp,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useAppointmentsRepository } from "@/data/repositories";
import {
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type {
  Appointment,
  Vaccination,
  WeightEntry,
} from "@/types/db";

type TimelineKind = "consultation" | "vaccination" | "weight";

type TimelineEntry = {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  description?: string;
  meta?: string;
  statusBadge?: { label: string; className: string };
};

const KIND_ICON: Record<TimelineKind, typeof Stethoscope> = {
  consultation: Stethoscope,
  vaccination: Syringe,
  weight: TrendUp,
};

const KIND_COLOR: Record<TimelineKind, string> = {
  consultation:
    "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  vaccination:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  weight: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

interface PatientTimelineProps {
  className?: string;
  onJumpToAppointment?: (appointmentId: string) => void;
  patientId: string;
}

const APPOINTMENT_STATUS_META: Record<
  Appointment["status"],
  { label: string; className: string }
> = {
  scheduled: {
    label: "Planifié",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
  in_progress: {
    label: "En cours",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  completed: {
    label: "Terminé",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  cancelled: {
    label: "Annulé",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-300",
  },
  no_show: {
    label: "Absent",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
};

const TYPE_LABEL: Record<Appointment["type"], string> = {
  Consultation: "Consultation",
  Vaccin: "Vaccin",
  Chirurgie: "Chirurgie",
  Urgence: "Urgence",
  Contrôle: "Contrôle",
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildEntries(
  appointments: Appointment[],
  vaccinations: Vaccination[],
  weights: WeightEntry[]
): TimelineEntry[] {
  const items: TimelineEntry[] = [];

  for (const apt of appointments) {
    const status = APPOINTMENT_STATUS_META[apt.status];
    items.push({
      id: `apt-${apt.id}`,
      at: apt.startTime,
      kind: "consultation",
      title: apt.title || apt.reason || TYPE_LABEL[apt.type],
      description: apt.diagnosis ?? apt.notes,
      meta: TYPE_LABEL[apt.type],
      statusBadge: { label: status.label, className: status.className },
    });
  }

  for (const vacc of vaccinations) {
    items.push({
      id: `vacc-${vacc.id}`,
      at: vacc.administeredAt,
      kind: "vaccination",
      title: vacc.vaccineName,
      description: vacc.notes,
      meta: vacc.vaccineType,
    });
  }

  for (const w of weights) {
    items.push({
      id: `w-${w.id}`,
      at: w.measuredAt,
      kind: "weight",
      title: `${w.weightKg.toFixed(2)} kg`,
      description: w.notes,
      meta: w.bcs != null ? `BCS ${w.bcs}/9` : undefined,
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function PatientTimeline({
  className,
  onJumpToAppointment,
  patientId,
}: PatientTimelineProps) {
  const { t } = useTranslation();
  const appointmentsRepo = useAppointmentsRepository();
  const vaccinationsRepo = useVaccinationsRepository();
  const weightsRepo = useWeightEntriesRepository();

  const entries = useMemo(
    () =>
      buildEntries(
        appointmentsRepo.data.filter((apt) => apt.patientId === patientId),
        vaccinationsRepo.forPatient(patientId),
        weightsRepo.forPatient(patientId)
      ),
    [
      appointmentsRepo.data,
      vaccinationsRepo,
      weightsRepo,
      patientId,
    ]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {t("patientDetail.timeline.title")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("patientDetail.timeline.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <CalendarBlank
                  className="size-7 text-muted-foreground"
                  weight="duotone"
                />
              </EmptyMedia>
              <EmptyTitle>{t("patientDetail.timeline.empty")}</EmptyTitle>
              <EmptyDescription>
                {t("patientDetail.timeline.subtitle")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="relative space-y-4">
            <span
              aria-hidden
              className="absolute left-[11px] top-1 bottom-1 w-px bg-border/60"
            />
            {entries.map((entry) => {
              const Icon = KIND_ICON[entry.kind];
              return (
                <li
                  className="group relative flex items-start gap-3 pl-1"
                  key={entry.id}
                >
                  <span
                    className={cn(
                      "z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ring-2 ring-background",
                      KIND_COLOR[entry.kind]
                    )}
                  >
                    <Icon className="size-3.5" weight="duotone" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold">
                        {entry.title}
                      </span>
                      {entry.meta ? (
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {entry.meta}
                        </span>
                      ) : null}
                      {entry.statusBadge ? (
                        <Badge
                          className={cn(
                            "rounded-full px-1.5 py-0 text-[10px] font-medium",
                            entry.statusBadge.className
                          )}
                          variant="secondary"
                        >
                          {entry.statusBadge.label}
                        </Badge>
                      ) : null}
                    </div>
                    {entry.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {entry.description}
                      </p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                      <span>
                        {entry.kind === "weight"
                          ? formatDate(entry.at)
                          : formatDateTime(entry.at)}
                      </span>
                      {entry.kind === "consultation" && onJumpToAppointment ? (
                        <Button
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() =>
                            onJumpToAppointment(
                              entry.id.replace(/^apt-/, "")
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          {t("patientDetail.timeline.openConsultation")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
