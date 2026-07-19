import { PencilSimple, Plus, Syringe, Trash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
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

function formatDateShort(value?: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
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

  const entries = repo.forPatient(patientId);

  const handleDelete = async (entry: Vaccination) => {
    if (!window.confirm(t("patientDetail.vaccinations.confirmDelete"))) {
      return;
    }
    const ok = await repo.remove(entry.id);
    if (ok) {
      toast.success(t("patientDetail.vaccinations.delete"));
    }
  };

  return (
    <div className={cn("clinical-surface flex flex-col p-5 sm:p-6", className)}>
      <div className="mb-6 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            {t("patientDetail.vaccinations.title")}
          </div>
          <div className="mt-1 truncate text-muted-foreground text-xs">
            {entries.length}{" "}
            {entries.length > 1
              ? t("patientDetail.vaccinations.plural")
              : t("patientDetail.vaccinations.singular")}
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
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Syringe
                  className="size-7 text-muted-foreground"
                  weight="duotone"
                />
              </EmptyMedia>
              <EmptyTitle>{t("patientDetail.vaccinations.empty")}</EmptyTitle>
              <EmptyDescription>
                {t("patientDetail.vaccinations.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                className="rounded-lg"
                onClick={onNew}
                size="sm"
                variant="outline"
              >
                <Plus className="mr-1.5 size-4" weight="bold" />
                {t("patientDetail.vaccinations.newVaccine")}
              </Button>
            </EmptyContent>
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
                      onClick={() => handleDelete(entry)}
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
    </div>
  );
}
