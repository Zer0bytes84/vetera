import {
  ArrowUpRight,
  CalendarBlank,
  Scales,
  Stethoscope,
  Syringe,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Appointment, Vaccination, WeightEntry } from "@/types/db";

interface PatientKpiStripProps {
  className?: string;
  lastVisit?: string;
  nextAppointment?: Appointment;
  nextVaccination?: Vaccination | null;
  now: number;
  onAppointmentClick: () => void;
  onTimelineClick: () => void;
  onVaccinationClick: () => void;
  onWeightClick: () => void;
  weightEntries: WeightEntry[];
}

function formatDateShort(value: string | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function diffDays(target: Date, now: Date) {
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function PatientKpiStrip({
  className,
  lastVisit,
  nextAppointment,
  nextVaccination,
  now,
  onAppointmentClick,
  onTimelineClick,
  onVaccinationClick,
  onWeightClick,
  weightEntries,
}: PatientKpiStripProps) {
  const { t } = useTranslation();
  const currentDate = new Date(now);

  const sortedWeights = [...weightEntries].sort(
    (a, b) =>
      new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );
  const lastWeight = sortedWeights[sortedWeights.length - 1];
  const previousWeight = sortedWeights[sortedWeights.length - 2];

  let weightTrend: "up" | "down" | "neutral" = "neutral";
  let weightDelta: string | null = null;
  if (lastWeight && previousWeight) {
    const diff = lastWeight.weightKg - previousWeight.weightKg;
    if (Math.abs(diff) < 0.05) {
      weightTrend = "neutral";
      weightDelta = "0 kg";
    } else {
      weightTrend = diff > 0 ? "up" : "down";
      weightDelta = `${diff > 0 ? "+" : ""}${diff.toFixed(2)} kg`;
    }
  }

  const lastVisitFormatted = formatDateShort(lastVisit);
  const daysSinceLastVisit =
    lastVisitFormatted && lastVisit
      ? -diffDays(new Date(lastVisit), currentDate)
      : null;

  const nextApptDate = nextAppointment
    ? new Date(nextAppointment.startTime)
    : null;
  const nextApptDaysOut = nextApptDate
    ? diffDays(nextApptDate, currentDate)
    : null;

  const nextVaccDate = nextVaccination?.nextDueAt
    ? new Date(nextVaccination.nextDueAt)
    : null;
  const nextVaccDaysOut = nextVaccDate
    ? diffDays(nextVaccDate, currentDate)
    : null;

  const items = [
    {
      title: t("patientDetail.kpi.currentWeight"),
      value: lastWeight
        ? `${lastWeight.weightKg.toFixed(2)} kg`
        : "À renseigner",
      detail:
        weightDelta ??
        (lastWeight ? t("patientDetail.kpi.lastWeight") : "Aucune pesée"),
      caption: lastWeight
        ? (formatDateShort(lastWeight.measuredAt) ?? "—")
        : "Ajoutez une première mesure",
      trend: weightTrend,
      icon: Scales,
      onClick: onWeightClick,
    },
    {
      title: t("patientDetail.kpi.lastVisit"),
      value: lastVisitFormatted ?? t("patientDetail.kpi.never"),
      detail:
        daysSinceLastVisit == null
          ? "—"
          : daysSinceLastVisit === 0
            ? t("common.today", { defaultValue: "Aujourd'hui" })
            : `${Math.abs(daysSinceLastVisit)} j`,
      caption:
        daysSinceLastVisit == null
          ? "—"
          : daysSinceLastVisit > 0
            ? t("patientDetail.kpi.lastVisit")
            : "",
      trend: "neutral",
      icon: Stethoscope,
      onClick: onTimelineClick,
    },
    {
      title: t("patientDetail.kpi.nextVaccine"),
      value: nextVaccination?.vaccineName ?? t("patientDetail.kpi.nonePlanned"),
      detail:
        nextVaccDaysOut == null
          ? "—"
          : nextVaccDaysOut < 0
            ? `${Math.abs(nextVaccDaysOut)} j`
            : nextVaccDaysOut === 0
              ? t("common.today", { defaultValue: "Aujourd'hui" })
              : `${nextVaccDaysOut} j`,
      caption: nextVaccination?.nextDueAt
        ? (formatDateShort(nextVaccination.nextDueAt) ?? "—")
        : "Aucun rappel programmé",
      trendLabel:
        nextVaccDaysOut == null
          ? ""
          : nextVaccDaysOut < 0
            ? t("patientDetail.vaccinations.status.overdue", {
                defaultValue: "En retard",
              })
            : nextVaccDaysOut < 30
              ? t("patientDetail.vaccinations.status.dueSoon", {
                  defaultValue: "Bientôt dû",
                })
              : t("patientDetail.vaccinations.status.upToDate", {
                  defaultValue: "À jour",
                }),
      trend:
        nextVaccDaysOut == null
          ? "neutral"
          : nextVaccDaysOut < 0
            ? "down"
            : nextVaccDaysOut < 30
              ? "neutral"
              : "up",
      icon: Syringe,
      onClick: onVaccinationClick,
    },
    {
      title: t("patientDetail.kpi.nextAppointment"),
      value: nextAppointment?.title ?? t("patientDetail.kpi.noAppointment"),
      detail:
        nextApptDaysOut == null
          ? "—"
          : nextApptDaysOut === 0
            ? t("common.today", { defaultValue: "Aujourd'hui" })
            : nextApptDaysOut < 0
              ? `${Math.abs(nextApptDaysOut)} j`
              : `${nextApptDaysOut} j`,
      caption: nextApptDate
        ? (formatDateShort(nextApptDate.toISOString()) ?? "—")
        : "Aucun créneau à venir",
      trend: "neutral",
      icon: CalendarBlank,
      onClick: onAppointmentClick,
    },
  ];

  return (
    <section
      aria-label="Repères cliniques"
      className={cn(
        "grid overflow-hidden rounded-2xl border border-border/70 bg-card sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-border/70",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const requiresAttention = item.trend === "down";

        return (
          <button
            aria-label={`Ouvrir ${item.title}`}
            className="clinical-interactive group min-h-[132px] min-w-0 border-border/70 border-b px-4 py-4 text-left last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:[&:nth-child(odd)]:border-r-0"
            key={item.title}
            onClick={item.onClick}
            type="button"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  requiresAttention
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-4" weight="duotone" />
              </span>
              <div className="min-w-0">
                <span className="block font-semibold text-muted-foreground text-xs">
                  {item.title}
                </span>
                <p className="mt-1 line-clamp-2 break-words font-semibold text-base leading-5 tracking-[-0.02em]">
                  {item.value}
                </p>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 items-end justify-between gap-3 pl-12 text-muted-foreground text-xs">
              <span className="min-w-0 leading-4">
                <span className="block font-medium text-foreground/75">{item.detail}</span>
                <span className="mt-0.5 block line-clamp-2">{item.caption}</span>
              </span>
              {"trendLabel" in item && item.trendLabel ? (
                <span className={cn("shrink-0 font-medium", requiresAttention && "text-rose-600 dark:text-rose-300")}>
                  {item.trendLabel}
                </span>
              ) : (
                <ArrowUpRight className="size-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              )}
            </div>
          </button>
        );
      })}
    </section>
  );
}
