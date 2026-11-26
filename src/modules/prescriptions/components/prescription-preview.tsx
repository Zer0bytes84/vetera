import { FileText } from "@/lib/icons";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Patient } from "@/types/db";
import type { PrescriptionVet, PreviewItem } from "../types";

import { PrescriptionPrintLayout } from "./prescription-print-layout";

export type { PreviewItem };

export interface PrescriptionPreviewProps {
  diagnosis: string;
  generalInstructions: string;
  items: PreviewItem[];
  onClose: () => void;
  patient: Patient;
  vet: PrescriptionVet | null;
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader icon={<FileText strokeWidth={1.8} />}>
          <DialogTitle>{t("prescriptions.builder.preview")}</DialogTitle>
          <DialogDescription>
            {patient.name} · {patient.species}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => window.print()} type="button">
            {t("prescriptions.builder.print")}
          </Button>
        </DialogFooter>
        <div>
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
