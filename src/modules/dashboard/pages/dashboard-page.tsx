import { useEffect, useMemo, useRef, useState } from "react";
import { showInFlux } from "@/modules/flow-board/open-in-flux";
import { useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
  useVaccinationsRepository,
  useHospitalizationsRepository,
  useUsersRepository,
} from "@/data/repositories";
import { useNowTick } from "@/hooks/useNowTick";
import { useAlertCare } from "../use-alert-care";
import type { FreeSlot } from "../model/free-slots";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
import { usePatientIntentPrefetch } from "@/hooks/usePatientIntentPrefetch";
import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import type { View } from "@/types";
import {
  ClinicalDashboardView,
  type WidgetState,
} from "../components/clinical-dashboard-view";
import { buildClinicalAlerts, buildTodaySchedule } from "../v2/model";
import { buildFinancialOverview } from "../v2/financial-model";
import {
  buildClinicalCash,
  buildClinicalFollowUp,
  buildClinicalTrends,
  buildDayContext,
  buildNowSnapshot,
  buildPatientFollowUpRows,
  type ClinicalCashPeriod,
} from "../model/clinical-dashboard";
import { addDays } from "../v2/model";
import { prepareAppointment } from "@/modules/shell/model/clinical-actions";
import type { ActionFilter } from "../components/clinical/actions-module";
import { useDashboardVersion } from "../hooks/use-dashboard-version";
import { useDashboardFinancials } from "../hooks/use-dashboard-financials";
import { DashboardModeToggle } from "../components/dashboard-mode-toggle";
import { PremiumAnalytics } from "../components/premium-analytics";
import { buildPremiumAnalytics, dashboardPresentationData, type AnalyticsPeriod, type CustomRange, type DashboardPeriod } from "../model/premium-analytics";
import "../components/premium-analytics.css";
import { DashboardWatch } from "../components/dashboard-watch";
import { OccupancyUnits } from "@/modules/hospitalizations/stays/occupancy-units";
import { useStays } from "@/modules/hospitalizations/stays/use-stays";
import {
  buildHospitalizedWatch,
  buildStockWatch,
  buildUpcomingReminders,
} from "../model/dashboard-watch";
import { buildSpeciesSplit } from "../model/dashboard-widgets";
import { usePatientReminders } from "@/modules/patient-reminders/use-patient-reminders";

