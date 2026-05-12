"use client";

import { ArrowRight01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { View } from "@/types";

type DashboardHeroOrbitProps = {
  title: string;
  subtitle: string;
  revenue: string;
  appointments: string;
  alerts: string;
  onNavigate: (view: View) => void;
};

export function DashboardHeroOrbit({
  title,
  subtitle,
  revenue,
  appointments,
  alerts,
  onNavigate,
}: DashboardHeroOrbitProps) {
  const signals = [
    {
      label: "Revenus 30j",
      value: revenue,
      tone: "text-orange-600 dark:text-orange-300",
    },
    {
      label: "RDV aujourd'hui",
      value: appointments,
      tone: "text-violet-600 dark:text-violet-300",
    },
    {
      label: "Alertes",
      value: alerts,
      tone: "text-rose-600 dark:text-rose-300",
    },
  ];

  return (
    <Card className="dashboard-luxe-card relative h-auto max-h-none min-h-0 overflow-hidden rounded-[32px] bg-card shadow-none">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[var(--dashboard-aura-blue)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[var(--dashboard-aura-mint)] blur-3xl" />
      <CardContent className="relative grid items-start gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
        <div className="flex min-h-[260px] flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="dashboard-soft-panel inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium text-muted-foreground text-xs">
              <HugeiconsIcon
                className="size-3.5 text-primary"
                icon={SparklesIcon}
                strokeWidth={2}
              />
              Cockpit clinique en temps réel
            </div>
            <div className="max-w-3xl space-y-2">
              <h2 className="font-semibold text-[34px] text-foreground leading-[0.95] tracking-[-0.065em] sm:text-[46px]">
                {title}
              </h2>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-full px-4"
              onClick={() => onNavigate("agenda")}
            >
              Nouveau RDV
              <HugeiconsIcon
                className="size-4"
                icon={ArrowRight01Icon}
                strokeWidth={2}
              />
            </Button>
            <Button
              className="rounded-full px-4"
              onClick={() => onNavigate("patients")}
              variant="outline"
            >
              Ajouter un patient
            </Button>
            <Button
              className="rounded-full px-4"
              onClick={() => onNavigate("finances")}
              variant="outline"
            >
              Voir finances
            </Button>
          </div>
        </div>

        <div className="dashboard-soft-panel grid min-w-0 gap-3 overflow-hidden rounded-[24px] p-2 sm:grid-cols-3 lg:grid-cols-1">
          {signals.map((signal, index) => (
            <div
              className="min-w-0 rounded-[18px] border border-border/50 bg-card/70 p-4 transition-transform duration-300 hover:-translate-y-0.5"
              key={signal.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[11px] text-muted-foreground">
                    {signal.label}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-semibold text-2xl tabular-nums tracking-[-0.04em]",
                      signal.tone
                    )}
                  >
                    {signal.value}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
