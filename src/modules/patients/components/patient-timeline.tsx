import {
  CalendarBlank,
  Notebook,
  Stethoscope,
  Syringe,
  TrendUp,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  useAppointmentsRepository,
  useVaccinationsRepository,
  useWeightEntriesRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Appointment, Vaccination, WeightEntry } from "@/types/db";

type TimelineKind = "consultation" | "vaccination" | "weight";

type TimelineEntry = {
  id: string;
  at: string;
  kind: TimelineKind;
  label: string;
  context?: string;
  summary: string;
  summaryDetail?: string;
  statusBadge?: { label: string; className: string };
  weightEntry?: WeightEntry;
};

const KIND_ICON: Record<TimelineKind, typeof Stethoscope> = {
  consultation: Stethoscope,
  vaccination: Syringe,
  weight: TrendUp,
};

const KIND_COLOR: Record<TimelineKind, string> = {
  consultation: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  vaccination:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  weight:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

interface PatientTimelineProps {
  className?: string;
  onEditWeight?: (entry: WeightEntry) => void;
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
  confirmed: {
    label: "Confirmé",
    className:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  },
  arrived: {
    label: "Arrivé",
    className:
      "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  },
  waiting: {
    label: "En attente",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
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
    className:
      "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-300",
  },
  no_show: {
    label: "Absent",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
};

const TYPE_LABEL: Record<Appointment["type"], string> = {
  Consultation: "Consultation",
  Vaccin: "Vaccin",
  Chirurgie: "Chirurgie",
  Urgence: "Urgence",
  Contrôle: "Contrôle",
};

function formatDateParts(iso: string, includeTime: boolean) {
  if (!includeTime) {
    const civilDate = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (civilDate) {
      const [, year, month, day] = civilDate;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      return {
        date: date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
          year: "numeric",
        }),
        time: null,
      };
    }
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { date: "—", time: null };
  }
  return {
    date: date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: includeTime
      ? date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
  };
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
      label: TYPE_LABEL[apt.type],
      context: apt.reason?.trim() || undefined,
      summary:
        apt.diagnosis?.trim() ||
        apt.treatment?.trim() ||
        apt.notes?.trim() ||
        "Compte rendu non renseigné",
      summaryDetail:
        apt.diagnosis?.trim() && apt.treatment?.trim()
          ? `Traitement · ${apt.treatment.trim()}`
          : apt.diagnosis?.trim() && apt.notes?.trim()
            ? apt.notes.trim()
            : undefined,
      statusBadge: { label: status.label, className: status.className },
    });
  }

  for (const vacc of vaccinations) {
    items.push({
      id: `vacc-${vacc.id}`,
      at: vacc.administeredAt,
      kind: "vaccination",
      label: "Vaccination",
      context: vacc.vaccineType,
      summary: vacc.vaccineName,
      summaryDetail: vacc.notes,
      statusBadge: {
        label: "Administré",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      },
    });
  }

  for (const w of weights) {
    items.push({
      id: `w-${w.id}`,
      at: w.measuredAt,
      kind: "weight",
      label: "Pesée",
      context: w.bcs == null ? undefined : `Score corporel ${w.bcs}/9`,
      summary: `${w.weightKg.toFixed(2)} kg`,
      summaryDetail: w.notes,
      statusBadge: {
        label: "Enregistrée",
        className:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      },
      weightEntry: w,
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function PatientTimeline({
  className,
  onEditWeight,
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
    [appointmentsRepo.data, vaccinationsRepo, weightsRepo, patientId]
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-1 flex-col">
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
          <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
          <table className="w-full min-w-[900px] table-fixed text-left text-sm">
            <caption className="sr-only">Historique clinique complet du patient</caption>
            <thead className="border-border/70 border-b bg-muted/30 text-muted-foreground">
              <tr>
                <th className="w-[15%] px-5 py-3.5 font-medium">Date</th>
                <th className="w-[22%] px-5 py-3.5 font-medium">Événement</th>
                <th className="w-[35%] px-5 py-3.5 font-medium">Résumé clinique</th>
                <th className="w-[12%] px-5 py-3.5 font-medium">Statut</th>
                <th className="w-[16%] px-5 py-3.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
            {entries.map((entry) => {
              const Icon = KIND_ICON[entry.kind];
              const dateParts = formatDateParts(
                entry.at,
                entry.kind === "consultation"
              );
              return (
                <tr className="group align-middle transition-colors hover:bg-muted/20" key={entry.id}>
                  <td className="px-5 py-4">
                    <time className="block text-xs leading-5" dateTime={entry.at}>
                      <span className="block font-medium text-foreground/80">{dateParts.date}</span>
                      {dateParts.time ? (
                        <span className="block text-muted-foreground">{dateParts.time}</span>
                      ) : null}
                    </time>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", KIND_COLOR[entry.kind])}>
                        <Icon className="size-4" weight="duotone" />
                      </span>
                      <div className="min-w-0">
                        <span className="block break-words font-semibold text-sm leading-5">
                          {entry.label}
                        </span>
                        {entry.context ? (
                          <span className="mt-0.5 block line-clamp-2 text-muted-foreground text-xs leading-4">
                            {entry.context}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className={cn(
                      "break-words text-sm leading-5",
                      entry.summary === "Compte rendu non renseigné"
                        ? "text-muted-foreground"
                        : "font-medium text-foreground/85"
                    )}>
                      {entry.summary}
                    </p>
                    {entry.summaryDetail ? (
                      <p className="mt-1 line-clamp-2 break-words text-muted-foreground text-xs leading-4">
                        {entry.summaryDetail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    {entry.statusBadge ? (
                        <Badge
                          className={cn("rounded-full px-2 py-0.5 font-medium text-[10px]", entry.statusBadge.className)}
                          variant="secondary"
                        >
                          {entry.statusBadge.label}
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {entry.kind === "consultation" && onJumpToAppointment ? (
                      <Button
                        className="h-9 gap-1.5 rounded-lg px-2.5 text-xs"
                        onClick={() => onJumpToAppointment(entry.id.replace(/^apt-/, ""))}
                        size="sm"
                        variant="ghost"
                      >
                        Note clinique
                        <Notebook className="size-3.5" weight="duotone" />
                      </Button>
                    ) : entry.kind === "weight" && entry.weightEntry && onEditWeight ? (
                      <Button
                        className="h-9 rounded-lg px-2.5 text-xs"
                        onClick={() => onEditWeight(entry.weightEntry!)}
                        size="sm"
                        variant="ghost"
                      >
                        Modifier
                      </Button>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
