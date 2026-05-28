"use client";

import * as React from "react";
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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ClinicalActivityPoint = {
  date: string;
  consultations: number;
  interventions: number;
};

export type MonthlyFinancialPoint = {
  month: string;
  value: number; // Revenue in DA
  hasData: boolean;
};

export type MonthlyAppointmentPoint = {
  month: string;
  value: number; // Appointment count
  hasData: boolean;
};

interface ClinicalChartsCenterProps {
  activityData: ClinicalActivityPoint[];
  monthlyRevenue: MonthlyFinancialPoint[];
  monthlyAppointments: MonthlyAppointmentPoint[];
}

export function ClinicalChartsCenter({
  activityData,
  monthlyRevenue,
  monthlyAppointments,
}: ClinicalChartsCenterProps) {
  const [activeTab, setActiveTab] = React.useState<"clinical" | "financial">("clinical");
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("90d");

  // Filtering clinical activity data based on range
  const filteredActivityData = React.useMemo(() => {
    if (!activityData.length) return [];
    const referenceDate = new Date(activityData[activityData.length - 1].date);
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    if (timeRange === "7d") daysToSubtract = 7;

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return activityData.filter((item) => new Date(item.date) >= startDate);
  }, [activityData, timeRange]);

  // Combined Financial data
  const combinedFinancialData = React.useMemo(() => {
    return monthlyRevenue.map((rev, index) => {
      const appt = monthlyAppointments[index];
      return {
        month: rev.month,
        revenue: rev.value,
        appointments: appt ? appt.value : 0,
      };
    });
  }, [monthlyRevenue, monthlyAppointments]);

  // Total calculated statistics for headers
  const clinicalTotals = React.useMemo(() => {
    return filteredActivityData.reduce(
      (acc, curr) => ({
        consultations: acc.consultations + curr.consultations,
        interventions: acc.interventions + curr.interventions,
      }),
      { consultations: 0, interventions: 0 }
    );
  }, [filteredActivityData]);

  const financialTotals = React.useMemo(() => {
    return combinedFinancialData.reduce(
      (acc, curr) => ({
        revenue: acc.revenue + curr.revenue,
        appointments: acc.appointments + curr.appointments,
      }),
      { revenue: 0, appointments: 0 }
    );
  }, [combinedFinancialData]);

  return (
    <Card className="dashboard-luxe-card group relative overflow-hidden p-6 shadow-none transition-[transform,shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-100">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl dark:bg-emerald-500/10 animate-pulse duration-4000" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-500/10 animate-pulse duration-4000" />
      </div>

      {/* Header section with tabs and quick stats */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300">
            Analytiques Cliniques & Financiers
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-1">
            {activeTab === "clinical" ? "Activité Médicale" : "Performance Globale"}
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="relative flex rounded-full bg-zinc-950/10 p-1 dark:bg-white/10 sm:self-center border border-zinc-950/5 dark:border-white/5 backdrop-blur-xs">
          <button
            onClick={() => setActiveTab("clinical")}
            className={cn(
              "relative px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-full cursor-pointer active:scale-95",
              activeTab === "clinical" ? "text-white dark:text-zinc-950 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            {activeTab === "clinical" && (
              <motion.span
                layoutId="activeTabBackdrop"
                className="absolute inset-0 z-0 rounded-full bg-zinc-900 dark:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Activité</span>
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={cn(
              "relative px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 rounded-full cursor-pointer active:scale-95",
              activeTab === "financial" ? "text-white dark:text-zinc-950 font-bold" : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            {activeTab === "financial" && (
              <motion.span
                layoutId="activeTabBackdrop"
                className="absolute inset-0 z-0 rounded-full bg-zinc-900 dark:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Finances</span>
          </button>
        </div>
      </div>

      {/* Sub-Header: Stats block and time range filter */}
      <div className="mt-6 flex flex-col gap-4 border-t border-zinc-950/10 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-8">
          {activeTab === "clinical" ? (
            <>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Consultations</span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {clinicalTotals.consultations}
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-950/10 dark:bg-white/10" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interventions</span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {clinicalTotals.interventions}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenus Cumulés</span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {new Intl.NumberFormat("fr-FR").format(financialTotals.revenue)} DA
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-950/10 dark:bg-white/10" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Consultations totales</span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white tabular-nums mt-0.5">
                  {financialTotals.appointments}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Time range selector for Clinical Tab */}
        {activeTab === "clinical" && (
          <div className="flex items-center gap-1 rounded-full border border-zinc-950/10 bg-zinc-100/50 p-0.5 dark:border-white/10 dark:bg-zinc-950/40">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all duration-100 rounded-full cursor-pointer active:scale-95",
                  timeRange === range
                    ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] text-foreground dark:bg-zinc-800 dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                type="button"
              >
                {range === "7d" ? "7 Jours" : range === "30d" ? "30 Jours" : "90 Jours"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main charting viewport */}
      <div className="relative mt-6 h-[300px] w-full">
        <AnimatePresence mode="wait">
          {activeTab === "clinical" ? (
            <motion.div
              key="clinical-chart"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredActivityData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="consultationsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.696 0.17 162)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="oklch(0.696 0.17 162)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="interventionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.17 72)" stopOpacity={0.06} />
                      <stop offset="100%" stopColor="oklch(0.72 0.17 72)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="rgba(128,128,128,0.04)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      return d.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      });
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const dateObj = new Date(payload[0].payload.date);
                      return (
                        <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                          <p className="text-[10px] text-muted-foreground font-bold">
                            {dateObj.toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                          <div className="mt-2 space-y-1">
                            {payload.map((p) => (
                              <div key={p.name} className="flex items-center gap-6 justify-between text-xs font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  <span className="text-zinc-500 dark:text-zinc-400">{p.name}</span>
                                </div>
                                <span className="text-zinc-900 dark:text-white font-bold tabular-nums">
                                  {p.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    name="Consultations"
                    dataKey="consultations"
                    stroke="oklch(0.696 0.17 162)"
                    strokeWidth={2}
                    fill="url(#consultationsGrad)"
                    type="monotone"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--background)", stroke: "oklch(0.696 0.17 162)" }}
                  />
                  <Area
                    name="Interventions"
                    dataKey="interventions"
                    stroke="oklch(0.72 0.17 72)"
                    strokeWidth={2}
                    fill="url(#interventionsGrad)"
                    type="monotone"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--background)", stroke: "oklch(0.72 0.17 72)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              key="financial-chart"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={combinedFinancialData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
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
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const month = payload[0].payload.month;
                      return (
                        <div className="rounded-2xl border border-zinc-950/10 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
                          <p className="text-xs text-muted-foreground font-bold">{month}</p>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-6 justify-between text-xs font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_#8b5cf6]" />
                                <span className="text-muted-foreground">Revenus</span>
                              </div>
                              <span className="text-foreground font-extrabold tabular-nums">
                                {new Intl.NumberFormat("fr-FR").format(payload[0].payload.revenue)} DA
                              </span>
                            </div>
                            <div className="flex items-center gap-6 justify-between text-xs font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                                <span className="text-muted-foreground">Consultations</span>
                              </div>
                              <span className="text-foreground font-extrabold tabular-nums">
                                {payload[0].payload.appointments}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    name="Revenus"
                    dataKey="revenue"
                    fill="url(#revenueGrad)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
