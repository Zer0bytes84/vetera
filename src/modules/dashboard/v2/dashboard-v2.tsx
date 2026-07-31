import { useMemo } from "react";
import {
  type DashboardLayoutBlock,
  DashboardLayoutManager,
} from "../components/dashboard-layout-manager";
import { AsterTasksChartWidget } from "../components/aster/aster-tasks-chart-widget";
import { OwnerAddressBookWidget } from "../components/owner-address-book-widget";
import { PatientPopulationWidget } from "../components/patient-population-widget";
import {
  type WaitingRoomAppointment,
  WaitingRoomWidget,
} from "../components/waiting-room-widget";
import { ActivityAnalysisWidget } from "./activity-analysis-widget";
import { CapacityWidget } from "./capacity-widget";
import { CashflowInsightWidget } from "./cashflow-insight-widget";
import { ClinicalAlertsWidget } from "./clinical-alerts-widget";
import { TodayScheduleWidget } from "./today-schedule-widget";
import type { DashboardV2Props } from "./types";
import { WidgetSkeleton } from "./widget-shell";

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

export function DashboardV2({
  appointments,
  isCustomizing,
  isLoading = false,
  metrics,
  onCustomizingChange,
  onNavigate,
  onNavigateToPatient,
  owners,
  patients,
  products,
  tasks,
  transactions,
  vaccinations,
}: DashboardV2Props) {
  const todayAppointments = useMemo<WaitingRoomAppointment[]>(() => {
    const patientsById = new Map(patients.map((patient) => [patient.id, patient]));
    const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
    const today = new Date(metrics.referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments
      .filter((appointment) => {
        const date = parseDashboardDate(appointment.startTime);
        return date && date >= today && date < tomorrow;
      })
      .map((appointment) => {
        const patient = patientsById.get(appointment.patientId);
        const owner = ownersById.get(appointment.ownerId);
        const date = parseDashboardDate(appointment.startTime);
        return {
          id: appointment.id,
          owner: owner
            ? `${owner.firstName} ${owner.lastName}`.trim()
            : "—",
          patient: patient?.name || appointment.title,
          patientId: appointment.patientId,
          species: patient?.species || "—",
          status: appointment.status,
          time: date
            ? date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—",
          type: appointment.type,
        };
      });
  }, [appointments, metrics.referenceDate, owners, patients]);

  const blocks = useMemo<DashboardLayoutBlock[]>(
    () => [
      {
        id: "v2-clinical-analysis",
        label: "Analyse clinique",
        description: "Activité et composition de la patientèle",
        content: (
          <section aria-label="Analyse de l'activité clinique">
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <ActivityAnalysisWidget
                  metrics={metrics}
                  onOpenAnalytics={() => onNavigate?.("finances_analytics")}
                />
              </div>
              <div className="xl:col-span-5">
                <PatientPopulationWidget
                  className="min-h-[420px]"
                  onOpenPatients={() => onNavigate?.("patients")}
                  patients={patients}
                  referenceDate={metrics.referenceDate}
                />
              </div>
            </div>
          </section>
        ),
      },
      {
        id: "v2-daily-command-center",
        label: "Poste de travail",
        description: "Planning du jour et priorités à traiter",
        content: (
          <section aria-label="Poste de travail clinique">
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <TodayScheduleWidget
                  appointments={appointments}
                  onNavigateToPatient={onNavigateToPatient}
                  onOpenAgenda={() => onNavigate?.("agenda")}
                  owners={owners}
                  patients={patients}
                  referenceDate={metrics.referenceDate}
                />
              </div>
              <div className="xl:col-span-5">
                <ClinicalAlertsWidget
                  appointments={appointments}
                  onNavigate={onNavigate}
                  onNavigateToPatient={onNavigateToPatient}
                  patients={patients}
                  products={products}
                  referenceDate={metrics.referenceDate}
                  tasks={tasks}
                  vaccinations={vaccinations}
                />
              </div>
            </div>
          </section>
        ),
      },
      {
        id: "v2-business-pulse",
        label: "Pilotage",
        description: "Trésorerie et capacité à venir",
        content: (
          <section aria-label="Pilotage du cabinet">
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <CashflowInsightWidget
                  onOpenFinances={() => onNavigate?.("finances")}
                  referenceDate={metrics.referenceDate}
                  transactions={transactions}
                />
              </div>
              <div className="xl:col-span-5">
                <CapacityWidget
                  appointments={appointments}
                  onOpenAgenda={() => onNavigate?.("agenda")}
                  referenceDate={metrics.referenceDate}
                />
              </div>
            </div>
          </section>
        ),
      },
      {
        id: "v2-owner-directory",
        label: "Carnet des propriétaires",
        description: "Contacts, patients liés et dossiers médicaux",
        content: (
          <OwnerAddressBookWidget
            appointments={appointments}
            onNavigateToPatient={onNavigateToPatient}
            onOpenPatients={() => onNavigate?.("patients")}
            owners={owners}
            patients={patients}
          />
        ),
      },
      {
        id: "v2-daily-workflow",
        label: "Déroulé et actions",
        description: "Rendez-vous du jour et tâches à traiter",
        content: (
          <section aria-label="Déroulé et actions du jour">
            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
              <WaitingRoomWidget
                appointments={todayAppointments}
                className="xl:col-span-7"
                onNavigateToPatient={onNavigateToPatient}
                onOpenAgenda={() => onNavigate?.("agenda")}
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
    ],
    [
      appointments,
      metrics,
      onNavigate,
      onNavigateToPatient,
      owners,
      patients,
      products,
      tasks,
      todayAppointments,
      transactions,
      vaccinations,
    ]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <WidgetSkeleton className="xl:col-span-7" />
        <WidgetSkeleton className="xl:col-span-5" />
        <WidgetSkeleton className="xl:col-span-7" />
        <WidgetSkeleton className="xl:col-span-5" />
      </div>
    );
  }

  return (
    <DashboardLayoutManager
      blocks={blocks}
      isEditing={isCustomizing}
      onEditingChange={onCustomizingChange}
      storageKeyPrefix="dashboard_layout_v2"
    />
  );
}
