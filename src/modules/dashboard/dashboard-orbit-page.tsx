"use client";

import React, { useMemo, useCallback } from "react";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";

// Import Aster widgets
import { AsterTopStats } from "./components/aster-top-stats";
import { AsterScoreChart } from "./components/aster/aster-score-chart";
import { AsterRanking } from "./components/aster/aster-ranking";

import { AsterRevenueBreakdown } from "./components/aster/aster-revenue-breakdown";
import { AsterTasksList } from "./components/aster/aster-tasks-list";

// Keep some essential widgets
import { DeferredWidget } from "@/components/deferred-widget";
import { WaitingRoomWidget } from "./components/waiting-room-widget";

interface DashboardOrbitPageProps {
  onNavigate?: (view: string) => void;
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

export function DashboardOrbitPage({ onNavigate, userDisplayName }: DashboardOrbitPageProps) {
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();

  const handlePatientClick = useCallback(
    (patientId: string) => {
      onNavigate?.(`#/patient/${patientId}`);
    },
    [onNavigate]
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
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-5 px-4 lg:px-6 pb-8 pt-16 md:pt-28">
      
      {/* Welcome Message */}
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          Bonjour{" "}
          <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent uppercase">
            {fullName}
          </span>
          👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Voici un résumé de l'activité de votre clinique aujourd'hui.
        </p>
      </div>

      {/* Row 1: Top Stats */}
      <AsterTopStats metrics={metrics} />

      {/* Row 2: Score & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        <AsterScoreChart metrics={metrics} />
        <AsterRanking metrics={metrics} />
      </div>

      {/* Row 3: Revenue Breakdown & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        <AsterRevenueBreakdown metrics={metrics} />
        <AsterTasksList metrics={metrics} />
      </div>

      {/* Row 4: Salle d'attente (Waiting Room) */}
      <DeferredWidget minHeight={300}>
        <div className="grid grid-cols-1 gap-5">
          <WaitingRoomWidget
            appointments={todayAppointmentsList as any}
            onNavigateToPatient={handlePatientClick}
          />
        </div>
      </DeferredWidget>
    </div>
  );
}
