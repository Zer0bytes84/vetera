"use client";


import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  SidebarSeparator,
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
  onLogout,
  onOpenPalette: _onOpenPalette,
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
    cachedProfile?.displayName ||
    currentUserRecord?.displayName ||
    currentUserName;
  const resolvedUserAvatar =
    cachedProfile?.avatarUrl ||
    currentUserRecord?.avatarUrl ||
    currentUserAvatar;

  const isDesktopRuntime = isTauriRuntime();
  const isClassicSidebar = props.variant === "sidebar";
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const appWindow = React.useMemo(
    () => (isDesktopRuntime ? getCurrentWindow() : null),
    [isDesktopRuntime]
  );

  React.useEffect(() => {
    if (!appWindow) {
      return;
    }

    let unlistenResize: UnlistenFn | null = null;
    let active = true;

    const syncWindowMode = async () => {
      try {
        const fullscreen = await appWindow.isFullscreen();
        if (active) {
          setIsFullscreen(fullscreen);
        }
      } catch {
        // no-op
      }
    };

    void syncWindowMode();
    void appWindow
      .onResized(() => {
        void syncWindowMode();
      })
      .then((unlisten) => {
        unlistenResize = unlisten;
      });

    return () => {
      active = false;
      if (unlistenResize) {
        unlistenResize();
      }
    };
  }, [appWindow]);

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
      <item.icon
        weight="duotone"
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
  }));

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: t(item.labelKey),
    icon: (
      <item.icon
        weight="duotone"
        className="text-muted-foreground transition-all duration-200 ease-out group-hover:text-foreground"
      />
    ),
    onClick: () => onNavigate(item.view),
  }));

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: t(item.labelKey),
    icon: (
      <item.icon
        weight="duotone"
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
  }));

  return (
    <Sidebar
      {...props}
      className={cn(
        isClassicSidebar &&
          "bg-sidebar shadow-[inset_-1px_0_0_var(--sidebar-border)]",
        props.className
      )}
    >

      <SidebarHeader
        data-tauri-drag-region={isDesktopRuntime ? "true" : undefined}
        className={cn(
          "flex shrink-0 flex-row items-center",
          isDesktopRuntime ? "py-3" : "py-2.5",
          "[@media(max-height:820px)]:p-1.5",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-all duration-200",
          isClassicSidebar ? "bg-sidebar" : "bg-transparent",
          isDesktopRuntime && !isCollapsed ? "h-[72px] pl-[76px] pr-3" : "px-3",
          !isDesktopRuntime && !isCollapsed && "h-[72px] px-3",
          isDesktopRuntime && isCollapsed && "h-[100px] flex-col justify-end pb-3",
          !isDesktopRuntime && isCollapsed && "h-[72px] justify-center"
        )}
      >
        <SidebarMenu className="w-full">
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                "ms-0 h-13 w-auto justify-start rounded-xl !ps-5 pe-2 hover:bg-transparent",
                isCollapsed &&
                  "ms-0 h-13 w-13 justify-center rounded-2xl border border-border/70 bg-background/92 px-0 shadow-xs hover:bg-muted/35"
              )}
              render={
                <button onClick={() => onNavigate("dashboard")} type="button" />
              }
              tooltip="bAItari"
            >
              <Logo
                className="text-sidebar-foreground"
                collapsed={isCollapsed}
                flatMark={isClassicSidebar}
                size="2xl"
                textSize="md"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent overflow-y-auto",
          "pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isClassicSidebar ? "overflow-y-hidden bg-sidebar px-5" : "px-3",
          isCollapsed && "px-2 pt-3"
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
            items={mainItems}
            title={t("nav.sections.patientJourney")}
          />
          <NavDocuments
            items={documents.map((item) => ({
              name: item.name,
              icon: item.icon,
              onClick: item.onClick,
            }))}
            title={t("nav.sections.operations")}
          />
        </div>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "shrink-0 transition-all duration-300",
          isCollapsed
            ? "mx-0 mb-1.5 gap-1.5 rounded-none border-0 bg-transparent px-2 py-0 shadow-none backdrop-blur-none"
            : isClassicSidebar
              ? "mx-4 mb-2 gap-0 rounded-[18px] border border-sidebar-border bg-sidebar-accent/90 dark:bg-zinc-800/40 px-2 pt-2 pb-2.5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
              : "mx-3 mb-2 gap-0 rounded-2xl border border-zinc-200/90 dark:border-white/12 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md px-2 pt-2 pb-2.5 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
        )}
      >
        <NavSecondary
          className={cn(
            "p-0",
            isCollapsed && "p-0"
          )}
          items={secondaryItems}
        />
        {isClassicSidebar && !isCollapsed ? (
          <SidebarSeparator className="mx-0 my-0.5 opacity-60" />
        ) : null}
        <NavUser
          onFinances={() => onNavigate("finances")}
          onLogout={onLogout}
          onNotifications={() => onNavigate("taches")}
          onProfile={() => onNavigate("equipe")}
          onSettings={() => onNavigate("parametres")}
          user={{
            name: resolvedUserName,
            email: currentUserEmail,
            avatar: resolvedUserAvatar,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
