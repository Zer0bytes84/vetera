"use client";

import { useMemo } from "react";
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

// Import our premium widgets
import { ClinicalChartsCenter } from "./components/clinical-charts-center";
import { NextAppointmentsFeed } from "./components/next-appointments-feed";
import { RemindersWidget } from "./components/reminders-widget";
import { ActivityWidget } from "./components/activity-widget";
import { SpecialtiesDistribution } from "./components/specialties-distribution";
import { TasksAlertsBoard } from "./components/tasks-alerts-board";
import { PipelineActivityFunnel } from "./components/pipeline-activity-funnel";
import { StaffStatusWidget } from "./components/staff-status-widget";
import { StockAlertsWidget } from "./components/stock-alerts-widget";
import { AutomationWidgets } from "./components/automation-widgets";

interface DashboardOrbitPageProps {
  onNavigate?: (view: string) => void;
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

export function DashboardOrbitPage({ onNavigate }: DashboardOrbitPageProps) {
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

  // 1. Clinical activity data for Charts widget (last 90 days)
  const clinicalActivityData = useMemo(() => {
    const ref = new Date(metrics.referenceDate);
    ref.setHours(23, 59, 59, 999);
    const days: Array<{ date: string; consultations: number; interventions: number }> = [];
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

  // 2. Formatting today's appointments list for NextAppointmentsFeed
  const todayAppointmentsList = useMemo(() => {
    const patientsById = new Map(patients.map((p) => [p.id, p]));
    const ownersById = new Map(owners.map((o) => [o.id, o]));
    const today = new Date(metrics.referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments
      .filter((a) => {
        const date = parseDashboardDate(a.startTime);
        return date && date >= today && date < tomorrow;
      })
      .map((a, idx) => {
        const patient = patientsById.get(a.patientId);
        const owner = ownersById.get(a.ownerId);
        const date = parseDashboardDate(a.startTime);
        return {
          id: a.id || idx,
          patient: patient?.name || a.title,
          owner: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "—",
          species: patient?.species || "—",
          type: a.type,
          time: date
            ? date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          status: a.status,
        };
      });
  }, [appointments, patients, owners, metrics.referenceDate]);

  // SectionCards items for the first row (retained as requested)
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
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 lg:px-6 pb-8 pt-16 md:pt-28">
      {/* Row 1 — Main Interactive Charts (full width) */}
      <ClinicalChartsCenter
        activityData={clinicalActivityData}
        monthlyRevenue={metrics.monthlyRevenue}
        monthlyAppointments={metrics.monthlyAppointments}
      />

      {/* Row 2 — Legacy Glowing KPI Cards */}
      <SectionCards items={sectionCardItems} />

      {/* Row 2.5 — Automation Widgets */}
      <AutomationWidgets />

      {/* Row 3 — Care Distribution, Tasks & Activity Funnel */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <SpecialtiesDistribution
            categories={metrics.topCategories}
            appointmentTypes={metrics.topAppointmentTypes}
          />
        </div>
        <div>
          <TasksAlertsBoard onNavigate={onNavigate} />
        </div>
        <div>
          <PipelineActivityFunnel
            pipelineRows={metrics.pipelineRows}
            activityDays={metrics.activityDays}
          />
        </div>
      </div>

      {/* Row 4 — Staff Status Board, Stock Alerts Inventory & Reminders */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <StaffStatusWidget
            onNavigate={onNavigate}
            referenceDate={metrics.referenceDate}
          />
        </div>
        <div>
          <StockAlertsWidget onNavigate={onNavigate} />
        </div>
        <div>
          <RemindersWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <NextAppointmentsFeed
            appointments={todayAppointmentsList}
            onNavigate={onNavigate}
          />
        </div>
        <div>
          <ActivityWidget />
        </div>
      </div>
    </div>
  );
}
