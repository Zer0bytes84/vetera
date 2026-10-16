import { formatDisplayText, formatNumber } from "@/utils/display-format";
import {
  ArrowUpRight,
  CalendarBlank,
  ClipboardList,
  Notebook,
} from "@/lib/icons";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Appointment, Task } from "@/types/db";
import { cn } from "@/lib/utils";
import { normalizeDate } from "./patients-shared";

interface PatientContextWidgetsProps {
  appointments: Appointment[];
  appointmentsLoading: boolean;
  appointmentsError: boolean;
  lastAppointment: Appointment | null;
  lastVisit?: string;
  nextAppointment: Appointment | null;
  now: number;
  onOpenHistory: () => void;
  onOpenLastConsultation: () => void;
  onOpenTask: (taskId: string) => void;
  onRetryTasks: () => void;
  patientName: string;
  tasks: Task[];
  tasksLoading: boolean;
  tasksError: boolean;
}

function shortDate(value: string) {
  return normalizeDate(value)?.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PatientContextWidgets({
  appointments,
  appointmentsLoading,
  appointmentsError,
  lastAppointment,
  lastVisit,
  nextAppointment,
  now,
  onOpenHistory,
  onOpenLastConsultation,
  onOpenTask,
  onRetryTasks,
  patientName,
  tasks,
  tasksLoading,
  tasksError,
}: PatientContextWidgetsProps) {
  const today = new Date(now).toDateString();
  const visitsToday = appointments.filter((appointment) => {
    const date = normalizeDate(appointment.startTime);
    return (
      date?.toDateString() === today &&
      !["cancelled", "no_show"].includes(appointment.status)
    );
  });
  const firstVisit = [...visitsToday].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )[0];
  const visitTime = normalizeDate(firstVisit?.startTime)?.toLocaleTimeString(
    "fr-FR",
    { hour: "2-digit", minute: "2-digit" }
  );
  const visitDetail = appointmentsLoading
    ? "Chargement des rendez-vous"
    : appointmentsError
      ? "Rendez-vous indisponibles"
      : firstVisit
        ? `${visitTime} · ${firstVisit.type}`
        : nextAppointment
          ? `Prochain : ${shortDate(nextAppointment.startTime) || "à confirmer"}`
          : "Aucun rendez-vous prévu aujourd’hui";
  const taskDetail = tasksLoading
    ? "Chargement des actions"
    : tasksError
      ? "Actions indisponibles"
      : formatDisplayText(
          tasks[0]?.title || "Aucune action en attente pour ce patient"
        );
  const displayedLastVisit = lastAppointment?.startTime || lastVisit;
  const lastSummary = (
    lastAppointment?.reason ||
    lastAppointment?.title ||
    ""
  ).trim();
  const lastType = lastAppointment?.type || "";
  const lastDescription = lastSummary
    .toLocaleLowerCase("fr")
    .includes(lastType.toLocaleLowerCase("fr"))
    ? lastSummary
    : [lastType, lastSummary].filter(Boolean).join(" · ");
  const lastVisitDetail = appointmentsLoading
    ? "Chargement de l’historique"
    : appointmentsError
      ? "Historique indisponible"
      : lastAppointment
        ? lastDescription
        : displayedLastVisit
          ? "Voir le parcours de soins"
          : "Aucune consultation terminée";

  return (
    <section
      className="patient-context-widgets"
      aria-label={`Repères du dossier de ${patientName}`}
    >
      <button
        type="button"
        className="patient-context-card group"
        onClick={onOpenHistory}
        aria-label={`Voir les rendez-vous de ${patientName}`}
        aria-busy={appointmentsLoading}
      >
        <span className="patient-context-heading flex items-center gap-2">
          <span className="size-7 rounded-md flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-200/60 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/40 shrink-0 shadow-xs">
            <CalendarBlank size={15} weight="duotone" aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">RDV aujourd’hui</span>
          <ArrowUpRight size={14} className="ml-auto text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "patient-context-value text-2xl font-bold tracking-tight text-foreground",
            appointmentsError ? "patient-context-date" : "",
            visitsToday.length > 0 ? "text-sky-600 dark:text-sky-400" : ""
          )}
        >
          {appointmentsLoading
            ? "…"
            : appointmentsError
              ? "N/D"
              : formatNumber(visitsToday.length)}
        </span>
        <span className="patient-context-detail text-xs text-muted-foreground truncate" title={visitDetail}>
          {visitDetail}
        </span>
      </button>

      <Popover>
        <PopoverTrigger
          className="patient-context-card group"
          aria-label={`Voir les actions à suivre pour ${patientName}`}
          aria-busy={tasksLoading}
        >
          <span className="patient-context-heading flex items-center gap-2">
            <span className="size-7 rounded-md flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/40 shrink-0 shadow-xs">
              <ClipboardList size={15} weight="duotone" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Actions à suivre</span>
            <ArrowUpRight size={14} className="ml-auto text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </span>
          <span
            className={cn(
              "patient-context-value text-2xl font-bold tracking-tight text-foreground",
              tasksError ? "patient-context-date" : "",
              tasks.length > 0 ? "text-amber-600 dark:text-amber-400" : ""
            )}
          >
            {tasksLoading
              ? "…"
              : tasksError
                ? "N/D"
                : formatNumber(tasks.length)}
          </span>
          <span className="patient-context-detail text-xs text-muted-foreground truncate" title={taskDetail}>
            {taskDetail}
          </span>
        </PopoverTrigger>
        <PopoverContent className="patient-context-popover" align="start">
          <PopoverTitle>Actions pour {patientName}</PopoverTitle>
          <PopoverDescription>
            Tâches et rappels rattachés à ce dossier.
          </PopoverDescription>
          {tasksLoading ? (
            <p className="patient-context-empty" role="status">
              Chargement des actions…
            </p>
          ) : tasksError ? (
            <div className="patient-context-empty" role="status">
              <p>Les actions n’ont pas pu être chargées.</p>
              <button type="button" onClick={onRetryTasks}>
                Réessayer
              </button>
            </div>
          ) : tasks.length ? (
            <ul className="patient-context-task-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(task.id)}
                    aria-label={`Ouvrir l’action : ${formatDisplayText(task.title)}`}
                  >
                    <span>
                      <strong>{formatDisplayText(task.title)}</strong>
                      <span className="patient-context-task-meta">
                        {task.status === "in_progress" ? "En cours" : "À faire"}
                        {task.dueDate &&
                          ` · ${shortDate(task.dueDate) || "Date à confirmer"}`}
                        {task.priority === "high" && " · Prioritaire"}
                      </span>
                    </span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="patient-context-empty">
              Aucune action en attente pour ce patient.
            </p>
          )}
        </PopoverContent>
      </Popover>

      <button
        type="button"
        className="patient-context-card group"
        onClick={onOpenLastConsultation}
        aria-label={
          lastAppointment
            ? `Ouvrir la dernière consultation de ${patientName}`
            : `Voir le parcours de soins de ${patientName}`
        }
        aria-busy={appointmentsLoading}
      >
        <span className="patient-context-heading flex items-center gap-2">
          <span className="size-7 rounded-md flex items-center justify-center bg-violet-50 text-violet-600 border border-violet-200/60 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800/40 shrink-0 shadow-xs">
            <Notebook size={15} weight="duotone" aria-hidden="true" />
          </span>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Dernière consultation</span>
          <ArrowUpRight size={14} className="ml-auto text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </span>
        <span className="patient-context-value patient-context-date text-xl font-bold tracking-tight text-foreground">
          {appointmentsLoading
            ? "…"
            : appointmentsError
              ? "N/D"
              : displayedLastVisit
                ? shortDate(displayedLastVisit) || "Date à confirmer"
                : "Pas encore"}
        </span>
        <span className="patient-context-detail text-xs text-muted-foreground truncate" title={lastVisitDetail}>
          {lastVisitDetail}
        </span>
      </button>
    </section>
  );
}
