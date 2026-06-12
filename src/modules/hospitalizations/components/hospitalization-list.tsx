import { ArrowsClockwise, Hospital, Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useHospitalizationsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Hospitalization, Patient } from "@/types/db";

import { formatDuration, formatTimeAgo } from "../lib/format";
import { HospitalizationDialog } from "./hospitalization-dialog";
import { HospitalizationStatusBadge } from "./hospitalization-status-badge";

export type HospitalizationStatusFilter =
  | "all"
  | "active"
  | "admitted"
  | "monitoring"
  | "critical"
  | "discharged";

function useNowTick(intervalMs = 60_000): number {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function HospitalizationList({
  patient,
  onSelect,
  className,
}: {
  patient: Patient;
  onSelect?: (h: Hospitalization) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const repo = useHospitalizationsRepository();
  const [filter, setFilter] = useState<HospitalizationStatusFilter>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = useNowTick();

  const all = repo.forPatient(patient.id);
  const filtered = all.filter((h) => {
    if (filter === "all") {
      return true;
    }
    if (filter === "active") {
      return (
        h.status === "admitted" ||
        h.status === "monitoring" ||
        h.status === "critical"
      );
    }
    return h.status === filter;
  });

  const filters: { value: HospitalizationStatusFilter; label: string }[] = [
    {
      value: "active",
      label: t("modules.hospitalizations.status.monitoring", "En cours"),
    },
    {
      value: "admitted",
      label: t("modules.hospitalizations.status.admitted", "Admis"),
    },
    {
      value: "critical",
      label: t("modules.hospitalizations.status.critical", "Critique"),
    },
    {
      value: "discharged",
      label: t("modules.hospitalizations.status.discharged", "Sorti"),
    },
    { value: "all", label: t("common.all", "Tous") },
  ];

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[16px] border border-border bg-card shadow-sm dark:border-border",
        className
      )}
    >
      <div className="border-border/40 border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10">
            <Hospital className="size-5 text-sky-600" weight="duotone" />
          </div>
          <div className="grid flex-1 gap-0.5">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.06em]">
              {t("modules.hospitalizations.subtitle", "Suivi 24h")}
            </div>
            <div className="font-semibold text-lg tracking-tight">
              {t("modules.hospitalizations.title", "Hospitalisation")}
            </div>
          </div>
          <Button
            className="gap-1.5 rounded-lg"
            onClick={() => setDialogOpen(true)}
            size="sm"
          >
            <Plus className="size-3.5" weight="bold" />
            {t(
              "modules.hospitalizations.newHospitalization",
              "Nouvelle hospitalisation"
            )}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-medium text-[11px] transition-all",
                filter === f.value
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                  : "border-border/50 bg-background text-muted-foreground hover:border-border hover:text-foreground"
              )}
              key={f.value}
              onClick={() => setFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-0">
        {filtered.length === 0 ? (
          <Empty className="m-6 border border-dashed">
            <EmptyHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-sky-500/10">
                <Hospital className="size-6 text-sky-600" weight="duotone" />
              </div>
              <EmptyTitle>
                {t(
                  "modules.hospitalizations.empty.title",
                  "Aucune hospitalisation"
                )}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "modules.hospitalizations.empty.description",
                  "Cliquez sur « Nouvelle hospitalisation » pour démarrer le suivi."
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((h) => {
              const durationMin =
                h.status === "discharged" && h.dischargeDate
                  ? Math.floor(
                      (new Date(h.dischargeDate).getTime() -
                        new Date(h.admissionDate).getTime()) /
                        60_000
                    )
                  : Math.floor(
                      (now - new Date(h.admissionDate).getTime()) / 60_000
                    );
              return (
                <li key={h.id}>
                  <button
                    className="grid w-full gap-2 px-6 py-4 text-left transition-colors hover:bg-muted/30"
                    onClick={() => onSelect?.(h)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <HospitalizationStatusBadge status={h.status} />
                      <Badge
                        className="border-border/40 bg-background"
                        variant="outline"
                      >
                        <ArrowsClockwise className="mr-1 size-3" />
                        {formatDuration(durationMin)}
                      </Badge>
                      {h.cage ? (
                        <Badge
                          className="border-border/40 bg-background"
                          variant="outline"
                        >
                          {t("modules.hospitalizations.fields.cage", "Box")}{" "}
                          {h.cage}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-medium text-foreground text-sm">
                      {h.reason}
                    </p>
                    {h.diagnosis ? (
                      <p className="text-muted-foreground text-xs">
                        {h.diagnosis}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground/80">
                      {t("modules.hospitalizations.fields.admittedAt", "Admis")}{" "}
                      : {formatTimeAgo(h.admissionDate)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <HospitalizationDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        patient={patient}
      />
    </div>
  );
}