export interface DashboardPageProps {
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  userDisplayName?: string;
}
function useWidgetState(
  loading: boolean,
  error: string | null,
  retry: () => void
): WidgetState {
  return { loading, skeleton: useDelayedSkeleton(loading), error, retry };
}
export function DashboardPage({
  onNavigate,
}: DashboardPageProps) {
  const appointments = useAppointmentsRepository();
  const owners = useOwnersRepository();
  const patients = usePatientsRepository();
  const products = useProductsRepository();
  const tasks = useTasksRepository();
  const transactions = useTransactionsRepository();
  const vaccinations = useVaccinationsRepository();
  const stays = useHospitalizationsRepository();
  // Places and stays of the Hospitalisation view, for the Hospitalisés card's capacity.
  const capacity = useStays();
  const invoices = useDashboardFinancials();
  const medicalReminders = usePatientReminders();
  const users = useUsersRepository();
  const vets = useMemo(
    () => users.data.filter((user) => user.status === "active" && (user.role === "vet_principal" || user.role === "vet_adjoint")),
    [users.data],
  );
  const [analyticsPeriod, setAnalyticsPeriod] = useState<DashboardPeriod>("30d");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const presentation = useMemo(() => dashboardPresentationData({
    appointments: appointments.data, owners: owners.data, patients: patients.data,
    products: products.data, tasks: tasks.data, transactions: transactions.data,
    vaccinations: vaccinations.data, invoices: invoices.invoices,
  }), [appointments.data, owners.data, patients.data, products.data, tasks.data, transactions.data, vaccinations.data, invoices.invoices]);
  const { version, setVersion } = useDashboardVersion();
  const [isCustomizing, setIsCustomizing] = useState(false);
  useEffect(() => {
    if (window.sessionStorage.getItem("baitari:customize-dashboard") !== "true") return;
    window.sessionStorage.removeItem("baitari:customize-dashboard");
    void setVersion("clinical");
    setIsCustomizing(true);
  }, [setVersion]);

  const [trendsOpen, setTrendsOpen] = useState(true);
  const [trendDays, setTrendDays] = useState<30 | 90>(30);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [cashPeriod, setCashPeriod] = useState<ClinicalCashPeriod>("today");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const now = useNowTick(30_000);
  const alertCare = useAlertCare(now);
  const createSlot = (slot: FreeSlot) => {
    prepareAppointment(undefined, slot.startsAt, slot.start, slot.vetId);
    navigate("agenda");
    // The agenda reads the marker when it mounts; the event covers a view that is already mounted.
    window.setTimeout(() => window.dispatchEvent(new Event("vetera:new-appointment")), 150);
  };
  const reduced = useReducedMotion();
  const intent = usePatientIntentPrefetch();
  const today = useMemo(
    () =>
      buildTodaySchedule({
        appointments: presentation.appointments.filter(
          (row) => row.status !== "cancelled"
        ),
        owners: presentation.owners,
        patients: presentation.patients,
        referenceDate: now,
      }),
    [presentation.appointments, presentation.owners, presentation.patients, now]
  );
  const dayDate = selectedDay ?? now;
  const day = useMemo(
    () =>
      selectedDay
        ? buildTodaySchedule({
            appointments: presentation.appointments.filter(
              (row) => row.status !== "cancelled"
            ),
            owners: presentation.owners,
            patients: presentation.patients,
            referenceDate: selectedDay,
          })
        : today,
    [presentation.appointments, presentation.owners, presentation.patients, selectedDay, today]
  );
  const context = useMemo(
    () =>
      buildDayContext(presentation.appointments, presentation.owners, presentation.patients, dayDate),
    [presentation.appointments, presentation.owners, presentation.patients, dayDate]
  );
  const alerts = useMemo(
    () =>
      buildClinicalAlerts({
        appointments: presentation.appointments,
        patients: presentation.patients,
        products: presentation.products.filter((product) => !product.archivedAt),
        tasks: presentation.tasks,
        vaccinations: presentation.vaccinations,
        referenceDate: now,
      }),
    [
      presentation.appointments,
      presentation.patients,
      presentation.products,
      presentation.tasks,
      presentation.vaccinations,
      now,
    ]
  );
  const financials = useMemo(
    () =>
      buildFinancialOverview(
        presentation.invoices,
        presentation.transactions,
        { from: "", to: "" },
        "all"
      ),
    [presentation.invoices, presentation.transactions]
  );
  const cash = useMemo(
    () => buildClinicalCash(presentation.transactions, now, cashPeriod),
    [presentation.transactions, now, cashPeriod]
  );
  const cashPending = Math.round(
    financials.categories.reduce((sum, row) => sum + row.riskValue, 0) * 100
  );
  const nowState = useWidgetState(
    appointments.loading || patients.loading || owners.loading,
    appointments.error || patients.error || owners.error,
    () => {
      void appointments.refresh();
      void patients.refresh();
      void owners.refresh();
    }
  );
  const dayState = useWidgetState(
    appointments.loading || patients.loading || owners.loading,
    appointments.error || patients.error || owners.error,
    nowState.retry
  );
  const actionsState = useWidgetState(
    tasks.loading ||
      products.loading ||
      vaccinations.loading ||
      appointments.loading ||
      patients.loading,
    tasks.error ||
      products.error ||
      vaccinations.error ||
      appointments.error ||
      patients.error,
    () => {
      void tasks.refresh();
      void products.refresh();
      void vaccinations.refresh();
      void appointments.refresh();
      void patients.refresh();
    }
  );
  const patientsState = useWidgetState(
    patients.loading || stays.loading || owners.loading,
    patients.error || stays.error || owners.error,
    () => {
      void patients.refresh();
      void stays.refresh();
      void owners.refresh();
    }
  );
  const cashState = useWidgetState(
    transactions.loading || invoices.loading,
    transactions.error || invoices.error,
    () => {
      void transactions.refresh();
      void invoices.refresh();
    }
  );
  const trendsState = useWidgetState(
    appointments.loading,
    appointments.error,
    () => {
      void appointments.refresh();
    }
  );
  const navigate = (view: View) => onNavigate?.(view);
  // Visits move on in Flux only: the dashboard shows them there.
  const showVisit = (id?: string) => (id ? showInFlux(id, navigate) : navigate("flux"));
  const completeTask = async (id: string) => {
    const row = presentation.tasks.find(task => task.id === id);
    if (!row || row.status === "done" || pending.current.has(id)) return;
    pending.current.add(id);
    setBusyIds([...pending.current]);
    try {
      if (!(await tasks.update(id, { status: "done" }))) return;
      toast.success("Tâche terminée", { duration: 5000, action: { label: "Annuler", onClick: () => { void tasks.update(id, { status: row.status }); } } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "La tâche n’a pas pu être terminée."); }
    finally { pending.current.delete(id); setBusyIds([...pending.current]); }
  };
  const plan = (date?: Date) => {
    prepareAppointment(undefined, date instanceof Date ? date : new Date());
    navigate("agenda");
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent("vetera:new-appointment")),
      150
    );
  };
  const clinicalView = (
    <ClinicalDashboardView
      now={buildNowSnapshot(today, presentation.patients, now)}
      day={day}
      dayDate={dayDate}
      context={context}
      alerts={alerts}
      followUp={buildClinicalFollowUp(presentation.patients, stays.data)}
      patientRows={buildPatientFollowUpRows(
        presentation.patients,
        presentation.owners,
        stays.data
      )}
      cash={cash}
      pending={cashPending}
      cashPeriod={cashPeriod}
      onCashPeriod={setCashPeriod}
      receivables={financials.receivables}
      trends={buildClinicalTrends(presentation.appointments, now, trendDays)}
      onTrendsPeriod={setTrendDays}
      actionFilter={actionFilter}
      onActionFilter={setActionFilter}
      reducedMotion={Boolean(reduced)}
      onShiftDay={(days) => setSelectedDay(addDays(dayDate, days))}
      onToday={() => setSelectedDay(null)}
      onPlan={plan}
      onReminders={() => navigate("taches")}
      states={{
        now: nowState,
        day: dayState,
        actions: actionsState,
        patients: patientsState,
        cash: cashState,
        trends: trendsState,
      }}
      busyIds={busyIds}
      isCustomizing={isCustomizing}
      onCustomizingChange={setIsCustomizing}
      trendsOpen={trendsOpen}
      onTrendsOpen={setTrendsOpen}
      onFlux={showVisit}
      onOpenPatient={openPatientPeek}
      onPatientIntent={intent.onPointerEnter}
      onPatientIntentCancel={intent.onPointerLeave}
      onCompleteTask={(id) => {
        void completeTask(id);
      }}
      onOpenAlert={(alert) =>
        alert.patientId
          ? openPatientPeek(alert.patientId)
          : navigate(alert.source === "stock" ? "stock" : "taches")
      }
      onAgenda={() => navigate("agenda")}
      onPatients={() => navigate("patients")}
      onFinances={() => navigate("finances")}
      // Rows appear with the data: a dashboard opened every morning does not perform an entrance.
      renderRow={(id, _index, content) => <div key={id}>{content}</div>}
    />
  );
    return (
      <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-4 pb-12 lg:px-6 premium-analytics-dashboard">
        <PremiumAnalytics
          clinicalView={version === "clinical" ? clinicalView : undefined}
          model={buildPremiumAnalytics({ ...presentation, alerts }, analyticsPeriod, now, customRange)}
          period={analyticsPeriod}
          onPeriod={(next: AnalyticsPeriod) => setAnalyticsPeriod(next)}
          customRange={customRange}
          onCustomRange={(range) => {
            setCustomRange(range);
            setAnalyticsPeriod("custom");
          }}
          states={{ cash: cashState, patients: nowState, actions: actionsState }}
          onFinances={() => navigate("finances")}
          onPatients={() => navigate("patients")}
          onActions={() => navigate("taches")}
          onNavigate={navigate}
          dashboardViewControl={
            <DashboardModeToggle
              value={version}
              reducedMotion={Boolean(reduced)}
              onChange={(next) => {
                setIsCustomizing(false);
                void setVersion(next);
              }}
            />
          }
          now={now}
          presentation={presentation}
          vets={vets}
          onCreateSlot={createSlot}
          alertSources={{
            reminders: medicalReminders.reminders,
            careTasks: alertCare.tasks,
            unavailable: [medicalReminders.error ? "rappels" : "", alertCare.error ? "soins" : ""].filter(Boolean),
          }}
          watch={
            <DashboardWatch
              hospitalized={buildHospitalizedWatch({
                now,
                patients: presentation.patients,
                stays: stays.data,
              })}
              hospitalizedCapacity={
                <OccupancyUnits compact locations={capacity.locations} stays={capacity.stays} />
              }
              onOpenPatient={openPatientPeek}
              onReminders={() => {
                window.sessionStorage.setItem("baitari:reminders-source", "medical");
                navigate("taches");
              }}
              onRemindersRetry={() => void medicalReminders.refresh()}
              onStays={() => navigate("soins")}
              onStock={() => navigate("stock")}
              reminders={buildUpcomingReminders({
                now,
                patients: presentation.patients,
                reminders: medicalReminders.reminders,
                types: medicalReminders.types,
              })}
              remindersError={medicalReminders.error}
              remindersLoading={medicalReminders.loading}
              stock={buildStockWatch({ now, products: presentation.products })}
              species={patients.loading ? undefined : buildSpeciesSplit(presentation.patients, now)}
              onPatients={() => navigate("patients")}
            />
          }
          today={today}
          financials={{
            income: cash.income,
            pending: cashPending,
            receivables: financials.receivables,
          }}
          onStartConsultation={showVisit}
        />
      </div>
    );
}
