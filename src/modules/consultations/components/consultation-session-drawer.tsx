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
        showCloseButton={false}
        className={cn(
          "w-full sm:max-w-5xl border-l border-white/20 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl shadow-2xl rounded-l-3xl p-0 flex flex-col",
          className
        )}
        side="right"
      >
        <SheetHeader className="border-b border-border/40 px-6 py-5 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm border border-primary/10">
              <Notebook weight="duotone" className="size-5" />
            </span>
            <div>
              <SheetTitle className="text-lg font-semibold tracking-tight text-foreground/90">
                {t("consultations.soap.title")}
                {patientName ? <span className="text-muted-foreground font-normal ml-1">· {patientName}</span> : ""}
              </SheetTitle>
              <SheetDescription className="text-xs font-medium">
                {t("consultations.soap.subtitle")}
              </SheetDescription>
            </div>
          </div>
          <div className="absolute right-4 top-4">
            <SheetClose
              render={
                <Button size="icon" type="button" variant="ghost" className="rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <span className="sr-only">{t("common.close")}</span>
                  <XCircle weight="fill" className="size-5 text-muted-foreground" />
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
          <SoapPanel
            appointmentId={appointmentId}
            patientId={patientId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
