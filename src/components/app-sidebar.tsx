"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import Logo from "@/components/Logo"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUsersRepository } from "@/data/repositories"
import {
  readCachedProfile,
  subscribeToCachedProfile,
} from "@/lib/profile-cache"
import { isTauriRuntime } from "@/services/browser-store"
import type { View } from "@/types"

import { navigationSections } from "@/app/config/navigation"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentView: View
  onNavigate: (view: View) => void
  currentUserName: string
  currentUserEmail: string
  currentUserAvatar?: string | null
  onLogout: () => Promise<void>
  onOpenPalette?: () => void
  onOpenAIAgent?: () => void
}

export function AppSidebar({
  currentView,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  onLogout,
  onOpenPalette,
  onOpenAIAgent,
  ...props
}: AppSidebarProps) {
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
  const appWindow = React.useMemo(
    () => (isDesktopRuntime ? getCurrentWindow() : null),
    [isDesktopRuntime]
  )

  const overviewSection = navigationSections[0]
  const patientSection = navigationSections[1]
  const operationsSection = navigationSections[2]
  const configSection = navigationSections[3]

  const mainItems = [
    ...(overviewSection?.items ?? []),
    ...(patientSection?.items.slice(0, 4) ?? []),
  ].map((item) => ({
    title: item.label,
    icon: <HugeiconsIcon icon={item.icon} strokeWidth={2} />,
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }))

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: item.label,
    icon: <HugeiconsIcon icon={item.icon} strokeWidth={2} />,
    onClick: () => onNavigate(item.view),
  }))

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: item.label,
    icon: <HugeiconsIcon icon={item.icon} strokeWidth={2} />,
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
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
      <SidebarHeader className="shrink-0 [@media(max-height:820px)]:p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5! [@media(max-height:820px)]:data-[slot=sidebar-menu-button]:p-1!"
              render={
                <button type="button" onClick={() => onNavigate("dashboard")} />
              }
            >
              <Logo size="md" className="text-sidebar-foreground" />
              <Badge
                variant="secondary"
                className="ml-auto rounded-full text-[10px]"
              >
                Pro
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent overflow-y-auto">
        <div className="flex min-h-full flex-1 flex-col gap-2 [@media(max-height:820px)]:gap-1.5">
          <NavMain
            title="Parcours patient"
            items={mainItems}
            onPrimaryAction={() => onNavigate("patients")}
            onAssistant={onOpenAIAgent}
          />
          <NavDocuments
            items={documents.map((item) => ({
              name: item.name,
              icon: item.icon,
              onClick: item.onClick,
            }))}
          />
          <div className="mt-auto pt-3 [@media(max-height:820px)]:pt-2">
            <NavSecondary title="Configuration" items={secondaryItems} />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border/50 bg-sidebar/80 backdrop-blur-sm [@media(max-height:820px)]:p-1.5">
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
