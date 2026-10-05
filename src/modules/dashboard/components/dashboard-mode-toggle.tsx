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
      className="inline-flex max-w-full items-center rounded-control bg-frame p-1 shadow-hairline"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          className={`relative isolate inline-flex h-8 items-center justify-center gap-2 rounded-[7px] px-3 text-[12px] font-medium transition-colors duration-150 ${value === mode.value ? "text-ink" : "text-ink-muted hover:text-ink"} ${focusRing}`}
          onClick={() => onChange(mode.value)}
        >
          {value === mode.value && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-[7px] bg-surface-raised shadow-card"
              layoutId={reducedMotion ? undefined : "dashboard-selected-view"}
              transition={{
                duration: reducedMotion ? 0 : MOTION.base,
                ease: MOTION.easeOut,
              }}
            />
          )}
          <HugeiconsIcon
            icon={mode.icon}
            size={15}
            strokeWidth={1.5}
            className={value === mode.value ? "text-primary" : "text-ink-muted"}
          />
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
