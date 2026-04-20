import React, { useState, useMemo } from "react"
import { ar, de, enUS, es, fr, pt } from "date-fns/locale"
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
  MoreVerticalCircle01Icon,
  Notification02Icon,
} from "@hugeicons/core-free-icons"
import { useTasksRepository } from "@/data/repositories"
import { DashboardPageIntro } from "@/components/dashboard-page-intro"
import {
  MetricOverviewStrip,
  type MetricOverviewItem,
} from "@/components/metric-overview-strip"
import { Task } from "../types/db"
import { useAuth } from "../contexts/AuthContext"
import KanbanBoard from "./KanbanBoard"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTranslation } from "react-i18next"

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

const PRIORITY_TABLE_BADGES: Record<string, string> = {
  high: "border-red-200 bg-red-500/12 text-red-700 dark:border-red-500/30 dark:bg-red-500/18 dark:text-red-300",
  medium:
    "border-amber-200 bg-amber-500/12 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/18 dark:text-amber-300",
  low: "border-sky-200 bg-sky-500/12 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/18 dark:text-sky-300",
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

const formatDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (value?: string) => {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

const buildTaskSparkline = (
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) => {
  const deltas = {
    steady: [-2, -1, 0, 1, 0, 1, 1, 2],
    rise: [-1, 0, 1, 2, 1, 2, 3, 4],
    watch: [3, 2, 4, 5, 4, 6, 5, 7],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern]

  return deltas.map((delta) => Math.max(base + delta, 0))
}

const Tasks: React.FC = () => {
  const { i18n } = useTranslation()
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
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [taskSearch, setTaskSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "todo" | "in_progress" | "done"
  >("all")
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all")
  const [favoriteTaskIds, setFavoriteTaskIds] = useState<string[]>([])
  const [taskLabels, setTaskLabels] = useState<Record<string, string[]>>({})
  const currentLocale = i18n.language.startsWith("ar")
    ? "ar"
    : i18n.language.startsWith("en")
      ? "en-US"
      : i18n.language.startsWith("es")
        ? "es-ES"
        : i18n.language.startsWith("pt")
          ? "pt-PT"
          : i18n.language.startsWith("de")
            ? "de-DE"
            : "fr-FR"
  const calendarLocale = i18n.language.startsWith("ar")
    ? ar
    : i18n.language.startsWith("en")
      ? enUS
      : i18n.language.startsWith("es")
        ? es
        : i18n.language.startsWith("pt")
          ? pt
          : i18n.language.startsWith("de")
            ? de
            : fr

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

  const handleEditTask = async (task: Task) => {
    const nextTitle = window.prompt("Modifier le titre de la tâche", task.title)
    if (!nextTitle || nextTitle.trim() === task.title) return
    await updateTask(task.id, { title: nextTitle.trim() })
  }

  const handleDuplicateTask = async (task: Task) => {
    await addTask({
      title: `${task.title} (copie)`,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startTime: task.startTime,
      endTime: task.endTime,
      isReminder: task.isReminder,
      assignedTo: task.assignedTo || currentUser?.uid,
      patientId: task.patientId,
    } as any)
  }

  const toggleFavoriteTask = (taskId: string) => {
    setFavoriteTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    )
  }

  const setTaskLabel = (taskId: string, label: string) => {
    setTaskLabels((prev) => {
      const labels = prev[taskId] ?? []
      if (labels.includes(label)) return prev
      return {
        ...prev,
        [taskId]: [...labels, label],
      }
    })
  }

  const setCustomTaskLabel = (taskId: string) => {
    const input = window.prompt("Nouvelle étiquette")
    if (!input || !input.trim()) return
    setTaskLabel(taskId, input.trim())
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

  const tableTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      const search = taskSearch.trim().toLowerCase()
      const matchesSearch =
        search.length === 0 ||
        task.title.toLowerCase().includes(search) ||
        task.id.toLowerCase().includes(search)
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [filteredTasks, priorityFilter, statusFilter, taskSearch])

  const overviewCards = useMemo<MetricOverviewItem[]>(() => {
    const openTasks = filteredTasks.filter((task) => task.status !== "done").length
    const urgentTasks = filteredTasks.filter(
      (task) => task.status !== "done" && task.priority === "high"
    ).length
    const completedTasks = filteredTasks.filter((task) => task.status === "done").length

    return [
      {
        label: "Tâches ouvertes",
        value: String(openTasks),
        meta: filter === "mine" ? "vue perso" : "équipe complète",
        note: "Charge active à absorber",
        icon: ListPlusIcon,
        tone: "blue",
        sparklineData: buildTaskSparkline(openTasks, "steady"),
      },
      {
        label: "À traiter aujourd'hui",
        value: String(groupedTasks.today.length),
        meta: `${groupedTasks.overdue.length} en retard`,
        note: "Priorités immédiates",
        icon: Calendar01Icon,
        tone: "orange",
        sparklineData: buildTaskSparkline(groupedTasks.today.length, "rise"),
      },
      {
        label: "Alertes prioritaires",
        value: String(urgentTasks),
        meta: `${groupedTasks.tomorrow.length} demain`,
        note: "Actions à surveiller",
        icon: Notification02Icon,
        tone: "amber",
        sparklineData: buildTaskSparkline(urgentTasks, "watch"),
      },
      {
        label: "Clôturées",
        value: String(completedTasks),
        meta: `${tableTasks.length} dans la vue`,
        note: "Suivi",
        icon: CheckmarkCircle02Icon,
        tone: "emerald",
        sparklineData: buildTaskSparkline(completedTasks, "stable"),
      },
    ]
  }, [
    filter,
    filteredTasks,
    groupedTasks.overdue.length,
    groupedTasks.today.length,
    groupedTasks.tomorrow.length,
    tableTasks.length,
  ])

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pt-4 pb-6 lg:px-6">
      <DashboardPageIntro
        eyebrow="Pilotage interne"
        title="Tâches"
        subtitle={`${filteredTasks.length} tâche${filteredTasks.length > 1 ? "s" : ""} dans la vue ${filter === "mine" ? "personnelle" : "équipe"} pour garder rappels, urgences et suivi dans le même flux.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
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
        }
      />

      <MetricOverviewStrip items={overviewCards} />

      {/* Quick Add Bar */}
      <Card
        size="sm"
        className="rounded-[24px] border border-border bg-card shadow-none transition-all focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20"
      >
        <CardContent className="p-5">
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
                  variant="default"
                  className="rounded-[0.95rem] px-4"
                >
                  Ajouter
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="flex animate-in flex-wrap items-center gap-3 border-t border-border pt-4 pl-9 fade-in slide-in-from-top-2">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-3xl bg-muted/30 px-3 text-xs font-normal hover:bg-muted/50"
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={Calendar01Icon}
                      strokeWidth={2}
                      className="size-3.5 text-muted-foreground"
                    />
                    {(parseDateInput(newTaskDetails.dueDate) ?? new Date()).toLocaleDateString(
                      currentLocale,
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }
                    )}
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={10}
                    className="w-auto rounded-[1.35rem] p-2.5"
                  >
                    <Calendar
                      mode="single"
                      locale={calendarLocale}
                      selected={parseDateInput(newTaskDetails.dueDate) ?? new Date()}
                      onSelect={(date) => {
                        if (!date) return
                        setNewTaskDetails({
                          ...newTaskDetails,
                          dueDate: formatDateInput(date),
                        })
                      }}
                      className="rounded-[1.05rem] [--cell-size:--spacing(8.6)]"
                    />
                  </PopoverContent>
                </Popover>

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
          />
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          <Card size="sm" className="rounded-[24px] border border-border bg-card shadow-none">
            <CardHeader className="border-b border-border px-6 py-5">
              <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Registre des rappels
              </CardDescription>
              <CardTitle className="text-[22px] font-normal tracking-[-0.04em]">
                Vue liste des tâches
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {tableTasks.length} rappel{tableTasks.length > 1 ? "s" : ""}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Filtrer les rappels..."
                  className="h-10 max-w-sm rounded-xl"
                />
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "todo" | "in_progress" | "done"
                    )
                  }
                  size="sm"
                  className="w-[170px]"
                >
                  <NativeSelectOption value="all">Statut</NativeSelectOption>
                  <NativeSelectOption value="todo">À faire</NativeSelectOption>
                  <NativeSelectOption value="in_progress">
                    En cours
                  </NativeSelectOption>
                  <NativeSelectOption value="done">Terminé</NativeSelectOption>
                </NativeSelect>
                <NativeSelect
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(
                      e.target.value as "all" | "high" | "medium" | "low"
                    )
                  }
                  size="sm"
                  className="w-[170px]"
                >
                  <NativeSelectOption value="all">Priorité</NativeSelectOption>
                  <NativeSelectOption value="high">Urgent</NativeSelectOption>
                  <NativeSelectOption value="medium">Normal</NativeSelectOption>
                  <NativeSelectOption value="low">Faible</NativeSelectOption>
                </NativeSelect>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead className="w-[140px]">Statut</TableHead>
                    <TableHead className="w-[120px]">Priorité</TableHead>
                    <TableHead className="w-[130px]">Horaire</TableHead>
                    <TableHead className="w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Aucun rappel trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          TASK-{task.id.slice(-4).toUpperCase()}
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate font-medium">
                          <div className="flex items-center gap-2">
                            {favoriteTaskIds.includes(task.id) ? (
                              <span className="text-amber-500">★</span>
                            ) : null}
                            <span className="truncate">{task.title}</span>
                            {(taskLabels[task.id] ?? []).slice(0, 1).map((label) => (
                              <Badge
                                key={`${task.id}-${label}`}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              task.status === "done" &&
                                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                              task.status === "in_progress" &&
                                "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                              task.status === "todo" &&
                                "bg-muted text-muted-foreground"
                            )}
                          >
                            {task.status === "done"
                              ? "Terminé"
                              : task.status === "in_progress"
                                ? "En cours"
                                : "À faire"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              PRIORITY_TABLE_BADGES[task.priority]
                            )}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.startTime
                            ? `${task.startTime}${task.endTime ? ` - ${task.endTime}` : ""}`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant={
                                task.status === "done" ? "secondary" : "default"
                              }
                              size="sm"
                              onClick={() => toggleStatus(task)}
                              className={cn(
                                "h-8 rounded-xl px-3 text-xs font-semibold"
                              )}
                            >
                              {task.status === "done" ? "Réouvrir" : "Terminer"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeTask(task.id)}
                            >
                              <HugeiconsIcon
                                icon={Delete01Icon}
                                strokeWidth={2}
                                className="size-4"
                              />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Plus d'actions"
                                  />
                                }
                              >
                                <HugeiconsIcon
                                  icon={MoreVerticalCircle01Icon}
                                  strokeWidth={2}
                                  className="size-4"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={6}>
                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateTask(task)}
                                >
                                  Dupliquer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleFavoriteTask(task.id)}
                                >
                                  {favoriteTaskIds.includes(task.id)
                                    ? "Retirer des favoris"
                                    : "Ajouter aux favoris"}
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    Étiquettes
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => setTaskLabel(task.id, "Suivi")}
                                    >
                                      Suivi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setTaskLabel(task.id, "Urgent")}
                                    >
                                      Urgent
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setTaskLabel(task.id, "Consultation")
                                      }
                                    >
                                      Consultation
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setCustomTaskLabel(task.id)}
                                    >
                                      Personnalisé…
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => removeTask(task.id)}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
        <h3 className={cn("text-sm font-semibold tracking-wider uppercase", color)}>
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
                          ? "font-semibold text-red-500"
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
