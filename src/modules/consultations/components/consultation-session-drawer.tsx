import { Notebook } from "@phosphor-icons/react";
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
import { SoapPanel } from "./soap-panel";

interface ConsultationSessionDrawerProps {
  appointmentId: string;
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  patientId: string;
  patientName?: string;
  trigger?: React.ReactNode;
}

export function ConsultationSessionDrawer({
  appointmentId,
  className,
  onOpenChange,
  open,
  patientId,
  patientName,
  trigger,
}: ConsultationSessionDrawerProps) {
  const { t } = useTranslation();

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      {trigger ? <div className="inline-flex">{trigger}</div> : null}
      <SheetContent
        className={cn("w-full sm:max-w-3xl", className)}
        side="right"
      >
        <SheetHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Notebook weight="duotone" className="size-4" />
            </span>
            <div>
              <SheetTitle className="text-base">
                {t("consultations.soap.title")}
                {patientName ? ` · ${patientName}` : ""}
              </SheetTitle>
              <SheetDescription>
                {t("consultations.soap.subtitle")}
              </SheetDescription>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <SheetClose
              render={
                <Button size="sm" type="button" variant="ghost">
                  {t("common.close")}
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <SoapPanel
            appointmentId={appointmentId}
            patientId={patientId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
