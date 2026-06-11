"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppointmentsRepository } from "@/data/repositories";
import { DashboardMetrics } from "@/lib/metrics";
import { Stethoscope, Clock, CheckCircle2, CalendarX, CalendarClock } from "lucide-react";
import { isToday, parseISO } from "date-fns";

export function AsterConsultationsWidget({ metrics, className }: { metrics: DashboardMetrics; className?: string }) {
  const { data: appointments } = useAppointmentsRepository();

  const todayStats = useMemo(() => {
    const todayAppointments = appointments.filter(a => {
      if (!a.startTime) return false;
      try {
        const date = parseISO(a.startTime);
        return isToday(date);
      } catch (e) {
        return false;
      }
    });

    const scheduled = todayAppointments.filter(a => a.status === "scheduled").length;
    const inProgress = todayAppointments.filter(a => a.status === "in_progress").length;
    const completed = todayAppointments.filter(a => a.status === "completed").length;
    const noShow = todayAppointments.filter(a => a.status === "no_show" || a.status === "cancelled").length;
    
    const total = todayAppointments.length;

    return {
      scheduled,
      inProgress,
      completed,
      noShow,
      total
    };
  }, [appointments]);

  const progressPct = todayStats.total > 0 
    ? Math.round((todayStats.completed / todayStats.total) * 100) 
    : 0;

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Stethoscope className="size-4 text-emerald-600" />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Consultations du jour
          </div>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {todayStats.total}
        </div>
      </div>

      <div className="flex flex-col gap-5 flex-1 justify-center">
        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Progression</span>
            <span>{progressPct}% ({todayStats.completed}/{todayStats.total})</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
            <CalendarClock className="size-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none">{todayStats.scheduled}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">À venir</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
            <Clock className="size-4 text-orange-500" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none">{todayStats.inProgress}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">En cours</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none">{todayStats.completed}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Terminées</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20">
            <CalendarX className="size-4 text-rose-500" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold leading-none">{todayStats.noShow}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Annulées</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
