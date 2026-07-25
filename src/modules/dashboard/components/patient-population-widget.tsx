"use client";

import {
  ArrowUpRight,
  Cat,
  Dog,
  PawPrint,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/db";

interface PatientPopulationWidgetProps {
  className?: string;
  onOpenPatients?: () => void;
  patients: Patient[];
  referenceDate: Date;
}

const speciesGroups = [
  {
    color: "bg-emerald-500 dark:bg-emerald-400",
    icon: Dog,
    label: "Chiens",
    matches: (species: string) => species.toLowerCase().includes("chien"),
    tone: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  {
    color: "bg-amber-400 dark:bg-amber-300",
    icon: Cat,
    label: "Chats",
    matches: (species: string) => species.toLowerCase().includes("chat"),
    tone: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  {
    color: "bg-rose-400 dark:bg-rose-300",
    icon: PawPrint,
    label: "Autres",
    matches: (species: string) =>
      !["chien", "chat"].some((value) => species.toLowerCase().includes(value)),
    tone: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-400",
  },
] as const;

const populationSegments = Array.from({ length: 42 }, (_, index) => ({
  id: `patient-population-segment-${index + 1}`,
  position: ((index + 0.5) / 42) * 100,
}));

function getSpeciesGroupIndex(
  position: number,
  dogEnd: number,
  catEnd: number
) {
  if (position <= dogEnd) {
    return 0;
  }
  if (position <= catEnd) {
    return 1;
  }
  return 2;
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function PatientPopulationWidget({
  className,
  onOpenPatients,
  patients,
  referenceDate,
}: PatientPopulationWidgetProps) {
  const summary = useMemo(() => {
    const activePatients = patients.filter(
      (patient) => patient.status !== "decede"
    );
    const periodEnd = new Date(referenceDate);
    const currentStart = new Date(periodEnd);
    currentStart.setDate(currentStart.getDate() - 29);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);

    const currentNew = activePatients.filter((patient) => {
      const created = parseDate(patient.createdAt);
      return created && created >= currentStart && created <= periodEnd;
    }).length;
    const previousNew = activePatients.filter((patient) => {
      const created = parseDate(patient.createdAt);
      return created && created >= previousStart && created < currentStart;
    }).length;

    const groups = speciesGroups.map((group) => {
      const count = activePatients.filter((patient) =>
        group.matches(patient.species)
      ).length;
      return {
        ...group,
        count,
        share:
          activePatients.length > 0
            ? Math.round((count / activePatients.length) * 100)
            : 0,
      };
    });

    const trend =
      previousNew > 0
        ? Math.round(((currentNew - previousNew) / previousNew) * 100)
        : null;

    return {
      activePatients,
      currentNew,
      groups,
      trend,
    };
  }, [patients, referenceDate]);

  const trendCopy =
    summary.trend === null
      ? `${summary.currentNew} nouveau${summary.currentNew > 1 ? "x" : ""}`
      : `${summary.trend >= 0 ? "+" : ""}${summary.trend}% vs période précédente`;
  const trendIsNegative = summary.trend !== null && summary.trend < 0;
  const hasNewPatients = summary.currentNew > 0;
  const TrendIcon = trendIsNegative ? TrendingDown : TrendingUp;

  return (
    <section
      aria-labelledby="patient-population-title"
      className={cn(
        "flex min-h-[390px] flex-col rounded-[20px] border border-zinc-200/80 bg-zinc-50/50 px-1.5 pt-3 pb-1.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/30",
        className
      )}
    >
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <UsersRound className="size-3.5" />
          </span>
          <h2
            className="truncate font-heading font-semibold text-sm text-zinc-800 tracking-[-0.02em] dark:text-zinc-200"
            id="patient-population-title"
          >
            Patients
          </h2>
        </div>
        <button
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-medium text-[11px] text-zinc-500 outline-none transition-colors hover:bg-white hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          onClick={onOpenPatients}
          type="button"
        >
          Répertoire
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col rounded-[12px] border border-zinc-200/60 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-end justify-between gap-4 border-zinc-100 border-b pb-4 dark:border-zinc-800">
          <div>
            <p className="font-semibold text-[10px] text-zinc-400 uppercase tracking-[0.1em] dark:text-zinc-500">
              Patients suivis
            </p>
            <p className="mt-1.5 font-heading font-semibold text-4xl text-zinc-950 tabular-nums leading-none tracking-[-0.055em] dark:text-zinc-50">
              {summary.activePatients.length}
            </p>
          </div>
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-[10px]",
              trendIsNegative &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-400",
              !trendIsNegative &&
                hasNewPatients &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              !(trendIsNegative || hasNewPatients) &&
                "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
            )}
          >
            <TrendIcon className="size-3" />
            {trendCopy}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-5">
            {summary.groups.map((group) => (
              <div className="flex items-center gap-1.5" key={group.label}>
                <group.icon className="size-3.5 text-zinc-400" />
                <span className="font-semibold text-xs text-zinc-700 tabular-nums dark:text-zinc-300">
                  {group.share}%
                </span>
              </div>
            ))}
          </div>

          <div
            aria-label="Répartition des patients par espèce"
            className="mt-3 flex h-9 items-stretch gap-1"
            role="img"
          >
            {populationSegments.map((segment) => {
              const dogEnd = summary.groups[0].share;
              const catEnd = dogEnd + summary.groups[1].share;
              const groupIndex = getSpeciesGroupIndex(
                segment.position,
                dogEnd,
                catEnd
              );
              return (
                <span
                  className={cn(
                    "min-w-0 flex-1 rounded-full opacity-80",
                    summary.activePatients.length > 0
                      ? summary.groups[groupIndex].color
                      : "bg-zinc-200 dark:bg-zinc-800"
                  )}
                  key={segment.id}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
          {summary.groups.map((group) => (
            <button
              className="group flex w-full items-center gap-3 py-3 text-left outline-none first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              key={group.label}
              onClick={onOpenPatients}
              type="button"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  group.tone
                )}
              >
                <group.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 font-medium text-xs text-zinc-700 dark:text-zinc-300">
                {group.label}
              </span>
              <span className="font-semibold text-xs text-zinc-900 tabular-nums dark:text-zinc-100">
                {group.count}
              </span>
              <span className="w-12 text-right text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">
                {group.share}%
              </span>
              <ArrowUpRight className="size-3.5 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-zinc-100 border-t pt-3 text-[10px] dark:border-zinc-800">
          <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <PawPrint className="size-3.5" />
            Population clinique active
          </span>
          <span className="text-zinc-400 dark:text-zinc-500">30 jours</span>
        </div>
      </div>
    </section>
  );
}
