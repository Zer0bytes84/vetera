"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface WaitingRoomAppointment {
  id: string | number;
  owner: string;
  patient: string;
  patientId?: string;
  species: string;
  status: string;
  time: string;
  type: string;
}

interface WaitingRoomWidgetProps {
  appointments: WaitingRoomAppointment[];
  className?: string;
  onNavigateToPatient?: (patientId: string) => void;
  onOpenAgenda?: () => void;
}

type WaitingFilter = "active" | "all" | "completed";

const filters: Array<{ label: string; value: WaitingFilter }> = [
  { label: "À suivre", value: "active" },
  { label: "Tous", value: "all" },
  { label: "Terminés", value: "completed" },
];

const statusCopy: Record<string, { label: string; tone: string; dot: string }> =
  {
    scheduled: {
      label: "Planifié",
      tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      dot: "bg-sky-500",
    },
    waiting: {
      label: "En attente",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    in_progress: {
      label: "En cours",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    completed: {
      label: "Terminé",
      tone: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
      dot: "bg-zinc-400",
    },
  };

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!(Number.isFinite(hours) && Number.isFinite(minutes))) {
    return Number.POSITIVE_INFINITY;
  }
  return hours * 60 + minutes;
}

export function WaitingRoomWidget({
  appointments,
  onNavigateToPatient,
  onOpenAgenda,
  className,
}: WaitingRoomWidgetProps) {
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<WaitingFilter>("active");
  const sorted = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
      ),
    [appointments]
  );
  const activeAppointments = useMemo(
    () =>
      sorted.filter((appointment) =>
        ["waiting", "scheduled", "in_progress"].includes(appointment.status)
      ),
    [sorted]
  );
  const completedCount = sorted.filter(
    (appointment) => appointment.status === "completed"
  ).length;
  const inProgressCount = sorted.filter(
    (appointment) => appointment.status === "in_progress"
  ).length;
  const nextAppointment =
    activeAppointments.find(
      (appointment) => appointment.status === "in_progress"
    ) ?? activeAppointments[0];
  const filteredAppointments = useMemo(() => {
    if (filter === "active") {
      return activeAppointments;
    }
    if (filter === "completed") {
      return sorted.filter((appointment) => appointment.status === "completed");
    }
    return sorted;
  }, [activeAppointments, filter, sorted]);

  return (
    <section
      aria-labelledby="waiting-room-title"
      className={cn(
        "flex min-h-[400px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
            <Clock3 className="size-3.5" />
          </span>
          <h2
            className="truncate font-heading font-semibold text-sm text-zinc-800 tracking-[-0.02em] dark:text-zinc-200"
            id="waiting-room-title"
          >
            Déroulé de la journée
          </h2>
        </div>
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-medium text-[11px] text-zinc-500 outline-none transition-colors hover:bg-white hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={onOpenAgenda}
          type="button"
        >
          Agenda
          <ArrowRight className="size-3" />
        </button>
      </div>

      <div className="flex flex-1 flex-col rounded-[12px] border border-zinc-200/60 bg-white p-4 shadow-xs sm:p-5 dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="grid grid-cols-3 divide-x divide-zinc-100 border-zinc-100 border-b pb-4 dark:divide-zinc-800 dark:border-zinc-800">
          <SummaryMetric
            icon={CalendarDays}
            label="Rendez-vous"
            value={sorted.length.toString()}
          />
          <SummaryMetric
            className="px-4"
            icon={PlayCircle}
            label="En cours"
            tone="text-emerald-600 dark:text-emerald-400"
            value={inProgressCount.toString()}
          />
          <SummaryMetric
            className="pl-4"
            icon={Clock3}
            label="Prochain"
            tone="text-sky-600 dark:text-sky-400"
            value={nextAppointment?.time ?? "—"}
          />
        </div>

        <fieldset className="mt-4 flex w-fit rounded-lg border-0 bg-zinc-100 p-1 dark:bg-zinc-900">
          <legend className="sr-only">Filtrer les rendez-vous</legend>
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className={cn(
                "relative min-h-8 rounded-md px-3 font-medium text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                filter === item.value
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {filter === item.value && (
                <motion.span
                  className="absolute inset-0 rounded-md bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10"
                  layoutId="waiting-room-filter"
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

        {filteredAppointments.length === 0 ? (
          <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-200 border-dashed bg-zinc-50/70 px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <CheckCircle2 className="mb-2 size-6 text-zinc-400" />
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Rien dans cette vue
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Le planning se mettra à jour avec les rendez-vous du jour.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex-1 space-y-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {filteredAppointments.slice(0, 5).map((appointment, index) => (
                <AppointmentRow
                  appointment={appointment}
                  index={index}
                  isNext={appointment.id === nextAppointment?.id}
                  key={appointment.id}
                  onNavigateToPatient={onNavigateToPatient}
                  reduceMotion={Boolean(reduceMotion)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-3 text-[11px] dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">
              {completedCount} terminé{completedCount > 1 ? "s" : ""}{" "}
              aujourd’hui
            </span>
            {filteredAppointments.length > 5 && (
              <button
                className="font-medium text-zinc-600 outline-none hover:text-zinc-950 focus-visible:underline dark:text-zinc-300 dark:hover:text-white"
                onClick={onOpenAgenda}
                type="button"
              >
                +{filteredAppointments.length - 5} autres
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryMetric({
  className,
  icon: Icon,
  label,
  tone,
  value,
}: {
  className?: string;
  icon: typeof CalendarDays;
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className={cn("min-w-0 pr-4", className)}>
      <span className="flex min-h-4 items-center gap-1.5 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={cn(
          "mt-1 block truncate font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100",
          tone
        )}
      >
        {value}
      </span>
    </div>
  );
}

function AppointmentRow({
  appointment,
  index,
  isNext,
  onNavigateToPatient,
  reduceMotion,
}: {
  appointment: WaitingRoomAppointment;
  index: number;
  isNext: boolean;
  onNavigateToPatient?: (patientId: string) => void;
  reduceMotion: boolean;
}) {
  const status = statusCopy[appointment.status] ?? statusCopy.scheduled;
  const canOpen = Boolean(onNavigateToPatient && appointment.patientId);

  return (
    <motion.button
      className={cn(
        "group grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        isNext
          ? "border-sky-200 bg-sky-50/70 shadow-xs dark:border-sky-900/70 dark:bg-sky-950/20"
          : "border-transparent hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/55",
        canOpen ? "cursor-pointer" : "cursor-default"
      )}
      disabled={!canOpen}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
      layout={!reduceMotion}
      onClick={() =>
        appointment.patientId && onNavigateToPatient?.(appointment.patientId)
      }
      transition={{
        duration: 0.2,
        delay: reduceMotion ? 0 : index * 0.025,
      }}
      type="button"
      whileTap={canOpen && !reduceMotion ? { scale: 0.992 } : undefined}
    >
      <div className="flex h-10 items-center justify-center rounded-lg bg-white font-heading font-semibold text-sm text-zinc-800 tabular-nums ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-white/10">
        {appointment.time}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {appointment.patient}
          </span>
          {isNext && (
            <span className="hidden shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 font-semibold text-[9px] text-sky-700 uppercase tracking-[0.08em] sm:inline dark:text-sky-300">
              Prochain
            </span>
          )}
        </div>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          <UserRound className="size-3 shrink-0" />
          <span className="truncate">{appointment.owner}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{appointment.type}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2 py-1 font-medium text-[10px] sm:inline-flex",
            status.tone
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
        {canOpen && (
          <ChevronRight className="size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
        )}
      </div>
    </motion.button>
  );
}
