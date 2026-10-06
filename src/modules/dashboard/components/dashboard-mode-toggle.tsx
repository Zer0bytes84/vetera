import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSquare01Icon, StethoscopeIcon } from "@/lib/hugeicons";
import { focusRing } from "@/design-system/primitives";
import { MOTION } from "@/design-system/motion";
import type { DashboardVersion } from "../hooks/use-dashboard-version";

const modes = [
  { value: "classic", label: "Vue classique", icon: DashboardSquare01Icon },
  { value: "clinical", label: "Journée clinique", icon: StethoscopeIcon },
] as const;

/** Two equally discoverable views; the choice changes immediately. */
export function DashboardModeToggle({
  value,
  onChange,
  reducedMotion = false,
}: {
  value: DashboardVersion;
  onChange: (value: DashboardVersion) => void;
  reducedMotion?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Vue du tableau de bord"
      className="inline-flex max-w-full items-center rounded-full bg-muted/60 p-0.5 shadow-hairline"
    >
      {modes.map((mode) => (
        <Tooltip key={mode.value}>
          <TooltipTrigger render={<button
          type="button"
          aria-label={mode.label}
          aria-pressed={value === mode.value}
          className={`relative isolate inline-flex size-8 items-center justify-center rounded-full p-0 text-[12px] font-medium transition-colors duration-150 ${value === mode.value ? "text-ink" : "text-ink-muted hover:text-ink"} ${focusRing}`}
          onClick={() => onChange(mode.value)}
        />}>
          {value === mode.value && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full bg-surface-raised shadow-sm"
              layoutId={reducedMotion ? undefined : "dashboard-selected-view"}
              transition={{
                duration: reducedMotion ? 0 : MOTION.base,
                ease: MOTION.easeOut,
              }}
            />
          )}
          <HugeiconsIcon
            icon={mode.icon}
            size={17}
            strokeWidth={1.5}
            className={value === mode.value ? "text-foreground" : "text-muted-foreground"}
          />
          </TooltipTrigger>
          <TooltipContent>{mode.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
