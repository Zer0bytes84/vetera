"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTasksRepository, usePatientsRepository } from "@/data/repositories";
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from "lucide-react";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function AsterTasksAlerts({ className }: { className?: string }) {
  const { data: tasks } = useTasksRepository();
  const { data: patients } = usePatientsRepository();

  const activeTasks = useMemo(() => {
    const pending = tasks.filter(t => t.status !== "done");
    
    // Sort by due date (earliest first), then priority
    return pending.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      const priorityWeight = { high: 0, medium: 1, low: 2 };
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }).slice(0, 4); // Top 4 tasks
  }, [tasks]);

  const getTaskStatus = (task: typeof tasks[0]) => {
    if (!task.dueDate) return { label: "Pas de date", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" };
    
    const date = parseISO(task.dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: "En retard", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/10" };
    }
    if (isToday(date)) {
      return { label: "Aujourd'hui", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/10" };
    }
    if (isTomorrow(date)) {
      return { label: "Demain", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/10" };
    }
    return { 
      label: format(date, "d MMM", { locale: fr }), 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-100 dark:bg-emerald-500/10" 
    };
  };

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10">
            <AlertCircle className="size-4 text-orange-600" />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Tâches & Alertes
          </div>
        </div>
        <button className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1">
          Tout voir <ArrowRight className="size-3" />
        </button>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {activeTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-dashed border-border/60 rounded-xl bg-muted/20">
            <CheckCircle2 className="size-8 text-emerald-500/50 mb-2" />
            <p className="text-sm font-medium text-foreground">Aucune tâche en attente</p>
            <p className="text-xs text-muted-foreground">Votre to-do list est vide !</p>
          </div>
        ) : (
          activeTasks.map((task) => {
            const status = getTaskStatus(task);
            const patient = task.patientId ? patients.find(p => p.id === task.patientId) : null;
            
            return (
              <div 
                key={task.id} 
                className="group flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-border hover:shadow-sm bg-background/50 transition-all"
              >
                <button className="mt-0.5 shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors">
                  <Circle className="size-4" />
                </button>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium tracking-wide", status.bg, status.color)}>
                      {status.label}
                    </span>
                    {patient && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        Patient: {patient.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
