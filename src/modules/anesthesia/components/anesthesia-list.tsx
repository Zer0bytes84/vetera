import { useState as useReactState } from "react";
import { useTranslation } from "react-i18next";

import { Syringe } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useAnesthesiaSheetsRepository } from "@/data/repositories";
import { formatDuration } from "@/modules/hospitalizations/lib/format";
import { cn } from "@/lib/utils";
import type { AnesthesiaSheet, Patient } from "@/types/db";

import { computeAnesthesiaDurationMinutes } from "../lib/format";
import { AnesthesiaSheetDialog } from "./anesthesia-sheet-dialog";
import { AnesthesiaStatusBadge } from "./anesthesia-status-badge";

export type AnesthesiaStatusFilter =
  | "all"
  | "active"
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export function AnesthesiaList({
  patient,
  onSelect,
  className,
}: {
  patient: Patient;
  onSelect?: (sheet: AnesthesiaSheet) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const repo = useAnesthesiaSheetsRepository();
  const [filter, setFilter] = useReactState<AnesthesiaStatusFilter>("active");
  const [dialogOpen, setDialogOpen] = useReactState(false);
  const all = repo.forPatient(patient.id);

  const filtered = all.filter((s) => {
    if (filter === "all") return true;
    if (filter === "active")
      return s.status === "planned" || s.status === "in_progress";
    return s.status === filter;
  });

  const filters: { value: AnesthesiaStatusFilter; label: string }[] = [
    { value: "active", label: t("modules.anesthesia.status.in_progress", "En cours") },
    { value: "planned", label: t("modules.anesthesia.status.planned", "Planifiée") },
    { value: "completed", label: t("modules.anesthesia.status.completed", "Terminée") },
    { value: "cancelled", label: t("modules.anesthesia.status.cancelled", "Annulée") },
    { value: "all", label: t("common.all", "Tous") },
  ];

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] shadow-sm flex flex-col overflow-hidden", className)}>
      <div className="border-border/40 border-b p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Syringe weight="duotone" className="size-5 text-violet-600" />
          </div>
          <div className="grid flex-1 gap-0.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {t("modules.anesthesia.subtitle", "Induction · Maintenance · Réveil")}
            </div>
            <div className="text-lg tracking-tight font-semibold">
              {t("modules.anesthesia.title", "Anesthésie")}
            </div>
          </div>
          <Button
            className="gap-1.5 rounded-lg"
            onClick={() => setDialogOpen(true)}
            size="sm"
          >
            <Syringe className="size-3.5" weight="bold" />
            {t("modules.anesthesia.newSheet", "Nouvelle feuille d'anesthésie")}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              className={cn(
                "rounded-full border px-3 py-1 font-medium text-[11px] transition-all",
                filter === f.value
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200"
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
      <div className="flex flex-col flex-1 p-0">
        {filtered.length === 0 ? (
          <Empty className="m-6 border border-dashed">
            <EmptyHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-violet-500/10">
                <Syringe className="size-6 text-violet-600" weight="duotone" />
              </div>
              <EmptyTitle>
                {t("modules.anesthesia.empty.title", "Aucune feuille d'anesthésie")}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "modules.anesthesia.empty.description",
                  "Démarrez une procédure pour enregistrer le protocole."
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((s) => {
              const durationMin = computeAnesthesiaDurationMinutes(
                s.startedAt,
                s.endedAt
              );
              return (
                <li key={s.id}>
                  <button
                    className="grid w-full gap-2 px-6 py-4 text-left transition-colors hover:bg-muted/30"
                    onClick={() => onSelect?.(s)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <AnesthesiaStatusBadge status={s.status} />
                      {s.asaStatus ? (
                        <Badge className="border-border/40 bg-background" variant="outline">
                          ASA {s.asaStatus}
                        </Badge>
                      ) : null}
                      {s.emergency ? (
                        <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-700" variant="outline">
                          Urgence
                        </Badge>
                      ) : null}
                      {s.startedAt ? (
                        <Badge className="border-border/40 bg-background" variant="outline">
                          {formatDuration(durationMin)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-medium text-foreground text-sm">
                      {s.procedureName}
                    </p>
                    {s.scheduledAt ? (
                      <p className="text-[11px] text-muted-foreground/80">
                        {t("modules.anesthesia.fields.scheduledAt", "Planifiée")} :{" "}
                        {new Date(s.scheduledAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AnesthesiaSheetDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        patient={patient}
      />
    </div>
  );
}
