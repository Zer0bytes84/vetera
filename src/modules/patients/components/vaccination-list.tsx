import { PencilSimple, Plus, Syringe, Trash } from "@/lib/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  VACCINATION_STATUS_META,
  type VaccinationStatus,
} from "@/config/status-meta";
import { useVaccinationsRepository } from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Vaccination } from "@/types/db";
import { getVaccinationStatus } from "../lib";

interface VaccinationListProps {
  className?: string;
  onEdit: (entry: Vaccination) => void;
  onNew: () => void;
  patientId: string;
}

import { normalizeDate } from "./patients-shared";

function formatDateShort(value?: string) {
  if (!value) {
    return "—";
  }
  const date = normalizeDate(value);
  if (!date) {
    return "—";
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function VaccinationList({
  className,
  onEdit,
  onNew,
  patientId,
}: VaccinationListProps) {
  const { t } = useTranslation();
  const repo = useVaccinationsRepository();
  const [deleteTarget, setDeleteTarget] = useState<Vaccination | null>(null);

  const entries = repo.forPatient(patientId);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ok = await repo.remove(deleteTarget.id);
    if (ok) {
      toast.success(t("patientDetail.vaccinations.delete"));
    }
    setDeleteTarget(null);
  };

  return (
    <div className={cn("clinical-surface flex flex-col p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-row items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Syringe className="size-4" weight="duotone" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
              {t("patientDetail.vaccinations.title")}
            </div>
            <div className="mt-0.5 truncate text-muted-foreground text-xs">
              {entries.length}{" "}
              {entries.length > 1
                ? t("patientDetail.vaccinations.plural", {
                    defaultValue: "vaccins",
                  })
                : t("patientDetail.vaccinations.singular", {
                    defaultValue: "vaccin",
                  })}
            </div>
          </div>
        </div>
        {onNew ? (
          <Button
            className="h-8 shrink-0 gap-1.5 rounded-lg"
            onClick={onNew}
            size="sm"
            variant="default"
          >
            <Plus className="size-3.5" weight="bold" />
            {t("patientDetail.vaccinations.newVaccine")}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col">
        {entries.length === 0 ? (
          <Empty className="min-h-[120px] py-4">
            <EmptyHeader>
              <EmptyMedia>
                <Syringe
                  className="size-7 text-muted-foreground"
                  weight="duotone"
                />
              </EmptyMedia>
              <EmptyTitle>{t("patientDetail.vaccinations.empty")}</EmptyTitle>
              <EmptyDescription>
                {t("patientDetail.vaccinations.emptyDescription", {
                  defaultValue: "Ajoutez le premier vaccin de ce patient.",
                })}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y divide-border/40">
            {entries.map((entry) => {
              const status: VaccinationStatus = getVaccinationStatus(entry);
              const meta = VACCINATION_STATUS_META[status];
              return (
                <li
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  key={entry.id}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-sm">
                        {entry.vaccineName}
                      </span>
                      {entry.vaccineType ? (
                        <Badge
                          className="rounded-full px-1.5 py-0 font-medium text-[10px]"
                          variant="outline"
                        >
                          {entry.vaccineType}
                        </Badge>
                      ) : null}
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0 font-medium text-[10px]",
                          meta.className
                        )}
                        variant="secondary"
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                      <span>✓ {formatDateShort(entry.administeredAt)}</span>
                      {entry.nextDueAt ? (
                        <span>↻ {formatDateShort(entry.nextDueAt)}</span>
                      ) : null}
                      {entry.batchNumber ? (
                        <span>Lot {entry.batchNumber}</span>
                      ) : null}
                      {entry.manufacturer ? (
                        <span>{entry.manufacturer}</span>
                      ) : null}
                    </div>
                    {entry.notes ? (
                      <p className="line-clamp-1 text-muted-foreground/80 text-xs">
                        {entry.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      aria-label={t("patientDetail.vaccinations.editVaccine")}
                      className="size-8"
                      onClick={() => onEdit(entry)}
                      size="icon"
                      variant="ghost"
                    >
                      <PencilSimple className="size-4" weight="duotone" />
                    </Button>
                    <Button
                      aria-label={t("patientDetail.vaccinations.delete")}
                      className="size-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                      onClick={() => setDeleteTarget(entry)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash className="size-4" weight="duotone" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("patientDetail.vaccinations.confirmDeleteTitle", {
                defaultValue: "Supprimer ce vaccin ?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("patientDetail.vaccinations.confirmDeleteMessage", {
                    defaultValue: `« ${deleteTarget.vaccineName} » sera définitivement retiré du carnet. Cette action est irréversible.`,
                  })
                : t("patientDetail.vaccinations.confirmDelete", {
                    defaultValue: "Supprimer ce vaccin du carnet ?",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel", { defaultValue: "Annuler" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete", { defaultValue: "Supprimer" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
