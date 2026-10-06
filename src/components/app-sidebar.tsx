"use client";

import { SidebarIcon } from "@/modules/shell/components/sidebar-icon";
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
      <SidebarIcon
        className={isCollapsed ? "size-6!" : "size-[22px]!"}
        view={item.view}
      />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: item.view === "notes" ? "Documents" : t(item.labelKey),
    icon: (
      <SidebarIcon
        className={isCollapsed ? "size-6!" : "size-[22px]!"}
        view={item.view}
      />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: t(item.labelKey),
    icon: (
      <SidebarIcon className="size-[22px]!" view={item.view} />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  return (
    <Sidebar
      {...props}
      data-desktop-runtime={isDesktopRuntime ? "true" : undefined}
      className={cn(
        "app-sidebar restored-sidebar",
        variant !== "sidebar" && "border-none",
        props.className
      )}
      variant={variant}
    >
      <div className="apple-sidebar-glow" />

      <SidebarHeader
        data-window-drag-region={isDesktopRuntime ? "true" : undefined}
        className={cn(
          "relative z-10 flex shrink-0 flex-row items-center p-0",
          "h-[calc(var(--header-height)+var(--titlebar-clearance))]",
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

        <div
          className={cn(
            "relative z-10 flex w-full items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <button
            aria-label="Tableau de bord Baitari"
            className={cn(
              "group flex items-center rounded-xl outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-primary/40",
              isCollapsed
                ? "size-9 justify-center hover:bg-sidebar-accent/50"
                : "gap-2.5 px-1 py-1 hover:opacity-85"
            )}
            onClick={() => onNavigate("dashboard")}
            title="Baitari"
            type="button"
          >
            <Logo
              className="text-sidebar-foreground"
              collapsed={isCollapsed}
              size={isCollapsed ? "sm" : "lg"}
              textSize="md"
              variant="refined"
            />
          </button>
          {!isCollapsed && (
            <SidebarTrigger className="sidebar-logo-toggle -mr-1 size-8 rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          )}
        </div>
        {!isCollapsed && isDesktopRuntime && (
          <SidebarTrigger className="sidebar-window-toggle absolute end-3 size-8 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        )}
        {isCollapsed && isDesktopRuntime && (
          <SidebarTrigger aria-label="Déployer la barre latérale" title="Déployer la barre latérale" className="sidebar-icon-mode-toggle absolute size-8 text-sidebar-foreground/65 hover:text-sidebar-foreground" />
        )}
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "relative z-10 overflow-y-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isCollapsed
            ? "flex flex-col items-center overflow-y-auto! overflow-x-hidden px-0 py-5"
            : "px-4 pt-2 pb-6"
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-1 flex-col",
            isCollapsed ? "w-full items-center gap-4" : "gap-4"
          )}
        >
          <NavMain items={mainItems} title={t("nav.sections.patientJourney")} />

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
          "relative z-10 shrink-0 border-sidebar-border/80 border-t transition-all duration-300 dark:border-white/10",
          isCollapsed
            ? "mx-0 mt-auto mb-0 flex flex-col items-center gap-2 px-0 py-3"
            : "mx-0 mt-auto mb-0 bg-transparent px-3 py-3"
        )}
      >
        {isCollapsed ? (
          <SidebarTrigger
            aria-label="Déployer la barre latérale"
            className="sidebar-footer-toggle size-11 rounded-xl text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Déployer la barre latérale"
          />
        ) : null}
        <div
          className={cn(
            "transition-all duration-300",
            !isCollapsed && "w-full"
          )}
        >
          <NavUser
            onFinances={() => onNavigate("finances")}
            onNotifications={() => onNavigate("taches")}
            onProfile={() => onNavigate("parametres")}
            onSettings={() => onNavigate("parametres")}
            user={{
              name: resolvedUserName,
              email: currentUserEmail,
              avatar: resolvedUserAvatar,
            }}
          />
        </div>
        {isCollapsed && (
          <button
            aria-label="Paramètres"
            aria-current={currentView === "parametres" ? "page" : undefined}
            className={cn(
              "flex size-11 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              currentView === "parametres" && "bg-sidebar-accent text-sidebar-foreground"
            )}
            onClick={() => onNavigate("parametres")}
            title="Paramètres"
            type="button"
          >
            <SidebarIcon view="parametres" className="size-6" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
