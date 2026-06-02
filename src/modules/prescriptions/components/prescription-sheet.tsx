import { useTranslation } from "react-i18next";

import { Pill } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Patient, User } from "@/types/db";

import { PrescriptionBuilder } from "./prescription-builder";

interface PrescriptionSheetProps {
  appointmentId: string;
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patient: Patient;
  vet?: User | null;
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
      <SheetContent
        className={cn("w-full gap-0 p-0 sm:max-w-4xl", className)}
        side="right"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Pill weight="duotone" className="size-4" />
            </span>
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                {t("prescriptions.title")}
                <span className="text-muted-foreground/60">·</span>
                <span className="font-medium text-muted-foreground">
                  {patient.name}
                </span>
              </SheetTitle>
              <SheetDescription>
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </SheetDescription>
            </div>
          </div>
          <SheetClose
            render={
              <Button size="sm" type="button" variant="ghost">
                {t("common.close")}
              </Button>
            }
          />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PrescriptionBuilder
            appointmentId={appointmentId}
            patient={patient}
            vet={vet ?? null}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
