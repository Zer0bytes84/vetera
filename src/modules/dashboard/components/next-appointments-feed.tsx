"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { View } from "@/types";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MonitorSmartphone,
  MoreVertical,
  Play,
  RefreshCcw,
  Stethoscope,
  Syringe,
  Timer,
  User,
} from "lucide-react";

export interface TodayAppointment {
  id: string | number;
  patient: string;
  owner: string;
  species: string;
  type: string;
  time: string;
  status: string;
}

interface NextAppointmentsFeedProps {
  appointments: TodayAppointment[];
  onNavigate?: (view: View) => void;
}

// ───────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────

function getTypeIcon(type: string) {
  const t = (type || "").toLowerCase();
  if (/(tele|télé|visio|virtuel|distance)/.test(t)) return MonitorSmartphone;
  if (/(vaccin|injection|piqûre|piqure)/.test(t)) return Syringe;
  if (/(suivi|contrôle|controle|follow|recheck|post)/.test(t)) return RefreshCcw;
  return Stethoscope;
}

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐶",
  chat: "🐱",
  lapin: "🐰",
  oiseau: "🦜",
  cheval: "🐴",
  rongeur: "🐹",
  hamster: "🐹",
  reptile: "🦎",
};

function emojiFor(species: string) {
  const key = (species || "").toLowerCase().trim();
  return SPECIES_EMOJI[key] || "🐾";
}

const STATUS_COPY: Record<
  string,
  { label: string; tone: string; dot: string }
