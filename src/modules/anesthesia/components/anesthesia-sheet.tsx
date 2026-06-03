import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Syringe } from "@phosphor-icons/react";

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
import type { AnesthesiaSheet, Patient } from "@/types/db";

import { AnesthesiaDetail } from "./anesthesia-detail";
import { AnesthesiaList } from "./anesthesia-list";

interface AnesthesiaSheetProps {
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patient: Patient;
}

export function AnesthesiaSheet({
  className,
  onOpenChange,
  open,
  patient,
}: AnesthesiaSheetProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AnesthesiaSheet | null>(null);

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
            <span className="flex size-9 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
              <Syringe weight="duotone" className="size-4" />
            </span>
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                {t("modules.anesthesia.title", "Anesthésie")}
                <span className="text-muted-foreground/60">·</span>
                <span className="font-medium text-muted-foreground">
                  {patient.name}
                </span>
              </SheetTitle>
              <SheetDescription>
                {t("modules.anesthesia.subtitle", "Induction · Maintenance · Réveil")}
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
            <AnesthesiaDetail
              onBack={() => setSelected(null)}
              patient={patient}
              sheet={selected}
            />
          ) : (
            <AnesthesiaList onSelect={setSelected} patient={patient} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
