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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      hospitalized: activePatients.filter(
        (patient) => patient.status === "hospitalise"
      ).length,
      inCare: activePatients.filter((patient) =>
        ["traitement", "hospitalise"].includes(patient.status)
      ).length,
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
    <Card
      aria-labelledby="patient-population-title"
      className={cn(
        "dashboard-v2-widget h-full min-h-[390px] border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.02),0_12px_32px_-26px_rgba(15,23,42,0.35)]",
        className
      )}
      role="region"
    >
      <CardHeader className="min-h-16 border-border/75 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-950/5 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/10">
            <UsersRound className="size-4.5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <CardTitle
              className="truncate font-semibold text-[15px] tracking-[-0.015em]"
              id="patient-population-title"
            >
              Patients
            </CardTitle>
            <CardDescription className="mt-0.5 truncate text-xs">
              Population et suivi clinique
            </CardDescription>
          </div>
        </div>
        <CardAction className="self-center">
          <Button onClick={onOpenPatients} size="sm" variant="ghost">
            Répertoire
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        <div className="flex items-end justify-between gap-4 border-zinc-200/70 border-b px-5 py-4 dark:border-white/8">
          <div>
            <p className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
              Patients suivis
            </p>
            <p className="mt-1.5 font-heading font-semibold text-4xl tabular-nums leading-none tracking-[-0.055em]">
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
                "bg-muted text-muted-foreground"
            )}
          >
            <TrendIcon className="size-3" />
            {trendCopy}
          </span>
        </div>

        <div className="px-5 pt-4">
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
                    "min-w-0 flex-1 rounded-full opacity-80 transition-[transform,opacity] duration-200 hover:-translate-y-1 hover:opacity-100",
                    summary.activePatients.length > 0
                      ? summary.groups[groupIndex].color
                      : "bg-muted"
                  )}
                  key={segment.id}
                />
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 divide-x divide-border/75 rounded-xl bg-muted/35 px-1 py-2.5 ring-1 ring-border/80">
            <div className="px-2">
              <p className="font-semibold text-xs text-zinc-900 tabular-nums dark:text-zinc-100">
                {summary.currentNew}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-zinc-400">
                Nouveaux · 30 j
              </p>
            </div>
            <div className="px-2">
              <p className="font-semibold text-xs text-zinc-900 tabular-nums dark:text-zinc-100">
                {summary.inCare}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-zinc-400">
                En suivi
              </p>
            </div>
            <div className="px-2">
              <p className="font-semibold text-xs text-zinc-900 tabular-nums dark:text-zinc-100">
                {summary.hospitalized}
              </p>
              <p className="mt-0.5 truncate text-[9px] text-zinc-400">
                Hospitalisés
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 divide-y divide-zinc-200/70 px-5 dark:divide-white/8">
          {summary.groups.map((group) => (
            <button
              className="group flex w-full items-center gap-3 py-3 text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
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

        <div className="mt-auto flex items-center justify-between border-zinc-200/70 border-t px-5 py-3 text-[10px] dark:border-white/8">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <PawPrint className="size-3.5" />
            Population clinique active
          </span>
          <span className="text-muted-foreground">30 jours</span>
        </div>
      </CardContent>
    </Card>
  );
}
