import React from "react";
import { Clock, User, ChevronRight, Calendar, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WaitingRoomAppointment {
  id: string | number;
  patientId?: string;
  patient: string;
  owner: string;
  species: string;
  type: string;
  time: string;
  status: string;
}

interface WaitingRoomWidgetProps {
  appointments: WaitingRoomAppointment[];
  onNavigateToPatient?: (patientId: string) => void;
}

export function WaitingRoomWidget({ appointments, onNavigateToPatient }: WaitingRoomWidgetProps) {
  // Filter for today's active appointments: waiting, scheduled, in_progress
  const activeAppointments = appointments.filter(
    (a) => ["waiting", "scheduled", "in_progress"].includes(a.status)
  );

  return (
    <div className="relative z-10 flex h-full w-full flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            Salle d'attente & Prochains RDV
          </h3>
          {activeAppointments.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              {activeAppointments.length} en attente
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {activeAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
            <Calendar className="mb-3 h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Aucun rendez-vous en attente
            </span>
            <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              La salle d'attente est vide.
            </span>
          </div>
        ) : (
          activeAppointments.map((app) => (
            <div
              key={app.id}
              onClick={() => onNavigateToPatient && app.patientId && onNavigateToPatient(app.patientId)}
              className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 p-4 transition-all duration-200 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                {/* Time */}
                <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-100/80 px-3 py-2 dark:bg-zinc-900">
                  <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                    {app.time}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {app.patient}
                    </span>
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {app.species}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <User className="h-3.5 w-3.5" />
                    <span>{app.owner}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:gap-6 mt-2 sm:mt-0">
                {/* Type & Status */}
                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    app.type === "Urgence" 
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  )}>
                    {app.type}
                  </span>
                  
                  {app.status === "in_progress" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <PlayCircle className="h-3 w-3" />
                      En consultation
                    </span>
                  )}
                  {app.status === "waiting" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Clock className="h-3 w-3" />
                      En salle d'attente
                    </span>
                  )}
                  {app.status === "scheduled" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      <Calendar className="h-3 w-3" />
                      À venir
                    </span>
                  )}
                </div>
                
                {/* Action Icon */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-zinc-400 transition-colors group-hover:bg-zinc-200 group-hover:text-zinc-900 dark:group-hover:bg-zinc-800 dark:group-hover:text-white shrink-0 ml-4">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
