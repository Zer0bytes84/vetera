"use client";

import { ChartNoAxesColumnIncreasing, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandRow {
  demand: number;
  name: string;
}

interface ProcedureDemandOrbitProps {
  className?: string;
  rows: DemandRow[];
}

const barOpacity = [
  "opacity-100",
  "opacity-80",
  "opacity-65",
  "opacity-50",
  "opacity-35",
];

export function ProcedureDemandOrbit({
  className,
  rows,
}: ProcedureDemandOrbitProps) {
  const visibleRows = rows.slice(0, 5);
  const max = Math.max(...visibleRows.map((row) => row.demand), 1);
  const total = rows.reduce((sum, row) => sum + row.demand, 0);
  const leader = visibleRows[0];
  const leaderShare =
    leader && total > 0 ? Math.round((leader.demand / total) * 100) : 0;

  return (
    <section
      aria-labelledby="procedure-demand-title"
      className={cn(
        "flex min-h-[390px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 select-none items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-400">
            <Stethoscope className="size-3.5" />
          </span>
          <h3
            className="truncate font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200"
            id="procedure-demand-title"
          >
            Demande par acte
          </h3>
        </div>
        <span className="shrink-0 font-medium text-[11px] text-zinc-400 dark:text-zinc-500">
          30 derniers jours
        </span>
      </div>

      <div className="flex flex-1 flex-col rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-200 border-dashed bg-zinc-50/70 px-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <ChartNoAxesColumnIncreasing className="mb-3 size-6 text-zinc-400" />
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Aucun acte analysé
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              La répartition apparaîtra après les premières consultations.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-5 border-zinc-100 border-b pb-4 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="min-h-4 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
                  Acte le plus demandé
                </p>
                <p className="mt-1 truncate font-semibold text-base text-zinc-900 tracking-[-0.02em] dark:text-zinc-100">
                  {leader?.name}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {leaderShare}% du volume observé
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100">
                  {total}
                </p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
                  actes
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-1 flex-col justify-center gap-3">
              {visibleRows.map((row, index) => {
                const width = Math.max(
                  (row.demand / max) * 100,
                  row.demand > 0 ? 7 : 0
                );
                const share =
                  total > 0 ? Math.round((row.demand / total) * 100) : 0;

                return (
                  <div className="group" key={row.name}>
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <span className="w-4 shrink-0 font-medium text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="min-w-0 flex-1 truncate font-medium text-xs text-zinc-700 dark:text-zinc-300">
                        {row.name}
                      </p>
                      <span className="font-semibold text-xs text-zinc-900 tabular-nums dark:text-zinc-100">
                        {row.demand}
                      </span>
                      <span className="w-7 text-right text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                        {share}%
                      </span>
                    </div>
                    <div className="ml-[26px] h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span
                        className={cn(
                          "block h-full rounded-full bg-teal-500 transition-[width] duration-700 dark:bg-teal-400",
                          barOpacity[index]
                        )}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-zinc-100 border-t pt-3 text-[11px] dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">
                {visibleRows.length} catégories principales
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-teal-700 dark:text-teal-400">
                <ChartNoAxesColumnIncreasing className="size-3.5" />
                Données consolidées
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
