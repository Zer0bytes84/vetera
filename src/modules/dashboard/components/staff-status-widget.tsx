"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import {
  useUsersRepository,
  useAppointmentsRepository,
} from "@/data/repositories";
import {
  ArrowRight,
  CalendarCheck2,
  Users,
  UserRoundCog,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

interface StaffStatusWidgetProps {
  onNavigate?: (view: View) => void;
  referenceDate?: string | Date;
}

const ROLE_META: Record<
  string,
  { label: string; chip: string; bar: string }
> = {
  admin: {
    label: "Admin",
    chip: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/20",
    bar: "bg-purple-500",
  },
  vet_principal: {
    label: "Vet Principal",
    chip: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20",
    bar: "bg-amber-500",
  },
  vet_adjoint: {
    label: "Vet Adjoint",
    chip: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/20",
    bar: "bg-blue-500",
  },
  assistant: {
    label: "Assistant(e)",
    chip: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    bar: "bg-emerald-500",
  },
  stagiaire: {
    label: "Stagiaire",
    chip: "text-zinc-600 dark:text-zinc-300 bg-zinc-500/10 border-zinc-500/20",
    bar: "bg-zinc-400",
  },
};

const AVATAR_GRADIENTS = [
  "from-cyan-400 to-sky-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
];

function parseDashboardDate(value?: string): Date | null {
  if (!value) return null;
  const sqliteLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const normalized = sqliteLike ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) && sqliteLike) {
    const localDate = new Date(value.replace(" ", "T"));
    return Number.isFinite(localDate.getTime()) ? localDate : null;
  }
  return Number.isFinite(date.getTime()) ? date : null;
}

function workloadTone(load: number, capacity: number) {
  const ratio = capacity > 0 ? load / capacity : 0;
  if (ratio === 0)
    return {
      label: "Libre",
      tone: "text-zinc-500 dark:text-zinc-400",
      bar: "bg-zinc-300 dark:bg-zinc-700",
    };
  if (ratio < 0.5)
    return {
      label: "Calme",
      tone: "text-sky-700 dark:text-sky-300",
      bar: "bg-sky-500",
    };
  if (ratio < 0.85)
    return {
      label: "Actif",
      tone: "text-emerald-700 dark:text-emerald-300",
      bar: "bg-emerald-500",
    };
  return {
    label: "Saturé",
    tone: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
  };
}

