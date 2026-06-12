"use client";

import { isToday, parseISO } from "date-fns";
import {
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Stethoscope,
} from "lucide-react";
import { useMemo } from "react";
import { useAppointmentsRepository } from "@/data/repositories";
import type { DashboardMetrics } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export function AsterConsultationsWidget({
  metrics,
  className,
}: {
  metrics: DashboardMetrics;
  className?: string;
}) {
  const { data: appointments } = useAppointmentsRepository();

  const todayStats = useMemo(() => {
    const todayAppointments = appointments.filter((a) => {
      if (!a.startTime) {
        return false;
      }
      try {
        const date = parseISO(a.startTime);
        return isToday(date);
      } catch (e) {
        return false;
      }
    });

    const scheduled = todayAppointments.filter(
      (a) => a.status === "scheduled"
    ).length;
    const inProgress = todayAppointments.filter(
      (a) => a.status === "in_progress"
    ).length;
    const completed = todayAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const noShow = todayAppointments.filter(
      (a) => a.status === "no_show" || a.status === "cancelled"
    ).length;

    const total = todayAppointments.length;

    return {
      scheduled,
      inProgress,
      completed,
      noShow,
      total,
    };
  }, [appointments]);

  const progressPct =
    todayStats.total > 0
      ? Math.round((todayStats.completed / todayStats.total) * 100)
      : 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Stethoscope className="size-4 text-emerald-600" />
          </div>
          <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            Consultations du jour
          </div>
        </div>
        <div className="font-semibold text-2xl text-foreground tracking-tight">
          {todayStats.total}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5">
        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between font-medium text-muted-foreground text-xs">
            <span>Progression</span>
            <span>
              {progressPct}% ({todayStats.completed}/{todayStats.total})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Status grid */}
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-800/20">
            <CalendarClock className="size-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-none">
                {todayStats.scheduled}
              </span>
              <span className="mt-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                À venir
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-800/20">
            <Clock className="size-4 text-orange-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-none">
                {todayStats.inProgress}
              </span>
              <span className="mt-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                En cours
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-800/20">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-none">
                {todayStats.completed}
              </span>
              <span className="mt-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                Terminées
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800/50 dark:bg-zinc-800/20">
            <CalendarX className="size-4 text-rose-500" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg leading-none">
                {todayStats.noShow}
              </span>
              <span className="mt-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                Annulées
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
