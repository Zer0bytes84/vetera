import type { ReactNode } from "react";
import { NowBoardView } from "./now-board-view";
import { DashboardLayoutManager } from "./dashboard-layout-manager";
import { DayModule } from "./clinical/day-module";
import { ActionsModule, type ActionFilter } from "./clinical/actions-module";
import { PatientsModule } from "./clinical/patients-module";
import { CashModule } from "./clinical/cash-module";
import { TrendsModule } from "./clinical/trends-module";
import type { WidgetState } from "./clinical/shared";
import type { ClinicalAlert, ScheduleEntry } from "../v2/model";
import type {
  buildClinicalCash,
  buildClinicalTrends,
  buildPatientFollowUpRows,
  ClinicalCashPeriod,
  NowSnapshot,
} from "../model/clinical-dashboard";
import type { Receivable } from "../v2/financial-model";
export type { WidgetState } from "./clinical/shared";

export interface ClinicalDashboardViewProps {
  now: NowSnapshot;
  day: ScheduleEntry[];
  dayDate: Date;
  context: { label: string; rows: ScheduleEntry[] };
  alerts: ClinicalAlert[];
  followUp: { count: number; underTreatment: number; hospitalized: number };
  patientRows: ReturnType<typeof buildPatientFollowUpRows>;
  cash: ReturnType<typeof buildClinicalCash>;
  pending: number;
  cashPeriod: ClinicalCashPeriod;
  receivables: Receivable[];
  trends: ReturnType<typeof buildClinicalTrends>;
  actionFilter: ActionFilter;
  reducedMotion: boolean;
  states: Record<
    "now" | "day" | "actions" | "patients" | "cash" | "trends",
    WidgetState
  >;
  busyIds: string[];
  isCustomizing: boolean;
  onCustomizingChange: (value: boolean) => void;
  trendsOpen: boolean;
  onTrendsOpen: (open: boolean) => void;
  onTrendsPeriod: (days: 30 | 90) => void;
  onCashPeriod: (period: ClinicalCashPeriod) => void;
  onActionFilter: (filter: ActionFilter) => void;
  onShiftDay: (days: number) => void;
  onToday: () => void;
  /** Visits move on in Flux only: the dashboard shows them there. */
  onFlux: (id?: string) => void;
  onOpenPatient: (id: string) => void;
  onPatientIntent: () => void;
  onPatientIntentCancel: () => void;
  onCompleteTask: (id: string) => void;
  onOpenAlert: (alert: ClinicalAlert) => void;
  onAgenda: () => void;
  onPlan: (date?: Date) => void;
  onPatients: () => void;
  onFinances: () => void;
  onReminders: () => void;
  /** The dashboard's view switch, shown beside « Ouvrir Flux ». */
  viewControl?: ReactNode;
  renderRow: (id: string, index: number, content: ReactNode) => ReactNode;
}
export function ClinicalDashboardView(p: ClinicalDashboardViewProps) {
  const blocks = [
    {
      id: "clinical-now",
      label: "Maintenant",
      description: "Prise en charge et salle d’attente",
      content: p.renderRow(
        "clinical-now",
        0,
        <NowBoardView
          snapshot={p.now}
          loading={p.states.now.loading}
          skeleton={p.states.now.skeleton}
          error={p.states.now.error}
          onRetry={p.states.now.retry}
          onFlux={p.onFlux}
          viewControl={p.viewControl}
        />
      ),
    },
    {
      id: "clinical-day",
      label: "Aujourd’hui",
      description: "Journée clinique et file d’actions",
      content: p.renderRow(
        "clinical-day",
        1,
        <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
          <DayModule
            key={p.dayDate.toDateString()}
            rows={p.day}
            date={p.dayDate}
            context={p.context}
            state={p.states.day}
            reducedMotion={p.reducedMotion}
            onShiftDay={p.onShiftDay}
            onToday={p.onToday}
            onAgenda={p.onAgenda}
            onPlan={() => p.onPlan(p.dayDate)}
            onPatient={p.onOpenPatient}
            onIntent={p.onPatientIntent}
            onIntentCancel={p.onPatientIntentCancel}
            onFlux={p.onFlux}
          />
          <ActionsModule
            alerts={p.alerts}
            busyIds={p.busyIds}
            filter={p.actionFilter}
            onFilter={p.onActionFilter}
            state={p.states.actions}
            reducedMotion={p.reducedMotion}
            onOpen={p.onOpenAlert}
            onComplete={p.onCompleteTask}
            onAll={p.onReminders}
          />
        </div>
      ),
    },
    {
      id: "clinical-followup",
      label: "Suivi",
      description: "Patients et trésorerie",
      content: p.renderRow(
        "clinical-followup",
        2,
        <div className="grid items-stretch gap-3 lg:grid-cols-2">
          <PatientsModule
            summary={p.followUp}
            rows={p.patientRows}
            state={p.states.patients}
            onPatient={p.onOpenPatient}
            onIntent={p.onPatientIntent}
            onIntentCancel={p.onPatientIntentCancel}
            onPatients={p.onPatients}
          />
          <CashModule
            cash={p.cash}
            pending={p.pending}
            receivables={p.receivables}
            period={p.cashPeriod}
            onPeriod={p.onCashPeriod}
            state={p.states.cash}
            onFinances={p.onFinances}
          />
        </div>
      ),
    },
    {
      id: "clinical-trends",
      label: "Tendances",
      description: "Activité récente et actes",
      content: p.renderRow(
        "clinical-trends",
        3,
        <TrendsModule
          open={p.trendsOpen}
          onOpen={p.onTrendsOpen}
          model={p.trends}
          onPeriod={p.onTrendsPeriod}
          state={p.states.trends}
          onPlan={p.onPlan}
        />
      ),
    },
  ];
  return (
    <DashboardLayoutManager
      blocks={blocks}
      firstBlockIds={["clinical-now", "clinical-day"]}
      isEditing={p.isCustomizing}
      onEditingChange={p.onCustomizingChange}
      storageKeyPrefix="dashboard_clinical_v1"
      migrateFromPrefix="dashboard_studio_v1"
    />
  );
}
