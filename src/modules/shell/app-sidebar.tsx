import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

import Logo from "@/components/Logo"
import { cn } from "@/lib/utils"
import type { View } from "@/types"

import { navigationItems } from "@/app/config/navigation"
import { useProductsRepository, useTasksRepository } from "@/data/repositories"
import type { ThemeMode } from "@/app/hooks/use-theme-mode"

export function AppSidebar({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  themeMode,
}: {
  currentView: View
  onNavigate: (view: View) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  themeMode: ThemeMode
}) {
  const { t } = useTranslation()
  const { data: tasks } = useTasksRepository()
  const { data: products } = useProductsRepository()

  const pendingTasks = tasks.filter((task) => task.status !== "done").length
  const stockAlerts = products.filter((product) => product.quantity <= product.minStock).length

  const mainItems = navigationItems.filter((item) => !["parametres", "aide"].includes(item.view))
  const settingsItem = navigationItems.find((item) => item.view === "parametres")

  return (
    <aside
      className={cn(
        "relative z-10 hidden h-full shrink-0 flex-col bg-[var(--sidebar-bg)] text-white lg:flex",
        collapsed ? "w-[78px]" : "w-[250px]"
      )}
    >
      <div className={cn("flex items-center justify-between", collapsed ? "px-3 pb-4 pt-7" : "px-5 pb-4 pt-7")}>
        <div className={cn("min-w-0", collapsed ? "mx-auto" : "")}>
          <Logo collapsed={collapsed} isDarkMode={themeMode === "dark"} className="shrink-0" />
        </div>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex size-8 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-white/60 transition hover:bg-white/8 hover:text-white"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex size-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-white/60 transition hover:bg-white/8 hover:text-white"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <nav className={cn("flex-1 overflow-y-auto pb-4 scrollbar-none", collapsed ? "px-2" : "px-3")}>
        <div className="space-y-1">
          {mainItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.view
            const badge = item.view === "taches" ? pendingTasks : item.view === "stock" ? stockAlerts : undefined

            return (
              <button
                key={`nav-${item.view}`}
                type="button"
                onClick={() => onNavigate(item.view)}
                title={collapsed ? t(item.labelKey) : undefined}
                className={cn(
                  "group relative flex w-full items-center rounded-2xl text-left transition-all duration-200",
                  collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3",
                  isActive
                    ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-white/68 hover:bg-white/6 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                    collapsed ? "size-10" : "size-9",
                    isActive ? "bg-white text-slate-900 shadow-sm" : "bg-white/6 text-white/72 group-hover:bg-white/10 group-hover:text-white"
                  )}
                >
                  <HugeiconsIcon icon={Icon} strokeWidth={2} />
                </span>

                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium">{t(item.labelKey)}</span>
                    {badge ? (
                      <span className="flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>

      {settingsItem ? (
        <div className={cn("mt-auto border-t border-white/8 pt-4", collapsed ? "px-2 pb-4" : "px-3 pb-4")}>
          <button
            type="button"
            onClick={() => onNavigate(settingsItem.view)}
            title={collapsed ? t(settingsItem.labelKey) : undefined}
            className={cn(
              "group flex w-full items-center rounded-2xl transition-all duration-200",
              collapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3",
              currentView === settingsItem.view
                ? "bg-white/10 text-white"
                : "text-white/68 hover:bg-white/6 hover:text-white"
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                collapsed ? "size-10" : "size-9",
                currentView === settingsItem.view ? "bg-white text-slate-900" : "bg-white/6 text-white/72 group-hover:bg-white/10 group-hover:text-white"
              )}
            >
              <HugeiconsIcon icon={settingsItem.icon} strokeWidth={2} />
            </span>
            {!collapsed ? <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium">{t(settingsItem.labelKey)}</span> : null}
          </button>
        </div>
      ) : null}
    </aside>
  )
}
