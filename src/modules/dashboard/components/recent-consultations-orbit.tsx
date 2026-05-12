"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

interface RecentConsultation {
  id: string;
  owner: string;
  patient: string;
  status: string;
  time: string;
  type: string;
}

interface RecentConsultationsOrbitProps {
  consultations: RecentConsultation[];
  onNavigate: (view: View) => void;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  no_show: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

const statusIcons: Record<string, string> = {
  scheduled: "📅",
  in_progress: "🩺",
  completed: "✅",
  cancelled: "❌",
  no_show: "🚫",
};

const statusLabels: Record<string, string> = {
  scheduled: "Planifié",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

const avatarColors = [
  "from-cyan-500 to-sky-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-blue-500 to-indigo-500",
];

export function RecentConsultationsOrbit({
  consultations,
  onNavigate,
}: RecentConsultationsOrbitProps) {
  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <CardDescription className="font-mono text-[10px] uppercase tracking-[0.06em]">
              Consultations
            </CardDescription>
            <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
              Aujourd'hui
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-semibold text-xs tabular-nums">
            <span className="text-foreground">{consultations.length}</span>
            <span className="font-normal text-muted-foreground">
              RDV{consultations.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {consultations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <span className="text-3xl">📋</span>
            <p className="font-medium text-foreground text-sm">
              Aucune consultation
            </p>
            <p className="text-muted-foreground text-xs">
              Aucun RDV programmé pour aujourd'hui
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {consultations.slice(0, 5).map((consultation, index) => (
              <button
                className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition-all hover:bg-secondary/60 hover:pl-7"
                key={consultation.id}
                onClick={() => onNavigate("clinique")}
                type="button"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-sm text-white shadow-sm",
                    avatarColors[index % avatarColors.length]
                  )}
                >
                  {consultation.patient.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground text-sm">
                      {consultation.patient}
                    </p>
                    <span className="text-xs">
                      {statusIcons[consultation.status] || "📋"}
                    </span>
                  </div>
                  <p className="truncate text-muted-foreground text-xs">
                    {consultation.owner}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-medium text-[11px]",
                      statusStyles[consultation.status] ||
                        "bg-muted text-muted-foreground"
                    )}
                    variant="secondary"
                  >
                    {statusLabels[consultation.status] || consultation.status}
                  </Badge>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {consultation.time}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
