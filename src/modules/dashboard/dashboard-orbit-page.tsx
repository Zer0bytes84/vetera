"use client";

import { useCallback, useMemo } from "react";
import MotivationalHeader from "@/components/MotivationalHeader";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";
import type { View } from "@/types";
import { AsterConsultationsChartWidget } from "./components/aster/aster-consultations-chart-widget";
import { AsterScoreChart } from "./components/aster/aster-score-chart";
import { AsterTasksChartWidget } from "./components/aster/aster-tasks-chart-widget";
import { AsterTopStats } from "./components/aster-top-stats";
import { ClinicPipelineOrbit } from "./components/clinic-pipeline-orbit";
import {
  type DashboardLayoutBlock,
  DashboardLayoutManager,
} from "./components/dashboard-layout-manager";
import { OwnerAddressBookWidget } from "./components/owner-address-book-widget";
import { PatientPopulationWidget } from "./components/patient-population-widget";
import {
  type WaitingRoomAppointment,
  WaitingRoomWidget,
} from "./components/waiting-room-widget";

interface DashboardOrbitPageProps {
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  userDisplayName?: string;
}

const SQLITE_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function parseDashboardDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const sqliteLike = SQLITE_TIMESTAMP_REGEX.test(value);
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
  userDisplayName: _userDisplayName,
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
  const todayAppointmentsList = useMemo<WaitingRoomAppointment[]>(() => {
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
          id: a.id || `appointment-${idx}`,
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

  const dashboardBlocks: DashboardLayoutBlock[] = [
    {
      id: "clinical-overview",
      label: "Vue clinique",
      description: "Activité des consultations et population suivie",
      content: (
        <section aria-label="Analyse clinique">
          <div className="grid w-full grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <AsterConsultationsChartWidget
              className="xl:col-span-7"
              metrics={metrics}
            />
            <PatientPopulationWidget
              className="xl:col-span-5"
              onOpenPatients={() => onNavigate?.("patients")}
              patients={patients}
              referenceDate={metrics.referenceDate}
            />
          </div>
        </section>
      ),
    },
    {
      id: "key-metrics",
      label: "Indicateurs clés",
      description: "Repères essentiels du cabinet",
      content: <AsterTopStats metrics={metrics} onNavigate={onNavigate} />,
    },
    {
      id: "owner-directory",
      label: "Carnet propriétaires",
      description: "Contacts, patients liés et dossiers médicaux",
      content: (
        <OwnerAddressBookWidget
          appointments={appointments}
          onNavigateToPatient={handlePatientClick}
          onOpenPatients={() => onNavigate?.("patients")}
          owners={owners}
          patients={patients}
        />
      ),
    },
    {
      id: "daily-operations",
      label: "Activité du jour",
      description: "Salle d’attente et flux des rendez-vous",
      content: (
        <section aria-label="Activité du jour">
          <div className="grid w-full grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <WaitingRoomWidget
              appointments={todayAppointmentsList}
              className="xl:col-span-7"
              onNavigateToPatient={handlePatientClick}
              onOpenAgenda={() => onNavigate?.("agenda")}
            />
            <ClinicPipelineOrbit
              className="xl:col-span-5"
              rows={metrics.pipelineRows}
              title="Flux des rendez-vous"
            />
          </div>
        </section>
      ),
    },
    {
      id: "business-operations",
      label: "Pilotage du cabinet",
      description: "Trésorerie et tâches à suivre",
      content: (
        <section aria-label="Pilotage du cabinet">
          <div className="grid w-full grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <AsterScoreChart
              className="xl:col-span-7"
              metrics={metrics}
              transactions={transactions}
            />
            <AsterTasksChartWidget
              className="xl:col-span-5"
              onOpenTasks={() => onNavigate?.("taches")}
              referenceDate={metrics.referenceDate}
            />
          </div>
        </section>
      ),
    },
  ];

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-4 px-4 pt-16 pb-8 md:pt-24 lg:px-6">
      <MotivationalHeader onNavigate={onNavigate} section="dashboard" />
      <DashboardLayoutManager blocks={dashboardBlocks} />
    </div>
  );
}
