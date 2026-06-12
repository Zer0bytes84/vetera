import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Patient, User } from "@/types/db";

import { PrescriptionPrintLayout } from "./prescription-print-layout";

export interface PreviewItem {
  computedDoseMg?: number;
  computedVolumeMl?: number;
  concentrationMgPerMl?: number;
  dosageMax?: number;
  dosageMin?: number;
  dosagePerKg: number;
  dosageUnit: string;
  duration: string;
  form?: string;
  frequency: string;
  id: string;
  instructions?: string;
  medicationClass?: string;
  medicationName: string;
  quantity?: string;
  route?: string;
  sortOrder: number;
  warnings?: string;
  weightKgSnapshot?: number;
}

export interface PrescriptionPreviewProps {
  diagnosis: string;
  generalInstructions: string;
  items: PreviewItem[];
  onClose: () => void;
  patient: Patient;
  vet: User | null;
}

/**
 * Aperçu de l'ordonnance avant impression.
 * Affiche la mise en page A4 dans un dialog (hors impression), avec
 * un bouton "Imprimer" qui appelle `window.print()`.
 *
 * Le rendu imprimable est délégué à `PrescriptionPrintLayout` (qui porte
 * la classe `prescription-print`, ciblée par les media queries print).
 */
export function PrescriptionPreview({
  diagnosis,
  generalInstructions,
  items,
  onClose,
  patient,
  vet,
}: PrescriptionPreviewProps) {
  const { t } = useTranslation();
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90dvh] w-full max-w-3xl gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="border-border/60 border-b bg-muted/30 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base">
                {t("prescriptions.builder.preview")}
              </DialogTitle>
              <DialogDescription>
                {patient.name} · {patient.species}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-8"
                onClick={() => window.print()}
                size="sm"
                type="button"
              >
                {t("prescriptions.builder.print")}
              </Button>
              <Button
                className="h-8"
                onClick={onClose}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[calc(90dvh-64px)] overflow-y-auto bg-muted/20 px-5 py-5">
          <PrescriptionPrintLayout
            className="prescription-print mx-auto max-w-[210mm] rounded-md border border-border/60 bg-white px-10 py-8 text-foreground shadow-sm"
            diagnosis={diagnosis}
            generalInstructions={generalInstructions}
            items={items}
            patient={patient}
            vet={vet}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
