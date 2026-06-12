import {
  CalendarBlank,
  Scales,
  Stethoscope,
  Syringe,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
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

  const items: SectionCardItem[] = [
    {
      title: t("patientDetail.kpi.currentWeight"),
      value: lastWeight
        ? `${lastWeight.weightKg.toFixed(2)} kg`
        : t("patientDetail.kpi.noWeight"),
      badge:
        weightDelta ?? (lastWeight ? t("patientDetail.kpi.lastWeight") : "—"),
      footerTitle: lastWeight
        ? (formatDateShort(lastWeight.measuredAt) ?? "—")
        : t("patientDetail.kpi.noWeight"),
      footerDescription: t("patientDetail.kpi.trend"),
      trend: weightTrend,
      icon: Scales,
    },
    {
      title: t("patientDetail.kpi.lastVisit"),
      value: lastVisitFormatted ?? t("patientDetail.kpi.never"),
      badge:
        daysSinceLastVisit == null
          ? "—"
          : daysSinceLastVisit === 0
            ? t("common.today", { defaultValue: "Aujourd'hui" })
            : `${Math.abs(daysSinceLastVisit)} j`,
      footerTitle:
        daysSinceLastVisit == null
          ? "—"
          : daysSinceLastVisit > 0
            ? t("patientDetail.kpi.lastVisit")
            : "",
      footerDescription:
        daysSinceLastVisit == null
          ? ""
          : daysSinceLastVisit > 0
            ? t("common.daysAgo", {
                count: daysSinceLastVisit,
                defaultValue: "Il y a {{count}} jours",
              })
            : "",
      trend: "neutral",
      icon: Stethoscope,
    },
    {
      title: t("patientDetail.kpi.nextVaccine"),
      value: nextVaccination?.vaccineName ?? t("patientDetail.kpi.nonePlanned"),
      badge:
        nextVaccDaysOut == null
          ? "—"
          : nextVaccDaysOut < 0
            ? `${Math.abs(nextVaccDaysOut)} j`
            : nextVaccDaysOut === 0
              ? t("common.today", { defaultValue: "Aujourd'hui" })
              : `${nextVaccDaysOut} j`,
      footerTitle: nextVaccination?.nextDueAt
        ? (formatDateShort(nextVaccination.nextDueAt) ?? "—")
        : "—",
      footerDescription:
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
      badge:
        nextApptDaysOut == null
          ? "—"
          : nextApptDaysOut === 0
            ? t("common.today", { defaultValue: "Aujourd'hui" })
            : nextApptDaysOut < 0
              ? `${Math.abs(nextApptDaysOut)} j`
              : `${nextApptDaysOut} j`,
      footerTitle: nextApptDate
        ? (formatDateShort(nextApptDate.toISOString()) ?? "—")
        : "—",
      footerDescription: nextAppointment?.type ?? "",
      trend: "neutral",
      icon: CalendarBlank,
    },
  ];

  return <SectionCards items={items} />;
}
