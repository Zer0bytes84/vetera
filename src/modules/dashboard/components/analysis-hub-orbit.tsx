"use client";

import {
  AnalyticsUpIcon,
  Calendar01Icon,
  ClinicIcon,
  MoneyBag02Icon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

type HugeIcon = ComponentProps<typeof HugeiconsIcon>["icon"];

type InsightItem = {
  label: string;
  value: string;
  tone: "cyan" | "violet" | "emerald" | "amber";
};

type AnalysisHubOrbitProps = {
  onNavigate: (view: View) => void;
  insights: InsightItem[];
};

const missions: Array<{
  label: string;
  hint: string;
  view: View;
  icon: HugeIcon;
  accent: string;
}> = [
  {
    label: "Planning",
    hint: "RDV",
    view: "agenda",
    icon: Calendar01Icon,
    accent: "bg-blue-500",
  },
  {
    label: "Soin",
    hint: "Clinique",
    view: "clinique",
    icon: ClinicIcon,
    accent: "bg-emerald-500",
  },
  {
    label: "Dossier",
    hint: "Patient",
    view: "patients",
    icon: UserGroupIcon,
    accent: "bg-violet-500",
  },
  {
    label: "Caisse",
    hint: "Factures",
    view: "finances",
    icon: MoneyBag02Icon,
    accent: "bg-orange-500",
  },
  {
    label: "Tâches",
    hint: "Urgences",
    view: "taches",
    icon: Task01Icon,
    accent: "bg-rose-500",
  },
  {
    label: "Analytics",
    hint: "Finance",
    view: "finances_analytics",
    icon: AnalyticsUpIcon,
    accent: "bg-cyan-500",
  },
];

export function AnalysisHubOrbit({
  onNavigate,
  insights,
}: AnalysisHubOrbitProps) {
  const leadInsight = insights[0];
  const secondaryInsights = insights.slice(1);

  return (
    <Card className="dashboard-luxe-card h-full overflow-hidden rounded-[28px] bg-card/95 shadow-none">
      <CardHeader className="border-border/50 border-b px-5 py-4">
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.08em]">
          Radar clinique
        </CardDescription>
        <CardTitle className="font-semibold text-[21px] tracking-[-0.045em]">
          Priorités du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="dashboard-soft-panel relative overflow-hidden rounded-[22px] p-4">
          <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative">
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              Signal principal
            </p>
            <p className="mt-3 font-semibold text-[30px] text-foreground leading-none tracking-[-0.055em]">
              {leadInsight?.value ?? "Stable"}
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              {leadInsight?.label ?? "Aucun signal critique détecté"}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {secondaryInsights.map((insight) => (
                <div
                  className="rounded-2xl border border-border/60 bg-background/70 p-3"
                  key={insight.label}
                >
                  <p className="truncate text-[10px] text-muted-foreground">
                    {insight.label}
                  </p>
                  <p className="mt-1 truncate font-semibold text-foreground text-sm">
                    {insight.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {missions.map((mission) => (
            <button
              className="dashboard-soft-panel group flex min-h-[72px] items-center gap-3 rounded-[18px] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-border"
              key={mission.label}
              onClick={() => onNavigate(mission.view)}
              type="button"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 size-2 rounded-full",
                    mission.accent
                  )}
                />
                <HugeiconsIcon
                  className="size-4"
                  icon={mission.icon}
                  strokeWidth={1.8}
                />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-foreground text-sm">
                  {mission.label}
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {mission.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
