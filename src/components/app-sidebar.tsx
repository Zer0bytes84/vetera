"use client";

import { LayoutLeftIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { navigationSections } from "@/app/config/navigation";
import Logo from "@/components/Logo";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUsersRepository } from "@/data/repositories";
import {
  readCachedProfile,
  subscribeToCachedProfile,
} from "@/lib/profile-cache";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentView: View;
  onNavigate: (view: View) => void;
  currentUserName: string;
  currentUserEmail: string;
  currentUserAvatar?: string | null;
  onLogout: () => Promise<void>;
  onOpenPalette?: () => void;
};

export function AppSidebar({
  currentView,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { data: users } = useUsersRepository();
  const [cachedProfile, setCachedProfile] = React.useState(() =>
    readCachedProfile(currentUserEmail)
  );

  React.useEffect(() => {
    setCachedProfile(readCachedProfile(currentUserEmail));
  }, [currentUserEmail]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    return subscribeToCachedProfile((event) => {
      if (event.detail.email === currentUserEmail) {
        setCachedProfile(event.detail.profile);
      }
    });
  }, [currentUserEmail]);

  const currentUserRecord = users.find(
    (user) => user.email === currentUserEmail
  );
  const resolvedUserName =
    currentUserRecord?.displayName ||
    cachedProfile?.displayName ||
    (currentUserName && currentUserName !== currentUserEmail
      ? currentUserName
      : null) ||
    currentUserEmail ||
    "Utilisateur";
  const resolvedUserAvatar =
    currentUserRecord?.avatarUrl ||
    currentUserAvatar ||
    cachedProfile?.avatarUrl;

  const isDesktopRuntime = isTauriRuntime();

  const overviewSection = navigationSections[0];
  const patientSection = navigationSections[1];
  const operationsSection = navigationSections[2];
  const configSection = navigationSections[3];

  const mainItems = [
    ...(overviewSection?.items ?? []),
    ...(patientSection?.items.slice(0, 4) ?? []),
  ].map((item) => ({
    title: t(item.labelKey),
    icon: (
      <HugeiconsIcon
        className="size-[19.5px] transition-all duration-200 ease-out"
        icon={item.icon}
        strokeWidth={1.5}
      />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: t(item.labelKey),
    icon: (
      <HugeiconsIcon
        className="size-[19.5px] transition-all duration-200 ease-out"
        icon={item.icon}
        strokeWidth={1.5}
      />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: t(item.labelKey),
    icon: (
      <HugeiconsIcon
        className="size-[19.5px] transition-all duration-200 ease-out"
        icon={item.icon}
        strokeWidth={1.5}
      />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  if (isCollapsed) {
    secondaryItems.unshift({
      title: "Développer",
      icon: (
        <HugeiconsIcon
          className="size-[19.5px] rotate-180 transition-all duration-200 ease-out"
          icon={LayoutLeftIcon}
          strokeWidth={1.5}
        />
      ),
      isActive: false,
      onClick: toggleSidebar,
    });
  }

  return (
    <Sidebar {...props} className={cn("border-none", props.className)}>
      <div className="apple-sidebar-glow" />

      <SidebarHeader
        className={cn(
          "relative z-10 flex shrink-0 flex-row items-center",
          "h-[64px] transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "px-4",
          "w-full bg-transparent"
        )}
      >
        {/* Hairline separator */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-full z-50 h-px -translate-y-[6px] bg-zinc-900/7.5 dark:bg-white/7.5",
            isCollapsed
              ? "left-0 w-[var(--sidebar-width-icon)]"
              : "-left-4 w-[calc(var(--sidebar-width)+1px)]"
          )}
        />

        {/* Invisible drag area to fill remaining space */}
        {isDesktopRuntime && (
          <div
            className="absolute inset-x-0 top-0 z-0 h-[40px] cursor-grab active:cursor-grabbing"
            data-tauri-drag-region="true"
          />
        )}
        <SidebarMenu className="relative z-10 w-full">
          <SidebarMenuItem className="flex w-full flex-row items-center justify-between">
            <SidebarMenuButton
              className={cn(
                "h-13 flex-1 px-1 hover:bg-transparent active:bg-transparent",
                "transition-all duration-300 ease-out",
                isCollapsed && "ms-0 justify-center px-0"
              )}
              render={
                <button onClick={() => onNavigate("dashboard")} type="button" />
              }
              tooltip="bAItari"
            >
              <Logo
                className="text-sidebar-foreground"
                collapsed={isCollapsed}
                flatMark={isCollapsed}
                size="2xl"
                textSize="md"
              />
            </SidebarMenuButton>
            {!isCollapsed && (
              <SidebarTrigger className="-mr-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "relative z-10 overflow-y-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isCollapsed
            ? "flex flex-col items-center px-0 pt-2"
            : "px-4 pt-2 pb-6"
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-1 flex-col",
            isCollapsed ? "w-full items-center gap-0.5" : "gap-6"
          )}
        >
          <NavMain items={mainItems} title={t("nav.sections.patientJourney")} />

          {/* Subtle divider between groups in collapsed mode */}
          {isCollapsed && (
            <div className="my-2 h-px w-8 rounded-full bg-zinc-900/8 dark:bg-white/8" />
          )}

          <NavDocuments
            items={documents.map((item) => ({
              name: item.name,
              icon: item.icon,
              isActive: item.isActive,
              onClick: item.onClick,
            }))}
            title={t("nav.sections.operations")}
          />

          {secondaryItems.length > 0 && (
            <NavSecondary className="mt-auto" items={secondaryItems} />
          )}
        </div>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "relative z-10 shrink-0 transition-all duration-300",
          isCollapsed
            ? "mx-0 mt-auto mb-0 flex flex-col items-center gap-0.5 px-0 pt-2 pb-2"
            : "mx-0 mt-auto mb-0 bg-transparent px-4 pt-1 pb-4"
        )}
      >
        {isCollapsed ? (
          <div className="mb-2 h-px w-8 rounded-full bg-zinc-900/8 dark:bg-white/8" />
        ) : null}
        <div
          className={cn(
            "transition-all duration-300",
            !isCollapsed &&
              "rounded-2xl border border-zinc-200/50 bg-zinc-50/30 p-2 dark:border-white/[0.04] dark:bg-zinc-900/20"
          )}
        >
          <NavUser
            onFinances={() => onNavigate("finances")}
            onNotifications={() => onNavigate("taches")}
            onProfile={() => onNavigate("equipe")}
            onSettings={() => onNavigate("parametres")}
            user={{
              name: resolvedUserName,
              email: currentUserEmail,
              avatar: resolvedUserAvatar,
            }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
