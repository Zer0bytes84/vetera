"use client";

import { useCallback, useMemo } from "react";
// Keep some essential widgets
import { DeferredWidget } from "@/components/deferred-widget";
import MotivationalHeader from "@/components/MotivationalHeader";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";
import { AsterConsultationsChartWidget } from "./components/aster/aster-consultations-chart-widget";
import { AsterRanking } from "./components/aster/aster-ranking";
import { AsterScoreChart } from "./components/aster/aster-score-chart";
import { AsterTasksChartWidget } from "./components/aster/aster-tasks-chart-widget";
import { AsterTopMotifsWidget } from "./components/aster/aster-top-motifs-widget";
// Import Aster widgets
import { AsterTopStats } from "./components/aster-top-stats";
import { WaitingRoomWidget } from "./components/waiting-room-widget";

interface DashboardOrbitPageProps {
  onNavigate?: (view: string) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  userDisplayName?: string;
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

export function DashboardOrbitPage({
  onNavigate,
  onNavigateToPatient,
  userDisplayName,
}: DashboardOrbitPageProps) {
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();

  const handlePatientClick = useCallback(
    (patientId: string) => {
      onNavigateToPatient?.(patientId);
    },
    [onNavigateToPatient]
  );

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

  // Formatting today's appointments list for Waiting Room
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
          patientId: a.patientId,
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

  const fullName = userDisplayName || "Dr.";

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 pt-16 pb-8 md:pt-28 lg:px-6">
      {/* Welcome Message */}
      <MotivationalHeader section="dashboard" />

      {/* Row 1: Top Stats */}
      <AsterTopStats metrics={metrics} />

      {/* Row 2: Score & Ranking */}
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
        <AsterScoreChart metrics={metrics} transactions={transactions} />
        <AsterRanking metrics={metrics} />
      </div>

      {/* Row 3: Tâches & Consultations */}
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
        <AsterTasksChartWidget className="min-h-[220px]" metrics={metrics} />
        <AsterConsultationsChartWidget
          className="min-h-[220px]"
          metrics={metrics}
        />
      </div>

      {/* Row 4: Motifs & Salle d'attente */}
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
        <AsterTopMotifsWidget metrics={metrics} />
        <WaitingRoomWidget
          appointments={todayAppointmentsList as any}
          onNavigateToPatient={handlePatientClick}
        />
      </div>
    </div>
  );
}
