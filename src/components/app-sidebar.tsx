"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import type { UnlistenFn } from "@tauri-apps/api/event"
import { useTranslation } from "react-i18next"

import Logo from "@/components/Logo"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { useUsersRepository } from "@/data/repositories"
import {
  readCachedProfile,
  subscribeToCachedProfile,
} from "@/lib/profile-cache"
import { isTauriRuntime } from "@/services/browser-store"
import type { View } from "@/types"
import { cn } from "@/lib/utils"

import { navigationSections } from "@/app/config/navigation"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentView: View
  onNavigate: (view: View) => void
  currentUserName: string
  currentUserEmail: string
  currentUserAvatar?: string | null
  onLogout: () => Promise<void>
  onOpenPalette?: () => void
}

export function AppSidebar({
  currentView,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  onLogout,
  onOpenPalette: _onOpenPalette,
  ...props
}: AppSidebarProps) {
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
  const isClassicSidebar = props.variant === "sidebar"
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const appWindow = React.useMemo(
    () => (isDesktopRuntime ? getCurrentWindow() : null),
    [isDesktopRuntime]
  )

  React.useEffect(() => {
    if (!appWindow) return

    let unlistenResize: UnlistenFn | null = null
    let active = true

    const syncWindowMode = async () => {
      try {
        const fullscreen = await appWindow.isFullscreen()
        if (active) setIsFullscreen(fullscreen)
      } catch {
        // no-op
      }
    }

    void syncWindowMode()
    void appWindow.onResized(() => {
      void syncWindowMode()
    }).then((unlisten) => {
      unlistenResize = unlisten
    })

    return () => {
      active = false
      if (unlistenResize) unlistenResize()
    }
  }, [appWindow])

  const overviewSection = navigationSections[0]
  const patientSection = navigationSections[1]
  const operationsSection = navigationSections[2]
  const configSection = navigationSections[3]

  const mainItems = [
    ...(overviewSection?.items ?? []),
    ...(patientSection?.items.slice(0, 4) ?? []),
  ].map((item) => {
    return {
      title: t(item.labelKey),
      icon: (
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={2}
          className={cn(
            "transition-all duration-200 ease-out",
            currentView === item.view
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      ),
      isActive: currentView === item.view,
      onClick: () => onNavigate(item.view),
    }
  })

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: t(item.labelKey),
    icon: (
      <HugeiconsIcon
        icon={item.icon}
        strokeWidth={2}
        className="text-muted-foreground transition-all duration-200 ease-out group-hover:text-foreground"
      />
    ),
    onClick: () => onNavigate(item.view),
  }))

  const secondaryItems = (configSection?.items ?? []).map((item) => {
    return {
      title: t(item.labelKey),
      icon: (
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={2}
          className={cn(
            "transition-all duration-200 ease-out",
            currentView === item.view
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground"
          )}
        />
      ),
      isActive: currentView === item.view,
      onClick: () => onNavigate(item.view),
    }
  })

  return (
    <Sidebar 
      {...props}
      className={cn(
        isDesktopRuntime && "top-8 h-[calc(100svh-32px)]",
        isClassicSidebar &&
          "bg-background/96 shadow-[inset_-1px_0_0_rgba(15,23,42,0.06)] dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]",
        props.className
      )}
    >

      <SidebarHeader
        className={cn(
          "flex shrink-0 flex-row items-center px-3",
          isDesktopRuntime ? "py-2" : "py-1",
          "[@media(max-height:820px)]:p-1",
          isClassicSidebar &&
      "h-[64px] border-b border-black/[0.06] dark:border-white/[0.05] bg-background/76 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-3xl supports-[backdrop-filter]:bg-background/60 supports-[backdrop-filter]:backdrop-saturate-180 supports-[backdrop-filter]:backdrop-contrast-105",
          isClassicSidebar && isCollapsed && "justify-center px-3"
        )}
      >
        <SidebarMenu className="w-full">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="bAItari"
              className={cn(
                "w-full justify-start",
                isClassicSidebar &&
                  "ms-4 h-10 w-auto justify-start rounded-xl px-3 hover:bg-transparent",
                isClassicSidebar &&
                  isCollapsed &&
                  "ms-0 h-11 w-11 justify-center rounded-2xl border border-border/70 bg-background/92 px-0 shadow-xs hover:bg-muted/35"
              )}
              render={<button type="button" onClick={() => onNavigate("dashboard")} />}
            >
              <Logo
                size="md"
                collapsed={isCollapsed}
                flatMark={isClassicSidebar}
                className={cn(
                  "text-sidebar-foreground",
                  isClassicSidebar && "[&_.logo-mark-shell]:bg-transparent [&_.logo-mark-shell_svg]:size-[2.35rem]"
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent overflow-y-auto",
          isClassicSidebar &&
            "overflow-y-hidden px-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isClassicSidebar && isCollapsed && "px-2 pt-3"
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-1 flex-col gap-2 [@media(max-height:820px)]:gap-1.5",
            isClassicSidebar && "gap-2.5 pb-2",
            isClassicSidebar && isCollapsed && "gap-2 pb-1"
          )}
        >
          <NavMain
            title={t("nav.sections.patientJourney")}
            items={mainItems}
            showQuickActions={!isClassicSidebar}
            onPrimaryAction={() => {
              if (currentView !== "patients") {
                onNavigate("patients")
                setTimeout(() => window.dispatchEvent(new CustomEvent("vetera:new-patient")), 150)
              } else {
                window.dispatchEvent(new CustomEvent("vetera:new-patient"))
              }
            }}
            onSecondaryAction={() => onNavigate("agenda")}
          />
          <NavDocuments
            title={t("nav.sections.operations")}
            items={documents.map((item) => ({
              name: item.name,
              icon: item.icon,
              onClick: item.onClick,
            }))}
          />
        </div>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "shrink-0 border-t border-sidebar-border/50 bg-sidebar/80 backdrop-blur-sm [@media(max-height:820px)]:p-1.5 glass-surface",
          isClassicSidebar && "mx-5 mb-3 gap-2 rounded-[24px] border border-sidebar-border/45 bg-sidebar px-4 py-3 shadow-soft",
          isClassicSidebar &&
            isCollapsed &&
            "mx-0 mb-2 gap-1.5 rounded-none border-0 bg-transparent px-2 py-0 shadow-none backdrop-blur-none"
        )}
      >
        <NavSecondary
          title={t("nav.sections.configuration")}
          items={secondaryItems}
          className={cn(
            isClassicSidebar && isCollapsed && "p-0"
          )}
        />
        {isClassicSidebar && !isCollapsed ? <SidebarSeparator className="mx-0 opacity-60" /> : null}
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
