import { Notebook, X } from "@phosphor-icons/react";
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
        className={cn(
          "flex w-full flex-col border-border border-l bg-background p-0 shadow-xl sm:max-w-6xl",
          className
        )}
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="border-border border-b bg-background px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
              <Notebook className="size-5" weight="duotone" />
            </span>
            <div>
              <SheetTitle className="font-semibold text-foreground text-lg tracking-[-0.02em]">
                {t("consultations.soap.title")}
                {patientName ? (
                  <span className="ml-1 font-medium text-muted-foreground">
                    · {patientName}
                  </span>
                ) : (
                  ""
                )}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {t("consultations.soap.subtitle")}
              </SheetDescription>
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <SheetClose
              render={
                <Button
                  className="size-10 rounded-xl hover:bg-muted"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <X className="size-5 text-muted-foreground" weight="bold" />
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <SoapPanel
            appointmentId={appointmentId}
            key={appointmentId}
            patientId={patientId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
