"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUsersRepository, useAppointmentsRepository } from "@/data/repositories";
import { Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

interface StaffStatusWidgetProps {
  onNavigate?: (view: View) => void;
  referenceDate?: string | Date;
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  vet_principal: "Vet Principal",
  vet_adjoint: "Vet Adjoint",
  assistant: "Assistant(e)",
  stagiaire: "Stagiaire",
};

const roleStyles: Record<string, string> = {
  admin: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  vet_principal: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  vet_adjoint: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  assistant: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  stagiaire: "text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

const avatarColors = [
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

export function StaffStatusWidget({ onNavigate, referenceDate = new Date() }: StaffStatusWidgetProps) {
  const { data: users } = useUsersRepository();
  const { data: appointments } = useAppointmentsRepository();

  // Filter active staff
  const activeStaff = React.useMemo(() => {
    return users.filter((u) => u.status === "active");
  }, [users]);

  // Compute live today appointments count per veterinarian
  const todayVetLoad = React.useMemo(() => {
    const loadMap = new Map<string, number>();
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppts = appointments.filter((a) => {
      const date = parseDashboardDate(a.startTime);
      const isToday = date && date >= today && date < tomorrow;
      const isValidStatus = !["cancelled", "no_show"].includes(a.status);
      return isToday && isValidStatus;
    });

    for (const appt of todayAppts) {
      if (appt.vetId) {
        loadMap.set(appt.vetId, (loadMap.get(appt.vetId) || 0) + 1);
      }
    }
    return loadMap;
  }, [appointments, referenceDate]);

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden p-6 shadow-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20 active:scale-[0.995]">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-0 z-[-1] opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute left-0 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/5" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-950/10 pb-4 dark:border-white/10">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-400 dark:from-cyan-400 dark:to-blue-300">
            Équipe de Service
          </span>
          <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
            Personnel en Clinique
          </h3>
        </div>

        {/* Counter */}
        <div className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 font-semibold text-xs text-cyan-700 border border-cyan-500/20 dark:text-cyan-300 dark:bg-cyan-500/5 dark:border-cyan-400/10 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
          <Users className="size-3.5" />
          <span className="tabular-nums font-bold">{activeStaff.length}</span> actif{activeStaff.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 max-h-[220px] pr-1">
        {activeStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="text-3xl">👥</span>
            <p className="italic text-sm text-foreground">Aucun membre actif</p>
            <p className="text-xs text-muted-foreground">Veuillez configurer l'équipe dans les paramètres.</p>
          </div>
        ) : (
          activeStaff.slice(0, 4).map((user, idx) => {
            const load = todayVetLoad.get(user.id) || 0;
            const grad = avatarColors[idx % avatarColors.length];
            const initials = user.displayName?.slice(0, 2).toUpperCase() || "EQ";

            return (
              <div
                key={user.id}
                className="flex items-center gap-3.5 rounded-xl p-2 border border-transparent transition-all duration-300 hover:bg-zinc-950/5 hover:border-zinc-950/5 dark:hover:bg-white/5 dark:hover:border-white/5"
              >
                {/* Avatar Initial with glowing outlines */}
                <div className="relative flex h-9 w-9 shrink-0 select-none items-center justify-center">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="h-full w-full rounded-full object-cover border border-zinc-950/10 dark:border-white/10"
                    />
                  ) : (
                    <>
                      <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-85 shadow-xs transition-transform duration-300 group-hover:scale-105", grad)} />
                      <span className="relative font-bold text-xs text-white uppercase tracking-tight">
                        {initials}
                      </span>
                    </>
                  )}
                  {/* Status small pulsing green indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full border border-white bg-green-500 dark:border-zinc-950 shadow-[0_0_4px_#22c55e]" />
                </div>

                {/* Info details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 justify-between">
                    <p className="truncate font-bold text-xs text-foreground">
                      {user.displayName}
                    </p>
                    {/* Load indicator with pulsing heart glow */}
                    {load > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-md dark:text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.15)] animate-pulse">
                        <Heart className="size-2.5 fill-current text-emerald-500" />
                        <span className="tabular-nums">{load} RDV</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 border text-[9px] font-bold tracking-wide leading-none",
                        roleStyles[user.role] || "bg-muted text-muted-foreground"
                      )}
                      variant="outline"
                    >
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    {user.specialty && (
                      <span className="text-[10px] text-muted-foreground font-semibold truncate leading-none">
                        • {user.specialty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {onNavigate && (
        <div className="mt-auto border-t border-zinc-950/10 pt-4 dark:border-white/10">
          <button
            onClick={() => onNavigate("equipe")}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 font-semibold text-xs text-white transition-all duration-200 hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.97] active:duration-75 hover:shadow-md dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
            type="button"
          >
            Voir toute l'équipe
          </button>
        </div>
      )}
    </Card>
  );
}
