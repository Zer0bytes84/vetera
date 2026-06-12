"use client";

import { motion } from "framer-motion";
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

const PremiumSegmentedBar = ({
  label,
  percentage,
  activeColorClass,
  inactiveColorClass,
  delayOffset = 0,
}: {
  label: string;
  percentage: number;
  activeColorClass: string;
  inactiveColorClass: string;
  delayOffset?: number;
}) => {
  const segments = 32;
  const litCount = Math.round((percentage / 100) * segments);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-zinc-50/50 p-5 transition-colors duration-500 hover:bg-zinc-100/50 dark:border-white/[0.03] dark:bg-[#151515] dark:hover:bg-[#1a1a1a]">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-10">
        <div
          className={cn(
            "absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl",
            activeColorClass
          )}
        />
      </div>

      <div className="relative z-10 mb-4 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest">
            {label}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-light text-3xl text-foreground tracking-tight">
              {percentage}
            </span>
            <span className="font-medium text-muted-foreground text-sm">%</span>
          </div>
        </div>

        {/* Small badge/indicator */}
        <div
          className={cn(
            "mb-1.5 rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider opacity-80",
            activeColorClass,
            "text-white dark:text-black/80"
          )}
        >
          {percentage >= 80
            ? "Optimal"
            : percentage >= 50
              ? "En cours"
              : "Critique"}
        </div>
      </div>

      {/* Segments with wave animation */}
      <div className="relative z-10 flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < litCount;
          return (
            <motion.div
              animate={{ opacity: 1, scaleY: 1 }}
              className={cn(
                "h-6 flex-1 rounded-[2px] transition-colors duration-500",
                isActive
                  ? activeColorClass
                  : cn(inactiveColorClass, "group-hover:opacity-60")
              )}
              initial={{ opacity: 0, scaleY: 0.5 }}
              key={i}
              transition={{
                delay: delayOffset + i * 0.015,
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
              }}
            />
          );
        })}
      </div>
    </div>
  );
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
      // Fake data for visual testing when DB is empty
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

  return (
    <div
      className={cn(
        "flex flex-col justify-center rounded-[16px] border border-border bg-card p-2 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="px-6 pt-5 pb-2">
        <h3 className="flex items-center gap-2 font-semibold text-[14px] text-foreground">
          Progression des objectifs
          <span className="relative ml-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-2 p-2">
        <PremiumSegmentedBar
          activeColorClass="bg-cyan-400 dark:bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          delayOffset={0}
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          label="Tâches courantes"
          percentage={stats.tasks.percentage}
        />

        <PremiumSegmentedBar
          activeColorClass="bg-fuchsia-400 dark:bg-fuchsia-500 shadow-[0_0_8px_rgba(232,121,249,0.4)]"
          delayOffset={0.1}
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          label="Rappels (Vaccins, Relances)"
          percentage={stats.reminders.percentage}
        />

        <PremiumSegmentedBar
          activeColorClass="bg-rose-400 dark:bg-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.4)]"
          delayOffset={0.2}
          inactiveColorClass="bg-zinc-200 dark:bg-zinc-800/60"
          label="Urgences & Priorité Haute"
          percentage={stats.urgent.percentage}
        />
      </div>
    </div>
  );
}
