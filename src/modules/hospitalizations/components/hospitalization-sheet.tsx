import { Hospital } from "@/lib/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Hospitalization, Patient } from "@/types/db";

import { HospitalizationDetail } from "./hospitalization-detail";
import { HospitalizationList } from "./hospitalization-list";

interface HospitalizationSheetProps {
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patient: Patient;
}

/**
 * Drawer latéral (Sheet right, sm:max-w-3xl) qui héberge :
 *  - la liste des hospitalisations existantes (par défaut)
 *  - le détail d'une hospitalisation sélectionnée
 *  - le bouton "Nouvelle hospitalisation" (in-place dialog)
 */
export function HospitalizationSheet({
  className,
  onOpenChange,
  open,
  patient,
}: HospitalizationSheetProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Hospitalization | null>(null);

  return (
    <Sheet
      onOpenChange={(o) => {
        if (!o) {
          setSelected(null);
        }
        onOpenChange(o);
      }}
      open={open}
    >
      <SheetContent className={cn("w-full sm:max-w-5xl", className)} focusClose side="right">
        <SheetHeader icon={<Hospital />}>
          <SheetTitle>
            {t("modules.hospitalizations.title", "Hospitalisation")}
            <span className="ml-1 font-normal text-muted-foreground">
              · {patient.name}
            </span>
          </SheetTitle>
          <SheetDescription>
            {t("modules.hospitalizations.subtitle", "Suivi 24h")}
          </SheetDescription>
        </SheetHeader>
        {selected ? (
          <HospitalizationDetail
            hospitalization={selected}
            onBack={() => setSelected(null)}
            patient={patient}
          />
        ) : (
          <HospitalizationList onSelect={setSelected} patient={patient} />
        )}
      </SheetContent>
    </Sheet>
  );
}
