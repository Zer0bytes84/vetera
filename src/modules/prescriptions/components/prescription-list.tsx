import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Pill, Printer } from "@phosphor-icons/react";

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
}

export function PrescriptionList({
  className,
  patient,
  appointmentId,
  limit = 5,
  vet,
}: PrescriptionListProps) {
  const { t } = useTranslation();
  const prescriptions = usePrescriptionsRepository();
  const items = usePrescriptionItemsRepository();

  const list = (appointmentId
    ? prescriptions.forAppointment(appointmentId)
    : prescriptions.forPatient(patient.id)
  ).slice(0, limit);

  if (list.length === 0) {
    return (
      <Card className={cn("border-dashed bg-muted/20", className)}>
        <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center text-xs text-muted-foreground">
          <Pill weight="duotone" className="mb-2 size-6 text-muted-foreground/50" />
          {t("prescriptions.list.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Pill weight="duotone" className="size-3.5 text-primary" />
          {t("prescriptions.list.title")}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {t("prescriptions.list.count", { count: list.length })}
        </span>
      </div>
      <ul className="space-y-2">
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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            {dateStr}
            <Badge
              className="text-[10px]"
              variant={status === "signed" ? "default" : "secondary"}
            >
              {t(`prescriptions.status.${status}`)}
            </Badge>
          </CardTitle>
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
      </CardHeader>
      <CardContent className="px-3 pb-2.5 pt-0">
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
      </CardContent>
    </Card>
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
