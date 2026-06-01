"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTasksRepository } from "@/data/repositories";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import * as React from "react";
import type { View } from "@/types";

interface TasksAlertsBoardProps {
  onNavigate?: (view: View) => void;
}

type FilterPriority = "all" | "high" | "medium" | "low";

const PRIORITY_META: Record<
  string,
  { label: string; tone: string; bar: string; ring: string }
> = {
  high: {
    label: "Haute",
    tone: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20",
    bar: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
    ring: "ring-rose-500/40",
  },
  medium: {
    label: "Moyenne",
    tone: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
    bar: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    ring: "ring-amber-500/40",
  },
  low: {
    label: "Basse",
    tone: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20",
    bar: "bg-sky-500",
    ring: "ring-sky-500/30",
  },
};

function relativeDate(iso?: string): { label: string; tone: string } {
  if (!iso) return { label: "Sans échéance", tone: "text-muted-foreground" };
  const due = new Date(iso);
  if (!Number.isFinite(due.getTime())) {
    return { label: "Sans échéance", tone: "text-muted-foreground" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0)
    return {
      label: `${Math.abs(diff)}j en retard`,
      tone: "text-rose-600 dark:text-rose-400",
    };
  if (diff === 0)
    return { label: "Aujourd'hui", tone: "text-amber-600 dark:text-amber-400" };
  if (diff === 1)
    return { label: "Demain", tone: "text-amber-600 dark:text-amber-400" };
  if (diff <= 7)
    return {
      label: due.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }),
      tone: "text-foreground",
    };
  return {
    label: due.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    tone: "text-muted-foreground",
  };
}

export function TasksAlertsBoard({ onNavigate }: TasksAlertsBoardProps) {
  const { data: tasks, update: updateTask } = useTasksRepository();
  const [filter, setFilter] = React.useState<FilterPriority>("all");

  const sorted = React.useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        const pa = order[a.priority] ?? 3;
        const pb = order[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });
  }, [tasks]);

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    return {
      total,
      done,
      pending: sorted.length,
      urgent: sorted.filter((t) => t.priority === "high").length,
      ratio: total > 0 ? done / total : 0,
    };
  }, [tasks, sorted]);

  const filtered = React.useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((t) => t.priority === filter);
  }, [sorted, filter]);

  const handleToggle = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    try {
      const ok = await updateTask(taskId, { status: newStatus });
      if (ok) {
        toast.success(
          newStatus === "done"
            ? "Tâche marquée comme complétée !"
            : "Tâche réactivée."
        );
      } else {
        toast.error("Impossible de mettre à jour la tâche.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  // Donut progress (SVG)
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = stats.ratio * circumference;

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden shadow-none !border-zinc-200 dark:!border-white/10 transition-[transform,shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/5" />
        <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-500/5" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            {/* Progress ring */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 56 56">
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  fill="none"
                  className="stroke-zinc-950/8 dark:stroke-white/10"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={radius}
                  fill="none"
                  stroke="url(#tasks-grad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="tasks-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="font-display text-sm font-bold tabular-nums text-foreground">
                {Math.round(stats.ratio * 100)}%
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-400 dark:from-amber-400 dark:to-rose-300 font-sans">
                Urgences &amp; Actions
              </span>
              <h3 className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-foreground">
                Tableau des Tâches
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground tabular-nums">{stats.done}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="tabular-nums">{stats.total}</span> complétées
              </p>
            </div>

            {stats.urgent > 0 && (
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-[0_0_10px_rgba(244,63,94,0.15)] dark:text-rose-300 dark:bg-rose-500/5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="tabular-nums">{stats.urgent}</span>
              </div>
            )}
          </div>

          {/* Filter chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(["all", "high", "medium", "low"] as FilterPriority[]).map((f) => {
              const labels: Record<FilterPriority, string> = {
                all: "Toutes",
                high: "Hautes",
                medium: "Moyennes",
                low: "Basses",
              };
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all",
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-zinc-200 bg-white/60 text-muted-foreground hover:border-zinc-300 hover:text-foreground dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                  )}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── List ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-2 py-2 max-h-[290px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                Tout est à jour !
              </p>
              <p className="text-xs text-muted-foreground">
                Aucune tâche {filter !== "all" ? "dans ce filtre" : "en attente"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5 px-1">
              {filtered.slice(0, 5).map((task) => {
                const meta = PRIORITY_META[task.priority] || PRIORITY_META.low;
                const rel = relativeDate(task.dueDate);
                const isHigh = task.priority === "high";

                return (
                  <li key={task.id}>
                    <div
                      className={cn(
                        "group/row relative flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 pl-4 transition-all duration-300 hover:bg-white/60 hover:border-zinc-200/60 hover:shadow-xs dark:hover:bg-white/[0.04] dark:hover:border-white/10",
                        isHigh &&
                          "bg-rose-500/[0.025] border-rose-500/10 dark:bg-rose-400/[0.02] dark:border-rose-400/10"
                      )}
                    >
                      {/* Priority accent bar */}
                      <span
                        className={cn(
                          "absolute left-0.5 top-3 bottom-3 w-[3px] rounded-full opacity-70 transition-all group-hover/row:opacity-100",
                          meta.bar
                        )}
                      />

                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        type="button"
                        aria-label="Marquer comme terminée"
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-white transition-all active:scale-90 cursor-pointer ring-2 ring-transparent",
                          task.status === "done"
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-zinc-300 bg-transparent hover:border-zinc-400 dark:border-white/20 dark:hover:border-white/40",
                          isHigh && task.status !== "done" && "border-rose-300 dark:border-rose-400/30"
                        )}
                      >
                        {task.status === "done" && (
                          <Check className="h-3 w-3 stroke-[3]" />
                        )}
                      </button>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-semibold leading-tight text-foreground",
                            task.status === "done" &&
                              "line-through text-muted-foreground"
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide",
                              meta.tone
                            )}
                          >
                            <Flag className="h-2.5 w-2.5" />
                            {meta.label}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold",
                              rel.tone
                            )}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {rel.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        {onNavigate && (
          <div className="border-t border-zinc-950/10 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => onNavigate("taches")}
              className="group/btn flex w-full items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Gérer toutes les tâches
              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
