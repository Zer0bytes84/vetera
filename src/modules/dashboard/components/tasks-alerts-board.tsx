"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTasksRepository } from "@/data/repositories";
import { Check, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import * as React from "react";
import type { View } from "@/types";

export interface DashboardTask {
  id: string;
  title: string;
  priority: string; // 'high', 'medium', 'low'
  status: string; // 'todo', 'in_progress', 'done'
  dueDate?: string;
}

interface TasksAlertsBoardProps {
  onNavigate?: (view: View) => void;
}

export function TasksAlertsBoard({ onNavigate }: TasksAlertsBoardProps) {
  const { data: tasks, update: updateTask } = useTasksRepository();

  // Extract pending tasks (not completed)
  const pendingTasks = React.useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        // High priority first, then date
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (a.priority !== "high" && b.priority === "high") return 1;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return ad - bd;
      });
  }, [tasks]);

  const urgentCount = React.useMemo(() => {
    return pendingTasks.filter((t) => t.priority === "high").length;
  }, [pendingTasks]);

  // Toggle status inside database
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    try {
      const ok = await updateTask(taskId, { status: newStatus });
      if (ok) {
        toast.success(
          newStatus === "done" ? "Tâche marquée comme complétée !" : "Tâche réactivée."
        );
      } else {
        toast.error("Impossible de mettre à jour la tâche.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour de la tâche.");
    }
  };

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden shadow-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20 active:scale-[0.995]">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute left-0 bottom-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/5" />
      </div>

      {/* Header */}
      <div className="border-b border-zinc-950/10 px-6 py-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-400 dark:from-amber-400 dark:to-rose-300">
              Urgences & Tâches actives
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Tableau des Actions
            </h3>
          </div>

          {/* Urgent alert counter */}
          {urgentCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 font-semibold text-xs text-rose-700 border border-rose-500/20 dark:text-rose-300 dark:bg-rose-500/5 dark:border-rose-400/10 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
              <AlertCircle className="size-3.5" />
              <span className="tabular-nums font-bold">{urgentCount}</span> urgent{urgentCount > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950/5 px-3 py-1 font-semibold text-[11px] text-muted-foreground dark:bg-white/5">
              <span>À jour</span>
            </div>
          )}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto px-1 py-2 max-h-[290px]">
        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="text-3xl">🎉</span>
            <p className="italic text-sm text-foreground">Toutes les tâches sont terminées !</p>
            <p className="text-xs text-muted-foreground">Excellent travail, aucune action requise.</p>
          </div>
        ) : (
          <div className="space-y-2 px-2">
            {pendingTasks.slice(0, 5).map((task) => {
              const isHigh = task.priority === "high";
              const formattedDate = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })
                : undefined;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl p-3 border transition-all duration-300 pl-4",
                    isHigh
                      ? "border-amber-500/30 bg-amber-500/[0.03] hover:border-amber-500/50 hover:bg-amber-500/[0.05] dark:border-amber-400/20 dark:bg-amber-400/[0.015] dark:hover:border-amber-400/30 hover:shadow-xs"
                      : "border-transparent bg-transparent hover:bg-zinc-950/5 dark:hover:bg-white/5"
                  )}
                >
                  {/* Glowing pulse indicator for high priority */}
                  {isHigh && (
                    <span className="absolute left-[3px] top-4 bottom-4 w-[3px] rounded-full">
                      <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                    </span>
                  )}

                  {/* Checkbox button */}
                  <button
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-lg border text-white transition-all duration-200 cursor-pointer active:scale-[0.85]",
                      task.status === "done"
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500 border-transparent shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                        : "border-zinc-900/15 bg-white hover:border-zinc-950/30 dark:border-white/15 dark:bg-zinc-950 dark:hover:border-white/30"
                    )}
                    type="button"
                    aria-label="Cocher la tâche"
                  >
                    {task.status === "done" && <Check className="size-3.5 stroke-[3]" />}
                  </button>

                  {/* Task description */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate font-bold text-xs leading-tight text-foreground",
                        task.status === "done" && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize font-semibold">
                      Priorité: {task.priority === "high" ? "haute" : task.priority === "medium" ? "moyenne" : "basse"}
                    </p>
                  </div>

                  {/* Date Badge */}
                  {formattedDate && (
                    <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground font-semibold bg-zinc-950/5 px-2 py-0.5 rounded-full dark:bg-white/5">
                      <Clock className="size-3" />
                      <span className="tabular-nums font-bold">{formattedDate}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer action */}
      {onNavigate && (
        <div className="mt-auto border-t border-zinc-950/10 p-4 dark:border-white/10">
          <button
            onClick={() => onNavigate("taches")}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 font-semibold text-xs text-white transition-all duration-200 hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.97] active:duration-75 hover:shadow-md dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
            type="button"
          >
            Gérer toutes les tâches
          </button>
        </div>
      )}
    </Card>
  );
}
