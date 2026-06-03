import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Hospital } from "@phosphor-icons/react";

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
    <Sheet onOpenChange={(o) => {
      if (!o) setSelected(null);
      onOpenChange(o);
    }} open={open}>
      <SheetContent
        className={cn("w-full gap-0 p-0 sm:max-w-3xl", className)}
        side="right"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
              <Hospital weight="duotone" className="size-4" />
            </span>
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                {t("modules.hospitalizations.title", "Hospitalisation")}
                <span className="text-muted-foreground/60">·</span>
                <span className="font-medium text-muted-foreground">
                  {patient.name}
                </span>
              </SheetTitle>
              <SheetDescription>
                {t("modules.hospitalizations.subtitle", "Suivi 24h")}
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
        <div className="flex-1 overflow-y-auto p-5">
          {selected ? (
            <HospitalizationDetail
              hospitalization={selected}
              onBack={() => setSelected(null)}
              patient={patient}
            />
          ) : (
            <HospitalizationList onSelect={setSelected} patient={patient} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
