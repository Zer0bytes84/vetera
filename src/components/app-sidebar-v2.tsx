"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

import Logo from "@/components/Logo"
import { NavMainV2 } from "./nav-main-v2"
import { NavDocumentsV2 } from "./nav-documents-v2"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { useUsersRepository } from "@/data/repositories"
import {
  readCachedProfile,
  subscribeToCachedProfile,
} from "@/lib/profile-cache"
import { isTauriRuntime } from "@/services/browser-store"
import type { View } from "@/types"

import { navigationSections } from "@/app/config/navigation"
import {
  StethoscopeIcon,
  Calendar01Icon,
  ClinicIcon,
  BookOpenTextIcon,
  Task01Icon,
  Package02Icon,
  WalletIcon,
  UserGroupIcon,
  Settings02Icon,
  HelpCircleIcon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons"

type AppSidebarV2Props = React.ComponentProps<typeof Sidebar> & {
  currentView: View
  onNavigate: (view: View) => void
  currentUserName: string
  currentUserEmail: string
  currentUserAvatar?: string | null
  onLogout: () => Promise<void>
  onOpenPalette?: () => void
  onOpenAIAgent?: () => void
  taskCount?: number
  notificationCount?: number
  hasStockAlert?: boolean
}

export function AppSidebarV2({
  currentView,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  onLogout,
  onOpenAIAgent,
  taskCount = 0,
  notificationCount = 0,
  hasStockAlert = false,
  ...props
}: AppSidebarV2Props) {
  const { t } = useTranslation()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { data: users } = useUsersRepository()
  const [cachedProfile, setCachedProfile] = React.useState(() =>
    readCachedProfile(currentUserEmail)
  )

  React.useEffect(() => {
    setCachedProfile(readCachedProfile(currentUserEmail))
  }, [currentUserEmail])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    return subscribeToCachedProfile((event) => {
      if (event.detail.email === currentUserEmail) {
        setCachedProfile(event.detail.profile)
      }
    })
  }, [currentUserEmail])

  const currentUserRecord = users.find(
    (user) => user.email === currentUserEmail
  )
  const resolvedUserName =
    cachedProfile?.displayName ||
    currentUserRecord?.displayName ||
    currentUserName
  const resolvedUserAvatar =
    cachedProfile?.avatarUrl ||
    currentUserRecord?.avatarUrl ||
    currentUserAvatar

  const isDesktopRuntime = isTauriRuntime()

  // Primary navigation items (Patient Journey)
  const primaryItems = [
    {
      title: t("views.dashboard"),
      icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "dashboard",
      onClick: () => onNavigate("dashboard"),
      badge: notificationCount > 0 ? notificationCount : undefined,
      badgeVariant: "default" as const,
    },
    {
      title: t("views.agenda"),
      icon: <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "agenda",
      onClick: () => onNavigate("agenda"),
    },
    {
      title: t("views.clinique"),
      icon: <HugeiconsIcon icon={ClinicIcon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "clinique",
      onClick: () => onNavigate("clinique"),
    },
    {
      title: t("views.patients"),
      icon: <HugeiconsIcon icon={StethoscopeIcon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "patients",
      onClick: () => onNavigate("patients"),
    },
  ]

  // Operations items
  const operationsItems = [
    {
      name: t("views.stock"),
      icon: <HugeiconsIcon icon={Package02Icon} strokeWidth={2} className="size-4" />,
      onClick: () => onNavigate("stock"),
      isAlert: hasStockAlert,
    },
    {
      name: t("views.finances"),
      icon: <HugeiconsIcon icon={WalletIcon} strokeWidth={2} className="size-4" />,
      onClick: () => onNavigate("finances"),
    },
    {
      name: t("views.equipe"),
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />,
      onClick: () => onNavigate("equipe"),
    },
  ]

  // Secondary items (Notes & Tasks)
  const notesTasksItems = [
    {
      title: t("views.notes"),
      icon: <HugeiconsIcon icon={BookOpenTextIcon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "notes",
      onClick: () => onNavigate("notes"),
    },
    {
      title: t("views.taches"),
      icon: <HugeiconsIcon icon={Task01Icon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "taches",
      onClick: () => onNavigate("taches"),
      badge: taskCount > 0 ? taskCount : undefined,
      badgeVariant: "alert" as const,
    },
  ]

  // Config items
  const configItems = [
    {
      title: t("views.parametres"),
      icon: <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "parametres",
      onClick: () => onNavigate("parametres"),
    },
    {
      title: t("views.aide"),
      icon: <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} className="size-4" />,
      isActive: currentView === "aide",
      onClick: () => onNavigate("aide"),
    },
  ]

  return (
    <Sidebar {...props} className={cn("border-r border-sidebar-border/50", props.className)}>
      {/* Tauri drag region */}
      {isDesktopRuntime ? (
        <div
          className="flex h-10 items-center px-4 [@media(max-height:820px)]:h-8 [@media(max-height:820px)]:px-3"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2">
            <div className="size-3" />
          </div>
        </div>
      ) : null}

      {/* Header with gradient */}
      <SidebarHeader className="relative px-4 pb-2 pt-3 [@media(max-height:820px)]:p-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sidebar-primary/5 via-sidebar-primary/[0.02] to-transparent" />
        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent/50"
          >
            <Logo size="md" collapsed={isCollapsed} className="text-sidebar-foreground" />
          </button>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent overflow-y-auto">
        <div className="flex min-h-full flex-1 flex-col gap-1 py-2">
          {/* Primary Navigation */}
          <NavMainV2
            title={t("nav.sections.patientJourney")}
            items={primaryItems}
            onAssistant={onOpenAIAgent}
          />

          {/* Separator */}
          <div className="mx-4 my-2 h-px bg-sidebar-border/50" />

          {/* Operations */}
          <NavDocumentsV2
            title={t("nav.sections.operations")}
            items={operationsItems}
          />

          {/* Separator */}
          <div className="mx-4 my-2 h-px bg-sidebar-border/50" />

          {/* Notes & Tasks */}
          <NavMainV2
            items={notesTasksItems}
          />

          {/* Config - pushed to bottom */}
          <div className="mt-auto">
            <div className="mx-4 my-2 h-px bg-sidebar-border/50" />
            <NavMainV2
              items={configItems}
            />
          </div>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="relative shrink-0 border-t border-sidebar-border/50 bg-sidebar/80 p-3 backdrop-blur-sm [@media(max-height:820px)]:p-2">
        <NavUser
          user={{
            name: resolvedUserName,
            email: currentUserEmail,
            avatar: resolvedUserAvatar,
          }}
          onProfile={() => onNavigate("equipe")}
          onSettings={() => onNavigate("parametres")}
          onFinances={() => onNavigate("finances")}
          onNotifications={() => onNavigate("taches")}
          onLogout={onLogout}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
