import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  Delete01Icon,
  Menu01Icon,
  PlayCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_META } from "@/config/status-meta";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/db";

interface KanbanBoardProps {
  onDelete: (taskId: string) => void;
  onStatusChange: (
    taskId: string,
    newStatus: "todo" | "in_progress" | "done"
  ) => void;
  tasks: Task[];
}

type TaskStatus = "todo" | "in_progress" | "done";

const columns: Array<{
  id: TaskStatus;
  title: string;
  icon: typeof CircleIcon;
  color: string;
  bgColor: string;
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
];

function formatDate(date?: string) {
  if (!date) {
    return null;
  }
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function resolveStatusFromId(
  id: string,
  tasks: Task[]
): TaskStatus | undefined {
  if (columns.some((column) => column.id === id)) {
    return id as TaskStatus;
  }
  return tasks.find((task) => task.id === id)?.status;
}

function KanbanCardBody({
  task,
  onStatusChange,
  onDelete,
  isOverlay = false,
  dragHandleProps,
}: {
  task: Task;
  onStatusChange: (newStatus: TaskStatus) => void;
  onDelete: () => void;
  isOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const isOverdue =
    !!task.dueDate &&
    task.dueDate < new Date().toISOString().split("T")[0] &&
    task.status !== "done";

  return (
    <div
      className={cn(
        "group rounded-xl border-l-4 bg-card p-4 shadow-sm transition-all",
        isOverlay ? "shadow-xl" : "hover:shadow-md",
        PRIORITY_META[task.priority].cardClassName
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...dragHandleProps}
          aria-label="Déplacer la tâche"
          className={cn(
            "mt-0.5 shrink-0 touch-none text-muted-foreground/30 transition-colors",
            isOverlay
              ? "cursor-grabbing"
              : "cursor-grab hover:text-muted-foreground/60 active:cursor-grabbing"
          )}
        >
          <HugeiconsIcon className="size-4" icon={Menu01Icon} strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium text-sm",
              task.status === "done"
                ? "text-muted-foreground line-through"
                : "text-foreground"
            )}
          >
            {task.title}
          </p>

          {task.description ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {task.description}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "rounded-full px-2 py-0.5 font-medium text-[10px]",
                PRIORITY_META[task.priority].badgeClassName
              )}
              variant="secondary"
            >
              {PRIORITY_META[task.priority].label}
            </Badge>

            {task.dueDate ? (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue
                    ? "font-medium text-red-600"
                    : "text-muted-foreground"
                )}
              >
                <HugeiconsIcon
                  className="size-2.5"
                  icon={Clock01Icon}
                  strokeWidth={2}
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

      {isOverlay ? null : (
        <div className="mt-3 flex items-center gap-1 border-border/50 border-t pt-3 opacity-0 transition-opacity group-hover:opacity-100">
          {task.status === "todo" ? null : (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onStatusChange("todo")}
              size="xs"
              variant="ghost"
            >
              À faire
            </Button>
          )}
          {task.status === "in_progress" ? null : (
            <Button
              className="text-blue-600 hover:text-blue-700"
              onClick={() => onStatusChange("in_progress")}
              size="xs"
              variant="ghost"
            >
              En cours
            </Button>
          )}
          {task.status === "done" ? null : (
            <Button
              className="text-emerald-600 hover:text-emerald-700"
              onClick={() => onStatusChange("done")}
              size="xs"
              variant="ghost"
            >
              Terminé
            </Button>
          )}
          <div className="flex-1" />
          <Button
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            size="icon-xs"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-3"
              icon={Delete01Icon}
              strokeWidth={2}
            />
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableTaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (newStatus: TaskStatus) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={cn(
        "transition-opacity duration-150",
        isDragging && "pointer-events-none opacity-0"
      )}
      ref={setNodeRef}
      style={style}
    >
      <KanbanCardBody
        dragHandleProps={{ ...attributes, ...listeners }}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        task={task}
      />
    </div>
  );
}

function DroppableColumn({
  id,
  children,
}: React.PropsWithChildren<{ id: TaskStatus }>) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      className={cn(
        "min-h-[300px] flex-1 space-y-3 overflow-y-auto rounded-xl pb-4 transition-shadow duration-150",
        isOver && "ring-1 ring-primary/25"
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onStatusChange,
  onDelete,
}) => {
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const tasksByStatus = React.useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...tasks].sort((a, b) => {
      if (a.status !== b.status) {
        return 0;
      }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.dueDate || "9999-99-99").localeCompare(
        b.dueDate || "9999-99-99"
      );
    });

    return {
      todo: sorted.filter((task) => task.status === "todo"),
      in_progress: sorted.filter((task) => task.status === "in_progress"),
      done: sorted.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  const activeTask = React.useMemo(
    () =>
      activeTaskId
        ? (tasks.find((task) => task.id === activeTaskId) ?? null)
        : null,
    [activeTaskId, tasks]
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTaskId(null);
    if (!over) {
      return;
    }

    const sourceStatus = resolveStatusFromId(String(active.id), tasks);
    const targetStatus = resolveStatusFromId(String(over.id), tasks);
    if (!(sourceStatus && targetStatus) || sourceStatus === targetStatus) {
      return;
    }

    onStatusChange(String(active.id), targetStatus);
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragCancel={() => setActiveTaskId(null)}
      onDragEnd={handleDragEnd}
      onDragStart={({ active }) => setActiveTaskId(String(active.id))}
      sensors={sensors}
    >
      <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.id];
          const Icon = column.icon;

          return (
            <div className="flex flex-col" key={column.id}>
              <div
                className={cn(
                  "mb-4 flex items-center gap-2 rounded-xl px-4 py-3",
                  column.bgColor
                )}
              >
                <HugeiconsIcon
                  className={cn("size-4.5", column.color)}
                  icon={Icon}
                  strokeWidth={2}
                />
                <span className={cn("font-semibold text-sm", column.color)}>
                  {column.title}
                </span>
                <Badge
                  className={cn(
                    "ml-auto font-medium text-xs",
                    column.bgColor,
                    column.color
                  )}
                  variant="secondary"
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
                    <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-border border-dashed bg-muted/10 transition-colors hover:border-primary/20 hover:bg-muted/20">
                      <HugeiconsIcon
                        className="size-6 text-muted-foreground/30"
                        icon={Icon}
                        strokeWidth={1.5}
                      />
                      <p className="font-medium text-muted-foreground text-xs">
                        Rien ici pour le moment
                      </p>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        onDelete={() => onDelete(task.id)}
                        onStatusChange={(newStatus) =>
                          onStatusChange(task.id, newStatus)
                        }
                        task={task}
                      />
                    ))
                  )}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
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
              isOverlay
              onDelete={() => {}}
              onStatusChange={() => {}}
              task={activeTask}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
