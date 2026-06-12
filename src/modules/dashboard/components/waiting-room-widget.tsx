import { Calendar, ChevronRight, User } from "lucide-react";
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
}

export function WaitingRoomWidget({
  appointments,
  onNavigateToPatient,
  className,
}: WaitingRoomWidgetProps) {
  // Filter for today's active appointments: waiting, scheduled, in_progress
  const activeAppointments = appointments.filter((a) =>
    ["waiting", "scheduled", "in_progress"].includes(a.status)
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
          Prochains rendez-vous
        </div>
        {activeAppointments.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-[10px] text-emerald-600 uppercase tracking-wider dark:bg-emerald-500/20 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {activeAppointments.length}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {activeAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 border-dashed bg-zinc-50 py-8 dark:border-zinc-800 dark:bg-zinc-900/50">
            <Calendar className="mb-2 h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            <span className="font-medium text-sm text-zinc-600 dark:text-zinc-400">
              Aucun rendez-vous
            </span>
          </div>
        ) : (
          activeAppointments.map((app) => (
            <div
              className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/20 dark:hover:bg-zinc-800/40"
              key={app.id}
              onClick={() =>
                onNavigateToPatient &&
                app.patientId &&
                onNavigateToPatient(app.patientId)
              }
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-border bg-white dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="font-bold font-mono text-foreground text-xs">
                    {app.time.split(":")[0]}
                  </span>
                  <span className="font-bold font-mono text-[9px] text-muted-foreground">
                    {app.time.split(":")[1]}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {app.patient}
                    </span>
                    <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                      {app.species}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 font-medium text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" /> {app.owner}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider",
                    app.type === "Urgence"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  )}
                >
                  {app.type}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
