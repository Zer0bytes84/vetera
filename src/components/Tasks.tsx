import { ErrorState } from "@/design-system/patterns/error-state";
import { BellIcon, CalendarDaysIcon, CheckBadgeIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, ClockIcon, MagnifyingGlassIcon, ShieldExclamationIcon } from "@heroicons/react/20/solid";
import { ArrowRightIcon, PlusIcon } from "@heroicons/react/16/solid";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientReminders } from "@/modules/patient-reminders/use-patient-reminders";
import type {
  MedicalReminderProposal,
  PatientReminder,
  ReminderType,
} from "@/modules/patient-reminders/store";
import {
  addCalendarMonths,
  isMedicalReminderType,
  localToday,
  reminderTypesForSelect,
} from "@/modules/patient-reminders/domain";
import { MedicalReminderDialog } from "@/modules/patient-reminders/medical-reminder-dialog";
import { patientRemindersService } from "@/modules/patient-reminders/service";
import { announcePatientRemindersChanged } from "@/modules/patient-reminders/use-patient-reminders";
import { PatientRemindersContent } from "@/modules/patient-reminders/patient-reminders-panel";
import { ListSearch } from "@/components/ui/list-controls";
import { formatDisplayText, formatNumber } from "@/utils/display-format";
import { ArrowUturnLeftIcon, CheckIcon, ChevronDownIcon, PencilIcon, TrashIcon, UserIcon } from "@heroicons/react/16/solid";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import MotivationalHeader from "@/components/MotivationalHeader";
import { SectionCards } from "@/components/section-cards";
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
import "./tasks.css";
import { buildReminderQuiet, type ReminderQuiet } from "./reminder-quiet";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import {
  groupReminders,
  reminderBucket,
  sourceBreakdown,
} from "./reminder-buckets";
import { useListCursor } from "@/hooks/useListCursor";
import { Kbd } from "@/components/ui/kbd";
import { DatePicker } from "@/components/ui/date-picker";

type ReminderView = "today" | "upcoming" | "completed";
type Scope = "mine" | "team";
type ReminderSource = "all" | "manual" | "medical";

