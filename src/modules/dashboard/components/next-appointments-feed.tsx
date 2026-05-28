"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

export interface TodayAppointment {
  id: string | number;
  patient: string;
  owner: string;
  species: string;
  type: string;
  time: string; // HH:MM or local string
  status: string; // scheduled, in_progress, completed, etc.
}

interface NextAppointmentsFeedProps {
  appointments: TodayAppointment[];
  onNavigate?: (view: View) => void;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:border-blue-400/20",
  in_progress: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/20",
  completed: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:border-rose-400/20",
  no_show: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-400/20",
};

const statusLabels: Record<string, string> = {
  scheduled: "Planifié",
  in_progress: "En salle",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const avatarGradients = [
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
];

const speciesIcons: Record<string, string> = {
  chien: "🐶",
  chat: "🐱",
  lapin: "🐰",
  oiseau: "🦜",
  cheval: "🐴",
};

export function NextAppointmentsFeed({
  appointments,
  onNavigate,
}: NextAppointmentsFeedProps) {
  // Compute how many patients are in the clinic right now (in_progress)
  const patientsInClinic = appointments.filter((a) => a.status === "in_progress").length;

  return (
    <Card className="dashboard-luxe-card group relative flex h-full flex-col overflow-hidden shadow-none transition-[transform,shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-md hover:shadow-zinc-950/5 dark:hover:shadow-black/20">
      {/* Glow on hover */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full">

      {/* Header */}
      <div className="border-b border-zinc-950/10 px-6 py-5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400 dark:from-blue-400 dark:to-indigo-300">
              Flux en Temps Réel
            </span>
            <h3 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Salle d'Attente & RDV
            </h3>
          </div>

          {/* Waiting Room pulse count */}
          {patientsInClinic > 0 ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-xs text-emerald-700 border border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-500/5 dark:border-emerald-400/10 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-sans tabular-nums font-bold">{patientsInClinic}</span> en salle
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950/5 px-3 py-1 font-semibold text-[11px] text-muted-foreground dark:bg-white/5">
              <span>Calme</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable list content */}
      <div className="flex-1 overflow-y-auto px-1 py-2 max-h-[290px]">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <span className="text-3xl">🌿</span>
            <p className="italic text-sm text-foreground">Aucune consultation aujourd'hui</p>
            <p className="text-xs text-muted-foreground">Votre agenda est vide pour le moment</p>
          </div>
        ) : (
          <div className="space-y-1.5 px-2">
            {appointments.map((appt, idx) => {
              const gradient = avatarGradients[idx % avatarGradients.length];
              const cleanSpecies = appt.species?.toLowerCase() || "";
              const emoji = speciesIcons[cleanSpecies] || "🐾";
              const inProgress = appt.status === "in_progress";

              return (
                <div
                  key={appt.id}
                  className={cn(
                    "group/row relative flex items-center gap-4 rounded-2xl p-3 border border-transparent transition-all duration-300 hover:bg-zinc-950/5 hover:border-zinc-950/5 dark:hover:bg-white/5 dark:hover:border-white/5 hover:shadow-xs pl-4",
                    inProgress && "bg-emerald-500/[0.02] border-emerald-500/10 dark:bg-emerald-400/[0.01] dark:border-emerald-400/10"
                  )}
                >
                  {/* Urgent or InProgress Left colored glowing Accent Bar */}
                  <span
                    className={cn(
                      "absolute left-0.5 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300 opacity-60 group-hover/row:opacity-100",
                      inProgress ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : appt.status === "scheduled" ? "bg-blue-400" : "bg-zinc-300 dark:bg-zinc-700"
                    )}
                  />

                  {/* Dynamic Gradient Avatar */}
                  <div className="relative flex h-10 w-10 shrink-0 select-none items-center justify-center">
                    <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-85 shadow-xs transition-transform duration-300 group-hover/row:scale-105", gradient)} />
                    <span className="relative font-bold text-xs text-white uppercase tracking-tight">
                      {appt.patient.slice(0, 2)}
                    </span>
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow-xs dark:bg-zinc-950 border border-zinc-950/5 dark:border-white/5">
                      {emoji}
                    </span>
                  </div>

                  {/* Core metadata info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-sm text-foreground leading-tight">
                        {appt.patient}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {appt.owner} • <span className="italic font-medium">{appt.type}</span>
                    </p>
                  </div>

                  {/* Actions & Time info */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 border font-semibold text-[10px] tracking-wide",
                        statusStyles[appt.status] || "bg-muted text-muted-foreground"
                      )}
                      variant="outline"
                    >
                      {statusLabels[appt.status] || appt.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground tracking-tight tabular-nums font-semibold">
                      {appt.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer action */}
      {onNavigate && (
        <div className="mt-auto border-t border-zinc-950/10 p-4 dark:border-white/10">
          <button
            onClick={() => onNavigate("agenda")}
            className="flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 font-semibold text-xs text-white transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.97] hover:shadow-md dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
            type="button"
          >
            Accéder à l'agenda complet
          </button>
        </div>
      )}
      </div>
    </Card>
  );
}
