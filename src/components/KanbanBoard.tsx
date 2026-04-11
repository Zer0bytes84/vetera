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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
}

type TaskStatus = "todo" | "in_progress" | "done"

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

const PRIORITY_LABELS: Record<string, string> = {
  high: "Urgent",
  medium: "Normal",
  low: "Faible",
}

const columns: Array<{
  id: TaskStatus
  title: string
  icon: typeof CircleIcon
  color: string
  bgColor: string
}> = [
  {
    id: "todo",
    title: "À faire",
    icon: CircleIcon,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    id: "in_progress",
    title: "En cours",
    icon: PlayCircle02Icon,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  {
    id: "done",
    title: "Terminé",
    icon: CheckmarkCircle02Icon,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
]

function formatDate(date?: string) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function resolveStatusFromId(id: string, tasks: Task[]): TaskStatus | undefined {
  if (columns.some((column) => column.id === id)) {
    return id as TaskStatus
  }
  return tasks.find((task) => task.id === id)?.status
}

function KanbanCardBody({
  task,
  onStatusChange,
  onDelete,
  isOverlay = false,
  dragHandleProps,
}: {
  task: Task
  onStatusChange: (newStatus: TaskStatus) => void
  onDelete: () => void
  isOverlay?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const isOverdue =
    !!task.dueDate &&
    task.dueDate < new Date().toISOString().split("T")[0] &&
    task.status !== "done"

  return (
    <div
      className={cn(
        "group rounded-xl border-l-4 bg-card p-4 shadow-sm transition-all",
        isOverlay ? "shadow-xl" : "hover:shadow-md",
        PRIORITY_COLORS[task.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...dragHandleProps}
          className={cn(
            "mt-0.5 shrink-0 touch-none text-muted-foreground/30 transition-colors",
            isOverlay ? "cursor-grabbing" : "cursor-grab hover:text-muted-foreground/60 active:cursor-grabbing"
          )}
          aria-label="Déplacer la tâche"
        >
          <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-4" />
        </button>

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

            {task.dueDate ? (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={Clock01Icon}
                  strokeWidth={2}
                  className="size-2.5"
                />
                {formatDate(task.dueDate)}
              </span>
            ) : null}

            {task.startTime ? (
              <span className="text-[10px] text-muted-foreground">
                {task.startTime}
                {task.endTime ? ` - ${task.endTime}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!isOverlay ? (
        <div className="mt-3 flex items-center gap-1 border-t border-border/50 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
          {task.status !== "todo" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onStatusChange("todo")}
              className="text-muted-foreground hover:text-foreground"
            >
              À faire
            </Button>
          ) : null}
          {task.status !== "in_progress" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onStatusChange("in_progress")}
              className="text-blue-600 hover:text-blue-700"
            >
              En cours
            </Button>
          ) : null}
          {task.status !== "done" ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onStatusChange("done")}
              className="text-emerald-600 hover:text-emerald-700"
            >
              Terminé
            </Button>
          ) : null}
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
      ) : null}
    </div>
  )
}

function SortableTaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task
  onStatusChange: (newStatus: TaskStatus) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", status: task.status },
    })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-opacity duration-150",
        isDragging && "pointer-events-none opacity-0"
      )}
    >
      <KanbanCardBody
        task={task}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function DroppableColumn({
  id,
  children,
}: React.PropsWithChildren<{ id: TaskStatus }>) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[300px] flex-1 space-y-3 overflow-y-auto rounded-xl pb-4 transition-shadow duration-150",
        isOver && "ring-1 ring-primary/25"
      )}
    >
      {children}
    </div>
  )
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onStatusChange,
  onDelete,
}) => {
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const tasksByStatus = React.useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const sorted = [...tasks].sort((a, b) => {
      if (a.status !== b.status) return 0
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return (a.dueDate || "9999-99-99").localeCompare(
        b.dueDate || "9999-99-99"
      )
    })

    return {
      todo: sorted.filter((task) => task.status === "todo"),
      in_progress: sorted.filter((task) => task.status === "in_progress"),
      done: sorted.filter((task) => task.status === "done"),
    }
  }, [tasks])

  const activeTask = React.useMemo(
    () =>
      activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null,
    [activeTaskId, tasks]
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null)
    if (!over) return

    const sourceStatus = resolveStatusFromId(String(active.id), tasks)
    const targetStatus = resolveStatusFromId(String(over.id), tasks)
    if (!sourceStatus || !targetStatus || sourceStatus === targetStatus) return

    onStatusChange(String(active.id), targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveTaskId(String(active.id))}
      onDragCancel={() => setActiveTaskId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.id]
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

              <DroppableColumn id={column.id}>
                <SortableContext
                  items={columnTasks.map((task) => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border">
                      <p className="text-sm text-muted-foreground">Aucune tâche</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus) =>
                          onStatusChange(task.id, newStatus)
                        }
                        onDelete={() => onDelete(task.id)}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          )
        })}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 170,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {activeTask ? (
          <div className="w-[280px] rotate-[0.35deg]">
            <KanbanCardBody
              task={activeTask}
              onStatusChange={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default KanbanBoard