interface TaskDraft {
  reminderTypeId: string;
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

interface MedicalReminderItem {
  kind: "medical";
  reminder: PatientReminder;
  patient?: Patient;
  date: Date;
}
type ReminderItem =
  ManualReminderItem | AutomaticReminderItem | MedicalReminderItem;

const emptyDraft = (): TaskDraft => ({
  description: "",
  reminderTypeId: "",
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

/** A reminder only has an hour when one was entered: never show an invented 12:00. */
function itemHasTime(item: ReminderItem) {
  if (item.kind === "manual") return Boolean(item.task.startTime);
  return item.kind === "automatic";
}

function dateLabel(date: Date | null, view: ReminderView, withTime = true) {
  if (!date) {
    return "Sans date";
  }
  if (!withTime) {
    const key = toDateKey(date);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (key === toDateKey(new Date())) return "Aujourd'hui";
    if (key === toDateKey(tomorrow)) return "Demain";
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      ...(view === "completed" ||
      date.getFullYear() !== new Date().getFullYear()
        ? { year: "numeric" }
        : {}),
    });
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
  if (item.kind === "medical") return item.reminder.statut !== "en_cours";
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
  const patientRemindersModel = usePatientReminders();
  const activeTypes = reminderTypesForSelect(patientRemindersModel.types);
  const [auxiliaryView, setAuxiliaryView] = useState<"calls" | "types" | null>(
    null,
  );
  const remindersRepository = useRemindersRepository();
  const { data: appointments } = useAppointmentsRepository();
  const { data: patients } = usePatientsRepository();
  const [activeView, setActiveView] = useState<ReminderView>("today");
  const [sourceFilter, setSourceFilter] = useState<ReminderSource>(() => {
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("baitari:reminders-source") === "medical"
    ) {
      return "medical";
    }
    return "all";
  });
  const [medicalDraft, setMedicalDraft] =
    useState<MedicalReminderProposal | null>(null);
  const [scope, setScope] = useState<Scope>("mine");
  const [query, setQuery] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<TaskDraft>(emptyDraft);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    window.sessionStorage.removeItem("baitari:reminders-source");
  }, []);

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const appointmentsById = useMemo(
    () =>
      new Map(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments],
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
      },
    );

    const medical: MedicalReminderItem[] = patientRemindersModel.reminders.map(
      (reminder) => ({
        kind: "medical",
        reminder,
        patient: patientsById.get(reminder.patient_id),
        date: new Date(`${reminder.echeance}T12:00:00`),
      }),
    );
    return [...manual, ...automatic, ...medical];
  }, [
    appointmentsById,
    currentUser?.uid,
    patientsById,
    remindersRepository.data,
    patientRemindersModel.reminders,
    scope,
    tasksRepository.data,
  ]);

  // One reading of every source for the indicators, the same as the list's.
  const counts = useMemo(() => {
    const now = new Date();
    const open = allItems.filter((item) => !itemIsCompleted(item));
    const overdue = open.filter(
      (item) => reminderBucket(item.date, now) === "overdue",
    );
    const dueToday = open.filter(
      (item) => reminderBucket(item.date, now) === "today",
    );
    const upcoming = allItems
      .filter((item) => itemMatchesView(item, "upcoming"))
      .sort((left, right) => itemDate(left) - itemDate(right));
    return {
      overdue,
      dueToday,
      today: overdue.length + dueToday.length,
      upcoming: upcoming.length,
      next: upcoming[0],
    };
  }, [allItems]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
    return allItems
      .filter((item) => itemMatchesView(item, activeView))
      .filter(
        (item) =>
          sourceFilter === "all" ||
          (sourceFilter === "manual" && item.kind === "manual") ||
          (sourceFilter === "medical" && item.kind === "medical"),
      )
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }
        const searchable =
          item.kind === "manual"
            ? [item.task.title, item.task.description, item.patient?.name]
            : item.kind === "medical"
              ? [
                  item.patient?.name,
                  item.reminder.note,
                  patientRemindersModel.types.find(
                    (type) => type.id === item.reminder.type,
                  )?.name,
                ]
              : [
                  item.reminder.message,
                  item.appointment?.title,
                  item.appointment?.reason,
                  item.patient?.name,
                ];
        return searchable.some((value) =>
          value?.toLocaleLowerCase("fr-FR").includes(normalizedQuery),
        );
      })
      .sort((a, b) => {
        const direction = activeView === "completed" ? -1 : 1;
        return (itemDate(a) - itemDate(b)) * direction;
      })
      .slice(0, 100);
  }, [activeView, allItems, query, patientRemindersModel.types, sourceFilter]);

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
              "today",
            )
          ? "today"
          : "upcoming",
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
      2200,
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
      const created = await tasksRepository.add({
        assignedTo: currentUser?.uid,
        description: draft.description.trim() || undefined,
        dueDate: draft.dueDate || undefined,
        endTime: undefined,
        isReminder: true,
        reminderTypeId: draft.reminderTypeId || null,
        patientId: draft.patientId || undefined,
        priority: draft.priority,
        startTime: draft.startTime || undefined,
        status: "todo",
        title: draft.title.trim(),
      });
      if (!created) {
        toast.error("Le rappel n’a pas pu être ajouté.");
        return;
      }
      setDraft(emptyDraft());
      setShowDetails(false);
      setAuxiliaryView(null);
      setActiveView(
        draft.dueDate > toDateKey(new Date()) ? "upcoming" : "today",
      );
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
      reminderTypeId: task.reminderTypeId || "",
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
      const updated = await tasksRepository.update(editingTaskId, {
        reminderTypeId: editDraft.reminderTypeId || null,
        description: editDraft.description.trim() || undefined,
        dueDate: editDraft.dueDate || undefined,
        patientId: editDraft.patientId || undefined,
        priority: editDraft.priority,
        startTime: editDraft.startTime || undefined,
        title: editDraft.title.trim(),
      });
      if (!updated) return;
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
    const nextStatus = task.status === "done" ? "todo" : "done";
    if (!(await tasksRepository.update(task.id, { status: nextStatus })))
      return;
    toast.success(
      nextStatus === "done" ? "Rappel terminé" : "Rappel réouvert",
      {
        duration: 5000,
        action: {
          label: "Annuler",
          onClick: () => {
            void tasksRepository.update(task.id, { status: task.status });
          },
        },
      },
    );
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

  // Several manual reminders at once: X (or the box) selects the current
  // row, the floating bar acts on all of them, Escape clears the selection.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const toggleSelected = (taskId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  const selectableIds = new Set(
    visibleItems.flatMap((item) =>
      item.kind === "manual" ? [item.task.id] : [],
    ),
  );
  const selectedTasks = tasksRepository.data.filter(
    (task) => selectedIds.has(task.id) && selectableIds.has(task.id),
  );
  const listRef = useListCursor({ storageKey: "reminders" });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']",
        )
      )
        return;
      if (event.key === "x" || event.key === "X") {
        const row = document.querySelector<HTMLElement>(
          ".reminders-page [data-list-row][data-current][data-task-id]",
        );
        if (!row?.dataset.taskId) return;
        event.preventDefault();
        toggleSelected(row.dataset.taskId);
      } else if (event.key === "Escape" && selectedIds.size) {
        setSelectedIds(new Set());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedIds.size]);
  const completeSelected = async () => {
    const tasks = selectedTasks.filter((task) => task.status !== "done");
    if (!tasks.length) return;
    setSaving(true);
    try {
      const results = await Promise.all(
        tasks.map((task) =>
          tasksRepository.update(task.id, { status: "done" }),
        ),
      );
      const done = tasks.filter((_, index) => results[index]);
      setSelectedIds(new Set());
      if (!done.length) return;
      toast.success(
        `${done.length} rappel${done.length > 1 ? "s" : ""} terminé${done.length > 1 ? "s" : ""}`,
        {
          duration: 5000,
          action: {
            label: "Annuler",
            onClick: () => {
              for (const task of done)
                void tasksRepository.update(task.id, { status: task.status });
            },
          },
        },
      );
    } finally {
      setSaving(false);
    }
  };
  const postponeSelected = async () => {
    const tasks = selectedTasks.filter((task) => task.status !== "done");
    if (!tasks.length) return;
    setSaving(true);
    try {
      await Promise.all(
        tasks.map((task) => {
          const date = parseTaskDate(task) ?? new Date();
          date.setDate(date.getDate() + 1);
          return tasksRepository.update(task.id, { dueDate: toDateKey(date) });
        }),
      );
      setSelectedIds(new Set());
      toast.success(
        `${tasks.length} rappel${tasks.length > 1 ? "s" : ""} reporté${tasks.length > 1 ? "s" : ""} au lendemain`,
      );
    } finally {
      setSaving(false);
    }
  };

  const sourceItems = allItems.filter(
    (item) =>
      sourceFilter === "all" ||
      (sourceFilter === "manual" && item.kind === "manual") ||
      (sourceFilter === "medical" && item.kind === "medical"),
  );
  const tabs: Array<{
    count: number;
    id: ReminderView;
    label: string;
  }> = [
    {
      count: sourceItems.filter((item) => itemMatchesView(item, "today"))
        .length,
      id: "today",
      label: "En cours",
    },
    {
      count: sourceItems.filter((item) => itemMatchesView(item, "upcoming"))
        .length,
      id: "upcoming",
      label: "À venir",
    },
    {
      count: sourceItems.filter((item) => itemMatchesView(item, "completed"))
        .length,
      id: "completed",
      label: "Terminés",
    },
  ];

  const openMedicalDraft = () => {
                const type =
                  patientRemindersModel.types.find(
                    (entry) => entry.active && entry.id === "vaccin",
                  ) ??
                  patientRemindersModel.types.find(
                    (entry) => entry.active && isMedicalReminderType(entry),
                  );
                if (!type) {
                  toast.error("Activez un type de rappel dans les paramètres.");
                  return;
                }
                setMedicalDraft({
                  acteSourceId: "",
                  clientId: null,
                  dateActe: localToday(),
                  echeance: addCalendarMonths(
                    localToday(),
                    type.interval_months,
                  ),
                  intervalleMois: type.interval_months,
                  patientId: "",
                  type: type.id,
                  typeLabel: type.name,
                });
  };
  const quiet = buildReminderQuiet(
    sourceItems.map((item) => ({
      item,
      kind: item.kind,
      date: item.date,
      completed: itemIsCompleted(item),
      title:
        item.kind === "manual"
          ? item.task.title
          : item.kind === "medical"
            ? (patientRemindersModel.types.find((type) => type.id === item.reminder.type)?.name ?? "Rappel médical")
            : (item.reminder.message || item.appointment?.title || "Rappel de rendez-vous"),
      patientName: item.patient?.name,
    })),
    new Date(),
  );
  const readAt = new Date();
  const readDay = readAt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const bandSubtitle = `${readDay[0].toLocaleUpperCase("fr-FR")}${readDay.slice(1)} · état à ${readAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${
    counts.overdue.length
      ? `${formatNumber(counts.overdue.length)} en retard`
      : counts.today
        ? `${formatNumber(counts.today)} à traiter aujourd’hui`
        : "rien à traiter"
  }`;

  return (
    <div
      className={cn(
        "reminders-page dashboard-stage flex w-full min-w-0 flex-col gap-3 px-4 pb-8 lg:px-6",
        selectedTasks.length > 0 && "pb-24",
      )}
    >
      <MotivationalHeader
        section="taches"
        title="Rappels"
        subtitle="actions à suivre"
      />

      <SectionCards
        actions={
            <Button
              className="h-9 rounded-full px-4"
              onClick={openMedicalDraft}
            >
              <PlusIcon className="size-4" />
              Rappel médical
            </Button>
        }
        badges={false}
        icon={ClipboardDocumentCheckIcon}
        subtitle={bandSubtitle}
        items={[
          {
            title: "En retard",
            icon: ShieldExclamationIcon,
            value: formatNumber(counts.overdue.length),
            // The dashboard's « À traiter » reading: rose when late, amber when due, green at zero.
            tone: counts.overdue.length ? "critical" : "positive",
            trend: "neutral",
            detailRow:
              sourceBreakdown(counts.overdue) || "Aucune échéance dépassée",
            onClick: () => {
              setAuxiliaryView(null);
              setSourceFilter("all");
              setActiveView("today");
            },
            actionLabel: "Voir les rappels en retard",
          },
          {
            title: "Dus aujourd’hui",
            icon: CalendarDaysIcon,
            value: formatNumber(counts.dueToday.length),
            tone: counts.dueToday.length ? "watch" : "positive",
            trend: "neutral",
            detailRow:
              sourceBreakdown(counts.dueToday) || "Aucune échéance aujourd’hui",
            onClick: () => {
              setAuxiliaryView(null);
              setSourceFilter("all");
              setActiveView("today");
            },
            actionLabel: "Voir les rappels du jour",
          },
          {
            title: "À traiter",
            icon: BellIcon,
            value: formatNumber(counts.today),
            tone: counts.overdue.length ? "critical" : counts.today ? "watch" : "positive",
            trend: "neutral",
            detailRow: counts.today
              ? `${formatNumber(counts.overdue.length)} en retard · ${formatNumber(counts.dueToday.length)} aujourd’hui`
              : "En retard et dus aujourd’hui",
            onClick: () => {
              setAuxiliaryView(null);
              setSourceFilter("all");
              setActiveView("today");
            },
            actionLabel: "Voir les rappels à traiter",
          },
          {
            title: "À venir",
            icon: ClockIcon,
            value: formatNumber(counts.upcoming),
            tone: "quiet",
            trend: "neutral",
            detailRow: counts.next
              ? `Prochain : ${dateLabel(counts.next.date, "upcoming", itemHasTime(counts.next))}`
              : "Aucun rappel après aujourd’hui",
            onClick: () => {
              setAuxiliaryView(null);
              setSourceFilter("all");
              setActiveView("upcoming");
            },
            actionLabel: "Voir les prochains rappels",
          },
        ]}
      />

      <form
        className="quick-reminder-form clinical-feature-surface overflow-hidden"
        onSubmit={handleCreate}
      >
        <div className="quick-reminder-fields flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="quick-reminder-title min-w-0 flex-1">
            <label
              htmlFor="new-reminder-title"
              className="inline-flex items-center gap-2 text-xs font-medium text-foreground"
            >
              <BellIcon aria-hidden="true" className="size-4 shrink-0" />
              Nouveau rappel
            </label>
            <Input
              id="new-reminder-title"
              aria-label="Nouveau rappel"
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Que faut-il prévoir ?"
              value={draft.title}
            />
          </div>
          <div className="quick-reminder-type flex min-w-40 flex-col gap-1">
            <label
              className="text-xs font-medium"
              htmlFor="quick-reminder-type"
            >
              Type de rappel
            </label>
            <SearchableSelect
              id="quick-reminder-type"
              label="Type du nouveau rappel"
              placeholder="Choisir un type…"
              options={activeTypes.map((type) => ({
                value: type.id,
                label: type.name,
              }))}
              value={draft.reminderTypeId}
              onValueChange={(reminderTypeId) =>
                setDraft((current) => ({ ...current, reminderTypeId }))
              }
              disabled={saving}
            />
          </div>
          <div className="quick-reminder-date flex w-40 flex-col gap-1">
            <label
              className="text-xs font-medium"
              htmlFor="quick-reminder-date"
            >
              Date du rappel
            </label>
            <DatePicker
              id="quick-reminder-date"
              aria-label="Date du nouveau rappel"
              value={draft.dueDate}
              onChange={(value) =>
                setDraft((current) => ({ ...current, dueDate: value }))
              }
              disabled={saving}
            />
          </div>
          <Button
            className="quick-reminder-details justify-between sm:justify-center"
            onClick={() => setShowDetails((current) => !current)}
            type="button"
            variant="ghost"
          >
            Détails
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                showDetails && "rotate-180",
              )}
            />
          </Button>
          <Button
            className="quick-reminder-submit"
            disabled={saving || !draft.title.trim()}
            type="submit"
          >
            <PlusIcon className="size-4" />
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
                placeholder="Une instruction courte pour l'équipe…"
                value={draft.description}
              />
            </div>
          </div>
        )}
      </form>

      <section className="space-y-4">
        {patientRemindersModel.error && !auxiliaryView && (
          <ErrorState
            message={patientRemindersModel.error}
            onRetry={() => void patientRemindersModel.refresh()}
          />
        )}
        <div className="reminders-filter-bar flex flex-wrap items-center gap-x-3 gap-y-2">
          <div
            className="reminder-segments"
            data-tabs-style="segmented"
            role="group"
            aria-label="Origine des rappels"
          >
            {(
              [
                ["all", "Tous"],
                ["manual", "Manuels"],
                ["medical", "Médicaux"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="reminder-segment"
                aria-pressed={sourceFilter === value}
                onClick={() => {
                  setSourceFilter(value);
                  setAuxiliaryView(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Tabs
            value={auxiliaryView ?? activeView}
            onValueChange={(value) => {
              if (value === "calls") {
                setAuxiliaryView(value);
                setSourceFilter("medical");
              } else {
                setAuxiliaryView(null);
                setActiveView(value as ReminderView);
              }
            }}
          >
            <TabsList
              aria-label="Vues des rappels"
              data-tabs-inline=""
              tabsStyle="segmented"
            >
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                  <span className="tabular-nums">{tab.count}</span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="calls">Rappels du jour</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            className="h-8 t-13"
            onClick={() => setAuxiliaryView("types")}
            type="button"
            variant="outline"
          >
            Gérer les types
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Périmètre des rappels"
              className="w-32"
              onChange={(event) => setScope(event.target.value as Scope)}
              value={scope}
            >
              <NativeSelectOption value="mine">Mes rappels</NativeSelectOption>
              <NativeSelectOption value="team">
                Toute l'équipe
              </NativeSelectOption>
            </NativeSelect>
            <ListSearch
              className="w-full lg:w-44"
              label="Rechercher dans les rappels"
              placeholder="Rechercher…"
              value={query}
              onValueChange={setQuery}
            />
          </div>
        </div>

        {auxiliaryView ? (
          <PatientRemindersContent
            key={auxiliaryView}
            model={patientRemindersModel}
            view={auxiliaryView}
            includeManualTypes={auxiliaryView === "types"}
            embedded
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            onClearQuery={() => setQuery("")}
            onCompleted={() => setActiveView("completed")}
            onMedical={openMedicalDraft}
            onNewReminder={() => document.getElementById("new-reminder-title")?.focus()}
            onUpcoming={() => setActiveView("upcoming")}
            query={query}
            quiet={quiet}
            view={activeView}
          />
        ) : (
          <div
            className="clinical-surface divide-y divide-border/70 overflow-hidden"
            ref={listRef}
          >
            {groupReminders(
              visibleItems.filter((item) => item.kind !== "medical"),
              (item) => item.date,
              new Date(),
            ).map((group) => (
              <section
                aria-label={`${group.label} : ${group.items.length}`}
                className="reminder-group divide-y divide-border/70"
                data-bucket={group.bucket}
                key={group.bucket}
              >
                {activeView !== "completed" && (
                  <h2 className="reminder-group-head">
                    {group.label}
                    <span className="tabular-nums">{group.items.length}</span>
                  </h2>
                )}
                {group.items.map((item) =>
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
                      onSelect={() => toggleSelected(item.task.id)}
                      selected={selectedIds.has(item.task.id)}
                      selecting={selectedIds.size > 0}
                      patients={patients}
                      reminderTypes={patientRemindersModel.types}
                      pendingDelete={pendingDeleteId === item.task.id}
                      saving={saving}
                      view={activeView}
                    />
                  ) : item.kind === "automatic" ? (
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
                  ) : null,
                )}
              </section>
            ))}
            {visibleItems.some((item) => item.kind === "medical") &&
              activeView !== "completed" && (
                <h2 className="reminder-group-head">
                  Rappels médicaux
                  <span className="tabular-nums">
                    {
                      visibleItems.filter((item) => item.kind === "medical")
                        .length
                    }
                  </span>
                </h2>
              )}
            {visibleItems.some((item) => item.kind === "medical") && (
              <PatientRemindersContent
                key={activeView}
                model={{
                  ...patientRemindersModel,
                  reminders: visibleItems
                    .filter(
                      (item): item is MedicalReminderItem =>
                        item.kind === "medical",
                    )
                    .map((item) => item.reminder),
                }}
                view={activeView === "completed" ? "completed" : "active"}
                embedded
              />
            )}
          </div>
        )}
      </section>
      {selectedTasks.length > 0 && !auxiliaryView && (
        <div
          aria-label="Actions sur la sélection"
          className="reminder-bulk-bar"
          role="toolbar"
        >
          <span className="tabular-nums">
            {selectedTasks.length} sélectionné
            {selectedTasks.length > 1 ? "s" : ""}
          </span>
          <Button
            disabled={
              saving || selectedTasks.every((task) => task.status === "done")
            }
            onClick={() => void completeSelected()}
            size="sm"
            type="button"
          >
            <CheckIcon className="size-4" />
            Marquer terminés
          </Button>
          <Button
            disabled={
              saving || selectedTasks.every((task) => task.status === "done")
            }
            onClick={() => void postponeSelected()}
            size="sm"
            type="button"
            variant="ghost"
          >
            <CalendarDaysIcon className="size-4" />
            Reporter à demain
          </Button>
          <Button
            aria-label="Annuler la sélection"
            onClick={() => setSelectedIds(new Set())}
            size="sm"
            type="button"
            variant="ghost"
          >
            Annuler <Kbd>Échap</Kbd>
          </Button>
        </div>
      )}
      {medicalDraft && (
        <MedicalReminderDialog
          editable
          onClose={() => setMedicalDraft(null)}
          onConfirm={async (proposal) => {
            await patientRemindersService.createFromProposal(
              proposal,
              currentUser?.id ?? "",
            );
            announcePatientRemindersChanged();
            await patientRemindersModel.refresh();
            setSourceFilter("medical");
            setAuxiliaryView(null);
            setActiveView(
              proposal.echeance > localToday() ? "upcoming" : "today",
            );
            toast.success("Rappel médical créé");
          }}
          proposal={medicalDraft}
          types={patientRemindersModel.types}
        />
      )}
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
  onSelect,
  selected,
  selecting,
  patients,
  reminderTypes,
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
  onSelect: () => void;
  selected: boolean;
  /** Some row is selected: every box stays visible. */
  selecting: boolean;
  patients: Patient[];
  reminderTypes: ReminderType[];
  pendingDelete: boolean;
  saving: boolean;
  view: ReminderView;
}) {
  if (editing) {
    return (
      <div className="bg-muted/15 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Type de rappel">
            <SearchableSelect
              label="Type du rappel modifié"
              placeholder="Sans type"
              options={reminderTypesForSelect(
                reminderTypes,
                draft.reminderTypeId,
              ).map((type) => ({ value: type.id, label: type.name }))}
              value={draft.reminderTypeId}
              onValueChange={(reminderTypeId) =>
                onDraftChange({ ...draft, reminderTypeId })
              }
            />
          </Field>
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
            <DatePicker
              onChange={(value) => onDraftChange({ ...draft, dueDate: value })}
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
            <CheckIcon className="size-4" />
            Enregistrer
          </Button>
        </div>
      </div>
    );
  }

  const completed = item.task.status === "done";
  return (
    <article
      aria-selected={selected}
      className={cn(
        "group flex flex-col gap-3 p-3 transition-shadow sm:flex-row sm:items-center",
        focused && "relative z-10 ring-2 ring-sky-500/40 ring-inset",
      )}
      data-list-row=""
      data-row-id={item.task.id}
      data-selected={selected ? "" : undefined}
      data-task-id={item.task.id}
    >
      <label
        className="reminder-select"
        data-visible={selecting || selected ? "" : undefined}
      >
        <input
          aria-label={`Sélectionner ${formatDisplayText(item.task.title)} (X)`}
          checked={selected}
          onChange={onSelect}
          type="checkbox"
        />
      </label>
      <button
        aria-label={completed ? "Rouvrir le rappel" : "Marquer comme terminé"}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          completed
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600",
        )}
        onClick={onToggle}
        type="button"
      >
        {completed ? (
          <CheckCircleIcon className="size-5" />
        ) : (
          <CheckIcon className="size-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-semibold text-sm",
              completed && "text-muted-foreground line-through",
            )}
          >
            {formatDisplayText(item.task.title)}
          </h3>
          {item.task.priority === "high" && (
            <Badge
              className="border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300"
              variant="outline"
            >
              Prioritaire
            </Badge>
          )}
          <Badge variant="outline">
            {reminderTypes.find((type) => type.id === item.task.reminderTypeId)
              ?.name || "Manuel"}
          </Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3.5" />
            {dateLabel(item.date, view, Boolean(item.task.startTime))}
          </span>
          {item.patient && (
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="size-3.5" />
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
            <CalendarDaysIcon className="size-4" />
            Demain
          </Button>
        )}
        <Button onClick={onEdit} size="sm" type="button" variant="ghost">
          <PencilIcon className="size-4" />
          Modifier
        </Button>
        <Button
          className={cn(pendingDelete && "bg-destructive/10 text-destructive")}
          onClick={onDelete}
          size="sm"
          type="button"
          variant="ghost"
        >
          <TrashIcon className="size-4" />
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
        <BellIcon className="size-4" />
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
            <ClockIcon className="size-3.5" />
            {dateLabel(item.date, view)}
          </span>
          {item.patient && (
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="size-3.5" />
              {item.patient.name} · {item.patient.species}
            </span>
          )}
          {item.appointment?.reason && <span>{item.appointment.reason}</span>}
        </div>
      </div>
      {!completed && (
        <div className="flex flex-wrap gap-1">
          <Button onClick={onSnooze} size="sm" type="button" variant="ghost">
            <ArrowUturnLeftIcon className="size-4" />
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

/**
 * « Rien à traiter » : composé comme la journée vide du Flux, dans le langage des bandes de la page. Le prochain rappel
 * ouvert (sur deux colonnes), où en sont les rappels (sur deux), et les deux gestes qui existent déjà sur la page
 * (écrire un nouveau rappel, créer un rappel médical). Une recherche sans résultat garde une ligne et de quoi l'effacer.
 */
function EmptyState({
  query,
  view,
  quiet,
  onUpcoming,
  onCompleted,
  onNewReminder,
  onMedical,
  onClearQuery,
}: {
  query: string;
  view: ReminderView;
  quiet: ReminderQuiet<{ kind: "manual" | "medical" | "automatic"; date: Date | null; completed: boolean; title: string; patientName?: string; item: ReminderItem }>;
  onUpcoming: () => void;
  onCompleted: () => void;
  onNewReminder: () => void;
  onMedical: () => void;
  onClearQuery: () => void;
}) {
  if (query) {
    return (
      <Shell className="reminders-quiet">
        <ShellHeader
          aside={
            <Button onClick={onClearQuery} size="sm" type="button" variant="outline">
              Effacer la recherche
            </Button>
          }
          as="h2"
          icon={MagnifyingGlassIcon}
          subtitle={`Aucun rappel ne correspond à « ${query} ».`}
          title="Aucun résultat"
        />
      </Shell>
    );
  }
  const copy =
    view === "today"
      ? "Tout est à jour pour aujourd’hui."
      : view === "upcoming"
        ? "Aucun rappel à venir."
        : "Aucun rappel terminé pour le moment.";
  const next = quiet.next;
  return (
    <Shell className="reminders-quiet">
      <ShellHeader as="h2" icon={view === "completed" ? CheckCircleIcon : CheckBadgeIcon} subtitle={copy} title="Rien à traiter" />
      <div className="reminders-quiet-grid">
        <Panel className="reminders-quiet-cell reminders-quiet-wide">
          <h3 className="reminders-quiet-label">Prochain rappel</h3>
          {next ? (
            <>
              <p className="reminders-quiet-when">{dateLabel(next.date, "upcoming", itemHasTime(next.item))}</p>
              <p className="reminders-quiet-what">
                <strong>{next.title}</strong>
                {next.patientName ? <span> · {next.patientName}</span> : null}
              </p>
              <p className="reminders-quiet-meta">{next.kind === "medical" ? "Médical" : next.kind === "manual" ? "Manuel" : "Automatique"}</p>
            </>
          ) : (
            <p className="reminders-quiet-when">Aucun rappel à venir</p>
          )}
          {view !== "upcoming" && next ? (
            <Button className="reminders-quiet-link" onClick={onUpcoming} size="sm" type="button" variant="ghost">
              Voir les rappels à venir
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </Button>
          ) : view !== "completed" ? (
            <Button className="reminders-quiet-link" onClick={onCompleted} size="sm" type="button" variant="ghost">
              Voir les rappels terminés
              <ArrowRightIcon aria-hidden="true" className="size-3.5" />
            </Button>
          ) : null}
        </Panel>
        <Panel className="reminders-quiet-cell reminders-quiet-wide">
          <h3 className="reminders-quiet-label">Rappels ouverts et terminés</h3>
          <dl className="reminders-quiet-facts">
            <div>
              <dt>Manuels</dt>
              <dd>{formatNumber(quiet.openManual)}</dd>
            </div>
            <div>
              <dt>Médicaux</dt>
              <dd>{formatNumber(quiet.openMedical)}</dd>
            </div>
            <div>
              <dt>D’ici 7 jours</dt>
              <dd>{formatNumber(quiet.week)}</dd>
            </div>
            <div>
              <dt>Terminés</dt>
              <dd>{formatNumber(quiet.completed)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="reminders-quiet-cell">
          <h3 className="reminders-quiet-label">Actions</h3>
          <Button onClick={onNewReminder} size="sm" type="button">
            <PlusIcon aria-hidden="true" className="size-4" />
            Nouveau rappel
          </Button>
          <Button onClick={onMedical} size="sm" type="button" variant="outline">
            <PlusIcon aria-hidden="true" className="size-4" />
            Rappel médical
          </Button>
        </Panel>
      </div>
    </Shell>
  );
}

export default Tasks;
