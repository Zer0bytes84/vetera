import React, { useState, useMemo } from "react"
import MotivationalHeader from "./MotivationalHeader"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  Delete01Icon,
  Flag01Icon,
  LayoutGridIcon,
  ListPlusIcon,
  Notification02Icon,
} from "@hugeicons/core-free-icons"
import { useTasksRepository } from "@/data/repositories"
import { Task } from "../types/db"
import { useAuth } from "../contexts/AuthContext"
import KanbanBoard from "./KanbanBoard"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-300",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300",
  low: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300",
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "Urgent",
  medium: "Normal",
  low: "Faible",
}

// Helper to generate time slots
const generateTimeSlots = () => {
  const slots = []
  for (let i = 7; i <= 20; i++) {
    const hour = i.toString().padStart(2, "0")
    slots.push(`${hour}:00`)
    slots.push(`${hour}:30`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

const Tasks: React.FC = () => {
  const { currentUser } = useAuth()
  const {
    data: tasks,
    add: addTask,
    update: updateTask,
    remove: removeTask,
  } = useTasksRepository()

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [filter, setFilter] = useState<"all" | "mine">("mine")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban")

  // Extended form state
  const [newTaskDetails, setNewTaskDetails] = useState<{
    priority: "low" | "medium" | "high"
    dueDate: string
    startTime: string
    endTime: string
    isReminder: boolean
  }>({
    priority: "medium",
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "09:00",
    isReminder: false,
  })

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStart = e.target.value
    let newEnd = newTaskDetails.endTime
    const startIndex = TIME_SLOTS.indexOf(newStart)
    if (startIndex !== -1 && startIndex + 2 < TIME_SLOTS.length) {
      newEnd = TIME_SLOTS[startIndex + 2]
    } else if (startIndex !== -1 && startIndex + 1 < TIME_SLOTS.length) {
      newEnd = TIME_SLOTS[startIndex + 1]
    }

    setNewTaskDetails((prev) => ({
      ...prev,
      startTime: newStart,
      endTime: newEnd > newStart ? newEnd : newStart,
    }))
  }

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      await addTask({
        title: newTaskTitle,
        status: "todo",
        priority: newTaskDetails.priority,
        dueDate: newTaskDetails.dueDate,
        startTime: newTaskDetails.startTime,
        endTime: newTaskDetails.endTime,
        isReminder: newTaskDetails.isReminder,
        assignedTo: currentUser?.uid,
      } as any)

      setNewTaskTitle("")
      setIsAdding(false)
      setNewTaskDetails((prev) => ({
        ...prev,
        startTime: "08:00",
        endTime: "09:00",
      }))
    } catch (err: any) {
      console.error(err)
      alert(
        "Erreur lors de la création de la tâche: " +
          (err.message || JSON.stringify(err))
      )
    }
  }

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done"
    await updateTask(task.id, { status: newStatus })
  }

  const filteredTasks = useMemo(() => {
    let filtered = tasks

    if (filter === "mine" && currentUser?.uid) {
      filtered = filtered.filter(
        (task) => task.assignedTo === currentUser.uid || !task.assignedTo
      )
    }

    return filtered.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1
      if (a.status !== "done" && b.status === "done") return -1

      const dateA = a.dueDate || "9999-99-99"
      const dateB = b.dueDate || "9999-99-99"
      if (dateA !== dateB) return dateA.localeCompare(dateB)

      const timeA = a.startTime || "00:00"
      const timeB = b.startTime || "00:00"
      return timeA.localeCompare(timeB)
    })
  }, [tasks, filter, currentUser])

  // Group by Date buckets
  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

    const groups = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      upcoming: [] as Task[],
      completed: [] as Task[],
    }

    filteredTasks.forEach((task) => {
      if (task.status === "done") {
        groups.completed.push(task)
        return
      }

      if (!task.dueDate) {
        groups.upcoming.push(task)
        return
      }

      if (task.dueDate < today) {
        groups.overdue.push(task)
      } else if (task.dueDate === today) {
        groups.today.push(task)
      } else if (task.dueDate === tomorrow) {
        groups.tomorrow.push(task)
      } else {
        groups.upcoming.push(task)
      }
    })

    return groups
  }, [filteredTasks])

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 pt-4 pb-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <MotivationalHeader
          section="taches"
          title=""
          subtitle="Gérez vos priorités et ne manquez rien."
        />

        <div className="flex items-center gap-3">
          {/* Filter toggle */}
          <ToggleGroup
            multiple={false}
            value={[filter]}
            onValueChange={(value) => {
              setFilter((value[0] as "all" | "mine" | undefined) ?? "mine")
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-fit rounded-3xl bg-muted/30 p-0.5"
          >
            <ToggleGroupItem value="mine">Mes Tâches</ToggleGroupItem>
            <ToggleGroupItem value="all">Tout l'équipe</ToggleGroupItem>
          </ToggleGroup>

          {/* View toggle */}
          <ToggleGroup
            multiple={false}
            value={[viewMode]}
            onValueChange={(value) => {
              setViewMode(
                (value[0] as "list" | "kanban" | undefined) ?? "kanban"
              )
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-fit rounded-3xl bg-muted/30 p-0.5"
          >
            <ToggleGroupItem value="list" title="Vue liste">
              <HugeiconsIcon
                icon={ListPlusIcon}
                strokeWidth={2}
                className="size-4"
              />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" title="Vue Kanban">
              <HugeiconsIcon
                icon={LayoutGridIcon}
                strokeWidth={2}
                className="size-4"
              />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Quick Add Bar */}
      <Card
        size="sm"
        className="transition-all focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20"
      >
        <CardContent>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  isAdding ? "border-primary" : "border-muted-foreground/30"
                )}
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  strokeWidth={2}
                  className={cn(
                    "size-3.5",
                    isAdding ? "text-primary" : "text-muted-foreground/50"
                  )}
                />
              </div>
              <Input
                type="text"
                value={newTaskTitle}
                onChange={(e) => {
                  setNewTaskTitle(e.target.value)
                  if (!isAdding) setIsAdding(true)
                }}
                placeholder="Ajouter une nouvelle tâche..."
                className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
              />
              {isAdding && (
                <Button
                  type="submit"
                  className="rounded-[0.95rem] bg-[linear-gradient(135deg,#316CFF,#6F7CFF)] px-4 shadow-[0_18px_35px_rgba(49,108,255,0.24)]"
                >
                  Ajouter
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="flex animate-in flex-wrap items-center gap-3 border-t border-border pt-4 pl-9 fade-in slide-in-from-top-2">
                {/* Date Picker */}
                <div className="flex items-center gap-2 rounded-3xl bg-muted/30 px-3 py-1.5">
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  <input
                    type="date"
                    value={newTaskDetails.dueDate}
                    onChange={(e) =>
                      setNewTaskDetails({
                        ...newTaskDetails,
                        dueDate: e.target.value,
                      })
                    }
                    className="border-none bg-transparent text-xs text-foreground outline-none"
                  />
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2 rounded-3xl bg-muted/30 px-3 py-1.5">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    strokeWidth={2}
                    className="size-3.5 text-muted-foreground"
                  />
                  <NativeSelect
                    value={newTaskDetails.startTime}
                    onChange={handleStartTimeChange}
                    size="sm"
                    className="w-auto"
                  >
                    <NativeSelectOption value="">Début</NativeSelectOption>
                    {TIME_SLOTS.map((t) => (
                      <NativeSelectOption key={t} value={t}>
                        {t}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <span className="text-xs text-muted-foreground">-</span>
                  <NativeSelect
                    value={newTaskDetails.endTime}
                    onChange={(e) =>
                      setNewTaskDetails({
                        ...newTaskDetails,
                        endTime: e.target.value,
                      })
                    }
                    size="sm"
                    className="w-auto"
                  >
                    <NativeSelectOption value="">Fin</NativeSelectOption>
                    {TIME_SLOTS.map((t) => (
                      <NativeSelectOption key={`end-${t}`} value={t}>
                        {t}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                {/* Priority Selector */}
                <div className="flex items-center gap-2 rounded-3xl bg-muted/30 px-3 py-1.5">
                  <HugeiconsIcon
                    icon={Flag01Icon}
                    strokeWidth={2}
                    className={cn(
                      "size-3.5",
                      newTaskDetails.priority === "high"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    )}
                  />
                  <NativeSelect
                    value={newTaskDetails.priority}
                    onChange={(e) =>
                      setNewTaskDetails({
                        ...newTaskDetails,
                        priority: e.target.value as any,
                      })
                    }
                    size="sm"
                    className="w-auto"
                  >
                    <NativeSelectOption value="low">
                      Priorité Basse
                    </NativeSelectOption>
                    <NativeSelectOption value="medium">
                      Priorité Moyenne
                    </NativeSelectOption>
                    <NativeSelectOption value="high">
                      Priorité Haute
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                {/* Reminder Toggle */}
                <Button
                  type="button"
                  variant={newTaskDetails.isReminder ? "outline" : "ghost"}
                  size="sm"
                  onClick={() =>
                    setNewTaskDetails({
                      ...newTaskDetails,
                      isReminder: !newTaskDetails.isReminder,
                    })
                  }
                  className={cn(
                    "gap-1.5 rounded-3xl text-xs",
                    newTaskDetails.isReminder &&
                      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  )}
                >
                  <HugeiconsIcon
                    icon={Notification02Icon}
                    strokeWidth={2}
                    className="size-3.5"
                  />
                  Rappel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === "kanban" ? (
        <div className="flex-1">
          <KanbanBoard
            tasks={filteredTasks}
            onStatusChange={async (taskId, newStatus) => {
              await updateTask(taskId, { status: newStatus })
            }}
            onDelete={async (taskId) => {
              if (window.confirm("Supprimer cette tâche ?")) {
                await removeTask(taskId)
              }
            }}
            onToggleStatus={toggleStatus}
          />
        </div>
      ) : (
        /* Tasks List Groups */
        <div className="flex-1 space-y-6">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <TaskGroup
              title="En Retard"
              tasks={groupedTasks.overdue}
              color="text-red-600 dark:text-red-400"
              onToggle={toggleStatus}
              onDelete={removeTask}
            />
          )}

          {/* Today */}
          <TaskGroup
            title="Aujourd'hui"
            tasks={groupedTasks.today}
            color="text-primary"
            onToggle={toggleStatus}
            onDelete={removeTask}
          />

          {/* Tomorrow */}
          {groupedTasks.tomorrow.length > 0 && (
            <TaskGroup
              title="Demain"
              tasks={groupedTasks.tomorrow}
              color="text-muted-foreground"
              onToggle={toggleStatus}
              onDelete={removeTask}
            />
          )}

          {/* Upcoming */}
          {groupedTasks.upcoming.length > 0 && (
            <TaskGroup
              title="Plus tard"
              tasks={groupedTasks.upcoming}
              color="text-muted-foreground"
              onToggle={toggleStatus}
              onDelete={removeTask}
            />
          )}

          {/* Completed */}
          {groupedTasks.completed.length > 0 && (
            <div className="opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0">
              <TaskGroup
                title="Terminées"
                tasks={groupedTasks.completed}
                color="text-green-600 dark:text-green-400"
                onToggle={toggleStatus}
                onDelete={removeTask}
                isCompletedGroup
              />
            </div>
          )}

          {filteredTasks.length === 0 && (
            <Empty className="border border-dashed border-border/80 bg-muted/20 py-20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    className="size-5"
                  />
                </EmptyMedia>
                <EmptyTitle>Tout est à jour !</EmptyTitle>
                <EmptyDescription>
                  Aucune tâche en attente. Profitez-en pour prendre une pause.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      )}
    </div>
  )
}

// Sub-component for a group of tasks
const TaskGroup: React.FC<{
  title: string
  tasks: Task[]
  color: string
  onToggle: (t: Task) => void
  onDelete: (id: string) => void
  isCompletedGroup?: boolean
}> = ({ title, tasks, color, onToggle, onDelete, isCompletedGroup }) => {
  if (tasks.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className={cn("text-sm font-bold tracking-wider uppercase", color)}>
          {title}
        </h3>
        <Badge variant="secondary" className="text-[10px]">
          {tasks.length}
        </Badge>
      </div>

      <Card size="sm">
        <CardContent className="grid gap-0.5 p-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "group flex items-start gap-3 rounded-3xl px-4 py-3 transition-all duration-200",
                isCompletedGroup
                  ? "bg-muted/20"
                  : "hover:-translate-y-0.5 hover:bg-muted/30"
              )}
            >
              <button
                onClick={() => onToggle(task)}
                className={cn(
                  "mt-0.5 shrink-0 transition-colors",
                  task.status === "done"
                    ? "text-green-500"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {task.status === "done" ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                    className="size-5"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={CircleIcon}
                    strokeWidth={2}
                    className="size-5"
                  />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    task.status === "done"
                      ? "text-muted-foreground line-through decoration-border"
                      : "text-foreground"
                  )}
                >
                  {task.title}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {task.priority !== "medium" && !isCompletedGroup && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        PRIORITY_COLORS[task.priority]
                      )}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  )}

                  {task.dueDate && !isCompletedGroup && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[10px]",
                        new Date(task.dueDate) < new Date() &&
                          task.dueDate !==
                            new Date().toISOString().split("T")[0]
                          ? "font-bold text-red-500"
                          : "text-muted-foreground"
                      )}
                    >
                      <HugeiconsIcon
                        icon={Calendar01Icon}
                        strokeWidth={2}
                        className="size-2.5"
                      />
                      {new Date(task.dueDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}

                  {/* Time Range Display */}
                  {task.startTime && !isCompletedGroup && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px] text-muted-foreground"
                    >
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        strokeWidth={2}
                        className="size-2.5"
                      />
                      {task.startTime} {task.endTime ? `- ${task.endTime}` : ""}
                    </Badge>
                  )}

                  {task.isReminder && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-200 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                    >
                      <HugeiconsIcon
                        icon={Notification02Icon}
                        strokeWidth={2}
                        className="size-2.5"
                      />{" "}
                      Rappel
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(task.id)}
                className="shrink-0 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <HugeiconsIcon
                  icon={Delete01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default Tasks
