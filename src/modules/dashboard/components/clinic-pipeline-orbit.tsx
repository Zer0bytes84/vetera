"use client";

import {
  Activity,
  CalendarCheck2,
  CheckCheck,
  CircleAlert,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineRow {
  color: string;
  label: string;
  ratio: number;
  value: number;
}

interface ClinicPipelineOrbitProps {
  className?: string;
  rows: PipelineRow[];
  title?: string;
}

const rowIcons = [CalendarCheck2, Activity, CheckCheck, CircleAlert];

export function ClinicPipelineOrbit({
  className,
  rows,
  title = "État clinique",
}: ClinicPipelineOrbitProps) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const completed = rows[2]?.value ?? 0;
  const active = (rows[0]?.value ?? 0) + (rows[1]?.value ?? 0);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      aria-labelledby="clinic-pipeline-title"
      className={cn(
        "flex min-h-[390px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 select-none items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
            <Activity className="size-3.5" />
          </span>
          <h3
            className="truncate font-semibold text-sm text-zinc-800 tracking-tight dark:text-zinc-200"
            id="clinic-pipeline-title"
          >
            {title}
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-[10px] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Aujourd’hui
        </span>
      </div>

      <div className="flex flex-1 flex-col rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        {total === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-200 border-dashed bg-zinc-50/70 px-6 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <Clock3 className="mb-3 size-6 text-zinc-400" />
            <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
              Aucun rendez-vous aujourd’hui
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Le flux clinique apparaîtra dès le premier créneau.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 border-zinc-100 border-b pb-4 dark:divide-zinc-800 dark:border-zinc-800">
              <div className="pr-4">
                <p className="min-h-4 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
                  Charge active
                </p>
                <p className="mt-1 font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100">
                  {active}
                </p>
              </div>
              <div className="px-4">
                <p className="min-h-4 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
                  Terminés
                </p>
                <p className="mt-1 font-heading font-semibold text-emerald-600 text-xl tabular-nums leading-none tracking-[-0.035em] dark:text-emerald-400">
                  {completionRate}%
                </p>
              </div>
              <div className="pl-4">
                <p className="min-h-4 font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
                  Total jour
                </p>
                <p className="mt-1 font-heading font-semibold text-xl text-zinc-900 tabular-nums leading-none tracking-[-0.035em] dark:text-zinc-100">
                  {total}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                  Répartition du flux
                </span>
                <span className="text-zinc-400 tabular-nums dark:text-zinc-500">
                  {total} rendez-vous
                </span>
              </div>
              <div
                aria-label={`Répartition de ${total} rendez-vous`}
                className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800"
                role="img"
              >
                {rows.map((row) =>
                  row.value > 0 ? (
                    <span
                      className="h-full min-w-1 rounded-full"
                      key={row.label}
                      style={{
                        backgroundColor: row.color,
                        width: `${(row.value / Math.max(total, 1)) * 100}%`,
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>

            <div className="mt-4 grid flex-1 gap-2 sm:grid-cols-2">
              {rows.map((row, index) => {
                const Icon = rowIcons[index] ?? Activity;
                const share =
                  total > 0 ? Math.round((row.value / total) * 100) : 0;

                return (
                  <div
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/55 p-3 transition-colors hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/35 dark:hover:bg-zinc-900/70"
                    key={row.label}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10"
                      style={{ color: row.color }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-xs text-zinc-700 dark:text-zinc-300">
                        {row.label}
                      </p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                        <span
                          className="block h-full rounded-full transition-[width] duration-700"
                          style={{
                            backgroundColor: row.color,
                            width: `${Math.max(row.ratio * 100, row.value ? 7 : 0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-sm text-zinc-900 tabular-nums dark:text-zinc-100">
                        {row.value}
                      </p>
                      <p className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                        {share}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
