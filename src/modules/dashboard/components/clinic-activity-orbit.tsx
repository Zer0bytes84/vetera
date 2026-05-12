"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActivityDay = {
  date: Date;
  value: number;
};

type ClinicActivityOrbitProps = {
  days: ActivityDay[];
};

export function ClinicActivityOrbit({ days }: ClinicActivityOrbitProps) {
  const max = Math.max(...days.map((day) => day.value), 1);
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const activeDays = days.filter((day) => day.value > 0).length;

  return (
    <Card className="dashboard-luxe-card overflow-hidden rounded-[26px] bg-card shadow-none">
      <CardHeader className="border-border/50 border-b px-6 py-5">
        <CardDescription className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.06em]">
          Rythme clinique
        </CardDescription>
        <CardTitle className="font-semibold text-[22px] tracking-[-0.045em]">
          Activité 12 semaines
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="dashboard-soft-panel rounded-2xl p-3">
            <p className="text-[11px] text-muted-foreground">Consultations</p>
            <p className="mt-1 font-semibold text-2xl text-foreground tabular-nums tracking-[-0.04em]">
              {total}
            </p>
          </div>
          <div className="dashboard-soft-panel rounded-2xl p-3">
            <p className="text-[11px] text-muted-foreground">Jours actifs</p>
            <p className="mt-1 font-semibold text-2xl text-foreground tabular-nums tracking-[-0.04em]">
              {activeDays}
            </p>
          </div>
        </div>

        <div className="dashboard-chart-frame grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
          {days.map((day) => {
            const intensity = day.value / max;
            return (
              <div
                className={cn(
                  "size-3 rounded-[4px] border border-border/60 transition-transform hover:scale-125",
                  intensity === 0 && "bg-secondary/60",
                  intensity > 0 && intensity <= 0.25 && "bg-emerald-500/25",
                  intensity > 0.25 && intensity <= 0.5 && "bg-emerald-500/45",
                  intensity > 0.5 && intensity <= 0.75 && "bg-emerald-500/70",
                  intensity > 0.75 && "bg-emerald-500"
                )}
                key={day.date.toISOString()}
                title={`${day.value} consultation${day.value > 1 ? "s" : ""}`}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
