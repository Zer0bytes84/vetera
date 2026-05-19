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
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ar, de, enUS, es, fr, pt } from "date-fns/locale";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type MetricOverviewItem,
  MetricOverviewStrip,
} from "@/components/metric-overview-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/contexts/AuthContext";
import { useTasksRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/db";
import { PRIORITY_META } from "@/config/status-meta";
import KanbanBoard from "./KanbanBoard";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/10 text-red-700 border-red-200 dark:text-red-300",
  medium: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300",
  low: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300",
};

const PRIORITY_TABLE_BADGES: Record<string, string> = {
  high: "border-red-200 bg-red-500/12 text-red-700 dark:border-red-500/30 dark:bg-red-500/18 dark:text-red-300",
  medium:
    "border-amber-200 bg-amber-500/12 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/18 dark:text-amber-300",
  low: "border-sky-200 bg-sky-500/12 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/18 dark:text-sky-300",
};

// Helper to generate time slots
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let i = 7; i <= 20; i++) {
    const hour = i.toString().padStart(2, "0");
    slots.push(`${hour}:00`);
    slots.push(`${hour}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value?: string) => {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return null;
  }
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const buildTaskSparkline = (
  base: number,
  pattern: "steady" | "rise" | "watch" | "stable"
) => {
  const deltas = {
    steady: [-2, -1, 0, 1, 0, 1, 1, 2],
    rise: [-1, 0, 1, 2, 1, 2, 3, 4],
    watch: [3, 2, 4, 5, 4, 6, 5, 7],
    stable: [1, 1, 0, 1, 0, 1, 0, 0],
  }[pattern];

  return deltas.map((delta) => Math.max(base + delta, 0));
};

const Tasks: React.FC = () => {
  const { i18n } = useTranslation();
  const { currentUser } = useAuth();
  const {
    data: tasks,
    add: addTask,
    update: updateTask,
    remove: removeTask,
  } = useTasksRepository();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "mine">("mine");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "todo" | "in_progress" | "done"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");
  const [favoriteTaskIds, setFavoriteTaskIds] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<Record<string, string[]>>({});
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
            : "fr-FR";
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
            : fr;

  // Extended form state
  const [newTaskDetails, setNewTaskDetails] = useState<{
    priority: "low" | "medium" | "high";
    dueDate: string;
    startTime: string;
    endTime: string;
    isReminder: boolean;
  }>({
    priority: "medium",
    dueDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "09:00",
    isReminder: false,
  });

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStart = e.target.value;
    let newEnd = newTaskDetails.endTime;
    const startIndex = TIME_SLOTS.indexOf(newStart);
    if (startIndex !== -1 && startIndex + 2 < TIME_SLOTS.length) {
      newEnd = TIME_SLOTS[startIndex + 2];
    } else if (startIndex !== -1 && startIndex + 1 < TIME_SLOTS.length) {
      newEnd = TIME_SLOTS[startIndex + 1];
    }

    setNewTaskDetails((prev) => ({
      ...prev,
      startTime: newStart,
      endTime: newEnd > newStart ? newEnd : newStart,
    }));
  };

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!newTaskTitle.trim()) {
      return;
    }

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
      } as any);

      setNewTaskTitle("");
      setIsAdding(false);
      setNewTaskDetails((prev) => ({
        ...prev,
        startTime: "08:00",
        endTime: "09:00",
      }));
    } catch (err: any) {
      console.error(err);
      alert(
        "Erreur lors de la création de la tâche: " +
          (err.message || JSON.stringify(err))
      );
    }
  };

  const handleEditTask = async (task: Task) => {
    const nextTitle = window.prompt(
      "Modifier le titre de la tâche",
      task.title
    );
    if (!nextTitle || nextTitle.trim() === task.title) {
      return;
    }
    await updateTask(task.id, { title: nextTitle.trim() });
  };

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
    } as any);
  };

  const toggleFavoriteTask = (taskId: string) => {
    setFavoriteTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const setTaskLabel = (taskId: string, label: string) => {
    setTaskLabels((prev) => {
      const labels = prev[taskId] ?? [];
      if (labels.includes(label)) {
        return prev;
      }
      return {
        ...prev,
        [taskId]: [...labels, label],
      };
    });
  };

  const setCustomTaskLabel = (taskId: string) => {
    const input = window.prompt("Nouvelle étiquette");
    if (!(input && input.trim())) {
      return;
    }
    setTaskLabel(taskId, input.trim());
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filter === "mine" && currentUser?.uid) {
      filtered = filtered.filter(
        (task) => task.assignedTo === currentUser.uid || !task.assignedTo
      );
    }

    return filtered.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") {
        return 1;
      }
      if (a.status !== "done" && b.status === "done") {
        return -1;
      }

      const dateA = a.dueDate || "9999-99-99";
      const dateB = b.dueDate || "9999-99-99";
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const timeA = a.startTime || "00:00";
      const timeB = b.startTime || "00:00";
      return timeA.localeCompare(timeB);
    });
  }, [tasks, filter, currentUser]);

  // Group by Date buckets
  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .split("T")[0];

    const groups = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      upcoming: [] as Task[],
      completed: [] as Task[],
    };

    filteredTasks.forEach((task) => {
      if (task.status === "done") {
        groups.completed.push(task);
        return;
      }

      if (!task.dueDate) {
        groups.upcoming.push(task);
        return;
      }

      if (task.dueDate < today) {
        groups.overdue.push(task);
      } else if (task.dueDate === today) {
        groups.today.push(task);
      } else if (task.dueDate === tomorrow) {
        groups.tomorrow.push(task);
      } else {
        groups.upcoming.push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  const tableTasks = useMemo(
    () =>
      filteredTasks.filter((task) => {
        const search = taskSearch.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          task.title.toLowerCase().includes(search) ||
          task.id.toLowerCase().includes(search);
        const matchesStatus =
          statusFilter === "all" || task.status === statusFilter;
        const matchesPriority =
          priorityFilter === "all" || task.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [filteredTasks, priorityFilter, statusFilter, taskSearch]
  );

  const overviewCards = useMemo<MetricOverviewItem[]>(() => {
    const openTasks = filteredTasks.filter(
      (task) => task.status !== "done"
    ).length;
    const urgentTasks = filteredTasks.filter(
      (task) => task.status !== "done" && task.priority === "high"
    ).length;
    const completedTasks = filteredTasks.filter(
      (task) => task.status === "done"
    ).length;

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
    ];
  }, [
    filter,
    filteredTasks,
    groupedTasks.overdue.length,
    groupedTasks.today.length,
    groupedTasks.tomorrow.length,
    tableTasks.length,
  ]);

  return (
    <div className="prospeo-dashboard flex w-full min-w-0 flex-col gap-5 px-4 pt-5 pb-16 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter toggle */}
          <ToggleGroup
            className="w-fit rounded-3xl bg-muted/30 p-0.5 transition-all duration-200 ease-out"
            multiple={false}
            onValueChange={(value) => {
              setFilter((value[0] as "all" | "mine" | undefined) ?? "mine");
            }}
            size="sm"
            spacing={0}
            value={[filter]}
            variant="outline"
          >
            <ToggleGroupItem value="mine">Mes Tâches</ToggleGroupItem>
            <ToggleGroupItem value="all">Tout l'équipe</ToggleGroupItem>
          </ToggleGroup>

          {/* View toggle */}
          <ToggleGroup
            className="w-fit rounded-3xl bg-muted/30 p-0.5 transition-all duration-200 ease-out"
            multiple={false}
            onValueChange={(value) => {
              setViewMode(
                (value[0] as "list" | "kanban" | undefined) ?? "kanban"
              );
            }}
            size="sm"
            spacing={0}
            value={[viewMode]}
            variant="outline"
          >
            <ToggleGroupItem title="Vue liste" value="list">
              <HugeiconsIcon
                className="size-4"
                icon={ListPlusIcon}
                strokeWidth={2}
              />
            </ToggleGroupItem>
            <ToggleGroupItem title="Vue Kanban" value="kanban">
              <HugeiconsIcon
                className="size-4"
                icon={LayoutGridIcon}
                strokeWidth={2}
              />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <MetricOverviewStrip items={overviewCards} />

      {/* Quick Add Bar */}
      <Card
        className="card-vibrant rounded-[24px] border border-border bg-card shadow-none transition-all focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary/20"
        size="sm"
      >
        <CardContent className="p-5">
          <form className="flex flex-col gap-4" onSubmit={handleAddTask}>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  isAdding ? "border-primary" : "border-muted-foreground/30"
                )}
              >
                <HugeiconsIcon
                  className={cn(
                    "size-3.5",
                    isAdding ? "text-primary" : "text-muted-foreground/50"
                  )}
                  icon={Add01Icon}
                  strokeWidth={2}
                />
              </div>
              <Input
                className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
                onChange={(e) => {
                  setNewTaskTitle(e.target.value);
                  if (!isAdding) {
                    setIsAdding(true);
                  }
                }}
                placeholder="Ajouter une nouvelle tâche..."
                type="text"
                value={newTaskTitle}
              />
              {isAdding && (
                <Button
                  className="rounded-[0.95rem] px-4"
                  type="submit"
                  variant="default"
                >
                  Ajouter
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="fade-in slide-in-from-top-2 flex animate-in flex-wrap items-center gap-3 border-border border-t pt-4 pl-9">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        className="h-8 rounded-3xl bg-muted/30 px-3 font-normal text-xs hover:bg-muted/50"
                        size="sm"
                        variant="ghost"
                      />
                    }
                  >
                    <HugeiconsIcon
                      className="size-3.5 text-muted-foreground"
                      icon={Calendar01Icon}
                      strokeWidth={2}
                    />
                    {(
                      parseDateInput(newTaskDetails.dueDate) ?? new Date()
                    ).toLocaleDateString(currentLocale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-auto rounded-[1.35rem] p-2.5"
                    sideOffset={10}
                  >
                    <Calendar
                      className="rounded-[1.05rem] [--cell-size:--spacing(8.6)]"
                      locale={calendarLocale}
                      mode="single"
                      onSelect={(date) => {
                        if (!date) {
                          return;
                        }
                        setNewTaskDetails({
                          ...newTaskDetails,
                          dueDate: formatDateInput(date),
                        });
                      }}
                      selected={
                        parseDateInput(newTaskDetails.dueDate) ?? new Date()
                      }
                    />
                  </PopoverContent>
                </Popover>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2 rounded-3xl bg-muted/30 px-3 py-1.5 transition-all duration-200 ease-out hover:bg-muted/40">
                  <HugeiconsIcon
                    className="size-3.5 text-muted-foreground"
                    icon={Clock01Icon}
                    strokeWidth={2}
                  />
                  <NativeSelect
                    className="w-auto"
                    onChange={handleStartTimeChange}
                    size="sm"
                    value={newTaskDetails.startTime}
                  >
                    <NativeSelectOption value="">Début</NativeSelectOption>
                    {TIME_SLOTS.map((t) => (
                      <NativeSelectOption key={t} value={t}>
                        {t}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <span className="text-muted-foreground text-xs">-</span>
                  <NativeSelect
                    className="w-auto"
                    onChange={(e) =>
                      setNewTaskDetails({
                        ...newTaskDetails,
                        endTime: e.target.value,
                      })
                    }
                    size="sm"
                    value={newTaskDetails.endTime}
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
                <div className="flex items-center gap-2 rounded-3xl bg-muted/30 px-3 py-1.5 transition-all duration-200 ease-out hover:bg-muted/40">
                  <HugeiconsIcon
                    className={cn(
                      "size-3.5",
                      newTaskDetails.priority === "high"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    )}
                    icon={Flag01Icon}
                    strokeWidth={2}
                  />
                  <NativeSelect
                    className="w-auto"
                    onChange={(e) =>
                      setNewTaskDetails({
                        ...newTaskDetails,
                        priority: e.target.value as any,
                      })
                    }
                    size="sm"
                    value={newTaskDetails.priority}
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
                  className={cn(
                    "gap-1.5 rounded-3xl text-xs",
                    newTaskDetails.isReminder &&
                      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  )}
                  onClick={() =>
                    setNewTaskDetails({
                      ...newTaskDetails,
                      isReminder: !newTaskDetails.isReminder,
                    })
                  }
                  size="sm"
                  type="button"
                  variant={newTaskDetails.isReminder ? "outline" : "ghost"}
                >
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={Notification02Icon}
                    strokeWidth={2}
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
            onDelete={async (taskId) => {
              if (window.confirm("Supprimer cette tâche ?")) {
                await removeTask(taskId);
              }
            }}
            onStatusChange={async (taskId, newStatus) => {
              await updateTask(taskId, { status: newStatus });
            }}
            tasks={filteredTasks}
          />
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          <Card
            className="rounded-[24px] border border-border bg-card shadow-none"
            size="sm"
          >
            <CardHeader className="border-border border-b px-6 py-5">
              <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
                Registre des rappels
              </CardDescription>
              <CardTitle className="font-normal text-[22px] tracking-[-0.04em]">
                Vue liste des tâches
              </CardTitle>
              <CardAction>
                <Badge className="rounded-full px-3 py-1" variant="outline">
                  {tableTasks.length} rappel{tableTasks.length > 1 ? "s" : ""}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="h-10 max-w-sm rounded-xl"
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Filtrer les rappels..."
                  value={taskSearch}
                />
                <NativeSelect
                  className="w-[170px]"
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "todo" | "in_progress" | "done"
                    )
                  }
                  size="sm"
                  value={statusFilter}
                >
                  <NativeSelectOption value="all">Statut</NativeSelectOption>
                  <NativeSelectOption value="todo">À faire</NativeSelectOption>
                  <NativeSelectOption value="in_progress">
                    En cours
                  </NativeSelectOption>
                  <NativeSelectOption value="done">Terminé</NativeSelectOption>
                </NativeSelect>
                <NativeSelect
                  className="w-[170px]"
                  onChange={(e) =>
                    setPriorityFilter(
                      e.target.value as "all" | "high" | "medium" | "low"
                    )
                  }
                  size="sm"
                  value={priorityFilter}
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
                    <TableHead className="w-[130px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Aucun rappel trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-muted-foreground text-xs">
                          TASK-{task.id.slice(-4).toUpperCase()}
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate font-medium">
                          <div className="flex items-center gap-2">
                            {favoriteTaskIds.includes(task.id) ? (
                              <span className="text-amber-500">★</span>
                            ) : null}
                            <span className="truncate">{task.title}</span>
                            {(taskLabels[task.id] ?? [])
                              .slice(0, 1)
                              .map((label) => (
                                <Badge
                                  className="text-[10px]"
                                  key={`${task.id}-${label}`}
                                  variant="outline"
                                >
                                  {label}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              task.status === "done" &&
                                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                              task.status === "in_progress" &&
                                "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                              task.status === "todo" &&
                                "bg-muted text-muted-foreground"
                            )}
                            variant="secondary"
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
                            className={cn(
                              "rounded-full px-2.5 py-0.5 font-semibold text-[11px]",
                              PRIORITY_TABLE_BADGES[task.priority]
                            )}
                            variant="outline"
                          >
                            {PRIORITY_META[task.priority].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {task.startTime
                            ? `${task.startTime}${task.endTime ? ` - ${task.endTime}` : ""}`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              className={cn(
                                "h-8 rounded-xl px-3 font-semibold text-xs"
                              )}
                              onClick={() => toggleStatus(task)}
                              size="sm"
                              variant={
                                task.status === "done" ? "secondary" : "default"
                              }
                            >
                              {task.status === "done" ? "Réouvrir" : "Terminer"}
                            </Button>
                            <Button
                              onClick={() => removeTask(task.id)}
                              size="icon-sm"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                className="size-4"
                                icon={Delete01Icon}
                                strokeWidth={2}
                              />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    aria-label="Plus d'actions"
                                    size="icon-sm"
                                    variant="ghost"
                                  />
                                }
                              >
                                <HugeiconsIcon
                                  className="size-4"
                                  icon={MoreVerticalCircle01Icon}
                                  strokeWidth={2}
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={6}>
                                <DropdownMenuItem
                                  onClick={() => handleEditTask(task)}
                                >
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
                                      onClick={() =>
                                        setTaskLabel(task.id, "Suivi")
                                      }
                                    >
                                      Suivi
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setTaskLabel(task.id, "Urgent")
                                      }
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
                                      onClick={() =>
                                        setCustomTaskLabel(task.id)
                                      }
                                    >
                                      Personnalisé…
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => removeTask(task.id)}
                                  variant="destructive"
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
  );
};

// Sub-component for a group of tasks
const TaskGroup: React.FC<{
  title: string;
  tasks: Task[];
  color: string;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  isCompletedGroup?: boolean;
}> = ({ title, tasks, color, onToggle, onDelete, isCompletedGroup }) => {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            "font-semibold text-sm uppercase tracking-wider",
            color
          )}
        >
          {title}
        </h3>
        <Badge className="text-[10px]" variant="secondary">
          {tasks.length}
        </Badge>
      </div>

      <Card size="sm">
        <CardContent className="grid gap-0.5 p-1">
          {tasks.map((task) => (
            <div
              className={cn(
                "group flex items-start gap-3 rounded-3xl px-4 py-3 transition-all duration-200 ease-out",
                isCompletedGroup
                  ? "bg-muted/20"
                  : "hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.04)]",
                !isCompletedGroup &&
                  task.priority === "high" &&
                  "priority-bar-high",
                !isCompletedGroup &&
                  task.priority === "medium" &&
                  "priority-bar-medium",
                !isCompletedGroup &&
                  task.priority === "low" &&
                  "priority-bar-low"
              )}
              key={task.id}
            >
              <button
                className={cn(
                  "mt-0.5 shrink-0 transition-colors",
                  task.status === "done"
                    ? "text-green-500"
                    : "text-muted-foreground hover:text-primary"
                )}
                onClick={() => onToggle(task)}
              >
                {task.status === "done" ? (
                  <HugeiconsIcon
                    className="status-dot-alive size-5"
                    icon={CheckmarkCircle02Icon}
                    strokeWidth={2}
                  />
                ) : (
                  <HugeiconsIcon
                    className="size-5"
                    icon={CircleIcon}
                    strokeWidth={2}
                  />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium text-sm",
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
                      className={cn(
                        "text-[10px]",
                        PRIORITY_COLORS[task.priority]
                      )}
                      variant="outline"
                    >
                      {PRIORITY_META[task.priority].label}
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
                        className="size-2.5"
                        icon={Calendar01Icon}
                        strokeWidth={2}
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
                      className="gap-1 text-[10px] text-muted-foreground"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className="size-2.5"
                        icon={Clock01Icon}
                        strokeWidth={2}
                      />
                      {task.startTime} {task.endTime ? `- ${task.endTime}` : ""}
                    </Badge>
                  )}

                  {task.isReminder && (
                    <Badge
                      className="gap-1 border-amber-200 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        className="size-2.5"
                        icon={Notification02Icon}
                        strokeWidth={2}
                      />{" "}
                      Rappel
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                className="shrink-0 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
                onClick={() => onDelete(task.id)}
                size="icon-sm"
                variant="ghost"
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={Delete01Icon}
                  strokeWidth={2}
                />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks;
