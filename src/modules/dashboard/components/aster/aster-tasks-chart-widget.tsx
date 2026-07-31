"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ListTodo,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTasksRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/db";
import { WidgetShell } from "../../v2/widget-shell";

type TaskFilter = "all" | "late" | "reminders";

const filterOptions: Array<{ label: string; value: TaskFilter }> = [
  { label: "À faire", value: "all" },
  { label: "En retard", value: "late" },
  { label: "Rappels", value: "reminders" },
];

function parseDueDate(value?: string) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDueLabel(task: Task, today: Date) {
  const due = parseDueDate(task.dueDate);
  if (!due) {
    return "Sans échéance";
  }
  const dueDay = startOfLocalDay(due);
  const diff = Math.round(
    (dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diff < 0) {
    return `${Math.abs(diff)} j de retard`;
  }
  if (diff === 0) {
    return task.startTime ? `Aujourd’hui · ${task.startTime}` : "Aujourd’hui";
  }
  if (diff === 1) {
    return "Demain";
  }
  return due.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getTaskTone(task: Task) {
  if (task.priority === "high") {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  }
  if (task.isReminder) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400";
}

export function AsterTasksChartWidget({
  className,
  onOpenTasks,
  referenceDate,
}: {
  className?: string;
  onOpenTasks?: () => void;
  referenceDate?: Date;
}) {
  const { data: allTasks } = useTasksRepository();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const today = useMemo(
    () => startOfLocalDay(referenceDate ?? new Date()),
    [referenceDate]
  );

  const taskStats = useMemo(() => {
    const open = allTasks.filter((task) => task.status !== "done");
    const done = allTasks.filter((task) => task.status === "done");
    const late = open.filter((task) => {
      const due = parseDueDate(task.dueDate);
      return due ? startOfLocalDay(due) < today : false;
    });
    const reminders = open.filter((task) => task.isReminder);
    const urgent = open.filter((task) => task.priority === "high");
    const sorted = [...open].sort((a, b) => {
      const priorityWeight = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityWeight[a.priority] - priorityWeight[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const aDue =
        parseDueDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue =
        parseDueDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });
    const completionRate =
      allTasks.length > 0
        ? Math.round((done.length / allTasks.length) * 100)
        : 0;

    return { open, late, reminders, urgent, sorted, completionRate };
  }, [allTasks, today]);

  const visibleTasks = useMemo(() => {
    if (filter === "late") {
      return taskStats.sorted.filter((task) => taskStats.late.includes(task));
    }
    if (filter === "reminders") {
      return taskStats.sorted.filter((task) => task.isReminder);
    }
    return taskStats.sorted;
  }, [filter, taskStats]);

  return (
    <WidgetShell
      action={
        <button
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 font-medium text-[11px] text-muted-foreground outline-none transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:hover:bg-white/7"
          onClick={onOpenTasks}
          type="button"
        >
          Tout ouvrir
          <ArrowRight className="size-3" />
        </button>
      }
      className={cn("min-h-[400px]", className)}
      contentClassName="flex flex-col p-4 sm:p-5"
      description="Priorités, rappels et échéances"
      icon={ListTodo}
      iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300"
      title="File d’actions"
    >
        <div className="grid grid-cols-3 divide-x divide-border/75 border-border/75 border-b pb-4">
          <TaskMetric
            icon={CalendarClock}
            label="Ouvertes"
            value={taskStats.open.length}
          />
          <TaskMetric
            className="px-4"
            icon={AlertCircle}
            label="En retard"
            tone={
              taskStats.late.length > 0
                ? "text-rose-600 dark:text-rose-400"
                : undefined
            }
            value={taskStats.late.length}
          />
          <TaskMetric
            className="pl-4"
            icon={BellRing}
            label="Rappels"
            tone="text-amber-600 dark:text-amber-400"
            value={taskStats.reminders.length}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <fieldset className="flex rounded-lg border-0 bg-muted/70 p-1">
            <legend className="sr-only">Filtrer les actions</legend>
            {filterOptions.map((item) => (
              <button
                aria-pressed={filter === item.value}
                className={cn(
                  "relative min-h-8 rounded-md px-2.5 font-medium text-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                  filter === item.value
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                )}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                {filter === item.value && (
                  <motion.span
                    className="absolute inset-0 rounded-md bg-background shadow-xs ring-1 ring-border"
                    layoutId="task-filter"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 500, damping: 38 }
                    }
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </fieldset>
          <span className="hidden text-[10px] text-zinc-400 sm:inline dark:text-zinc-500">
            {taskStats.completionRate}% terminées
          </span>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-border border-dashed bg-muted/35 px-5 py-8 text-center">
            <CheckCircle2 className="mb-2 size-6 text-emerald-500" />
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Aucune action dans cette vue
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              La file est à jour pour le moment.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex-1 space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleTasks.slice(0, 4).map((task, index) => (
                <TaskQueueRow
                  index={index}
                  isLate={taskStats.late.includes(task)}
                  key={task.id}
                  onOpenTasks={onOpenTasks}
                  reduceMotion={Boolean(reduceMotion)}
                  task={task}
                  today={today}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-3 border-border/75 border-t pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="text-zinc-500 dark:text-zinc-400">
              Progression globale
            </span>
            <span className="font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
              {taskStats.completionRate}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              animate={{ width: `${taskStats.completionRate}%` }}
              className="h-full rounded-full bg-emerald-500"
              initial={reduceMotion ? false : { width: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
            />
          </div>
        </div>
    </WidgetShell>
  );
}

function TaskMetric({
  className,
  icon: Icon,
  label,
  tone,
  value,
}: {
  className?: string;
  icon: typeof ListTodo;
  label: string;
  tone?: string;
  value: number;
}) {
  return (
    <div className={cn("min-w-0 pr-4", className)}>
      <span className="flex min-h-4 items-center gap-1.5 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={cn(
          "mt-1 block font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100",
          tone
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TaskQueueRow({
  index,
  isLate,
  onOpenTasks,
  reduceMotion,
  task,
  today,
}: {
  index: number;
  isLate: boolean;
  onOpenTasks?: () => void;
  reduceMotion: boolean;
  task: Task;
  today: Date;
}) {
  return (
    <motion.button
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-left outline-none transition-colors hover:border-border hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
      layout={!reduceMotion}
      onClick={onOpenTasks}
      transition={{
        duration: 0.2,
        delay: reduceMotion ? 0 : index * 0.025,
      }}
      type="button"
      whileTap={reduceMotion ? undefined : { scale: 0.992 }}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          getTaskTone(task)
        )}
      >
        {task.isReminder ? (
          <BellRing className="size-3.5" />
        ) : (
          <ListTodo className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-xs text-zinc-800 dark:text-zinc-200">
          {task.title}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[10px]",
            isLate
              ? "font-medium text-rose-600 dark:text-rose-400"
              : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          {getDueLabel(task, today)}
        </span>
      </span>
      <ChevronIndicator />
    </motion.button>
  );
}

function ChevronIndicator() {
  return (
    <ArrowRight className="size-3.5 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
  );
}
