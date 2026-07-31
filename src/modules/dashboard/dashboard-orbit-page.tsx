"use client";

import { useMemo, useState } from "react";
import MotivationalHeader from "@/components/MotivationalHeader";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useProductsRepository,
  useTasksRepository,
  useTransactionsRepository,
  useVaccinationsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics } from "@/lib/metrics";
import type { View } from "@/types";
import { DashboardV2 } from "./v2/dashboard-v2";

interface DashboardOrbitPageProps {
  onNavigate?: (view: View) => void;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAIAgent?: () => void;
  userDisplayName?: string;
}

export function DashboardOrbitPage({
  onNavigate,
  onNavigateToPatient,
}: DashboardOrbitPageProps) {
  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();
  const { data: owners, loading: ownersLoading } = useOwnersRepository();
  const { data: patients, loading: patientsLoading } = usePatientsRepository();
  const { data: products, loading: productsLoading } = useProductsRepository();
  const { data: tasks, loading: tasksLoading } = useTasksRepository();
  const { data: transactions, loading: transactionsLoading } =
    useTransactionsRepository();
  const { data: vaccinations, loading: vaccinationsLoading } =
    useVaccinationsRepository();
  const [isCustomizing, setIsCustomizing] = useState(false);

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

  return (
    <div className="dashboard-stage flex w-full min-w-0 flex-col gap-4 px-4 pt-16 pb-8 md:pt-24 lg:px-6">
      <MotivationalHeader
        isCustomizing={isCustomizing}
        onCustomize={() => setIsCustomizing(true)}
        onNavigate={onNavigate}
        section="dashboard"
      />
      <DashboardV2
        appointments={appointments}
        isCustomizing={isCustomizing}
        isLoading={
          appointmentsLoading ||
          ownersLoading ||
          patientsLoading ||
          productsLoading ||
          tasksLoading ||
          transactionsLoading ||
          vaccinationsLoading
        }
        metrics={metrics}
        onCustomizingChange={setIsCustomizing}
        onNavigate={onNavigate}
        onNavigateToPatient={onNavigateToPatient}
        owners={owners}
        patients={patients}
        products={products}
        tasks={tasks}
        transactions={transactions}
        vaccinations={vaccinations}
      />
    </div>
  );
}
