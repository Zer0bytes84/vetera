import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useFocus } from "@/contexts/focus-provider";
import {
  useAppointmentsRepository,
  usePatientsRepository,
  useRemindersRepository,
  useTasksRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Appointment, Patient, Reminder, Task } from "@/types/db";

type ReminderView = "today" | "upcoming" | "completed";
type Scope = "mine" | "team";

interface TaskDraft {
  description: string;
  dueDate: string;
  patientId: string;
  priority: Task["priority"];
  startTime: string;
  title: string;
}

interface ManualReminderItem {
  date: Date | null;
  kind: "manual";
  patient?: Patient;
  task: Task;
}

interface AutomaticReminderItem {
  appointment?: Appointment;
  date: Date;
  kind: "automatic";
  patient?: Patient;
  reminder: Reminder;
}

type ReminderItem = ManualReminderItem | AutomaticReminderItem;

const emptyDraft = (): TaskDraft => ({
  description: "",
  dueDate: toDateKey(new Date()),
  patientId: "",
  priority: "medium",
  startTime: "",
  title: "",
});

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTaskDate(task: Task) {
  if (!task.dueDate) {
    return null;
  }
  const time = task.startTime || "12:00";
  const date = new Date(`${task.dueDate}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reminderDate(reminder: Reminder) {
  const value =
    reminder.status === "snoozed" && reminder.snoozedUntil
      ? reminder.snoozedUntil
      : reminder.scheduledFor;
  return new Date(value);
}

function dateLabel(date: Date | null, view: ReminderView) {
  if (!date) {
    return "Sans date";
  }
  const today = toDateKey(new Date());
  const key = toDateKey(date);
  if (key === today) {
    return `Aujourd'hui · ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === toDateKey(tomorrow)) {
    return `Demain · ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  const formatted = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(view === "completed" ? { year: "numeric" } : {}),
  });
  return `${formatted} · ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function itemDate(item: ReminderItem) {
  return item.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function itemIsCompleted(item: ReminderItem) {
  if (item.kind === "manual") {
    return item.task.status === "done";
  }
  return (
    item.reminder.status === "sent" || item.reminder.status === "dismissed"
  );
}

function itemMatchesView(item: ReminderItem, view: ReminderView) {
  const completed = itemIsCompleted(item);
  if (view === "completed") {
    return completed;
  }
  if (completed) {
    return false;
  }
  const key = item.date ? toDateKey(item.date) : null;
  if (view === "today") {
    return key !== null && key <= toDateKey(new Date());
  }
  return key === null || key > toDateKey(new Date());
}

function priorityLabel(priority: Task["priority"]) {
  if (priority === "high") {
    return "Prioritaire";
  }
  if (priority === "low") {
    return "Faible";
  }
  return "Normal";
}

const Tasks: React.FC = () => {
  const { currentUser } = useAuth();
  const { clearFocus, focus } = useFocus();
  const tasksRepository = useTasksRepository();
  const remindersRepository = useRemindersRepository();
  const { data: appointments } = useAppointmentsRepository();
  const { data: patients } = usePatientsRepository();
  const [activeView, setActiveView] = useState<ReminderView>("today");
  const [scope, setScope] = useState<Scope>("mine");
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients]
  );
  const appointmentsById = useMemo(
    () =>
      new Map(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments]
  );

  const allItems = useMemo<ReminderItem[]>(() => {
    const manual: ManualReminderItem[] = tasksRepository.data
      .filter((task) => {
        if (scope === "team" || !currentUser?.uid) {
          return true;
        }
        return task.assignedTo === currentUser.uid || !task.assignedTo;
      })
      .map((task) => ({
        date: parseTaskDate(task),
        kind: "manual",
        patient: task.patientId ? patientsById.get(task.patientId) : undefined,
        task,
      }));

    const automatic: AutomaticReminderItem[] = remindersRepository.data.map(
      (reminder) => {
        const appointment = appointmentsById.get(reminder.appointmentId);
        return {
          appointment,
          date: reminderDate(reminder),
          kind: "automatic",
          patient: appointment
            ? patientsById.get(appointment.patientId)
            : undefined,
          reminder,
        };
      }
    );

    return [...manual, ...automatic];
  }, [
    appointmentsById,
    currentUser?.uid,
    patientsById,
    remindersRepository.data,
    scope,
    tasksRepository.data,
  ]);

  const counts = useMemo(
    () => ({
      completed: allItems.filter((item) => itemMatchesView(item, "completed"))
        .length,
      today: allItems.filter((item) => itemMatchesView(item, "today")).length,
      upcoming: allItems.filter((item) => itemMatchesView(item, "upcoming"))
        .length,
    }),
    [allItems]
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
    return allItems
      .filter((item) => itemMatchesView(item, activeView))
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        const searchable =
          item.kind === "manual"
            ? [item.task.title, item.task.description, item.patient?.name]
            : [
                item.reminder.message,
                item.appointment?.title,
                item.appointment?.reason,
                item.patient?.name,
              ];
        return searchable.some((value) =>
          value?.toLocaleLowerCase("fr-FR").includes(normalizedQuery)
        );
      })
      .sort((a, b) => {
        const direction = activeView === "completed" ? -1 : 1;
        return (itemDate(a) - itemDate(b)) * direction;
      })
      .slice(0, 100);
  }, [activeView, allItems, query]);

  useEffect(() => {
    if (focus?.kind !== "task") {
      return;
    }
    const task = tasksRepository.data.find((entry) => entry.id === focus.id);
    if (!task) {
      clearFocus();
      return;
    }

    setScope("team");
    setQuery("");
    setActiveView(
      task.status === "done"
        ? "completed"
        : itemMatchesView(
              {
                date: parseTaskDate(task),
                kind: "manual",
                task,
              },
              "today"
            )
          ? "today"
          : "upcoming"
    );
    setFocusedTaskId(task.id);

    const timer = window.setTimeout(() => {
      document
        .querySelector(`[data-task-id="${task.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      clearFocus();
    }, 120);
    const highlightTimer = window.setTimeout(
      () => setFocusedTaskId(null),
      2200
    );
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(highlightTimer);
    };
  }, [clearFocus, focus, tasksRepository.data]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      return;
    }
    setSaving(true);
    try {
      await tasksRepository.add({
        assignedTo: currentUser?.uid,
        description: draft.description.trim() || undefined,
        dueDate: draft.dueDate || undefined,
        endTime: undefined,
        isReminder: true,
        patientId: draft.patientId || undefined,
        priority: draft.priority,
        startTime: draft.startTime || undefined,
        status: "todo",
        title: draft.title.trim(),
      });
      setDraft(emptyDraft());
      setShowDetails(false);
      setActiveView("today");
      toast.success("Rappel ajouté");
    } catch (error) {
      console.error("[Reminders] Unable to create reminder", error);
      toast.error("Impossible d'ajouter le rappel");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setPendingDeleteId(null);
    setEditDraft({
      description: task.description || "",
      dueDate: task.dueDate || "",
      patientId: task.patientId || "",
      priority: task.priority,
      startTime: task.startTime || "",
      title: task.title,
    });
  };

  const saveEdit = async () => {
    if (!(editingTaskId && editDraft.title.trim())) {
      return;
    }
    setSaving(true);
    try {
      await tasksRepository.update(editingTaskId, {
        description: editDraft.description.trim() || undefined,
        dueDate: editDraft.dueDate || undefined,
        patientId: editDraft.patientId || undefined,
        priority: editDraft.priority,
        startTime: editDraft.startTime || undefined,
        title: editDraft.title.trim(),
      });
      setEditingTaskId(null);
      toast.success("Rappel mis à jour");
    } catch (error) {
      console.error("[Reminders] Unable to update reminder", error);
      toast.error("Impossible de modifier le rappel");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    await tasksRepository.update(task.id, {
      status: task.status === "done" ? "todo" : "done",
    });
  };

  const postponeTask = async (task: Task) => {
    const date = parseTaskDate(task) ?? new Date();
    date.setDate(date.getDate() + 1);
    await tasksRepository.update(task.id, { dueDate: toDateKey(date) });
    toast.success("Rappel reporté à demain");
  };

  const deleteTask = async (taskId: string) => {
    if (pendingDeleteId !== taskId) {
      setPendingDeleteId(taskId);
      return;
    }
    await tasksRepository.remove(taskId);
    setPendingDeleteId(null);
    toast.success("Rappel supprimé");
  };

  const tabs: Array<{
    count: number;
    id: ReminderView;
    label: string;
  }> = [
    { count: counts.today, id: "today", label: "Aujourd'hui" },
    { count: counts.upcoming, id: "upcoming", label: "À venir" },
    { count: counts.completed, id: "completed", label: "Terminés" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="clinical-eyebrow">Suivi quotidien</p>
          <h1 className="mt-2 font-semibold text-3xl tracking-[-0.035em] sm:text-4xl">
            Rappels
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm sm:text-base">
            Les actions à ne pas oublier, réunies avec les rappels du planning.
          </p>
        </div>
        <NativeSelect
          aria-label="Périmètre des rappels"
          className="w-full md:w-44"
          onChange={(event) => setScope(event.target.value as Scope)}
          value={scope}
        >
          <NativeSelectOption value="mine">Mes rappels</NativeSelectOption>
          <NativeSelectOption value="team">Toute l'équipe</NativeSelectOption>
        </NativeSelect>
      </header>

      <form
        className="clinical-feature-surface overflow-hidden"
        onSubmit={handleCreate}
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <Bell className="size-5" />
          </div>
          <Input
            aria-label="Nouveau rappel"
            className="h-11 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Ex. Appeler le propriétaire de Milo"
            value={draft.title}
          />
          <Button
            className="justify-between sm:justify-center"
            onClick={() => setShowDetails((current) => !current)}
            type="button"
            variant="ghost"
          >
            Détails
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showDetails && "rotate-180"
              )}
            />
          </Button>
          <Button disabled={saving || !draft.title.trim()} type="submit">
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>

        {showDetails && (
          <div className="grid gap-4 border-border/70 border-t bg-muted/15 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <Field label="Patient">
              <NativeSelect
                className="w-full"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    patientId: event.target.value,
                  }))
                }
                value={draft.patientId}
              >
                <NativeSelectOption value="">Aucun patient</NativeSelectOption>
                {patients
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                  .map((patient) => (
                    <NativeSelectOption key={patient.id} value={patient.id}>
                      {patient.name} · {patient.species}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Date">
              <Input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                type="date"
                value={draft.dueDate}
              />
            </Field>
            <Field label="Heure">
              <Input
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                type="time"
                value={draft.startTime}
              />
            </Field>
            <Field label="Priorité">
              <NativeSelect
                className="w-full"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as Task["priority"],
                  }))
                }
                value={draft.priority}
              >
                <NativeSelectOption value="low">Faible</NativeSelectOption>
                <NativeSelectOption value="medium">Normale</NativeSelectOption>
                <NativeSelectOption value="high">
                  Prioritaire
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="font-medium text-sm" htmlFor="reminder-note">
                Note utile
              </label>
              <Textarea
                className="mt-2 min-h-20"
                id="reminder-note"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Une instruction courte pour l'équipe..."
                value={draft.description}
              />
            </div>
          </div>
        )}
      </form>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 border-border/70 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            aria-label="Période"
            className="flex gap-1 overflow-x-auto"
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                aria-selected={activeView === tab.id}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-medium text-sm transition-colors",
                  activeView === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px]",
                    activeView === tab.id
                      ? "bg-background/15 text-background"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans les rappels"
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
              value={query}
            />
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState query={query} view={activeView} />
        ) : (
          <div className="clinical-surface divide-y divide-border/70 overflow-hidden">
            {visibleItems.map((item) =>
              item.kind === "manual" ? (
                <ManualReminderRow
                  draft={editDraft}
                  editing={editingTaskId === item.task.id}
                  item={item}
                  focused={focusedTaskId === item.task.id}
                  key={`task-${item.task.id}`}
                  onCancelEdit={() => setEditingTaskId(null)}
                  onDelete={() => deleteTask(item.task.id)}
                  onDraftChange={setEditDraft}
                  onEdit={() => startEditing(item.task)}
                  onPostpone={() => postponeTask(item.task)}
                  onSave={saveEdit}
                  onToggle={() => toggleTask(item.task)}
                  patients={patients}
                  pendingDelete={pendingDeleteId === item.task.id}
                  saving={saving}
                  view={activeView}
                />
              ) : (
                <AutomaticReminderRow
                  item={item}
                  key={`automatic-${item.reminder.id}`}
                  onDismiss={async () => {
                    await remindersRepository.dismiss(item.reminder.id);
                    toast.success("Rappel automatique ignoré");
                  }}
                  onSnooze={async () => {
                    await remindersRepository.snooze(item.reminder.id, 60);
                    toast.success("Rappel reporté d'une heure");
                  }}
                  view={activeView}
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
};

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <span className="font-medium text-sm">{label}</span>
      {children}
    </div>
  );
}

function ManualReminderRow({
  draft,
  editing,
  focused,
  item,
  onCancelEdit,
  onDelete,
  onDraftChange,
  onEdit,
  onPostpone,
  onSave,
  onToggle,
  patients,
  pendingDelete,
  saving,
  view,
}: {
  draft: TaskDraft;
  editing: boolean;
  focused: boolean;
  item: ManualReminderItem;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDraftChange: (draft: TaskDraft) => void;
  onEdit: () => void;
  onPostpone: () => void;
  onSave: () => void;
  onToggle: () => void;
  patients: Patient[];
  pendingDelete: boolean;
  saving: boolean;
  view: ReminderView;
}) {
  if (editing) {
    return (
      <div className="bg-muted/15 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <Input
              aria-label="Titre du rappel"
              className="font-medium"
              onChange={(event) =>
                onDraftChange({ ...draft, title: event.target.value })
              }
              value={draft.title}
            />
          </div>
          <Field label="Patient">
            <NativeSelect
              className="w-full"
              onChange={(event) =>
                onDraftChange({ ...draft, patientId: event.target.value })
              }
              value={draft.patientId}
            >
              <NativeSelectOption value="">Aucun patient</NativeSelectOption>
              {patients
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                .map((patient) => (
                  <NativeSelectOption key={patient.id} value={patient.id}>
                    {patient.name} · {patient.species}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </Field>
          <Field label="Date">
            <Input
              onChange={(event) =>
                onDraftChange({ ...draft, dueDate: event.target.value })
              }
              type="date"
              value={draft.dueDate}
            />
          </Field>
          <Field label="Heure">
            <Input
              onChange={(event) =>
                onDraftChange({ ...draft, startTime: event.target.value })
              }
              type="time"
              value={draft.startTime}
            />
          </Field>
          <Field label="Priorité">
            <NativeSelect
              className="w-full"
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  priority: event.target.value as Task["priority"],
                })
              }
              value={draft.priority}
            >
              <NativeSelectOption value="low">Faible</NativeSelectOption>
              <NativeSelectOption value="medium">Normale</NativeSelectOption>
              <NativeSelectOption value="high">Prioritaire</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Textarea
            className="sm:col-span-2 lg:col-span-4"
            onChange={(event) =>
              onDraftChange({ ...draft, description: event.target.value })
            }
            placeholder="Instruction pour l'équipe"
            value={draft.description}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onCancelEdit} type="button" variant="ghost">
            Annuler
          </Button>
          <Button
            disabled={saving || !draft.title.trim()}
            onClick={onSave}
            type="button"
          >
            <Check className="size-4" />
            Enregistrer
          </Button>
        </div>
      </div>
    );
  }

  const completed = item.task.status === "done";
  return (
    <article
      className={cn(
        "group flex flex-col gap-4 p-4 transition-shadow sm:flex-row sm:items-center sm:p-5",
        focused && "relative z-10 ring-2 ring-sky-500/40 ring-inset"
      )}
      data-task-id={item.task.id}
    >
      <button
        aria-label={completed ? "Rouvrir le rappel" : "Marquer comme terminé"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          completed
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600"
        )}
        onClick={onToggle}
        type="button"
      >
        {completed ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <Check className="size-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-semibold text-sm",
              completed && "text-muted-foreground line-through"
            )}
          >
            {item.task.title}
          </h3>
          {item.task.priority === "high" && (
            <Badge
              className="border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300"
              variant="outline"
            >
              Prioritaire
            </Badge>
          )}
          <Badge variant="outline">Manuel</Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {dateLabel(item.date, view)}
          </span>
          {item.patient && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {item.patient.name} · {item.patient.species}
            </span>
          )}
          {item.task.priority !== "high" && (
            <span>{priorityLabel(item.task.priority)}</span>
          )}
        </div>
        {item.task.description && (
          <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
            {item.task.description}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:justify-end">
        {!completed && (
          <Button onClick={onPostpone} size="sm" type="button" variant="ghost">
            <CalendarDays className="size-4" />
            Demain
          </Button>
        )}
        <Button onClick={onEdit} size="sm" type="button" variant="ghost">
          <Pencil className="size-4" />
          Modifier
        </Button>
        <Button
          className={cn(pendingDelete && "bg-destructive/10 text-destructive")}
          onClick={onDelete}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" />
          {pendingDelete ? "Confirmer" : "Supprimer"}
        </Button>
      </div>
    </article>
  );
}

function AutomaticReminderRow({
  item,
  onDismiss,
  onSnooze,
  view,
}: {
  item: AutomaticReminderItem;
  onDismiss: () => void;
  onSnooze: () => void;
  view: ReminderView;
}) {
  const completed = itemIsCompleted(item);
  return (
    <article className="flex flex-col gap-4 bg-sky-500/[0.025] p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">
        <Bell className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-sm">
            {item.reminder.message ||
              item.appointment?.title ||
              "Rendez-vous à venir"}
          </h3>
          <Badge
            className="border-sky-500/20 bg-sky-500/8 text-sky-700 dark:text-sky-300"
            variant="outline"
          >
            Planning
          </Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {dateLabel(item.date, view)}
          </span>
          {item.patient && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {item.patient.name} · {item.patient.species}
            </span>
          )}
          {item.appointment?.reason && <span>{item.appointment.reason}</span>}
        </div>
      </div>
      {!completed && (
        <div className="flex flex-wrap gap-1">
          <Button onClick={onSnooze} size="sm" type="button" variant="ghost">
            <RotateCcw className="size-4" />
            Dans 1 h
          </Button>
          <Button onClick={onDismiss} size="sm" type="button" variant="ghost">
            Ignorer
          </Button>
        </div>
      )}
    </article>
  );
}

function EmptyState({ query, view }: { query: string; view: ReminderView }) {
  let copy = "Aucun rappel terminé pour le moment.";
  if (query) {
    copy = "Aucun rappel ne correspond à cette recherche.";
  } else if (view === "today") {
    copy = "Tout est à jour pour aujourd'hui.";
  } else if (view === "upcoming") {
    copy = "Aucun rappel à venir.";
  }
  return (
    <div className="clinical-subtle-surface flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-xs">
        {view === "completed" ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <Clock3 className="size-5" />
        )}
      </div>
      <h2 className="mt-4 font-semibold">Rien à traiter</h2>
      <p className="mt-1 text-muted-foreground text-sm">{copy}</p>
    </div>
  );
}

export default Tasks;
