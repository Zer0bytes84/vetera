"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
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
import { type SectionCardItem, SectionCards } from "@/components/section-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
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

  const yearlyRevenue = metrics.monthlyRevenue.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const sectionCards: SectionCardItem[] = [
    {
      title: "Encaissements (30j)",
      value: formatDZD(metrics.summary.income30 * 100),
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
      value: formatDZD(metrics.summary.averageBasket * 100),
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
  const [activeTab, setActiveTab] = React.useState<"revenue" | "cashflow">(
    "revenue"
  );

  // Format revenue data
  const revenueData = React.useMemo(
    () =>
      metrics.monthlyRevenue.map((entry) => ({
        month: entry.month,
        value: Number(entry.value.toFixed(1)),
      })),
    [metrics.monthlyRevenue]
  );

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
    <Card className="dashboard-luxe-card group relative col-span-1 overflow-hidden p-6 shadow-sm lg:p-8 xl:col-span-2">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100">
        <div className="absolute -top-24 -right-24 h-96 w-96 animate-pulse rounded-full bg-violet-500/15 blur-3xl duration-4000 dark:bg-violet-500/10" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-blue-500/15 blur-3xl duration-4000 dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* Header & Tabs */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-8">
            {activeTab === "revenue" ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Chiffre d'Affaires Cumulé
                  </span>
                </div>
                <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
                  {new Intl.NumberFormat("fr-FR").format(totalRevenue)} DA
                </span>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    Flux de Trésorerie (14j)
                  </span>
                </div>
                <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
                  {new Intl.NumberFormat("fr-FR").format(totalCashflow)} DA
                </span>
              </div>
            )}
          </div>

          <div className="relative flex rounded-full border border-zinc-950/10 bg-white/60 p-1 shadow-sm backdrop-blur-md sm:self-center dark:border-white/10 dark:bg-zinc-900/60">
            <button
              className={cn(
                "relative cursor-pointer rounded-full px-4 py-1.5 font-semibold text-xs tracking-wide transition-all duration-200 active:scale-95",
                activeTab === "revenue"
                  ? "font-bold text-white dark:text-zinc-950"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("revenue")}
              type="button"
            >
              {activeTab === "revenue" && (
                <motion.span
                  className="absolute inset-0 z-0 rounded-full bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:bg-white"
                  layoutId="finTabBackdrop"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">Revenus Mensuels</span>
            </button>
            <button
              className={cn(
                "relative cursor-pointer rounded-full px-4 py-1.5 font-semibold text-xs tracking-wide transition-all duration-200 active:scale-95",
                activeTab === "cashflow"
                  ? "font-bold text-white dark:text-zinc-950"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("cashflow")}
              type="button"
            >
              {activeTab === "cashflow" && (
                <motion.span
                  className="absolute inset-0 z-0 rounded-full bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:bg-white"
                  layoutId="finTabBackdrop"
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
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full"
                exit={{ opacity: 0, scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.98 }}
                key="revenue-chart"
                transition={{ duration: 0.3 }}
              >
                <ResponsiveContainer
                  height="100%"
                  minHeight={0}
                  minWidth={0}
                  width="100%"
                >
                  <BarChart
                    data={revenueData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="oklch(0.55 0.19 285)"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.45 0.18 270)"
                          stopOpacity={0.15}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(128,128,128,0.06)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={false}
                      dataKey="month"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!(active && payload?.length)) {
                          return null;
                        }
                        return (
                          <div className="rounded-2xl border border-zinc-950/10 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
                            <p className="font-bold text-muted-foreground text-xs">
                              {payload[0].payload.month}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-6 font-bold text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_#8b5cf6]" />
                                <span className="text-muted-foreground">
                                  Revenus
                                </span>
                              </div>
                              <span className="font-extrabold text-foreground tabular-nums">
                                {new Intl.NumberFormat("fr-FR").format(
                                  payload[0].payload.value
                                )}{" "}
                                DA
                              </span>
                            </div>
                          </div>
                        );
                      }}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#revGrad)"
                      maxBarSize={32}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full"
                exit={{ opacity: 0, scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.98 }}
                key="cashflow-chart"
                transition={{ duration: 0.3 }}
              >
                <ResponsiveContainer
                  height="100%"
                  minHeight={0}
                  minWidth={0}
                  width="100%"
                >
                  <AreaChart
                    data={cashflowData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="flowGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="oklch(0.6 0.15 240)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.6 0.15 240)"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(128,128,128,0.04)"
                      strokeDasharray="3 4"
                      vertical={false}
                    />
                    <XAxis
                      axisLine={false}
                      dataKey="name"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickFormatter={(value) => String(value).slice(0, 3)}
                      tickLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!(active && payload?.length)) {
                          return null;
                        }
                        return (
                          <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                            <p className="font-bold text-[10px] text-muted-foreground">
                              {payload[0].payload.name}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-6 font-semibold text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  Flux net
                                </span>
                              </div>
                              <span className="font-bold text-zinc-900 tabular-nums dark:text-white">
                                {new Intl.NumberFormat("fr-FR").format(
                                  payload[0].payload.value
                                )}{" "}
                                DA
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      activeDot={{
                        r: 4,
                        strokeWidth: 1.5,
                        fill: "var(--background)",
                        stroke: "oklch(0.6 0.15 240)",
                      }}
                      dataKey="value"
                      fill="url(#flowGrad)"
                      stroke="oklch(0.6 0.15 240)"
                      strokeWidth={2}
                      type="monotone"
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
    {
      label: "Consultations",
      value: metrics.summary.income30 * 0.65,
      color: "#10b981",
    },
    {
      label: "Actes / Interventions",
      value: metrics.summary.income30 * 0.25,
      color: "#8b5cf6",
    },
    {
      label: "Ventes produits",
      value: metrics.summary.income30 * 0.1,
      color: "#f59e0b",
    },
  ];

  const total = metrics.summary.income30;

  return (
    <Card className="dashboard-luxe-card relative flex flex-col overflow-hidden p-6 shadow-sm lg:p-8 xl:col-span-1">
      <div className="mb-6">
        <h3 className="font-semibold text-foreground text-lg tracking-tight">
          Répartition des Revenus
        </h3>
        <p className="mt-1 text-muted-foreground text-xs">
          Analyse sur les 30 derniers jours
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6">
        {sources.map((source) => {
          const percentage = total > 0 ? (source.value / total) * 100 : 0;
          return (
            <div className="group flex flex-col gap-2" key={source.label}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="font-medium text-foreground/80 text-sm">
                    {source.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-foreground text-sm tabular-nums">
                    {new Intl.NumberFormat("fr-FR").format(source.value)} DA
                  </span>
                  <span className="w-10 text-right font-mono text-muted-foreground text-xs">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                <motion.div
                  animate={{ width: `${percentage}%` }}
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  style={{ backgroundColor: source.color }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-border/40 border-t pt-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total Période</span>
          <span className="font-extrabold text-foreground text-xl tabular-nums tracking-tight">
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
export function FinancialAnalyticsV2Page({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
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
    <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-2 py-6 sm:px-4 md:px-8">
      {/* Protocol Aesthetic Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="mb-2 block font-semibold text-sm text-violet-600 uppercase tracking-wider dark:text-violet-400">
            ANALYSE FINANCIÈRE
          </span>
          <h2 className="mt-1.5 font-display font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
            Performance Financière
          </h2>
          <p className="mt-3 max-w-[62ch] text-muted-foreground text-sm leading-relaxed">
            Vue consolidée de vos encaissements, flux de trésorerie et
            répartition des revenus.
          </p>
        </div>

        <Button
          className="h-10 rounded-full border border-zinc-950/10 bg-white/60 px-5 font-semibold text-foreground shadow-sm backdrop-blur-md hover:bg-muted/80 dark:border-white/10 dark:bg-zinc-900/60"
          onClick={() => onNavigate("finances")}
          variant="outline"
        >
          <HugeiconsIcon
            className="mr-2 size-4"
            icon={ArrowLeft01Icon}
            strokeWidth={2.5}
          />
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
