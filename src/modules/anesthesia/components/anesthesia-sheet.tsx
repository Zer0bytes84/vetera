import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Syringe } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type {
  AnesthesiaSheet as AnesthesiaSheetRow,
  Patient,
} from "@/types/db";

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
  const [selected, setSelected] = useState<AnesthesiaSheetRow | null>(null);

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
      <SheetContent
        className={cn("w-full sm:max-w-5xl", className)}
        focusClose
        side="right"
      >
        <SheetHeader icon={<Syringe />}>
          <SheetTitle>
            {t("modules.anesthesia.title", "Anesthésie")}
            <span className="ml-1 font-normal text-muted-foreground">
              · {patient.name}
            </span>
          </SheetTitle>
          <SheetDescription>
            {t(
              "modules.anesthesia.subtitle",
              "Induction · Maintenance · Réveil"
            )}
          </SheetDescription>
        </SheetHeader>
        {selected ? (
          <AnesthesiaDetail
            onBack={() => setSelected(null)}
            patient={patient}
            sheet={selected}
          />
        ) : (
          <AnesthesiaList onSelect={setSelected} patient={patient} />
        )}
      </SheetContent>
    </Sheet>
  );
}
