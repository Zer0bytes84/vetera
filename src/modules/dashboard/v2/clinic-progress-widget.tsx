import { CircleDashed } from "lucide-react";
import { useMemo, useState } from "react";
import type { View } from "@/types";
import type { Appointment, Task, Transaction } from "@/types/db";
import { buildClinicProgress } from "./progress-model";
import { WidgetShell } from "./widget-shell";

export function ClinicProgressWidget({
  appointments,
  tasks,
  transactions,
  referenceDate,
  onNavigate,
}: {
  appointments: Appointment[];
  tasks: Task[];
  transactions: Transaction[];
  referenceDate: Date;
  onNavigate?: (view: View) => void;
}) {
  const [days, setDays] = useState<7 | 30>(30);
  const [focused, setFocused] = useState<number | null>(null);
  const progress = useMemo(
    () =>
      buildClinicProgress({
        appointments,
        tasks,
        transactions,
        referenceDate,
        days,
      }),
    [appointments, tasks, transactions, referenceDate, days]
  );
  return (
    <WidgetShell
      accent="violet"
      action={
        <div className="widget-range" aria-label="Période de progression">
          {([7, 30] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {value} j
            </button>
          ))}
        </div>
      }
      contentClassName="flex flex-col p-0"
      description="Trois repères, une lecture d’ensemble"
      icon={CircleDashed}
      title="Progression du cabinet"
    >
      <div className="widget-chart-surface mx-4 mb-4 flex flex-1 flex-col rounded-xl p-4">
        <div className="grid grid-cols-3 gap-2">
          {progress.map((item, index) => (
            <button
              aria-label={`${item.label} : ${item.done} sur ${item.total}. Ouvrir ${item.shortLabel.toLowerCase()}.`}
              className="ring-stat min-w-0 rounded-lg bg-card p-2.5 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              title={`${item.label} : ${item.total ? `${Math.round((item.done / item.total) * 100)} %` : "Aucun élément sur cette période"}. Ouvrir le détail.`}
              key={item.id}
              onBlur={() => setFocused(null)}
              onFocus={() => setFocused(index)}
              onMouseEnter={() => setFocused(index)}
              onMouseLeave={() => setFocused(null)}
              onClick={() => onNavigate?.(item.route)}
              type="button"
            >
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ background: item.color }}
                />
                {item.shortLabel}
              </span>
              <span className="mt-1 block font-medium text-lg tabular-nums">
                {item.done}
                <span className="text-xs text-muted-foreground">
                  {" "}
                  / {item.total}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="relative mx-auto my-5 w-full max-w-[280px] flex-1 content-center">
          <svg
            aria-label={progress
              .map((item) => `${item.label} : ${item.done} sur ${item.total}`)
              .join(". ")}
            className="mx-auto block w-full"
            role="img"
            viewBox="0 0 240 240"
          >
            {progress.map((item, index) => {
              const radius = 99 - index * 25;
              const length = 2 * Math.PI * radius;
              const ratio = item.total ? item.done / item.total : 0;
              return (
                <g
                  key={item.id}
                  className="transition-opacity duration-200 motion-reduce:transition-none"
                  opacity={focused === null || focused === index ? 1 : 0.28}
                >
                  <circle
                    cx="120"
                    cy="120"
                    fill="none"
                    r={radius}
                    stroke={item.color}
                    strokeOpacity="0.12"
                    strokeWidth="21"
                  />
                  {ratio > 0 && (
                    <circle
                      className="clinic-progress-arc"
                      cx="120"
                      cy="120"
                      fill="none"
                      r={radius}
                      stroke={item.color}
                      strokeDasharray={`${length * ratio} ${length}`}
                      strokeLinecap="round"
                      strokeWidth="21"
                      transform="rotate(-90 120 120)"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <p className="px-5 pb-4 text-[11px] text-muted-foreground">
        {days} derniers jours · tâches selon leur échéance, paiements en nombre.
      </p>
    </WidgetShell>
  );
}
