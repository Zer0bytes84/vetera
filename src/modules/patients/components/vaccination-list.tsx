import { PencilSimple, Plus, Syringe, Trash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex flex-row items-start justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
            {t("patientDetail.vaccinations.title")}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {entries.length}{" "}
            {entries.length > 1
              ? t("patientDetail.vaccinations.plural")
              : t("patientDetail.vaccinations.singular")}
          </div>
        </div>
        {onNew ? (
          <Button
            className="h-8 gap-1.5 rounded-lg shrink-0"
            onClick={onNew}
            size="sm"
            variant="default"
          >
            <Plus weight="bold" className="size-3.5" />
            {t("patientDetail.vaccinations.newVaccine")}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-col flex-1">
        {entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Syringe weight="duotone" className="size-7 text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>{t("patientDetail.vaccinations.empty")}</EmptyTitle>
              <EmptyDescription>
                {t("patientDetail.vaccinations.emptyDescription")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onNew} size="sm" variant="outline" className="rounded-lg">
                <Plus weight="bold" className="size-4 mr-1.5" />
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
                      <span className="truncate text-sm font-semibold">
                        {entry.vaccineName}
                      </span>
                      {entry.vaccineType ? (
                        <Badge
                          className="rounded-full px-1.5 py-0 text-[10px] font-medium"
                          variant="outline"
                        >
                          {entry.vaccineType}
                        </Badge>
                      ) : null}
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-0 text-[10px] font-medium",
                          meta.className
                        )}
                        variant="secondary"
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
                      <p className="line-clamp-1 text-xs text-muted-foreground/80">
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
                      <PencilSimple weight="duotone" className="size-4" />
                    </Button>
                    <Button
                      aria-label={t("patientDetail.vaccinations.delete")}
                      className="size-8 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                      onClick={() => handleDelete(entry)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash weight="duotone" className="size-4" />
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
