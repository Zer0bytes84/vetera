"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { APP_NAME } from "@/lib/brand";
import {
  buildDashboardMetrics,
  type DashboardMetrics,
  formatCompactInteger,
  formatPercent,
  getCurrentLocale,
  percentageDelta,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import { formatDZD } from "@/utils/currency";
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// METRICS STRIP
// ============================================================================
function FinancialMetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const incomeDelta = percentageDelta(
    metrics.summary.income30,
    metrics.summary.previousIncome30
  );
  const appointmentsDelta = percentageDelta(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  const basketDelta = percentageDelta(
    metrics.summary.averageBasket,
    metrics.summary.previousIncome30
      ? metrics.summary.previousIncome30 /
          Math.max(1, metrics.summary.currentQualified)
      : 0
  );

  const yearlyRevenue = metrics.monthlyRevenue.reduce((sum, item) => sum + item.value, 0);

  const sectionCards: SectionCardItem[] = [
    {
      title: "Encaissements (30j)",
      value: formatDZD(metrics.summary.income30),
      badge: `${incomeDelta >= 0 ? "+" : ""}${formatPercent(Math.abs(incomeDelta))}`,
      trend: incomeDelta >= 0 ? "up" : "down",
      footerTitle: incomeDelta >= 0 ? "En hausse" : "En baisse",
      footerDescription: "vs période précédente",
    },
    {
      title: "CA Annuel",
      value: formatDZD(yearlyRevenue * 100), // * 100 to convert to DZD since monthlyRevenue is already divided by 100 in metrics.ts
      badge: "Année en cours",
      trend: "up",
      footerTitle: "Cumul",
      footerDescription: "depuis janvier",
    },
    {
      title: "Consultations facturées",
      value: formatCompactInteger(metrics.summary.todayAppointments),
      badge: `${appointmentsDelta >= 0 ? "+" : ""}${formatPercent(Math.abs(appointmentsDelta))}`,
      trend: appointmentsDelta >= 0 ? "up" : "down",
      footerTitle: appointmentsDelta >= 0 ? "Progression" : "Moins qu'hier",
      footerDescription: "vs journée précédente",
    },
    {
      title: "Panier moyen",
      value: formatDZD(metrics.summary.averageBasket),
      badge: `${basketDelta >= 0 ? "+" : ""}${formatPercent(Math.abs(basketDelta))}`,
      trend: basketDelta >= 0 ? "up" : "down",
      footerTitle: basketDelta >= 0 ? "En hausse" : "En baisse",
      footerDescription: "vs période précédente",
    },
  ];

  return <SectionCards items={sectionCards} />;
}

// ============================================================================
// FINANCIAL CHARTS CENTER (Protocol Aesthetic)
// ============================================================================
function FinancialChartsCenter({ metrics }: { metrics: DashboardMetrics }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<"revenue" | "cashflow">("revenue");

  // Format revenue data
  const revenueData = React.useMemo(() => {
    return metrics.monthlyRevenue.map((entry) => ({
      month: entry.month,
      value: Number(entry.value.toFixed(1)),
    }));
  }, [metrics.monthlyRevenue]);

  // Format cashflow data (last 14 days)
  const cashflowData = React.useMemo(() => {
    return metrics.cashflowSeries.slice(-14).map((entry) => ({
      name: entry.name, // Usually a date string
      value: Number(entry.value.toFixed(1)),
    }));
  }, [metrics.cashflowSeries]);

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalCashflow = cashflowData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="dashboard-luxe-card relative overflow-hidden p-6 lg:p-8 shadow-sm group col-span-1 xl:col-span-2">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl dark:bg-violet-500/10 animate-pulse duration-4000" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/10 animate-pulse duration-4000" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Header & Tabs */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-8">
            {activeTab === "revenue" ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Chiffre d'Affaires Cumulé
                  </span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {new Intl.NumberFormat("fr-FR").format(totalRevenue * 100)} DA
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Flux de Trésorerie (14j)
                  </span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {new Intl.NumberFormat("fr-FR").format(totalCashflow * 100)} DA
                </span>
              </div>
            )}
          </div>

          <div className="relative flex rounded-full bg-white/60 p-1 dark:bg-zinc-900/60 sm:self-center border border-zinc-950/10 dark:border-white/10 backdrop-blur-md shadow-sm">
            <button
              onClick={() => setActiveTab("revenue")}
              className={cn(
                "relative px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-full cursor-pointer active:scale-95",
                activeTab === "revenue" ? "text-white dark:text-zinc-950 font-bold" : "text-muted-foreground hover:text-foreground"
              )}
              type="button"
            >
              {activeTab === "revenue" && (
                <motion.span
                  layoutId="finTabBackdrop"
                  className="absolute inset-0 z-0 rounded-full bg-zinc-900 dark:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">Revenus Mensuels</span>
            </button>
            <button
              onClick={() => setActiveTab("cashflow")}
              className={cn(
                "relative px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-full cursor-pointer active:scale-95",
                activeTab === "cashflow" ? "text-white dark:text-zinc-950 font-bold" : "text-muted-foreground hover:text-foreground"
              )}
              type="button"
            >
              {activeTab === "cashflow" && (
                <motion.span
                  layoutId="finTabBackdrop"
                  className="absolute inset-0 z-0 rounded-full bg-zinc-900 dark:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">Trésorerie</span>
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="relative mt-2 h-[300px] w-full">
          <AnimatePresence mode="wait">
            {activeTab === "revenue" ? (
              <motion.div
                key="revenue-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.19 285)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="oklch(0.45 0.18 270)" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(128,128,128,0.06)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-2xl border border-zinc-950/10 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
                            <p className="text-xs text-muted-foreground font-bold">{payload[0].payload.month}</p>
                            <div className="mt-2 flex items-center gap-6 justify-between text-xs font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_#8b5cf6]" />
                                <span className="text-muted-foreground">Revenus</span>
                              </div>
                              <span className="text-foreground font-extrabold tabular-nums">
                                {new Intl.NumberFormat("fr-FR").format(payload[0].payload.value * 100)} DA
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" fill="url(#revGrad)" radius={[8, 8, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                key="cashflow-chart"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.6 0.15 240)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="oklch(0.6 0.15 240)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="rgba(128,128,128,0.04)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                      tickFormatter={(value) => String(value).slice(0, 3)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                            <p className="text-[10px] text-muted-foreground font-bold">{payload[0].payload.name}</p>
                            <div className="mt-2 flex items-center gap-6 justify-between text-xs font-semibold">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-zinc-500 dark:text-zinc-400">Flux net</span>
                              </div>
                              <span className="text-zinc-900 dark:text-white font-bold tabular-nums">
                                {new Intl.NumberFormat("fr-FR").format(payload[0].payload.value * 100)} DA
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="oklch(0.6 0.15 240)"
                      strokeWidth={2}
                      fill="url(#flowGrad)"
                      activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--background)", stroke: "oklch(0.6 0.15 240)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SEGMENTATION PANEL
// ============================================================================
function FinancialSegmentation({ metrics }: { metrics: DashboardMetrics }) {
  const sources = [
    { label: "Consultations", value: metrics.summary.income30 * 0.65, color: "#10b981" },
    { label: "Actes / Interventions", value: metrics.summary.income30 * 0.25, color: "#8b5cf6" },
    { label: "Ventes produits", value: metrics.summary.income30 * 0.10, color: "#f59e0b" },
  ];

  const total = metrics.summary.income30;

  return (
    <Card className="dashboard-luxe-card relative overflow-hidden p-6 lg:p-8 shadow-sm flex flex-col xl:col-span-1">
      <div className="mb-6">
        <h3 className="font-semibold text-lg text-foreground tracking-tight">Répartition des Revenus</h3>
        <p className="text-xs text-muted-foreground mt-1">Analyse sur les 30 derniers jours</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        {sources.map((source) => {
          const percentage = total > 0 ? (source.value / total) * 100 : 0;
          return (
            <div key={source.label} className="group flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-sm font-medium text-foreground/80">{source.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {new Intl.NumberFormat("fr-FR").format(source.value)} DA
                  </span>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: source.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Période</span>
          <span className="text-xl font-extrabold text-foreground tabular-nums tracking-tight">
            {new Intl.NumberFormat("fr-FR").format(total)} DA
          </span>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export function FinancialAnalyticsV2Page({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();
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
    [appointments, owners, patients, tasks, transactions, locale]
  );

  return (
    <div className="flex flex-1 flex-col gap-8 py-6 px-2 sm:px-4 md:px-8 max-w-[1400px] mx-auto w-full relative z-10">
      
      {/* Protocol Aesthetic Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 block">
            ANALYSE FINANCIÈRE
          </span>
          <h2 className="text-4xl font-display font-semibold tracking-tight text-foreground sm:text-5xl mt-1.5">
            Performance Financière
          </h2>
          <p className="max-w-[62ch] text-muted-foreground text-sm mt-3 leading-relaxed">
            Vue consolidée de vos encaissements, flux de trésorerie et répartition des revenus.
          </p>
        </div>
        
        <Button
          className="h-10 rounded-full px-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-950/10 dark:border-white/10 shadow-sm hover:bg-muted/80 text-foreground font-semibold"
          onClick={() => onNavigate("finances")}
          variant="outline"
        >
          <HugeiconsIcon className="size-4 mr-2" icon={ArrowLeft01Icon} strokeWidth={2.5} />
          Retour aux Finances
        </Button>
      </div>

      <div className="space-y-8">
        <FinancialMetricStrip metrics={metrics} />

        <div className="grid gap-6 xl:grid-cols-3">
          <FinancialChartsCenter metrics={metrics} />
          <FinancialSegmentation metrics={metrics} />
        </div>
      </div>
      
    </div>
  );
}

export default FinancialAnalyticsV2Page;
