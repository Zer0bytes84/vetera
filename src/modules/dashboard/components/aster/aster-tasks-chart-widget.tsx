"use client";

import { ListTodo, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  useAppointmentsRepository,
  useTasksRepository,
} from "@/data/repositories";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const parseDate = (value?: string) => {
  if (!value) {
    return null;
  }
  const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = sqliteLike ? value.replace(" ", "T") : value;
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d : null;
};

export function AsterTasksChartWidget({
  className,
  metrics,
}: {
  className?: string;
  metrics?: DashboardMetrics;
}) {
  const { data: allTasks } = useTasksRepository();
  const { data: allAppointments } = useAppointmentsRepository();

  const refDate = useMemo(() => {
    if (metrics?.referenceDate) {
      return new Date(metrics.referenceDate);
    }
    return new Date();
  }, [metrics?.referenceDate]);

  const todayAppointments = useMemo(() => {
    const start = new Date(refDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(refDate);
    end.setHours(23, 59, 59, 999);

    return allAppointments.filter((item) => {
      const date = parseDate(item.startTime);
      const isToday = date && date >= start && date <= end;
      const isValidStatus = !["cancelled", "no_show"].includes(item.status);
      return isToday && isValidStatus;
    });
  }, [allAppointments, refDate]);

  const stats = useMemo(() => {
    const normalTasks = allTasks.filter(
      (t) => !t.isReminder && t.priority !== "high"
    );
    const reminders = allTasks.filter((t) => t.isReminder);
    const urgentTasks = allTasks.filter(
      (t) => !t.isReminder && t.priority === "high"
    );

    const normalAppts = todayAppointments.filter(
      (a) => a.type !== "Urgence" && a.type !== "Vaccin"
    );
    const reminderAppts = todayAppointments.filter((a) => a.type === "Vaccin");
    const urgentAppts = todayAppointments.filter((a) => a.type === "Urgence");

    const getRates = (
      tasksList: typeof allTasks,
      apptsList: typeof todayAppointments
    ) => {
      const totalTasks = tasksList.length;
      const doneTasks = tasksList.filter((t) => t.status === "done").length;

      const totalAppts = apptsList.length;
      const doneAppts = apptsList.filter(
        (a) => a.status === "completed"
      ).length;

      const total = totalTasks + totalAppts;
      const done = doneTasks + doneAppts;

      if (total === 0) {
        return { total: 0, done: 0, percentage: 0 };
      }
      return { total, done, percentage: Math.round((done / total) * 100) };
    };

    if (allTasks.length === 0 && todayAppointments.length === 0) {
      return {
        tasks: { percentage: 75 },
        reminders: { percentage: 42 },
        urgent: { percentage: 15 },
      };
    }

    return {
      tasks: getRates(normalTasks, normalAppts),
      reminders: getRates(reminders, reminderAppts),
      urgent: getRates(urgentTasks, urgentAppts),
    };
  }, [allTasks, todayAppointments]);

  const categories = [
    {
      label: "Courantes",
      percentage: stats.tasks.percentage,
      color: "bg-cyan-400 dark:bg-cyan-500",
      trendColor: "text-emerald-600 dark:text-emerald-400",
      TrendIcon: stats.tasks.percentage >= 50 ? TrendingUp : TrendingDown,
      status:
        stats.tasks.percentage >= 80
          ? "Positif"
          : stats.tasks.percentage >= 50
            ? "Neutre"
            : "Critique",
    },
    {
      label: "Rappels",
      percentage: stats.reminders.percentage,
      color: "bg-fuchsia-400 dark:bg-fuchsia-500",
      trendColor: "text-zinc-400 dark:text-zinc-500",
      TrendIcon: Minus,
      status:
        stats.reminders.percentage >= 80
          ? "Positif"
          : stats.reminders.percentage >= 50
            ? "Neutre"
            : "Critique",
    },
    {
      label: "Urgences",
      percentage: stats.urgent.percentage,
      color: "bg-rose-400 dark:bg-rose-500",
      trendColor: "text-rose-600 dark:text-rose-400",
      TrendIcon: stats.urgent.percentage >= 50 ? TrendingUp : TrendingDown,
      status:
        stats.urgent.percentage >= 80
          ? "Positif"
          : stats.urgent.percentage >= 50
            ? "Neutre"
            : "Critique",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      {/* Outer Card Header */}
      <div className="mb-2 flex select-none items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-zinc-200/60 dark:bg-zinc-800">
            <ListTodo className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="flex items-center gap-2 font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200">
            Progression des objectifs
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </span>
        </div>
        <button className="cursor-pointer font-medium text-[11px] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
          Voir plus
        </button>
      </div>

      {/* Inner White Box — Sentiment Analysis style */}
      <div className="flex flex-1 flex-col rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        {/* KPI Row */}
        <div className="grid select-none grid-cols-3 gap-3">
          {categories.map((cat, idx) => (
            <div
              className={cn(
                "flex flex-col gap-1",
                idx === 1 &&
                  "border-zinc-100 border-x px-4 dark:border-zinc-800/80"
              )}
              key={cat.label}
            >
              <span className="font-semibold text-2xl text-zinc-900 tabular-nums tracking-tight dark:text-zinc-50">
                {cat.percentage}%
              </span>
              <span className="font-medium text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
                {cat.label}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 font-semibold text-[10px]",
                  cat.trendColor
                )}
              >
                <cat.TrendIcon className="h-3 w-3" />
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bars */}
        <div className="mt-5 flex flex-col gap-3">
          {categories.map((cat) => (
            <div className="flex flex-col gap-1.5" key={cat.label}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                  {cat.label}
                </span>
                <span className="font-bold text-[10px] text-zinc-600 tabular-nums dark:text-zinc-300">
                  {cat.percentage}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    cat.color
                  )}
                  style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
