"use client";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
import { buildDashboardMetrics, getCurrentLocale } from "@/lib/metrics";
import { useDashboardFinancials } from "@/modules/dashboard/hooks/use-dashboard-financials";
import type { View } from "@/types";
import { PremiumFinancialAnalysis } from "./components/premium-financial-analysis";

export function FinancialAnalyticsV2Page({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const { i18n } = useTranslation();

  const { data: appointments, loading: appointmentsLoading } =
    useAppointmentsRepository();
  const { data: owners, loading: ownersLoading } = useOwnersRepository();
  const { data: patients, loading: patientsLoading } = usePatientsRepository();
  const { data: tasks, loading: tasksLoading } = useTasksRepository();
  const { data: transactions, loading: transactionsLoading } =
    useTransactionsRepository();
  const financials = useDashboardFinancials();
  // Every figure, chart and list of the page reads these sources: until all are read (first read only), the page
  // holds its place in the skeleton's sheen instead of drawing zeros that grow into the real figures.
  const loading =
    appointmentsLoading ||
    ownersLoading ||
    patientsLoading ||
    tasksLoading ||
    transactionsLoading ||
    financials.loading;
  const skeleton = useDelayedSkeleton(loading);
  const locale = getCurrentLocale(i18n.language);

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        appointments,
        owners,
        patients,
        tasks,
        transactions,
        locale,
      }),
    [appointments, owners, patients, tasks, transactions, locale]
  );

  return (
    <PremiumFinancialAnalysis
      invoices={financials.invoices}
      invoicesUnavailable={Boolean(financials.error)}
      loading={loading || skeleton}
      loadingRevealed={skeleton}
      metrics={metrics}
      onNavigate={onNavigate}
      transactions={transactions}
    />
  );
}
