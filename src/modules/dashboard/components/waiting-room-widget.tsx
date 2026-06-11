import React from "react";
import { User, ChevronRight, Calendar } from "lucide-react";
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
  className?: string;
}

export function WaitingRoomWidget({ appointments, onNavigateToPatient, className }: WaitingRoomWidgetProps) {
  // Filter for today's active appointments: waiting, scheduled, in_progress
  const activeAppointments = appointments.filter(
    (a) => ["waiting", "scheduled", "in_progress"].includes(a.status)
  );

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex justify-between items-center mb-6">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Prochains rendez-vous
        </div>
        {activeAppointments.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            {activeAppointments.length}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {activeAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-8 dark:border-zinc-800 dark:bg-zinc-900/50">
            <Calendar className="mb-2 h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Aucun rendez-vous
            </span>
          </div>
        ) : (
          activeAppointments.map((app) => (
            <div
              key={app.id}
              onClick={() => onNavigateToPatient && app.patientId && onNavigateToPatient(app.patientId)}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {app.time.split(':')[0]}
                  </span>
                  <span className="font-mono text-[9px] font-bold text-muted-foreground">
                    {app.time.split(':')[1]}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{app.patient}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{app.species}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <User className="w-3 h-3" /> {app.owner}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  app.type === "Urgence" 
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                )}>
                  {app.type}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

