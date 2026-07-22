import { Pill, Plus, Printer } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  usePrescriptionItemsRepository,
  usePrescriptionsRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/db";
import type { PrescriptionVet } from "../types";

import { formatNumber } from "../lib/dose-calculator";
import { PrescriptionPreview, type PreviewItem } from "./prescription-preview";

export interface PrescriptionListProps {
  /** Si fourni, limite l'affichage à cette consultation. */
  appointmentId?: string;
  className?: string;
  /** Limite du nombre d'ordonnances affichées. */
  limit?: number;
  onNew?: () => void;
  patient: Patient;
  vet?: PrescriptionVet | null;
}

export function PrescriptionList({
  className,
  patient,
  appointmentId,
  limit = 5,
  vet,
  onNew,
}: PrescriptionListProps) {
  const { t } = useTranslation();
  const prescriptions = usePrescriptionsRepository();
  const items = usePrescriptionItemsRepository();

  const list = (
    appointmentId
      ? prescriptions.forAppointment(appointmentId)
      : prescriptions.forPatient(patient.id)
  ).slice(0, limit);

  return (
    <div
      className={cn(
        "flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm dark:border-border",
        className
      )}
    >
      <div className="mb-6 flex flex-row items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
            <Pill className="size-3.5 text-primary" weight="duotone" />
            {t("prescriptions.list.title")}
          </div>
          <div className="mt-1 truncate text-muted-foreground text-xs">
            {list.length}{" "}
            {t("prescriptions.list.count", { count: list.length })}
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
            Nouvelle ordonnance
          </Button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 border-dashed bg-muted/20 px-4 py-8 text-center text-muted-foreground text-xs">
            <Pill
              className="mb-2 size-6 text-muted-foreground/50"
              weight="duotone"
            />
            {t("prescriptions.list.empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((p) => {
              const pItems = items.forPrescription(p.id);
              return (
                <PrescriptionRow
                  diagnosis={p.diagnosis}
                  items={pItems.map<PreviewItem>((it) => ({
                    id: it.id,
                    medicationName: it.medicationName,
                    medicationClass: it.medicationClass,
                    form: it.form,
                    dosagePerKg: it.dosagePerKg,
                    dosageUnit: it.dosageUnit,
                    dosageMin: it.dosageMin,
                    dosageMax: it.dosageMax,
                    concentrationMgPerMl: it.concentrationMgPerMl,
                    computedDoseMg: it.computedDoseMg,
                    computedVolumeMl: it.computedVolumeMl,
                    frequency: it.frequency,
                    duration: it.duration,
                    route: it.route,
                    quantity: it.quantity,
                    instructions: it.instructions,
                    warnings: it.warnings,
                    sortOrder: it.sortOrder,
                    weightKgSnapshot: p.weightKg,
                  }))}
                  key={p.id}
                  patient={patient}
                  prescriptionDate={p.prescriptionDate}
                  status={p.status}
                  vet={vet}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function PrescriptionRow({
  diagnosis,
  items,
  patient,
  prescriptionDate,
  status,
  vet,
}: {
  diagnosis?: string;
  items: PreviewItem[];
  patient: Patient;
  prescriptionDate: string;
  status: string;
  vet?: PrescriptionVet | null;
}) {
  const { t } = useTranslation();
  const dateStr = new Date(prescriptionDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mb-3 flex flex-col rounded-[16px] border border-border bg-card p-4 shadow-sm dark:border-border">
      <div className="mb-3 flex flex-row items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-sm">
            {dateStr}
            <Badge
              className="text-[10px]"
              variant={status === "signed" ? "default" : "secondary"}
            >
              {t(`prescriptions.status.${status}`)}
            </Badge>
          </div>
          {diagnosis ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {diagnosis}
            </p>
          ) : null}
        </div>
        <PrintButton
          diagnosis={diagnosis ?? ""}
          generalInstructions=""
          items={items}
          patient={patient}
          vet={vet ?? null}
        />
      </div>
      <div className="pt-0">
        <ul className="divide-y divide-border/40 text-[11px]">
          {items.slice(0, 4).map((it) => (
            <li
              className="flex items-center justify-between gap-2 py-1.5"
              key={it.id}
            >
              <span className="truncate font-medium">
                {it.medicationName}
                <span className="ml-1 text-muted-foreground">
                  · {it.frequency} · {it.duration}
                </span>
              </span>
              {it.computedDoseMg == null ? null : (
                <span className="text-muted-foreground tabular-nums">
                  {formatNumber(it.computedDoseMg)} mg
                </span>
              )}
            </li>
          ))}
          {items.length > 4 ? (
            <li className="pt-1 text-[10px] text-muted-foreground">
              + {items.length - 4}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function PrintButton({
  diagnosis,
  generalInstructions,
  items,
  patient,
  vet,
}: {
  diagnosis: string;
  generalInstructions: string;
  items: PreviewItem[];
  patient: Patient;
  vet: PrescriptionVet | null;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="h-7 gap-1"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Printer className="size-3.5" weight="duotone" />
        {t("prescriptions.builder.print")}
      </Button>
      {open ? (
        <PrescriptionPreview
          diagnosis={diagnosis}
          generalInstructions={generalInstructions}
          items={items}
          onClose={() => setOpen(false)}
          patient={patient}
          vet={vet}
        />
      ) : null}
    </>
  );
}
