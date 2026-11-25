import {
  ClipboardDocumentListIcon,
  Squares2X2Icon,
} from "@heroicons/react/16/solid";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DashboardVersion } from "../hooks/use-dashboard-version";

const modes = [
  { value: "analytics", label: "Vue d’ensemble", icon: Squares2X2Icon },
  {
    value: "clinical",
    label: "Journée clinique",
    icon: ClipboardDocumentListIcon,
  },
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
                  aria-label={mode.label}
                  aria-pressed={isSelected}
                  className={cn(
                    "t-12 relative inline-flex size-7 items-center justify-center rounded-md font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isSelected
                      ? "bg-surface font-semibold text-ink shadow-2xs"
                      : "bg-transparent text-ink-muted hover:text-ink"
                  )}
                  onClick={() => onChange(mode.value)}
                  type="button"
                  value={mode.value}
                />
              }
            >
              <mode.icon
                aria-hidden="true"
                className={cn(
                  "relative z-10 size-4",
                  isSelected ? "text-ink" : "text-ink-muted"
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
