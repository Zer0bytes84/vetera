"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import {
  useAppointmentsRepository,
  useOwnersRepository,
  usePatientsRepository,
  useTasksRepository,
  useTransactionsRepository,
} from "@/data/repositories";
import { buildDashboardMetrics, type DashboardMetrics } from "@/lib/metrics";
import type { View } from "@/types";
import {
  ProspeoActivityHeatmap,
  ProspeoConsultationsTable,
  ProspeoIcons,
  ProspeoMetricCard,
  ProspeoPipeline,
  ProspeoRetentionReport,
  ProspeoRevenueChart,
  ProspeoRevenueReport,
  ProspeoSparkCard,
  ProspeoTopProcedures,
  type RetentionTrendPoint,
  type RevenuePeriod,
  type RevenueReportRow,
} from "./components/prospeo-dashboard-widgets";

type DashboardOrbitPageProps = {
  onNavigate: (view: View) => void;
  onOpenAIAgent?: () => void;
};

function formatCompactInteger(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function getDeltaPercent(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function parseDashboardDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = sqliteLike ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) && sqliteLike) {
    const localDate = new Date(value.replace(" ", "T"));
    return Number.isFinite(localDate.getTime()) ? localDate : null;
  }
  return Number.isFinite(date.getTime()) ? date : null;
}

