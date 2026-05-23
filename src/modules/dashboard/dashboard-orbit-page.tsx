"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import type { ClinicalActivityPoint } from "@/components/chart-area-interactive";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import type { AppointmentTableRow } from "@/components/data-table";
import { DataTable } from "@/components/data-table";
import type { SectionCardItem } from "@/components/section-cards";
import { SectionCards } from "@/components/section-cards";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";

interface DashboardOrbitPageProps {
  onOpenAIAgent?: () => void;
}

function formatCompactInteger(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function getDeltaPercent(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function parseDashboardDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = sqliteLike ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) && sqliteLike) {
    const localDate = new Date(value.replace(" ", "T"));
    return Number.isFinite(localDate.getTime()) ? localDate : null;
  }
  return Number.isFinite(date.getTime()) ? date : null;
}

export function DashboardOrbitPage({ onOpenAIAgent }: DashboardOrbitPageProps) {
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        appointments,
        owners,
        patients,
        tasks,
        transactions,
      }),
    [appointments, owners, patients, tasks, transactions]
  );

  const revenueDelta = getDeltaPercent(
    metrics.summary.income30,
    metrics.summary.previousIncome30
  );
  const appointmentsDelta = getDeltaPercent(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  const returningDelta = getDeltaPercent(
    metrics.summary.currentReturningPatients,
    metrics.summary.previousReturningPatients
  );
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const urgentTasks = tasks.filter(
    (task) => task.priority === "high" && task.status !== "done"
  ).length;

  // Clinical activity data for ChartAreaInteractive (90 derniers jours)
  const clinicalActivityData = useMemo<ClinicalActivityPoint[]>(() => {
    const ref = new Date(metrics.referenceDate);
    ref.setHours(23, 59, 59, 999);
    const days: ClinicalActivityPoint[] = [];
    for (let i = 89; i >= 0; i -= 1) {
      const day = new Date(ref);
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      let consultations = 0;
      let interventions = 0;
      for (const a of appointments) {
        if (["cancelled", "no_show"].includes(a.status)) {
          continue;
        }
        const date = parseDashboardDate(a.startTime);
        if (!date || date < dayStart || date > dayEnd) {
          continue;
        }
        consultations += 1;
        if (a.type === "Chirurgie" || a.type === "Urgence") {
          interventions += 1;
        }
      }
      days.push({
        date: day.toISOString().slice(0, 10),
        consultations,
        interventions,
      });
    }
    return days;
  }, [appointments, metrics.referenceDate]);

  // Appointment table rows for DataTable
  const appointmentTableRows = useMemo<AppointmentTableRow[]>(() => {
    const patientsById = new Map(patients.map((p) => [p.id, p]));
    const ownersById = new Map(owners.map((o) => [o.id, o]));
    const today = new Date(metrics.referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments.map((a, idx) => {
      const patient = patientsById.get(a.patientId);
      const owner = ownersById.get(a.ownerId);
      const date = parseDashboardDate(a.startTime);
      const isToday = date && date >= today && date < tomorrow;
      const isPast = date && date < today;
      const isPending = a.status === "scheduled" || a.status === "in_progress";
      const isDone = a.status === "completed";

      let tab: AppointmentTableRow["tab"] = "planning";
      if (isDone) {
        tab = "termine";
      } else if (isToday && isPending) {
        tab = "aujourdhui";
      } else if (isPast && isPending) {
        tab = "attention";
      }

      return {
        id: idx,
        patient: patient?.name || a.title,
        owner: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "—",
        species: patient?.species || "—",
        type: a.type,
        appointmentAt: date
          ? date.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
        status: a.status,
        veterinarian: `Vétérinaire ${a.vetId.slice(0, 4)}`,
        tab,
        diagnosis: a.diagnosis,
        treatment: a.treatment,
        notes: a.notes,
      };
    });
  }, [appointments, patients, owners, metrics.referenceDate]);

  // SectionCards items for first row
  const sectionCardItems: SectionCardItem[] = [
    {
      title: "Revenus 30j",
      value: `${formatCompactInteger(metrics.summary.income30)} DA`,
      badge: `${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}%`,
      trend: revenueDelta >= 0 ? "up" : "down",
      footerTitle:
        revenueDelta >= 0 ? "En hausse ce mois" : "En baisse ce mois",
      footerDescription: "vs période précédente de 30 jours",
    },
    {
      title: "RDV aujourd'hui",
      value: String(metrics.summary.todayAppointments),
      badge: `${appointmentsDelta >= 0 ? "+" : ""}${appointmentsDelta.toFixed(1)}%`,
      trend: appointmentsDelta >= 0 ? "up" : "down",
      footerTitle:
        appointmentsDelta >= 0 ? "Progression aujourd'hui" : "Moins qu'hier",
      footerDescription: "consultations planifiées",
    },
    {
      title: "Patients actifs",
      value: formatCompactInteger(metrics.summary.currentActivePatients),
      badge: `${returningDelta >= 0 ? "+" : ""}${returningDelta.toFixed(1)}%`,
      trend: returningDelta >= 0 ? "up" : "down",
      footerTitle: "Fidélisation stable",
      footerDescription: "patients actifs sur 90 jours",
    },
    {
      title: "Tâches ouvertes",
      value: String(openTasks),
      badge: `${urgentTasks} urgente${urgentTasks > 1 ? "s" : ""}`,
      trend: urgentTasks > 0 ? "down" : "up",
      footerTitle:
        urgentTasks > 0 ? "Attention requise" : "Tout est sous contrôle",
      footerDescription:
        urgentTasks > 0
          ? "tâches nécessitant une action immédiate"
          : "aucune tâche urgente",
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground tracking-tight">
            Tableau de bord
          </h1>
          <p className="mt-1 text-muted-foreground">
            Suivez l'activité de votre clinique en temps réel
          </p>
        </div>
        <div className="text-right text-muted-foreground text-sm">
          {new Date(metrics.referenceDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* SectionCards — KPI Cards */}
      <SectionCards items={sectionCardItems} />

      {/* ChartAreaInteractive — stacked area chart */}
      <ChartAreaInteractive data={clinicalActivityData} />

      {/* DataTable — shadcnspace multi-tab table */}
      <DataTable data={appointmentTableRows} />

      {onOpenAIAgent && (
        <button
          aria-label="Assistant IA"
          className="fixed right-6 bottom-6 z-50 flex size-12 items-center justify-center rounded-full bg-[var(--prospeo-active)] text-black shadow-[0_18px_38px_-22px_var(--prospeo-active)] transition-all hover:scale-105 active:scale-95"
          onClick={onOpenAIAgent}
          type="button"
        >
          <HugeiconsIcon
            className="size-5"
            icon={SparklesIcon}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
