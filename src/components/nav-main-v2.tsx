"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  icon: React.ReactNode
  isActive?: boolean
  onClick?: () => void
  badge?: number | string
  badgeVariant?: "default" | "alert" | "success"
  isNew?: boolean
}

interface NavMainV2Props {
  title?: string
  items: NavItem[]
  onAssistant?: () => void
}

export function NavMainV2({ title, items, onAssistant }: NavMainV2Props) {
  const { t } = useTranslation()

  return (
    <div className="px-3 py-2">
      {title && (
        <div className="mb-2 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {title}
          </span>
        </div>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavButton
            key={item.title}
            {...item}
          />
        ))}
        {onAssistant && (
          <NavButton
            title={t("nav.assistant")}
            icon={<HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />}
            onClick={onAssistant}
            isNew
            highlight
          />
        )}
      </nav>
    </div>
  )
}

function NavButton({
  title,
  icon,
  isActive,
  onClick,
  badge,
  badgeVariant = "default",
  isNew,
  highlight,
}: NavItem & { highlight?: boolean }) {
  const badgeStyles = {
    default: "bg-sidebar-foreground/10 text-sidebar-foreground/70",
    alert: "bg-rose-500 text-white",
    success: "bg-emerald-500 text-white",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        isActive && [
          "bg-gradient-to-r from-sidebar-primary/10 to-transparent",
          "text-sidebar-primary",
          "border-l-2 border-sidebar-primary",
          "relative",
        ],
        !isActive && "text-sidebar-foreground/80",
        highlight && "text-primary hover:text-primary"
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-sidebar-primary/15 text-sidebar-primary"
            : "bg-sidebar-accent/50 text-sidebar-foreground/70 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground",
          highlight && "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>

      {/* Label */}
      <span className="flex-1 truncate text-left">{title}</span>

      {/* Badge */}
      {badge !== undefined && (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            badgeStyles[badgeVariant]
          )}
        >
          {badge}
        </span>
      )}

      {/* New indicator */}
      {isNew && !badge && (
        <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
      )}

      {/* Active glow effect */}
      {isActive && (
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-sidebar-primary/30 to-transparent" />
      )}
    </button>
  )
}
