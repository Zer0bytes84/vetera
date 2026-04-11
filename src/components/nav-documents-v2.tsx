"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface NavDocumentItem {
  name: string
  icon: React.ReactNode
  onClick?: () => void
  badge?: string
  isAlert?: boolean
}

interface NavDocumentsV2Props {
  title?: string
  items: NavDocumentItem[]
}

export function NavDocumentsV2({ title, items }: NavDocumentsV2Props) {
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
          <button
            key={item.name}
            type="button"
            onClick={item.onClick}
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              "text-sidebar-foreground/80"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                "bg-sidebar-accent/50 text-sidebar-foreground/70 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground",
                item.isAlert && "bg-rose-500/10 text-rose-600 group-hover:bg-rose-500/20"
              )}
            >
              {item.icon}
            </div>

            {/* Label */}
            <span className="flex-1 truncate text-left">{item.name}</span>

            {/* Badge or Alert */}
            {item.isAlert ? (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                {t("common.alert")}
              </span>
            ) : item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-foreground/10 px-1.5 text-[10px] font-semibold text-sidebar-foreground/70">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  )
}
