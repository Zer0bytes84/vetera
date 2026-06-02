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
                "rounded-full",
                isListening
                  ? "bg-rose-500/90 text-white hover:bg-rose-500"
                  : "bg-background/80",
                className
              )}
              disabled={disabled || !isSupported}
              onClick={onToggle}
              size="icon"
              type="button"
              variant={isListening ? "default" : "ghost"}
            >
              {isListening ? (
                <Stop weight="duotone" className={iconDim} />
              ) : (
                <Microphone weight="duotone" className={iconDim} />
              )}
            </Button>
          }
        />
        <TooltipContent side="bottom" sideOffset={6}>
          {!isSupported
            ? t("consultations.soap.ai.unsupportedBrowser")
            : isListening
              ? t("consultations.soap.ai.stopDictation")
              : t("consultations.soap.ai.startDictation")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
