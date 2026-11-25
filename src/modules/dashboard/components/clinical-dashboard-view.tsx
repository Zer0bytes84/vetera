// biome-ignore-all assist/source/organizeImports: ranger ces imports change l'ordre des règles dans la feuille CSS assemblée (A2, CSS_CHANGE, décision du 25/11) ; l'ordre actuel est celui que l'app affiche
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
  actionFilter: ActionFilter;
  alerts: ClinicalAlert[];
  busyIds: string[];
  cash: ReturnType<typeof buildClinicalCash>;
  cashPeriod: ClinicalCashPeriod;
  context: { label: string; rows: ScheduleEntry[] };
  day: ScheduleEntry[];
  dayDate: Date;
  followUp: { count: number; underTreatment: number; hospitalized: number };
  isCustomizing: boolean;
  now: NowSnapshot;
  onActionFilter: (filter: ActionFilter) => void;
  onAgenda: () => void;
  onCashPeriod: (period: ClinicalCashPeriod) => void;
  onCompleteTask: (id: string) => void;
  onCustomizingChange: (value: boolean) => void;
  onFinances: () => void;
  /** Visits move on in Flux only: the dashboard shows them there. */
  onFlux: (id?: string) => void;
  onOpenAlert: (alert: ClinicalAlert) => void;
  onOpenPatient: (id: string) => void;
  onPatientIntent: () => void;
  onPatientIntentCancel: () => void;
  onPatients: () => void;
  onPlan: (date?: Date) => void;
  onReminders: () => void;
  onShiftDay: (days: number) => void;
  onToday: () => void;
  onTrendsOpen: (open: boolean) => void;
  onTrendsPeriod: (days: 30 | 90) => void;
  patientRows: ReturnType<typeof buildPatientFollowUpRows>;
  pending: number;
  receivables: Receivable[];
  reducedMotion: boolean;
  renderRow: (id: string, index: number, content: ReactNode) => ReactNode;
  states: Record<
    "now" | "day" | "actions" | "patients" | "cash" | "trends",
    WidgetState
  >;
  trends: ReturnType<typeof buildClinicalTrends>;
  trendsOpen: boolean;
  /** The dashboard's view switch, shown beside « Ouvrir Flux ». */
  viewControl?: ReactNode;
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
          error={p.states.now.error}
          loading={p.states.now.loading}
          onFlux={p.onFlux}
          onRetry={p.states.now.retry}
          skeleton={p.states.now.skeleton}
          snapshot={p.now}
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
            context={p.context}
            date={p.dayDate}
            key={p.dayDate.toDateString()}
            onAgenda={p.onAgenda}
            onFlux={p.onFlux}
            onIntent={p.onPatientIntent}
            onIntentCancel={p.onPatientIntentCancel}
            onPatient={p.onOpenPatient}
            onPlan={() => p.onPlan(p.dayDate)}
            onShiftDay={p.onShiftDay}
            onToday={p.onToday}
            reducedMotion={p.reducedMotion}
            rows={p.day}
            state={p.states.day}
          />
          <ActionsModule
            alerts={p.alerts}
            busyIds={p.busyIds}
            filter={p.actionFilter}
            onAll={p.onReminders}
            onComplete={p.onCompleteTask}
            onFilter={p.onActionFilter}
            onOpen={p.onOpenAlert}
            reducedMotion={p.reducedMotion}
            state={p.states.actions}
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
            onIntent={p.onPatientIntent}
            onIntentCancel={p.onPatientIntentCancel}
            onPatient={p.onOpenPatient}
            onPatients={p.onPatients}
            rows={p.patientRows}
            state={p.states.patients}
            summary={p.followUp}
          />
          <CashModule
            cash={p.cash}
            onFinances={p.onFinances}
            onPeriod={p.onCashPeriod}
            pending={p.pending}
            period={p.cashPeriod}
            receivables={p.receivables}
            state={p.states.cash}
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
          model={p.trends}
          onOpen={p.onTrendsOpen}
          onPeriod={p.onTrendsPeriod}
          onPlan={p.onPlan}
          open={p.trendsOpen}
          state={p.states.trends}
        />
      ),
    },
  ];
  return (
    <DashboardLayoutManager
      blocks={blocks}
      firstBlockIds={["clinical-now", "clinical-day"]}
      isEditing={p.isCustomizing}
      migrateFromPrefix="dashboard_studio_v1"
      onEditingChange={p.onCustomizingChange}
      storageKeyPrefix="dashboard_clinical_v1"
    />
  );
}
