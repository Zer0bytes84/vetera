"use client";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics, getCurrentLocale } from "@/lib/metrics";
import type { View } from "@/types";
import { PremiumFinancialAnalysis } from "./components/premium-financial-analysis";
import { useDashboardFinancials } from "@/modules/dashboard/hooks/use-dashboard-financials";

export function FinancialAnalyticsV2Page({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const { i18n } = useTranslation();

  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();
  const financials = useDashboardFinancials();
  const locale = getCurrentLocale(i18n.language);

  const metrics = React.useMemo(
    () =>
      buildDashboardMetrics({
        appointments,
        owners,
        patients,
        tasks,
        transactions,
        locale,
      }),
    [appointments, owners, patients, tasks, transactions, locale],
  );

  return (
    <PremiumFinancialAnalysis
      invoices={financials.invoices}
      invoicesUnavailable={Boolean(financials.error)}
      metrics={metrics}
      onNavigate={onNavigate}
      transactions={transactions}
    />
  );
}
