import {
  CalendarBlank,
  Scales,
  Stethoscope,
  Syringe,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Appointment, Vaccination, WeightEntry } from "@/types/db";

interface PatientKpiStripProps {
  lastVisit?: string;
  nextAppointment?: Appointment;
  nextVaccination?: Vaccination | null;
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
  lastVisit,
  nextAppointment,
  nextVaccination,
  weightEntries,
}: PatientKpiStripProps) {
  const { t } = useTranslation();
  const now = new Date();

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
  const daysSinceLastVisit = lastVisitFormatted
    ? -diffDays(new Date(lastVisit), now)
    : null;

  const nextApptDate = nextAppointment
    ? new Date(nextAppointment.startTime)
    : null;
  const nextApptDaysOut = nextApptDate ? diffDays(nextApptDate, now) : null;

  const nextVaccDate = nextVaccination?.nextDueAt
    ? new Date(nextVaccination.nextDueAt)
    : null;
  const nextVaccDaysOut = nextVaccDate ? diffDays(nextVaccDate, now) : null;

  const items = [
    {
      title: t("patientDetail.kpi.currentWeight"),
      value: lastWeight
        ? `${lastWeight.weightKg.toFixed(2)} kg`
        : "À renseigner",
      detail: weightDelta ?? (lastWeight ? t("patientDetail.kpi.lastWeight") : "Aucune pesée"),
      caption: lastWeight
        ? (formatDateShort(lastWeight.measuredAt) ?? "—")
        : "Ajoutez une première mesure",
      trend: weightTrend,
      icon: Scales,
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
    },
  ];

  return (
    <section
      aria-label="Repères cliniques"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const tone =
          item.trend === "down"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : item.trend === "up"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-sky-500/10 text-sky-600 dark:text-sky-400";

        return (
          <div
            className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm"
            key={item.title}
          >
            <div className="flex items-center gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-xl", tone)}>
                <Icon className="size-4" weight="duotone" />
              </span>
              <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
                {item.title}
              </span>
            </div>
            <p className="mt-4 truncate font-semibold text-lg tracking-[-0.03em]">
              {item.value}
            </p>
            <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-muted-foreground text-xs">
              <span className="truncate">{item.detail}</span>
              {"trendLabel" in item && item.trendLabel ? (
                <span className="shrink-0">{item.trendLabel}</span>
              ) : null}
            </div>
            <p className="mt-3 truncate border-border/70 border-t pt-3 text-muted-foreground text-xs">
              {item.caption}
            </p>
          </div>
        );
      })}
    </section>
  );
}
