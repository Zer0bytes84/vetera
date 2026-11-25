import { Pill } from "@/lib/icons";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/db";
import type { PrescriptionVet } from "../types";

import { PrescriptionBuilder } from "./prescription-builder";

interface PrescriptionSheetProps {
  appointmentId: string;
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patient: Patient;
  vet?: PrescriptionVet | null;
}

/**
 * Drawer latéral (Sheet right, sm:max-w-4xl) qui monte le PrescriptionBuilder.
 * S'ouvre depuis le bouton "Ordonnance" dans le header d'une consultation.
 */
export function PrescriptionSheet({
  appointmentId,
  className,
  onOpenChange,
  open,
  patient,
  vet,
}: PrescriptionSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className={cn("w-full sm:max-w-5xl", className)} focusClose side="right">
        <SheetHeader icon={<Pill />}>
          <SheetTitle>
            {t("prescriptions.title")}
            <span className="ml-1 font-normal text-muted-foreground">
              · {patient.name}
            </span>
          </SheetTitle>
          <SheetDescription>
            {patient.species}
            {patient.breed ? ` · ${patient.breed}` : ""}
          </SheetDescription>
        </SheetHeader>
        <PrescriptionBuilder
          appointmentId={appointmentId}
          patient={patient}
          vet={vet ?? null}
        />
      </SheetContent>
    </Sheet>
  );
}
