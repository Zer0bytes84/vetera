import { ArrowUpRight, CircleDashed } from "lucide-react";
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
      description="Rendez-vous, tâches et encaissements"
      icon={CircleDashed}
      title="Progression du cabinet"
    >
      <div className="progress-ledger px-5">
        {progress.map((item) => {
          const percent = item.total ? Math.round(item.done / item.total * 100) : null;
          return (
            <button
              key={item.id}
              type="button"
              className="progress-ledger-row group w-full text-start"
              onClick={() => onNavigate?.(item.route)}
              aria-label={`${item.label} : ${item.done} sur ${item.total}. Ouvrir ${item.shortLabel.toLowerCase()}.`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="size-2 rounded-full" style={{ background: item.color }} />
                  {item.shortLabel}
                </span>
                <ArrowUpRight aria-hidden="true" className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
              </span>
              <span className="mt-2 flex items-baseline justify-between gap-3">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {item.done}<span className="ml-1.5 text-sm font-normal text-muted-foreground">/ {item.total}</span>
                </span>
                <span className="text-xs text-muted-foreground">{percent === null ? "Aucun élément" : `${percent} % terminés`}</span>
              </span>
              <span className="progress-ledger-track mt-2.5 block h-2 overflow-hidden rounded-full" aria-hidden="true">
                <span className="block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent ?? 0}%`, background: item.color }} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-5 pb-4 text-[11px] text-muted-foreground">
        {days} derniers jours · tâches selon leur échéance, paiements en nombre.
      </p>
    </WidgetShell>
  );
}
