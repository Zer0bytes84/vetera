import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import MotivationalHeader from "@/components/MotivationalHeader";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
  useVaccinationsRepository,
  useHospitalizationsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";
import { useNowTick } from "@/hooks/useNowTick";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
import { usePatientIntentPrefetch } from "@/hooks/usePatientIntentPrefetch";
import { rowMotion, reducedRowMotion } from "@/design-system/motion";
import { openPatientPeek } from "@/modules/patients/pages/patient-peek";
import type { View } from "@/types";
import type { AppointmentStatus } from "@/types/db";
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
import {
  prepareAppointment,
  prepareInvoice,
} from "@/modules/shell/model/clinical-actions";
import type { ActionFilter } from "../components/clinical/actions-module";
import { useDashboardVersion } from "../hooks/use-dashboard-version";
import { useDashboardFinancials } from "../hooks/use-dashboard-financials";
import { DashboardModeToggle } from "../components/dashboard-mode-toggle";

const ClassicDashboard = lazy(async () => {
  const module = await import("../v2/studio-dashboard");
  return { default: module.StudioDashboard };
});
const ENTRY_KEY = "baitari:clinical-dashboard-entered";
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
  onNavigateToPatient,
}: DashboardPageProps) {
  const appointments = useAppointmentsRepository();
  const owners = useOwnersRepository();
  const patients = usePatientsRepository();
  const products = useProductsRepository();
  const tasks = useTasksRepository();
  const transactions = useTransactionsRepository();
  const vaccinations = useVaccinationsRepository();
  const stays = useHospitalizationsRepository();
  const invoices = useDashboardFinancials();
  const { version, setVersion } = useDashboardVersion();
  const [isCustomizing, setIsCustomizing] = useState(false);
  useEffect(() => {
    if (window.sessionStorage.getItem("baitari:customize-dashboard") !== "true") return;
    window.sessionStorage.removeItem("baitari:customize-dashboard");
    void setVersion("classic");
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
  const reduced = useReducedMotion();
  const hasEntered = useRef(Boolean(sessionStorage.getItem(ENTRY_KEY)));
  const entrance = version === "clinical" && !hasEntered.current;
  const intent = usePatientIntentPrefetch();
  useEffect(() => {
    if (version !== "clinical") return;
    hasEntered.current = true;
    sessionStorage.setItem(ENTRY_KEY, "true");
  }, [version]);
  const today = useMemo(
    () =>
      buildTodaySchedule({
        appointments: appointments.data.filter(
          (row) => row.status !== "cancelled"
        ),
        owners: owners.data,
        patients: patients.data,
        referenceDate: now,
      }),
    [appointments.data, owners.data, patients.data, now]
  );
  const dayDate = selectedDay ?? now;
  const day = useMemo(
    () =>
      selectedDay
        ? buildTodaySchedule({
            appointments: appointments.data.filter(
              (row) => row.status !== "cancelled"
            ),
            owners: owners.data,
            patients: patients.data,
            referenceDate: selectedDay,
          })
        : today,
    [appointments.data, owners.data, patients.data, selectedDay, today]
  );
  const context = useMemo(
    () =>
      buildDayContext(appointments.data, owners.data, patients.data, dayDate),
    [appointments.data, owners.data, patients.data, dayDate]
  );
  const alerts = useMemo(
    () =>
      buildClinicalAlerts({
        appointments: appointments.data,
        patients: patients.data,
        products: products.data.filter((product) => !product.archivedAt),
        tasks: tasks.data,
        vaccinations: vaccinations.data,
        referenceDate: now,
      }),
    [
      appointments.data,
      patients.data,
      products.data,
      tasks.data,
      vaccinations.data,
      now,
    ]
  );
  const financials = useMemo(
    () =>
      buildFinancialOverview(
        invoices.invoices,
        transactions.data,
        { from: "", to: "" },
        "all"
      ),
    [invoices.invoices, transactions.data]
  );
  const cash = useMemo(
    () => buildClinicalCash(transactions.data, now, cashPeriod),
    [transactions.data, now, cashPeriod]
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
  const paymentsState = useWidgetState(
    transactions.loading,
    transactions.error,
    () => {
      void transactions.refresh();
    }
  );
  const populationState = useWidgetState(
    patients.loading,
    patients.error,
    () => {
      void patients.refresh();
    }
  );
  const activityState = useWidgetState(
    appointments.loading || transactions.loading,
    appointments.error || transactions.error,
    () => {
      void appointments.refresh();
      void transactions.refresh();
    }
  );
  const navigate = (view: View) => onNavigate?.(view);
  const openConsultation = (id: string) => {
    sessionStorage.setItem("vetera:pending-consultation-start", id);
    navigate("clinique");
  };
  const advance = async (
    id: string,
    status: AppointmentStatus,
    after?: () => void
  ) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setBusyIds([...pending.current]);
    try {
      await appointments.transitionStatus(id, status);
      after?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Le rendez-vous n’a pas été mis à jour."
      );
    } finally {
      pending.current.delete(id);
      setBusyIds([...pending.current]);
    }
  };
  const start = (id: string) => {
    const row = appointments.data.find((row) => row.id === id);
    if (row?.status === "in_progress") {
      openConsultation(id);
      return;
    }
    void advance(id, "in_progress", () => openConsultation(id));
  };
  const completeTask = async (id: string) => {
    const row = tasks.data.find(task => task.id === id);
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
  const bill = (id: string) => {
    const row = appointments.data.find((row) => row.id === id);
    if (!row) return;
    prepareInvoice(row.ownerId, row.patientId, row.id);
    navigate("finances");
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent("vetera:new-invoice")),
      150
    );
  };
  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        appointments: appointments.data,
        owners: owners.data,
        patients: patients.data,
        tasks: tasks.data,
        transactions: transactions.data,
      }),
    [
      appointments.data,
      owners.data,
      patients.data,
      tasks.data,
      transactions.data,
    ]
  );
  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-6 px-4 pt-8 pb-8 lg:px-6">
      <MotivationalHeader
        section="dashboard"
        isCustomizing={isCustomizing}
        onNavigate={onNavigate}
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
      />
      {version === "classic" ? (
        <Suspense fallback={<div className="min-h-[180px]" />}>
          <ClassicDashboard
            appointments={appointments.data}
            owners={owners.data}
            patients={patients.data}
            products={products.data}
            tasks={tasks.data}
            transactions={transactions.data}
            vaccinations={vaccinations.data}
            metrics={metrics}
            isCustomizing={isCustomizing}
            onCustomizingChange={setIsCustomizing}
            onNavigate={onNavigate}
            onNavigateToPatient={onNavigateToPatient}
            onStatusChange={appointments.transitionStatus}
            widgetStates={{
              schedule: nowState,
              patients: populationState,
              payments: paymentsState,
              appointments: trendsState,
              activity: activityState,
              priorities: actionsState,
            }}
          />
        </Suspense>
      ) : (
        <ClinicalDashboardView
          now={buildNowSnapshot(today, patients.data, now)}
          day={day}
          dayDate={dayDate}
          context={context}
          alerts={alerts}
          followUp={buildClinicalFollowUp(patients.data, stays.data)}
          patientRows={buildPatientFollowUpRows(
            patients.data,
            owners.data,
            stays.data
          )}
          cash={cash}
          pending={cashPending}
          cashPeriod={cashPeriod}
          onCashPeriod={setCashPeriod}
          receivables={financials.receivables}
          trends={buildClinicalTrends(appointments.data, now, trendDays)}
          onTrendsPeriod={setTrendDays}
          actionFilter={actionFilter}
          onActionFilter={setActionFilter}
          reducedMotion={Boolean(reduced)}
          onShiftDay={(days) => setSelectedDay(addDays(dayDate, days))}
          onToday={() => setSelectedDay(null)}
          onBill={bill}
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
          onAdvance={(id, status) => {
            void advance(id, status);
          }}
          onStart={start}
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
          renderRow={(id, index, content) => (
            <motion.div
              key={id}
              variants={
                reduced
                  ? reducedRowMotion
                  : {
                      ...rowMotion,
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.22,
                          ease: [0.2, 0, 0, 1],
                          delay: entrance ? index * 0.1 : 0,
                        },
                      },
                    }
              }
              initial={entrance ? "hidden" : false}
              animate="visible"
            >
              {content}
            </motion.div>
          )}
        />
      )}
    </div>
  );
}
