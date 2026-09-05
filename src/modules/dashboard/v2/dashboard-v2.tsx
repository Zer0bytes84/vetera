import { useMemo } from "react";
import {
  type DashboardLayoutBlock,
  DashboardLayoutManager,
} from "../components/dashboard-layout-manager";
import { PatientPopulationWidget } from "../components/patient-population-widget";
import { ActivityContributionsWidget } from "./activity-contributions-widget";
import { ClinicProgressWidget } from "./clinic-progress-widget";
import { ActivityAnalysisWidget } from "./activity-analysis-widget";
import { CashflowInsightWidget } from "./cashflow-insight-widget";
import { ClinicalAlertsWidget } from "./clinical-alerts-widget";
import { TodayScheduleWidget } from "./today-schedule-widget";
import type { DashboardV2Props } from "./types";
import { WidgetSkeleton } from "./widget-shell";

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
                <ClinicProgressWidget
                  appointments={appointments}
                  tasks={tasks}
                  transactions={transactions}
                  referenceDate={metrics.referenceDate}
                  onNavigate={onNavigate}
                />
              </div>
            </div>
          </section>
        ),
      },
      {
        id: "v2-activity-patterns",
        label: "Calendrier d’activité",
        description: "Consultations sur les douze derniers mois",
        content: (
          <section
            aria-label="Rythme et patientèle"
            className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12"
          >
            <div className="xl:col-span-8">
              <ActivityContributionsWidget
                metrics={metrics}
                onOpenAnalytics={() => onNavigate?.("finances_analytics")}
              />
            </div>
            <div className="xl:col-span-4">
              <PatientPopulationWidget
                onOpenPatients={() => onNavigate?.("patients")}
                patients={patients}
                referenceDate={metrics.referenceDate}
              />
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
        description: "Trésorerie et priorités à traiter",
        content: (
          <section aria-label="Pilotage du cabinet">
            <div className="grid grid-cols-1 items-stretch gap-4">
              <div>
                <CashflowInsightWidget
                  onOpenFinances={() => onNavigate?.("finances")}
                  referenceDate={metrics.referenceDate}
                  transactions={transactions}
                />
              </div>
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
      storageKeyPrefix="dashboard_layout_v3"
    />
  );
}
