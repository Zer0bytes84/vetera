"use client"

import {
  MonitorDotIcon,
  StarsIcon,
  Sun02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

type ThemeModeToggleProps = {
  mode: "light" | "dark" | "system"
  onChange: (nextMode: "light" | "dark" | "system") => void
  className?: string
}

export function ThemeModeToggle({
  mode,
  onChange,
  className,
}: ThemeModeToggleProps) {
  const options: {
    value: "light" | "dark" | "system"
    icon: typeof Sun02Icon
    label: string
  }[] = [
    { value: "light", icon: Sun02Icon, label: "Clair" },
    { value: "system", icon: MonitorDotIcon, label: "Auto" },
    { value: "dark", icon: StarsIcon, label: "Sombre" },
  ]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-muted p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = mode === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HugeiconsIcon
              icon={option.icon}
              strokeWidth={1.5}
              className="size-3.5"
            />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
