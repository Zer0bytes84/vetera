import React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  Delete01Icon,
  Menu01Icon,
  PlayCircle02Icon,
} from "@hugeicons/core-free-icons"
import { Task } from "../types/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (
    taskId: string,
    newStatus: "todo" | "in_progress" | "done"
  ) => void
  onDelete: (taskId: string) => void
  onToggleStatus: (task: Task) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-destructive bg-destructive/5",
  medium: "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10",
  low: "border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/10",
}

const PRIORITY_BADGES: Record<string, string> = {
  high: "bg-red-500/10 text-red-700 dark:text-red-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
}

const columns = [
  {
    id: "todo" as const,
    title: "À faire",
    icon: CircleIcon,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    id: "in_progress" as const,
    title: "En cours",
    icon: PlayCircle02Icon,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  {
    id: "done" as const,
    title: "Terminé",
    icon: CheckmarkCircle02Icon,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
]

const PRIORITY_LABELS: Record<string, string> = {
  high: "Urgent",
  medium: "Normal",
  low: "Faible",
}

const KanbanCard: React.FC<{
  task: Task
  onStatusChange: (newStatus: "todo" | "in_progress" | "done") => void
  onDelete: () => void
}> = ({ task, onStatusChange, onDelete }) => {
  const formatDate = (date?: string) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  const isOverdue =
    task.dueDate &&
    task.dueDate < new Date().toISOString().split("T")[0] &&
    task.status !== "done"

  return (
    <div
      className={cn(
        "group rounded-xl border-l-4 bg-card p-4 shadow-sm transition-all hover:shadow-md",
        PRIORITY_COLORS[task.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <HugeiconsIcon
          icon={Menu01Icon}
          strokeWidth={2}
          className="mt-0.5 size-4 cursor-grab text-muted-foreground/30"
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              task.status === "done"
                ? "text-muted-foreground line-through"
                : "text-foreground"
            )}
          >
            {task.title}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                PRIORITY_BADGES[task.priority]
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>

            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue
                    ? "font-medium text-red-600"
                    : "text-muted-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={Clock01Icon}
                  strokeWidth={2}
                  className="size-2.5"
                />
                {formatDate(task.dueDate)}
              </span>
            )}

            {task.startTime && (
              <span className="text-[10px] text-muted-foreground">
                {task.startTime}
                {task.endTime && ` - ${task.endTime}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
        {task.status !== "todo" && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onStatusChange("todo")}
            className="text-muted-foreground hover:text-foreground"
          >
            À faire
          </Button>
        )}
        {task.status !== "in_progress" && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onStatusChange("in_progress")}
            className="text-blue-600 hover:text-blue-700"
          >
            En cours
          </Button>
        )}
        {task.status !== "done" && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onStatusChange("done")}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Terminé
          </Button>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon
            icon={Delete01Icon}
            strokeWidth={2}
            className="size-3"
          />
        </Button>
      </div>
    </div>
  )
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onStatusChange,
  onDelete,
}) => {
  const getTasksByStatus = (status: "todo" | "in_progress" | "done") => {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return (a.dueDate || "9999-99-99").localeCompare(
          b.dueDate || "9999-99-99"
        )
      })
  }

  return (
    <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id)
        const Icon = column.icon

        return (
          <div key={column.id} className="flex flex-col">
            <div
              className={cn(
                "mb-4 flex items-center gap-2 rounded-xl px-4 py-3",
                column.bgColor
              )}
            >
              <HugeiconsIcon
                icon={Icon}
                strokeWidth={2}
                className={cn("size-4.5", column.color)}
              />
              <span className={cn("text-sm font-semibold", column.color)}>
                {column.title}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "ml-auto text-xs font-medium",
                  column.bgColor,
                  column.color
                )}
              >
                {columnTasks.length}
              </Badge>
            </div>

            <div className="min-h-[300px] flex-1 space-y-3 overflow-y-auto pb-4">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Aucune tâche</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onStatusChange={(newStatus) =>
                      onStatusChange(task.id, newStatus)
                    }
                    onDelete={() => onDelete(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default KanbanBoard