export function DashboardOrbitPage({
  onNavigate,
  onOpenAIAgent,
}: DashboardOrbitPageProps) {
  const { data: appointments } = useAppointmentsRepository();
  const { data: owners } = useOwnersRepository();
  const { data: patients } = usePatientsRepository();
  const { data: tasks } = useTasksRepository();
  const { data: transactions } = useTransactionsRepository();

  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>("30d");

  const metrics = useMemo<DashboardMetrics>(
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

  const revenueDelta = getDeltaPercent(
    metrics.summary.income30,
    metrics.summary.previousIncome30
  );
  const appointmentsDelta = getDeltaPercent(
    metrics.summary.todayAppointments,
    metrics.summary.yesterdayAppointments
  );
  const returningDelta = getDeltaPercent(
    metrics.summary.currentReturningPatients,
    metrics.summary.previousReturningPatients
  );
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const urgentTasks = tasks.filter(
    (task) => task.priority === "high" && task.status !== "done"
  ).length;

  // Revenue trend dynamique selon la période sélectionnée (7j / 30j / 90j)
  const periodDays =
    revenuePeriod === "7d" ? 7 : revenuePeriod === "30d" ? 30 : 90;
  const revenueChart = useMemo(() => {
    const reference = new Date(metrics.referenceDate);
    reference.setHours(23, 59, 59, 999);
    const start = new Date(reference);
    start.setDate(start.getDate() - (periodDays - 1));
    start.setHours(0, 0, 0, 0);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(start);
    previousEnd.setMilliseconds(-1);

    const buckets = new Map<string, number>();
    let total = 0;
    let previousTotal = 0;

    for (const tx of transactions) {
      if (tx.type !== "income" || tx.status !== "paid") {
        continue;
      }
      const date = parseDashboardDate(tx.date);
      if (!date) {
        continue;
      }
      const amount = tx.amount / 100;
      if (date >= start && date <= reference) {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        buckets.set(key, (buckets.get(key) || 0) + amount);
        total += amount;
      } else if (date >= previousStart && date <= previousEnd) {
        previousTotal += amount;
      }
    }

    const groupBy: "day" | "week" = periodDays > 30 ? "week" : "day";
    const data: { name: string; value: number }[] = [];

    if (groupBy === "day") {
      for (let i = 0; i < periodDays; i += 1) {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
        data.push({
          name: day.toLocaleDateString(
            "fr-FR",
            periodDays <= 7
              ? { weekday: "short" }
              : { day: "2-digit", month: "short" }
          ),
          value: buckets.get(key) || 0,
        });
      }
    } else {
      // 90j → grouper par semaine pour rester lisible
      for (let i = 0; i < periodDays; i += 7) {
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() + i);
        let weekValue = 0;
        for (let d = 0; d < 7 && i + d < periodDays; d += 1) {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + d);
          weekValue +=
            buckets.get(
              `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            ) || 0;
        }
        data.push({
          name: weekStart.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
          }),
          value: weekValue,
        });
      }
    }

    return { data, total, delta: getDeltaPercent(total, previousTotal) };
  }, [transactions, periodDays, metrics.referenceDate]);

  // Heatmap : 365 jours d'activité clinique
  const heatmapDays = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const appointment of appointments) {
      if (["cancelled", "no_show"].includes(appointment.status)) {
        continue;
      }
      const date = parseDashboardDate(appointment.startTime);
      if (!date) {
        continue;
      }
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    const today = new Date(metrics.referenceDate);
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; value: number }[] = [];
    for (let i = 364; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      days.push({ date: day, value: buckets.get(key) || 0 });
    }
    return days;
  }, [appointments, metrics.referenceDate]);

  // Rapport revenus par catégorie (Top 3 catégories avec delta vs période précédente)
  const revenueReport = useMemo(() => {
    const ref = new Date(metrics.referenceDate);
    ref.setHours(23, 59, 59, 999);
    const last30Start = new Date(ref);
    last30Start.setDate(last30Start.getDate() - 29);
    last30Start.setHours(0, 0, 0, 0);
    const prev30Start = new Date(last30Start);
    prev30Start.setDate(prev30Start.getDate() - 30);
    const prev30End = new Date(last30Start);
    prev30End.setMilliseconds(-1);

    const currentByCategory = new Map<string, number>();
    const previousByCategory = new Map<string, number>();
    let totalCurrent = 0;
    let totalPrevious = 0;

    for (const tx of transactions) {
      if (tx.type !== "income" || tx.status !== "paid") {
        continue;
      }
      const date = parseDashboardDate(tx.date);
      if (!date) {
        continue;
      }
      const category = tx.category || "Autre";
      const amount = tx.amount / 100;
      if (date >= last30Start && date <= ref) {
        currentByCategory.set(
          category,
          (currentByCategory.get(category) || 0) + amount
        );
        totalCurrent += amount;
      } else if (date >= prev30Start && date <= prev30End) {
        previousByCategory.set(
          category,
          (previousByCategory.get(category) || 0) + amount
        );
        totalPrevious += amount;
      }
    }

    const rows: RevenueReportRow[] = Array.from(currentByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({
        label,
        amount,
        delta: getDeltaPercent(amount, previousByCategory.get(label) || 0),
      }));

    const totalDelta = getDeltaPercent(totalCurrent, totalPrevious);

    // 12 mois pour le bar chart
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const currentMonth = ref.getMonth();
    const currentYear = ref.getFullYear();
    const monthlyData: { month: string; value: number; isCurrent?: boolean }[] =
      [];
    for (let i = 11; i >= 0; i -= 1) {
      const target = new Date(currentYear, currentMonth - i, 1);
      const monthStart = new Date(target);
      const monthEnd = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      let value = 0;
      for (const tx of transactions) {
        if (tx.type !== "income" || tx.status !== "paid") {
          continue;
        }
        const date = parseDashboardDate(tx.date);
        if (!date) {
          continue;
        }
        if (date >= monthStart && date <= monthEnd) {
          value += tx.amount / 100;
        }
      }
      monthlyData.push({
        month: monthNames[target.getMonth()],
        value,
        isCurrent: i === 0,
      });
    }

    return { total: totalCurrent, delta: totalDelta, rows, monthlyData };
  }, [transactions, metrics.referenceDate]);

  // Fidélisation patients (taux de retour + breakdown par espèce + trend 8 semaines)
  const retentionReport = useMemo(() => {
    const ref = new Date(metrics.referenceDate);
    ref.setHours(23, 59, 59, 999);
    const last90Start = new Date(ref);
    last90Start.setDate(last90Start.getDate() - 89);
    last90Start.setHours(0, 0, 0, 0);
    const prev90Start = new Date(last90Start);
    prev90Start.setDate(prev90Start.getDate() - 90);
    const prev90End = new Date(last90Start);
    prev90End.setMilliseconds(-1);

    // Compte les visites par patient sur la fenêtre courante / précédente
    const visitsCurrent = new Map<string, number>();
    const visitsPrevious = new Map<string, number>();
    for (const a of appointments) {
      if (["cancelled", "no_show"].includes(a.status)) {
        continue;
      }
      const date = parseDashboardDate(a.startTime);
      if (!date) {
        continue;
      }
      if (date >= last90Start && date <= ref) {
        visitsCurrent.set(
          a.patientId,
          (visitsCurrent.get(a.patientId) || 0) + 1
        );
      } else if (date >= prev90Start && date <= prev90End) {
        visitsPrevious.set(
          a.patientId,
          (visitsPrevious.get(a.patientId) || 0) + 1
        );
      }
    }

    const seenCurrent = visitsCurrent.size;
    const returningCurrent = Array.from(visitsCurrent.values()).filter(
      (c) => c > 1
    ).length;
    const seenPrevious = visitsPrevious.size;
    const returningPrevious = Array.from(visitsPrevious.values()).filter(
      (c) => c > 1
    ).length;

    const rateCurrent = seenCurrent
      ? (returningCurrent / seenCurrent) * 100
      : 0;
    const ratePrevious = seenPrevious
      ? (returningPrevious / seenPrevious) * 100
      : 0;
    const rateDelta = getDeltaPercent(rateCurrent, ratePrevious);

    // Breakdown par espèce
    const patientsByIdMap = new Map(patients.map((p) => [p.id, p]));
    const speciesCurrent = new Map<string, number>();
    const speciesPrevious = new Map<string, number>();
    for (const [pid] of visitsCurrent) {
      const pat = patientsByIdMap.get(pid);
      const species = pat?.species || "Autre";
      speciesCurrent.set(species, (speciesCurrent.get(species) || 0) + 1);
    }
    for (const [pid] of visitsPrevious) {
      const pat = patientsByIdMap.get(pid);
      const species = pat?.species || "Autre";
      speciesPrevious.set(species, (speciesPrevious.get(species) || 0) + 1);
    }

    const rows: RevenueReportRow[] = Array.from(speciesCurrent.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({
        label,
        amount,
        delta: getDeltaPercent(amount, speciesPrevious.get(label) || 0),
      }));

    // Trend par semaine (8 dernières semaines) : nouveaux vs retour
    const weeks = 8;
    const trend: RetentionTrendPoint[] = [];
    const seenBeforeIds = new Set<string>();
    for (const a of appointments) {
      const date = parseDashboardDate(a.startTime);
      if (!date) {
        continue;
      }
      const earliestStart = new Date(ref);
      earliestStart.setDate(earliestStart.getDate() - weeks * 7);
      if (date < earliestStart) {
        seenBeforeIds.add(a.patientId);
      }
    }

    for (let w = weeks - 1; w >= 0; w -= 1) {
      const weekEnd = new Date(ref);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      let nouveaux = 0;
      let retour = 0;
      const thisWeekSeen = new Set<string>();
      for (const a of appointments) {
        if (["cancelled", "no_show"].includes(a.status)) {
          continue;
        }
        const date = parseDashboardDate(a.startTime);
        if (!date || date < weekStart || date > weekEnd) {
          continue;
        }
        if (thisWeekSeen.has(a.patientId)) {
          continue;
        }
        thisWeekSeen.add(a.patientId);
        if (seenBeforeIds.has(a.patientId)) {
          retour += 1;
        } else {
          nouveaux += 1;
          seenBeforeIds.add(a.patientId);
        }
      }
      trend.push({
        name: weekStart.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        nouveaux,
        retour,
      });
    }

    return { rate: rateCurrent, delta: rateDelta, rows, trend };
  }, [appointments, patients, metrics.referenceDate]);

  const recentConsultations = useMemo(() => {
    const today = new Date(metrics.referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments
      .filter((appointment) => {
        const date = parseDashboardDate(appointment.startTime);
        if (!date) {
          return false;
        }
        return date >= today && date < tomorrow;
      })
      .slice(0, 5)
      .map((appointment) => {
        const patient = patients.find(
          (item) => item.id === appointment.patientId
        );
        const owner = owners.find(
          (item) => item.id === (patient?.ownerId || appointment.ownerId)
        );
        return {
          id: appointment.id,
          patient: patient?.name || appointment.title,
          owner: owner
            ? `${owner.firstName} ${owner.lastName}`.trim()
            : "Propriétaire",
          type: appointment.type,
          time: (
            parseDashboardDate(appointment.startTime) ?? new Date()
          ).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: appointment.status,
        };
      });
  }, [appointments, patients, owners, metrics.referenceDate]);

  const taskSparkData = useMemo(
    () =>
      metrics.taskCadenceSeries.map((item) => ({
        name: item.label,
        value: item.total,
      })),
    [metrics.taskCadenceSeries]
  );

  return (
    <div className="prospeo-dashboard flex w-full flex-col gap-5 px-4 pt-5 pb-16 md:px-5 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ProspeoMetricCard
          caption="vs période précédente"
          compact
          delta={revenueDelta}
          icon={ProspeoIcons.revenue}
          title="Revenus 30j"
          tone="orange"
          value={`${formatCompactInteger(metrics.summary.income30)} DA`}
        />
        <ProspeoMetricCard
          caption="vs hier"
          delta={appointmentsDelta}
          icon={ProspeoIcons.appointment}
          title="RDV aujourd'hui"
          tone="blue"
          value={String(metrics.summary.todayAppointments).padStart(2, "0")}
        />
        <ProspeoMetricCard
          caption="patients retour"
          delta={returningDelta}
          icon={ProspeoIcons.patient}
          title="Patients actifs"
          tone="green"
          value={formatCompactInteger(metrics.summary.currentActivePatients)}
        />
        <ProspeoMetricCard
          caption={`${urgentTasks} urgentes`}
          delta={urgentTasks ? -urgentTasks : 0}
          icon={ProspeoIcons.task}
          title="Tâches ouvertes"
          tone={urgentTasks ? "red" : "green"}
          value={String(openTasks).padStart(2, "0")}
        />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <ProspeoRevenueChart
          data={revenueChart.data}
          delta={revenueChart.delta}
          onPeriodChange={setRevenuePeriod}
          period={revenuePeriod}
          total={revenueChart.total}
        />
        <ProspeoConsultationsTable
          onOpen={() => onNavigate("clinique")}
          onSelect={() => onNavigate("clinique")}
          rows={recentConsultations}
        />
      </div>

      <ProspeoActivityHeatmap
        days={heatmapDays}
        onSelectDay={() => onNavigate("agenda")}
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <ProspeoRevenueReport
          delta={revenueReport.delta}
          monthlyData={revenueReport.monthlyData}
          onDetails={() => onNavigate("finances_analytics")}
          rows={revenueReport.rows}
          total={revenueReport.total}
        />
        <ProspeoRetentionReport
          delta={retentionReport.delta}
          onDetails={() => onNavigate("patients")}
          rate={retentionReport.rate}
          rows={retentionReport.rows}
          trend={retentionReport.trend}
        />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-3 [&>*]:min-w-0">
        <ProspeoPipeline rows={metrics.pipelineRows} />
        <ProspeoTopProcedures rows={metrics.topAppointmentTypes} />
        <ProspeoSparkCard
          data={taskSparkData}
          title="Cadence tâches"
          tone="orange"
          value={`${Math.round(metrics.summary.taskCadenceRate)}%`}
        />
      </div>

      {onOpenAIAgent && (
        <button
          aria-label="Assistant IA"
          className="fixed right-6 bottom-6 z-50 flex size-12 items-center justify-center rounded-full bg-[var(--prospeo-active)] text-black shadow-[0_18px_38px_-22px_var(--prospeo-active)] transition-all hover:scale-105 active:scale-95"
          onClick={onOpenAIAgent}
          type="button"
        >
          <HugeiconsIcon
            className="size-5"
            icon={SparklesIcon}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  );
}
