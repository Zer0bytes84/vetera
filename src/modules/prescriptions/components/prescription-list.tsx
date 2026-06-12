import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Pill, Printer, Plus } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  usePrescriptionItemsRepository,
  usePrescriptionsRepository,
} from "@/data/repositories";
import { cn } from "@/lib/utils";
import type { Patient, User } from "@/types/db";

import { formatNumber } from "../lib/dose-calculator";
import {
  PrescriptionPreview,
  type PreviewItem,
} from "./prescription-preview";

export interface PrescriptionListProps {
  className?: string;
  patient: Patient;
  /** Si fourni, limite l'affichage à cette consultation. */
  appointmentId?: string;
  /** Limite du nombre d'ordonnances affichées. */
  limit?: number;
  vet?: User | null;
  onNew?: () => void;
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

  const list = (appointmentId
    ? prescriptions.forAppointment(appointmentId)
    : prescriptions.forPatient(patient.id)
  ).slice(0, limit);

  return (
    <div className={cn("bg-card border border-border dark:border-border rounded-[16px] p-6 shadow-sm flex flex-col", className)}>
      <div className="flex flex-row items-start justify-between gap-4 mb-6">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate flex items-center gap-1.5">
            <Pill weight="duotone" className="size-3.5 text-primary" />
            {t("prescriptions.list.title")}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {list.length} {t("prescriptions.list.count", { count: list.length })}
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
            Nouvelle ordonnance
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col flex-1">
        {list.length === 0 ? (
          <div className="border border-dashed border-border/60 bg-muted/20 rounded-xl flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
            <Pill weight="duotone" className="mb-2 size-6 text-muted-foreground/50" />
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
  vet?: User | null;
}) {
  const { t } = useTranslation();
  const dateStr = new Date(prescriptionDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-card border border-border dark:border-border rounded-[16px] p-4 shadow-sm flex flex-col mb-3">
      <div className="flex flex-row items-center justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
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
              {it.computedDoseMg != null ? (
                <span className="tabular-nums text-muted-foreground">
                  {formatNumber(it.computedDoseMg)} mg
                </span>
              ) : null}
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
  vet: User | null;
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
        <Printer weight="duotone" className="size-3.5" />
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
