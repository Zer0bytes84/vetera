import { Microphone, Stop } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MicrophoneButtonProps {
  className?: string;
  disabled?: boolean;
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}

export function MicrophoneButton({
  className,
  disabled,
  isListening,
  isSupported,
  onToggle,
  size = "sm",
}: MicrophoneButtonProps) {
  const { t } = useTranslation();
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconDim = size === "sm" ? "size-3.5" : "size-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={
                isListening
                  ? t("consultations.soap.ai.stopDictation")
                  : t("consultations.soap.ai.startDictation")
              }
              className={cn(
                dim,
                "relative rounded-full transition-all duration-300",
                isListening
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] hover:bg-rose-600 hover:shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                  : "bg-background/80 shadow-sm backdrop-blur-sm hover:bg-muted/80",
                className
              )}
              disabled={disabled || !isSupported}
              onClick={onToggle}
              size="icon"
              type="button"
              variant={isListening ? "default" : "ghost"}
            >
              {isListening && (
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-rose-400 opacity-75" />
              )}
              {isListening ? (
                <Stop className={iconDim} weight="fill" />
              ) : (
                <Microphone className={iconDim} weight="duotone" />
              )}
            </Button>
          }
        />
        <TooltipContent side="bottom" sideOffset={6}>
          {isSupported
            ? isListening
              ? t("consultations.soap.ai.stopDictation")
              : t("consultations.soap.ai.startDictation")
            : t("consultations.soap.ai.unsupportedBrowser")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