> = {
  scheduled: {
    label: "Planifié",
    tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "En cours",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Terminé",
    tone: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
  },
  cancelled: {
    label: "Annulé",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
  no_show: {
    label: "Absent",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
};

function parseHHMM(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  if (!m) return Number.POSITIVE_INFINITY;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// ───────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────

type Filter = "all" | "upcoming" | "in_progress" | "tele";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "upcoming", label: "À venir" },
  { id: "in_progress", label: "En cours" },
  { id: "tele", label: "Téléconsultation" },
];

export function NextAppointmentsFeed({
  appointments,
  onNavigate,
}: NextAppointmentsFeedProps) {
  const [filter, setFilter] = React.useState<Filter>("all");

  const sorted = React.useMemo(
    () => [...appointments].sort((a, b) => parseHHMM(a.time) - parseHHMM(b.time)),
    [appointments]
  );

  const stats = React.useMemo(() => {
    return {
      total: sorted.length,
      inProgress: sorted.filter((a) => a.status === "in_progress").length,
      upcoming: sorted.filter((a) => a.status === "scheduled").length,
      completed: sorted.filter((a) => a.status === "completed").length,
    };
  }, [sorted]);

  const completionRatio = stats.total > 0 ? stats.completed / stats.total : 0;

  // "Up next" = first appointment that is in_progress or scheduled
  const upNext = React.useMemo(
    () =>
      sorted.find(
        (a) => a.status === "in_progress" || a.status === "scheduled"
      ),
    [sorted]
  );

  const filtered = React.useMemo(() => {
    const base = sorted.filter((a) => a.id !== upNext?.id);
    switch (filter) {
      case "upcoming":
        return base.filter((a) => a.status === "scheduled");
      case "in_progress":
        return base.filter((a) => a.status === "in_progress");
      case "tele":
        return base.filter((a) => /tele|télé|visio/i.test(a.type));
      default:
        return base;
    }
  }, [sorted, filter, upNext]);

  const goAgenda = React.useCallback(() => {
    onNavigate?.("agenda");
  }, [onNavigate]);

  return (
    <Card className="dashboard-luxe-card group relative flex flex-col overflow-hidden shadow-none !border-zinc-200 dark:!border-white/10">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
        <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
      </div>

      <div className="relative z-10 flex flex-col gap-5 p-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/10 ring-1 ring-blue-500/15 dark:from-blue-400/10 dark:to-indigo-400/10 dark:ring-blue-400/15">
                <CalendarDays
                  className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300"
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400 dark:from-blue-400 dark:to-indigo-300 font-sans">
                Programme du Jour
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-display font-semibold tracking-tight text-foreground">
              Salle d'Attente &amp; Rendez-vous
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total > 0
                ? `${stats.total} consultation${stats.total > 1 ? "s" : ""} prévue${stats.total > 1 ? "s" : ""} • ${stats.completed} terminée${stats.completed > 1 ? "s" : ""}`
                : "Aucune consultation prévue aujourd'hui"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                  filter === f.id
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 bg-white/60 text-muted-foreground hover:border-zinc-300 hover:text-foreground dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
                )}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={goAgenda}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.97] dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              Voir tout
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Quick Stats Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            icon={<CalendarDays className="h-4 w-4" strokeWidth={2} />}
            label="Aujourd'hui"
            value={stats.total}
            tone="blue"
          />
          <StatPill
            icon={<Play className="h-3.5 w-3.5" strokeWidth={2.5} />}
            label="En consultation"
            value={stats.inProgress}
            tone="emerald"
            live={stats.inProgress > 0}
          />
          <StatPill
            icon={<Timer className="h-4 w-4" strokeWidth={2} />}
            label="À venir"
            value={stats.upcoming}
            tone="violet"
          />
          <StatPill
            icon={<CheckCircle2 className="h-4 w-4" strokeWidth={2} />}
            label="Terminés"
            value={stats.completed}
            tone="zinc"
            progress={completionRatio}
          />
        </div>

        {/* ── Empty State ─────────────────────────────────────────── */}
        {stats.total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200/80 bg-white/40 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <span className="text-4xl">🌿</span>
            <p className="text-sm italic text-foreground">
              Votre agenda est libre aujourd'hui
            </p>
            <p className="text-xs text-muted-foreground">
              Profitez-en pour souffler ou préparer la semaine
            </p>
            <button
              type="button"
              onClick={goAgenda}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Ouvrir l'agenda
              <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* ── Hero: Up Next ─────────────────────────────────── */}
            {upNext && (
              <div className="lg:col-span-5">
                <HeroAppointment appointment={upNext} onStart={goAgenda} />
              </div>
            )}

            {/* ── Grid: Other appointments ───────────────────── */}
            <div className={cn(upNext ? "lg:col-span-7" : "lg:col-span-12")}>
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200/80 bg-white/40 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-foreground">
                    Aucun rendez-vous dans cette catégorie
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="mt-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Réinitialiser le filtre
                  </button>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.slice(0, 6).map((appt) => (
                    <li key={appt.id}>
                      <AppointmentTile
                        appointment={appt}
                        onStart={goAgenda}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "emerald" | "violet" | "zinc";
  live?: boolean;
  progress?: number;
}

const STAT_TONES: Record<StatPillProps["tone"], { ring: string; icon: string; ring2: string }> = {
  blue: {
    ring: "from-blue-500/10 to-blue-500/[0.02] ring-blue-500/15 dark:from-blue-400/10 dark:ring-blue-400/15",
    icon: "text-blue-600 dark:text-blue-300",
    ring2: "bg-blue-500",
  },
  emerald: {
    ring: "from-emerald-500/10 to-emerald-500/[0.02] ring-emerald-500/15 dark:from-emerald-400/10 dark:ring-emerald-400/15",
    icon: "text-emerald-600 dark:text-emerald-300",
    ring2: "bg-emerald-500",
  },
  violet: {
    ring: "from-violet-500/10 to-violet-500/[0.02] ring-violet-500/15 dark:from-violet-400/10 dark:ring-violet-400/15",
    icon: "text-violet-600 dark:text-violet-300",
    ring2: "bg-violet-500",
  },
  zinc: {
    ring: "from-zinc-500/10 to-zinc-500/[0.02] ring-zinc-500/15 dark:from-zinc-400/10 dark:ring-zinc-400/15",
    icon: "text-zinc-600 dark:text-zinc-300",
    ring2: "bg-zinc-500",
  },
};

function StatPill({ icon, label, value, tone, live, progress }: StatPillProps) {
  const t = STAT_TONES[tone];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 p-3.5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ring-1",
          t.ring
        )}
      />
      <div className="relative flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-zinc-900",
            t.icon
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-xl font-display font-semibold tabular-nums tracking-tight text-foreground leading-none">
              {value}
            </span>
            {live && (
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
        </div>
      </div>
      {progress !== undefined && (
        <div className="relative mt-2.5 h-1 w-full overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
          <div
            className={cn("h-full rounded-full", t.ring2)}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface HeroAppointmentProps {
  appointment: TodayAppointment;
  onStart: () => void;
}

function HeroAppointment({ appointment, onStart }: HeroAppointmentProps) {
  const Icon = getTypeIcon(appointment.type);
  const status = STATUS_COPY[appointment.status] || STATUS_COPY.scheduled;
  const inProgress = appointment.status === "in_progress";
  const emoji = emojiFor(appointment.species);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-3xl p-5",
        "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white",
        "shadow-[0_10px_40px_-20px_rgba(0,0,0,0.4)]",
        "dark:from-zinc-900 dark:via-zinc-900 dark:to-black"
      )}
    >
      {/* Animated gradient orb */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-blue-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-500/30 blur-3xl" />

      {/* Top label */}
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/15">
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              inProgress ? "bg-emerald-400" : "bg-blue-400"
            )}
          >
            {inProgress && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
          </span>
          {inProgress ? "En consultation" : "Prochain RDV"}
        </span>
        <span className="font-mono text-xs text-white/60 tabular-nums">
          {appointment.time}
        </span>
      </div>

      {/* Patient hero */}
      <div className="relative mt-5 flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-2xl font-bold uppercase tracking-tight text-white shadow-lg">
          {appointment.patient.slice(0, 2)}
          <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow-md ring-2 ring-zinc-900 dark:ring-zinc-900">
            {emoji}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-xl font-semibold leading-tight tracking-tight text-white">
            {appointment.patient}
          </h4>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
            <User className="h-3 w-3" />
            <span className="truncate">{appointment.owner}</span>
          </p>
        </div>
      </div>

      {/* Type and metadata */}
      <div className="relative mt-4 flex items-center gap-2.5 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/90">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            Type de consultation
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">
            {appointment.type}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide",
            status.tone
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={onStart}
        className="group/start relative mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all duration-200 hover:bg-zinc-100 hover:shadow-xl active:scale-[0.98]"
      >
        <Play
          className="h-3.5 w-3.5 fill-current"
          strokeWidth={2.5}
        />
        {inProgress ? "Reprendre la consultation" : "Démarrer la consultation"}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover/start:translate-x-1"
          strokeWidth={2.5}
        />
      </button>
    </div>
  );
}

interface AppointmentTileProps {
  appointment: TodayAppointment;
  onStart: () => void;
}

function AppointmentTile({ appointment, onStart }: AppointmentTileProps) {
  const Icon = getTypeIcon(appointment.type);
  const status = STATUS_COPY[appointment.status] || STATUS_COPY.scheduled;
  const inProgress = appointment.status === "in_progress";
  const completed = appointment.status === "completed";
  const emoji = emojiFor(appointment.species);

  return (
    <div
      className={cn(
        "group/tile relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/70 p-3.5 backdrop-blur-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-zinc-300/80 hover:bg-white hover:shadow-md",
        "dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]",
        completed && "opacity-70",
        inProgress
          ? "border-emerald-500/30 dark:border-emerald-400/20"
          : "border-zinc-200/70"
      )}
    >
      {/* Left accent for in-progress */}
      {inProgress && (
        <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
      )}

      {/* Top row: time + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ring-1",
              inProgress
                ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/20"
                : "bg-zinc-100 text-zinc-600 ring-zinc-200/80 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <p className="font-mono text-sm font-bold text-foreground tabular-nums leading-none">
              {appointment.time}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide",
                status.tone
              )}
            >
              <span className={cn("h-1 w-1 rounded-full", status.dot)} />
              {status.label}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-zinc-100 hover:text-foreground group-hover/tile:opacity-100 dark:hover:bg-white/10"
                aria-label="Plus d'options"
              />
            }
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStart}>
              Voir le détail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStart}>
              Reprogrammer
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-600 focus:text-rose-600 dark:text-rose-400"
              onClick={onStart}
            >
              Annuler
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Patient name + species */}
      <div className="mt-3 flex items-start gap-2">
        <span className="text-lg leading-none">{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground leading-tight" title={appointment.patient}>
            {appointment.patient}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug" title={appointment.owner}>
            {appointment.owner}
          </p>
        </div>
      </div>

      {/* Type */}
      <p
        className="mt-2.5 text-[11px] font-medium italic text-muted-foreground leading-snug"
        title={appointment.type}
      >
        {appointment.type}
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={onStart}
        className={cn(
          "mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
          completed
            ? "border-zinc-200 bg-white text-muted-foreground hover:bg-zinc-50 dark:border-white/10 dark:bg-transparent"
            : inProgress
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              : "border-blue-500/30 bg-blue-500/5 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/30 dark:bg-blue-500/10"
        )}
      >
        {completed ? (
          <>
            <ClipboardList className="h-3 w-3" />
            Voir le compte-rendu
          </>
        ) : (
          <>
            <Play className="h-3 w-3 fill-current" />
            {inProgress ? "Reprendre" : "Démarrer"}
            <ArrowRight className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
}
