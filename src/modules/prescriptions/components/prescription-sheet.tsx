import { Pill } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

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
      <SheetContent
        className={cn(
          "flex w-full flex-col rounded-l-3xl border-white/20 border-l bg-white/70 p-0 shadow-2xl backdrop-blur-3xl sm:max-w-5xl dark:border-white/10 dark:bg-zinc-950/70",
          className
        )}
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="border-border/40 border-b bg-background/50 px-6 py-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
              <Pill className="size-5" weight="duotone" />
            </span>
            <div>
              <SheetTitle className="flex items-center gap-2 font-semibold text-foreground/90 text-lg tracking-tight">
                {t("prescriptions.title")}
                <span className="ml-1 font-normal text-muted-foreground">
                  · {patient.name}
                </span>
              </SheetTitle>
              <SheetDescription className="font-medium text-xs">
                {patient.species}
                {patient.breed ? ` · ${patient.breed}` : ""}
              </SheetDescription>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <SheetClose
              render={
                <Button
                  className="rounded-full bg-zinc-100/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <svg
                    className="size-5 text-muted-foreground"
                    fill="none"
                    height="15"
                    viewBox="0 0 15 15"
                    width="15"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      clipRule="evenodd"
                      d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                      fill="currentColor"
                      fillRule="evenodd"
                    />
                  </svg>
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-5">
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
