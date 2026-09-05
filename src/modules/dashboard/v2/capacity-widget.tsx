import { ArrowUpRight, CalendarRange, Clock4 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types/db";
import { buildCapacitySeries, isSameDay } from "./model";
import { WidgetShell } from "./widget-shell";

export function CapacityWidget({
  appointments,
  referenceDate,
  onOpenAgenda,
}: {
  appointments: Appointment[];
  referenceDate: Date;
  onOpenAgenda?: () => void;
}) {
  const capacity = useMemo(
    () => buildCapacitySeries(appointments, referenceDate),
    [appointments, referenceDate]
  );
  const totalAppointments = capacity.reduce((sum, day) => sum + day.count, 0);
  const available = capacity.reduce((sum, day) => sum + day.available, 0);
  const busiest = capacity.reduce(
    (current, day) => (day.count > current.count ? day : current),
    capacity[0]
  );

  return (
    <WidgetShell
      accent="violet"
      action={
        <Button onClick={onOpenAgenda} size="sm" variant="ghost">
          Planning
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      }
      className="min-h-[410px]"
      contentClassName="flex flex-col p-0"
      description="Charge prévue sur les 7 prochains jours"
      icon={CalendarRange}
      iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300"
      title="Capacité"
    >
      <div className="widget-metrics grid grid-cols-3">
        <div className="px-4 py-4">
          <p className="font-semibold text-2xl tabular-nums tracking-[-0.04em]">
            {totalAppointments}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Rendez-vous</p>
        </div>
        <div className="px-4 py-4">
          <p className="font-semibold text-2xl tabular-nums tracking-[-0.04em]">
            {available}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Créneaux repères
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="truncate font-semibold text-sm capitalize tracking-[-0.02em]">
            {busiest?.date.toLocaleDateString("fr-FR", {
              weekday: "long",
            }) ?? "—"}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Journée la plus chargée
          </p>
        </div>
      </div>

      <div className="widget-chart-surface mx-4 mb-4 flex flex-1 items-end gap-3 rounded-xl px-4 pt-6 pb-4">
        {capacity.map((day) => {
          const today = isSameDay(day.date, referenceDate);
          const busy = day.load >= 75;
          let barClassName = "bg-lime-400 dark:bg-lime-400";
          if (today) {
            barClassName = "bg-violet-500 dark:bg-violet-400";
          }
          if (busy) {
            barClassName = "bg-orange-400 dark:bg-orange-400/80";
          }
          return (
            <div
              className="flex min-w-0 flex-1 flex-col items-center"
              key={day.date.toISOString()}
            >
              <span className="mb-2 font-semibold text-[11px] tabular-nums">
                {day.count}
              </span>
              <div className="relative flex h-36 w-full max-w-10 items-end overflow-hidden rounded-xl bg-zinc-200/60 dark:bg-white/7">
                <span
                  className={cn(
                    "w-full rounded-xl transition-[height] duration-500 motion-reduce:transition-none",
                    barClassName
                  )}
                  style={{
                    height: `${Math.min(100, day.load)}%`,
                  }}
                />
              </div>
              <span
                className={cn(
                  "mt-2 truncate text-[10px] capitalize",
                  today
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {day.label.replace(".", "")}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 text-[11px] text-muted-foreground dark:border-white/8">
        <span className="flex items-center gap-1.5">
          <Clock4 className="size-3.5" />
          Référence : 8 créneaux par jour
        </span>
        <span className="hidden sm:inline">Orange = forte charge</span>
      </div>
    </WidgetShell>
  );
}
