"use client";

import { AnimatePresence, motion } from "framer-motion";
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
import { useAuth } from "@/contexts/AuthContext";
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
  monthlyAppointments: MonthlyAppointmentPoint[];
  monthlyRevenue: MonthlyFinancialPoint[];
}

export const ClinicalChartsCenter = React.memo(function ClinicalChartsCenter({
  activityData,
  monthlyRevenue,
  monthlyAppointments,
}: ClinicalChartsCenterProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"clinical" | "financial">(
    "clinical"
  );
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("7d");

  // Filtering clinical activity data based on range
  const filteredActivityData = React.useMemo(() => {
    if (!activityData.length) {
      return [];
    }
    const referenceDate = new Date(activityData[activityData.length - 1].date);
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    }
    if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return activityData.filter((item) => new Date(item.date) >= startDate);
  }, [activityData, timeRange]);

  // Combined Financial data
  const combinedFinancialData = React.useMemo(
    () =>
      monthlyRevenue.map((rev, index) => {
        const appt = monthlyAppointments[index];
        return {
          month: rev.month,
          revenue: rev.value,
          appointments: appt ? appt.value : 0,
        };
      }),
    [monthlyRevenue, monthlyAppointments]
  );

  // Total calculated statistics for headers
  const clinicalTotals = React.useMemo(
    () =>
      filteredActivityData.reduce(
        (acc, curr) => ({
          consultations: acc.consultations + curr.consultations,
          interventions: acc.interventions + curr.interventions,
        }),
        { consultations: 0, interventions: 0 }
      ),
    [filteredActivityData]
  );

  const financialTotals = React.useMemo(
    () =>
      combinedFinancialData.reduce(
        (acc, curr) => ({
          revenue: acc.revenue + curr.revenue,
          appointments: acc.appointments + curr.appointments,
        }),
        { revenue: 0, appointments: 0 }
      ),
    [combinedFinancialData]
  );

  return (
    <div className="flex h-full w-full flex-col rounded-[16px] border border-zinc-200 bg-white p-6 shadow-sm lg:p-8 dark:border-[#333333] dark:bg-[#242424]">
      {/* Header section with tabs (Floating directly on background like Protocol template) */}
      <div className="flex flex-col gap-6 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <span className="mb-2 block font-semibold text-emerald-700 text-sm uppercase tracking-wider dark:text-emerald-400">
            Bonjour{" "}
            {currentUser?.displayName
              ? `${currentUser.displayName.split(" ")[0]} `
              : ""}
            👋 Ravi de vous retrouver !
          </span>
          <h2 className="mt-1.5 font-display font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
            {activeTab === "clinical"
              ? "Activité Médicale"
              : "Performance Globale"}
          </h2>
        </div>

        {/* Tab Controls */}
        <div className="relative flex rounded-full border border-zinc-950/10 bg-white/60 p-1 shadow-sm backdrop-blur-md sm:self-center dark:border-white/10 dark:bg-zinc-900/60">
          <button
            className={cn(
              "relative cursor-pointer rounded-full px-4 py-1.5 font-semibold text-xs tracking-wide transition-all duration-200 active:scale-95",
              activeTab === "clinical"
                ? "font-bold text-white dark:text-zinc-950"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("clinical")}
            type="button"
          >
            {activeTab === "clinical" && (
              <motion.span
                className="absolute inset-0 z-0 rounded-full bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:bg-white"
                layoutId="activeTabBackdrop"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Activité</span>
          </button>
          <button
            className={cn(
              "relative cursor-pointer rounded-full px-4 py-1.5 font-semibold text-xs tracking-wide transition-all duration-200 active:scale-95",
              activeTab === "financial"
                ? "font-bold text-white dark:text-zinc-950"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("financial")}
            type="button"
          >
            {activeTab === "financial" && (
              <motion.span
                className="absolute inset-0 z-0 rounded-full bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.15)] dark:bg-white"
                layoutId="activeTabBackdrop"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">Finances</span>
          </button>
        </div>
      </div>

      <div className="mt-8 flex h-full w-full flex-col">
        {/* Sub-Header: Stats block and time range filter */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-8">
            {activeTab === "clinical" ? (
              <>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Consultations
                    </span>
                  </div>
                  <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
                    {clinicalTotals.consultations}
                  </span>
                </div>
                <div className="h-8 w-px bg-zinc-950/10 dark:bg-white/10" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Interventions
                    </span>
                  </div>
                  <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
                    {clinicalTotals.interventions}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Revenus Cumulés
                    </span>
                  </div>
                  <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
                    {new Intl.NumberFormat("fr-FR").format(
                      financialTotals.revenue
                    )}{" "}
                    DA
                  </span>
                </div>
                <div className="h-8 w-px bg-zinc-950/10 dark:bg-white/10" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                      Consultations totales
                    </span>
                  </div>
                  <span className="mt-0.5 font-extrabold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-white">
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
                  className={cn(
                    "cursor-pointer rounded-full px-3 py-1 font-extrabold text-[10px] uppercase tracking-wider transition-all duration-100 active:scale-95",
                    timeRange === range
                      ? "bg-white text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={range}
                  onClick={() => setTimeRange(range)}
                  type="button"
                >
                  {range === "7d"
                    ? "7 Jours"
                    : range === "30d"
                      ? "30 Jours"
                      : "90 Jours"}
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
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full"
                exit={{ opacity: 0, scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.98 }}
                key="clinical-chart"
                transition={{ duration: 0.3 }}
              >
                <ResponsiveContainer
                  height="100%"
                  minHeight={0}
                  minWidth={0}
                  width="100%"
                >
                  <AreaChart
                    data={filteredActivityData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="consultationsGrad"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.696 0.17 162)"
                          stopOpacity={0.08}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.696 0.17 162)"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="interventionsGrad"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.72 0.17 72)"
                          stopOpacity={0.06}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.72 0.17 72)"
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
                      dataKey="date"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickFormatter={(value) => {
                        const d = new Date(value);
                        return d.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        });
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
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!(active && payload?.length)) {
                          return null;
                        }
                        const dateObj = new Date(payload[0].payload.date);
                        return (
                          <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-white/5 dark:bg-zinc-900/90">
                            <p className="font-bold text-[10px] text-muted-foreground">
                              {dateObj.toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </p>
                            <div className="mt-2 space-y-1">
                              {payload.map((p) => (
                                <div
                                  className="flex items-center justify-between gap-6 font-semibold text-xs"
                                  key={p.name}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: p.color }}
                                    />
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {p.name}
                                    </span>
                                  </div>
                                  <span className="font-bold text-zinc-900 tabular-nums dark:text-white">
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
                      activeDot={{
                        r: 4,
                        strokeWidth: 1.5,
                        fill: "var(--background)",
                        stroke: "oklch(0.696 0.17 162)",
                      }}
                      dataKey="consultations"
                      dot={false}
                      fill="url(#consultationsGrad)"
                      name="Consultations"
                      stroke="oklch(0.696 0.17 162)"
                      strokeWidth={2}
                      type="monotone"
                    />
                    <Area
                      activeDot={{
                        r: 4,
                        strokeWidth: 1.5,
                        fill: "var(--background)",
                        stroke: "oklch(0.72 0.17 72)",
                      }}
                      dataKey="interventions"
                      dot={false}
                      fill="url(#interventionsGrad)"
                      name="Interventions"
                      stroke="oklch(0.72 0.17 72)"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="h-full w-full"
                exit={{ opacity: 0, scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.98 }}
                key="financial-chart"
                transition={{ duration: 0.3 }}
              >
                <ResponsiveContainer
                  height="100%"
                  minHeight={0}
                  minWidth={0}
                  width="100%"
                >
                  <BarChart
                    data={combinedFinancialData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="revenueGrad"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
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
                      yAxisId="left"
                    />
                    <YAxis
                      axisLine={false}
                      orientation="right"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickLine={false}
                      yAxisId="right"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!(active && payload?.length)) {
                          return null;
                        }
                        const month = payload[0].payload.month;
                        return (
                          <div className="rounded-2xl border border-zinc-950/10 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/95">
                            <p className="font-bold text-muted-foreground text-xs">
                              {month}
                            </p>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center justify-between gap-6 font-bold text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-[0_0_6px_#8b5cf6]" />
                                  <span className="text-muted-foreground">
                                    Revenus
                                  </span>
                                </div>
                                <span className="font-extrabold text-foreground tabular-nums">
                                  {new Intl.NumberFormat("fr-FR").format(
                                    payload[0].payload.revenue
                                  )}{" "}
                                  DA
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-6 font-bold text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                                  <span className="text-muted-foreground">
                                    Consultations
                                  </span>
                                </div>
                                <span className="font-extrabold text-foreground tabular-nums">
                                  {payload[0].payload.appointments}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="url(#revenueGrad)"
                      maxBarSize={28}
                      name="Revenus"
                      radius={[10, 10, 0, 0]}
                      yAxisId="left"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
