"use client";

import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useMemo } from "react";
import { usePatientsRepository, useTasksRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";

export function AsterTasksAlerts({ className }: { className?: string }) {
  const { data: tasks } = useTasksRepository();
  const { data: patients } = usePatientsRepository();

  const activeTasks = useMemo(() => {
    const pending = tasks.filter((t) => t.status !== "done");

    // Sort by due date (earliest first), then priority
    return pending
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) {
          return -1;
        }
        if (b.dueDate) {
          return 1;
        }

        const priorityWeight = { high: 0, medium: 1, low: 2 };
        return priorityWeight[a.priority] - priorityWeight[b.priority];
      })
      .slice(0, 4); // Top 4 tasks
  }, [tasks]);

  const getTaskStatus = (task: (typeof tasks)[0]) => {
    if (!task.dueDate) {
      return {
        label: "Pas de date",
        color: "text-zinc-500 dark:text-zinc-400",
        bg: "bg-zinc-100 dark:bg-zinc-800",
      };
    }

    const date = parseISO(task.dueDate);
    if (isPast(date) && !isToday(date)) {
      return {
        label: "En retard",
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-100 dark:bg-rose-500/10",
      };
    }
    if (isToday(date)) {
      return {
        label: "Aujourd'hui",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-500/10",
      };
    }
    if (isTomorrow(date)) {
      return {
        label: "Demain",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-500/10",
      };
    }
    return {
      label: format(date, "d MMM", { locale: fr }),
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/10",
    };
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10">
            <AlertCircle className="size-4 text-orange-600" />
          </div>
          <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            Tâches & Alertes
          </div>
        </div>
        <button className="flex items-center gap-1 font-semibold text-[11px] text-blue-500 transition-colors hover:text-blue-600">
          Tout voir <ArrowRight className="size-3" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {activeTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border/60 border-dashed bg-muted/20 p-4 text-center">
            <CheckCircle2 className="mb-2 size-8 text-emerald-500/50" />
            <p className="font-medium text-foreground text-sm">
              Aucune tâche en attente
            </p>
            <p className="text-muted-foreground text-xs">
              Votre to-do list est vide !
            </p>
          </div>
        ) : (
          activeTasks.map((task) => {
            const status = getTaskStatus(task);
            const patient = task.patientId
              ? patients.find((p) => p.id === task.patientId)
              : null;

            return (
              <div
                className="group flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3 transition-all hover:border-border hover:shadow-sm"
                key={task.id}
              >
                <button className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-emerald-500">
                  <Circle className="size-4" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-foreground text-sm">
                    {task.title}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 font-medium text-[10px] tracking-wide",
                        status.bg,
                        status.color
                      )}
                    >
                      {status.label}
                    </span>
                    {patient && (
                      <span className="truncate text-[11px] text-muted-foreground">
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
