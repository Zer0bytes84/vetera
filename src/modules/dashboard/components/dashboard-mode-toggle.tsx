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
      className="dashboard-mode-toggle inline-flex items-center rounded-lg border border-black/8 bg-black/[0.03] p-0.5 dark:border-white/10 dark:bg-white/[0.05]"
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
                    "relative inline-flex size-7 items-center justify-center rounded-md text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isSelected
                      ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-transparent"
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
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400"
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
