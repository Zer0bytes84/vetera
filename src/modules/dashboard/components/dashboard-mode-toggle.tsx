import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { DashboardSquare01Icon, StethoscopeIcon } from "@/lib/hugeicons";
import type { DashboardVersion } from "../hooks/use-dashboard-version";

const modes = [
  { value: "analytics", label: "Vue d’ensemble", icon: DashboardSquare01Icon },
  { value: "clinical", label: "Journée clinique", icon: StethoscopeIcon },
] as const;

/** Two equally discoverable views; the choice changes immediately. */
export function DashboardModeToggle({
  value,
  onChange,
}: {
  value: DashboardVersion;
  onChange: (value: DashboardVersion) => void;
  reducedMotion?: boolean;
}) {
  return (
    <div
      aria-label="Vue du tableau de bord"
      className="dashboard-mode-toggle inline-flex items-center rounded-lg border border-border bg-muted p-0.5"
      data-slot="dashboard-mode-toggle"
    >
      {modes.map((mode) => {
        const isSelected = value === mode.value;
        return (
          <Tooltip key={mode.value}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  value={mode.value}
                  aria-label={mode.label}
                  aria-pressed={isSelected}
                  onClick={() => onChange(mode.value)}
                  className={cn(
                    "relative inline-flex size-7 items-center justify-center rounded-md t-12 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isSelected
                      ? "bg-surface text-ink shadow-2xs font-semibold"
                      : "text-ink-muted hover:text-ink bg-transparent"
                  )}
                />
              }
            >
              <HugeiconsIcon
                icon={mode.icon}
                size={16}
                strokeWidth={1.5}
                className={cn(
                  "relative z-10",
                  isSelected
                    ? "text-ink"
                    : "text-ink-muted"
                )}
              />
            </TooltipTrigger>
            <TooltipContent>{mode.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