export function StaffStatusWidget({
  onNavigate,
  referenceDate = new Date(),
}: StaffStatusWidgetProps) {
  const { data: users } = useUsersRepository();
  const { data: appointments } = useAppointmentsRepository();

  const activeStaff = React.useMemo(
    () => users.filter((u) => u.status === "active"),
    [users]
  );

  // Today's load per vet
  const todayVetLoad = React.useMemo(() => {
    const loadMap = new Map<string, number>();
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const appt of appointments) {
      if (["cancelled", "no_show"].includes(appt.status)) continue;
      const date = parseDashboardDate(appt.startTime);
      if (!date || date < today || date >= tomorrow) continue;
      if (appt.vetId) {
        loadMap.set(appt.vetId, (loadMap.get(appt.vetId) || 0) + 1);
      }
    }
    return loadMap;
  }, [appointments, referenceDate]);

  const totalTodayLoad = React.useMemo(
    () => Array.from(todayVetLoad.values()).reduce((s, v) => s + v, 0),
    [todayVetLoad]
  );

  const capacity = 10; // soft capacity per vet/day

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden shadow-none !border-zinc-200 dark:!border-white/10 transition-[transform,shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/5" />
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/5" />
      </div>

      <div className="relative z-10 flex h-full flex-col p-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-950/10 pb-4 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/15 to-sky-500/10 ring-1 ring-cyan-500/15 dark:ring-cyan-400/15">
                <UserRoundCog
                  className="h-3.5 w-3.5 text-cyan-700 dark:text-cyan-300"
                  strokeWidth={2.2}
                />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-400 dark:from-cyan-400 dark:to-blue-300 font-sans">
                Équipe en Service
              </span>
            </div>
            <h3 className="mt-2 truncate font-display text-xl font-semibold tracking-tight text-foreground">
              Personnel en Clinique
            </h3>
          </div>

          {/* Hero count */}
          <div className="flex shrink-0 flex-col items-end">
            <span className="font-display text-2xl font-semibold tabular-nums leading-none text-foreground">
              {activeStaff.length}
            </span>
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              actifs
            </span>
          </div>
        </div>

        {/* ── Mini summary row ────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <SummaryStat
            icon={<Users className="h-3.5 w-3.5" />}
            value={activeStaff.length}
            label="Effectif"
            tone="cyan"
          />
          <SummaryStat
            icon={<CalendarCheck2 className="h-3.5 w-3.5" />}
            value={totalTodayLoad}
            label="RDV jour"
            tone="emerald"
          />
          <SummaryStat
            icon={<Zap className="h-3.5 w-3.5" />}
            value={Math.round(
              (totalTodayLoad / (activeStaff.length * capacity || 1)) * 100
            )}
            suffix="%"
            label="Charge"
            tone="amber"
          />
        </div>

        {/* ── Staff List ──────────────────────────────────────── */}
        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
          {activeStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="text-3xl">👥</span>
              <p className="text-sm italic text-foreground">
                Aucun membre actif
              </p>
              <p className="text-xs text-muted-foreground">
                Configurez l'équipe dans les paramètres
              </p>
            </div>
          ) : (
            activeStaff.slice(0, 4).map((user, idx) => {
              const load = todayVetLoad.get(user.id) || 0;
              const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const initials = user.displayName?.slice(0, 2).toUpperCase() || "EQ";
              const role = ROLE_META[user.role] || ROLE_META.assistant;
              const wl = workloadTone(load, capacity);
              const loadRatio = Math.min(1, load / capacity);

              return (
                <div
                  key={user.id}
                  className="group/row rounded-2xl border border-transparent p-2.5 transition-all hover:bg-white/60 hover:border-zinc-200/60 hover:shadow-xs dark:hover:bg-white/[0.04] dark:hover:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-full w-full rounded-full border border-zinc-950/10 object-cover dark:border-white/10"
                        />
                      ) : (
                        <>
                          <div
                            className={cn(
                              "absolute inset-0 rounded-full bg-gradient-to-br opacity-90 shadow-sm transition-all duration-500 group-hover/row:rotate-[30deg]",
                              grad
                            )}
                          />
                          <span className="relative font-bold text-xs uppercase tracking-tight text-white">
                            {initials}
                          </span>
                        </>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_6px_#22c55e] dark:border-zinc-900" />
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="truncate text-sm font-bold text-foreground"
                          title={user.displayName}
                        >
                          {user.displayName}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-bold tabular-nums",
                            wl.tone
                          )}
                        >
                          {load}/{capacity}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide leading-tight",
                            role.chip
                          )}
                        >
                          {role.label}
                        </span>
                        {user.specialty && (
                          <span
                            className="truncate text-[10px] font-medium italic text-muted-foreground"
                            title={user.specialty}
                          >
                            {user.specialty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Workload bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-950/5 dark:bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          wl.bar
                        )}
                        style={{ width: `${loadRatio * 100}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-bold uppercase tracking-wide",
                        wl.tone
                      )}
                    >
                      {wl.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        {onNavigate && (
          <div className="mt-4 border-t border-zinc-950/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => onNavigate("equipe")}
              className="group/btn flex w-full items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <Users className="h-3.5 w-3.5" />
              Voir toute l'équipe
              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

interface SummaryStatProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  tone: "cyan" | "emerald" | "amber";
}

const SUMMARY_TONES: Record<SummaryStatProps["tone"], string> = {
  cyan: "from-cyan-500/15 to-cyan-500/[0.03] ring-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  emerald: "from-emerald-500/15 to-emerald-500/[0.03] ring-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "from-amber-500/15 to-amber-500/[0.03] ring-amber-500/15 text-amber-700 dark:text-amber-300",
};

function SummaryStat({ icon, value, suffix, label, tone }: SummaryStatProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-clip-padding bg-gradient-to-br p-2.5 ring-1 ring-inset dark:border-white/10",
        SUMMARY_TONES[tone]
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-xs dark:bg-zinc-900/60">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-semibold tabular-nums leading-none text-foreground">
          {value}
          {suffix && (
            <span className="text-xs font-bold text-muted-foreground">{suffix}</span>
          )}
        </p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
