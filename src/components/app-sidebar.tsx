"use client";


import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  SidebarSeparator,
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
  onLogout,
  onOpenPalette: _onOpenPalette,
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
    currentUserName ||
    cachedProfile?.displayName;
  const resolvedUserAvatar =
    currentUserRecord?.avatarUrl ||
    currentUserAvatar ||
    cachedProfile?.avatarUrl;

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
  ].map((item, index) => {
    return {
      title: t(item.labelKey),
      icon: (
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={1.5}
          className="transition-all duration-200 ease-out size-[18px]"
        />
      ),
      isActive: currentView === item.view,
      onClick: () => onNavigate(item.view),
    };
  });

  const documents = [
    ...(patientSection?.items.slice(4) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => {
    return {
      name: t(item.labelKey),
      icon: (
        <HugeiconsIcon
          icon={item.icon}
          strokeWidth={1.5}
          className="transition-all duration-200 ease-out size-[18px]"
        />
      ),
      isActive: currentView === item.view,
      onClick: () => onNavigate(item.view),
    };
  });

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: t(item.labelKey),
    icon: (
      <HugeiconsIcon
        icon={item.icon}
        strokeWidth={1.5}
        className="transition-all duration-200 ease-out size-[18px]"
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
          icon={LayoutLeftIcon}
          strokeWidth={1.5}
          className="transition-all duration-200 ease-out size-[18px] rotate-180"
        />
      ),
      isActive: false,
      onClick: toggleSidebar,
    });
  }

  return (
    <Sidebar
      {...props}
      className={cn("border-none", props.className)}
    >
      <div className="apple-sidebar-glow" />

      <SidebarHeader
        className={cn(
          "flex shrink-0 flex-row items-center relative z-10",
          "h-[64px] transition-all duration-300",
          isCollapsed ? "px-0 justify-center" : "px-4",
          "bg-transparent w-full"
        )}
      >
        {/* Hairline separator */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute z-50 top-full -translate-y-[6px] h-px bg-zinc-900/7.5 dark:bg-white/7.5",
            isCollapsed 
              ? "w-[var(--sidebar-width-icon)] left-0" 
              : "w-[calc(var(--sidebar-width)+1px)] -left-4"
          )}
        />

        {/* Invisible drag area to fill remaining space */}
        {isDesktopRuntime && (
          <div data-tauri-drag-region="true" className="absolute inset-x-0 top-0 h-[40px] z-0 cursor-grab active:cursor-grabbing" />
        )}
        <SidebarMenu className="relative z-10 w-full">
          <SidebarMenuItem className="flex flex-row items-center justify-between w-full">
              <SidebarMenuButton
                className={cn(
                  "hover:bg-transparent active:bg-transparent h-13 px-1 flex-1",
                  "transition-all duration-300 ease-out",
                  isCollapsed && "px-0 justify-center ms-0"
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
                <SidebarTrigger className="-mr-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
              )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "overflow-y-auto relative z-10",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isCollapsed ? "px-0 pt-2 flex flex-col items-center" : "px-4 pt-2 pb-6"
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-1 flex-col",
            isCollapsed ? "gap-0.5 items-center w-full" : "gap-6"
          )}
        >
          <NavMain
            items={mainItems}
            title={t("nav.sections.patientJourney")}
          />

          {/* Subtle divider between groups in collapsed mode */}
          {isCollapsed && (
            <div className="my-2 h-px w-8 bg-zinc-900/8 dark:bg-white/8 rounded-full" />
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
        </div>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "shrink-0 transition-all duration-300 relative z-10",
          isCollapsed
            ? "mx-0 mb-0 mt-auto px-0 pt-2 pb-2 flex flex-col items-center gap-0.5"
            : "mx-3 mb-1 mt-auto rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 px-2 pt-2 pb-1 shadow-sm backdrop-blur-md"
        )}
      >
        {/* Divider above footer */}
        {isCollapsed && (
          <div className="mb-2 h-px w-8 bg-zinc-900/8 dark:bg-white/8 rounded-full" />
        )}
        <NavSecondary
          className="p-0"
          items={secondaryItems}
        />
        <div className={cn("my-1.5 h-px w-full bg-zinc-900/5 dark:bg-white/5", isCollapsed && "hidden")} />
        <NavUser
          onFinances={() => onNavigate("finances")}
          onNotifications={() => onNavigate("taches")}
          onProfile={() => onNavigate("equipe")}
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
