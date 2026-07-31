"use client";

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
};

export function AppSidebar({
  currentView,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  variant = "sidebar",
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
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
  let sidebarSeparatorWidth = "-left-4 w-[calc(100%+32px)]";
  if (variant === "sidebar") {
    sidebarSeparatorWidth = "inset-x-0";
  }
  let sidebarHeaderPadding = "px-4";
  if (isCollapsed) {
    sidebarHeaderPadding = "justify-center px-0";
  } else if (variant === "sidebar") {
    sidebarHeaderPadding = "px-6";
  }

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

  return (
    <Sidebar
      {...props}
      className={cn(
        "app-sidebar",
        variant !== "sidebar" && "border-none",
        props.className
      )}
      variant={variant}
    >
      <div className="apple-sidebar-glow" />

      <SidebarHeader
        className={cn(
          "relative z-10 flex shrink-0 flex-row items-center",
          "h-[calc(var(--header-height)+var(--titlebar-clearance))] transition-all duration-300",
          sidebarHeaderPadding,
          "w-full bg-transparent"
        )}
        style={{ paddingTop: "var(--titlebar-clearance)" }}
      >
        {/* Hairline separator */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-full z-50 h-px bg-zinc-900/7.5 transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-white/12",
            sidebarSeparatorWidth
          )}
          data-slot="sidebar-header-separator"
        />

        {/* Invisible drag area to fill remaining space */}
        {isDesktopRuntime && (
          <div
            className="absolute inset-x-0 top-0 z-0 h-[40px] cursor-grab active:cursor-grabbing"
            data-tauri-drag-region="true"
          />
        )}
        <SidebarMenu
          className="relative z-10 w-full transition-opacity duration-200"
        >
          <SidebarMenuItem className="flex w-full flex-row items-center justify-between">
            <SidebarMenuButton
              className={cn(
                "h-12 flex-1 overflow-visible px-1 hover:bg-transparent active:bg-transparent",
                variant === "minimal" && "h-14",
                "transition-all duration-300 ease-out",
                isCollapsed &&
                  "ms-0 justify-center px-0 group-data-[collapsible=icon]:size-10!"
              )}
              render={
                <button onClick={() => onNavigate("dashboard")} type="button" />
              }
              tooltip="Baitari"
            >
              <Logo
                className={cn(
                  "text-sidebar-foreground",
                  isCollapsed
                    ? "translate-y-0"
                    : isDesktopRuntime
                      ? "translate-y-1.5"
                      : "translate-y-0.5",
                  variant === "minimal" &&
                    (isCollapsed
                      ? isDesktopRuntime
                        ? "translate-y-2"
                        : "translate-y-0.5"
                      : isDesktopRuntime
                        ? "translate-y-1"
                        : "translate-y-1")
                )}
                collapsed={isCollapsed}
                size={variant === "sidebar" ? "xl" : "2xl"}
                textSize="md"
              />
            </SidebarMenuButton>
            {!isCollapsed && (
              <SidebarTrigger
                className={cn(
                  "-mr-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  variant === "minimal" &&
                    isDesktopRuntime &&
                    "translate-y-1"
                )}
              />
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
            : "mx-0 mt-auto mb-0 bg-transparent px-3 pt-1 pb-4"
        )}
      >
        {isCollapsed && variant === "minimal" ? (
          <SidebarTrigger
            aria-label="Déployer la barre latérale"
            className="mb-1 size-9 rounded-xl border border-zinc-900/[0.06] bg-zinc-950/[0.025] text-sidebar-foreground/65 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-zinc-950/[0.055] hover:text-sidebar-foreground dark:border-white/[0.09] dark:bg-white/[0.035] dark:hover:bg-white/[0.07]"
            title="Déployer la barre latérale"
          />
        ) : null}
        {isCollapsed ? (
          <div className="mb-2 h-px w-8 rounded-full bg-zinc-900/8 dark:bg-white/8" />
        ) : null}
        <div
          className={cn(
            "transition-all duration-300",
            !isCollapsed &&
              "sidebar-user-card w-full rounded-2xl border border-zinc-200/50 bg-zinc-50/30 p-1.5 dark:border-white/[0.09] dark:bg-zinc-900/24"
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
