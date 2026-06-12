import { Notebook, XCircle } from "@phosphor-icons/react";
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
          "flex w-full flex-col rounded-l-3xl border-white/20 border-l bg-white/70 p-0 shadow-2xl backdrop-blur-3xl sm:max-w-5xl dark:border-white/10 dark:bg-zinc-950/70",
          className
        )}
        showCloseButton={false}
        side="right"
      >
        <SheetHeader className="border-border/40 border-b bg-background/50 px-6 py-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
              <Notebook className="size-5" weight="duotone" />
            </span>
            <div>
              <SheetTitle className="font-semibold text-foreground/90 text-lg tracking-tight">
                {t("consultations.soap.title")}
                {patientName ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {patientName}
                  </span>
                ) : (
                  ""
                )}
              </SheetTitle>
              <SheetDescription className="font-medium text-xs">
                {t("consultations.soap.subtitle")}
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
                  <XCircle
                    className="size-5 text-muted-foreground"
                    weight="fill"
                  />
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-5">
          <SoapPanel appointmentId={appointmentId} patientId={patientId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
