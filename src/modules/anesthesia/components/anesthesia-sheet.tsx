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
        showCloseButton={false}
        className={cn(
          "w-full sm:max-w-5xl border-l border-white/20 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl shadow-2xl rounded-l-3xl p-0 flex flex-col",
          className
        )}
        side="right"
      >
        <SheetHeader className="border-b border-border/40 px-6 py-5 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 text-violet-600 shadow-sm border border-violet-500/10">
              <Syringe weight="duotone" className="size-5" />
            </span>
            <div>
              <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground/90">
                {t("modules.anesthesia.title", "Anesthésie")}
                <span className="text-muted-foreground font-normal ml-1">· {patient.name}</span>
              </SheetTitle>
              <SheetDescription className="text-xs font-medium">
                {t("modules.anesthesia.subtitle", "Induction · Maintenance · Réveil")}
              </SheetDescription>
            </div>
          </div>
          <div className="absolute right-4 top-4">
            <SheetClose
              render={
                <Button size="icon" type="button" variant="ghost" className="rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <span className="sr-only">{t("common.close")}</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5 text-muted-foreground"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
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
