"use client";

import { CalendarPlus, Stethoscope, Search, ClipboardList } from "@/lib/icons";
import { PREMIUM_SHORTCUTS, type PremiumShortcut } from "@/lib/visual-style";

import { SidebarIcon } from "@/modules/shell/components/sidebar-icon";
import { PremiumSidebarIcon } from "@/modules/shell/components/premium-sidebar-icon";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import { CalendarPlus as PremiumCalendarPlus, Stethoscope as PremiumStethoscope, Search as PremiumSearch, ClipboardList as PremiumClipboardList } from "lucide-react";
import "@/modules/shell/premium-sidebar.css";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { navigationSections } from "@/app/config/navigation";
import { SidebarBrand } from "@/components/mascot/sidebar-brand";
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
  onQuickAction?: (action: PremiumShortcut) => void;
  currentView: View;
  onNavigate: (view: View) => void;
  currentUserName: string;
  currentUserEmail: string;
  currentUserAvatar?: string | null;
};

export function AppSidebar({
  currentView,
  onQuickAction,
  onNavigate,
  currentUserName,
  currentUserEmail,
  currentUserAvatar,
  variant = "sidebar",
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isPremium = useIsPremium();
  const NavigationIcon = isPremium ? PremiumSidebarIcon : SidebarIcon;
  const navigationRef = React.useRef<HTMLDivElement>(null);
  const isCollapsed = state === "collapsed";
  React.useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;
    const revealActiveItem = () => {
      const active = navigation.querySelector<HTMLElement>('[data-active]');
      if (!active) return;
      const viewport = navigation.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const top = item.top - viewport.top;
      const bottom = item.bottom - viewport.bottom;
      if (top < 8) navigation.scrollTop += top - 8;
      else if (bottom > -8) navigation.scrollTop += bottom + 8;
    };
    const frame = requestAnimationFrame(revealActiveItem);
    const observer = new ResizeObserver(revealActiveItem);
    observer.observe(navigation);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [currentView, isCollapsed]);
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
    ...(patientSection?.items.slice(0, 5) ?? []),
  ].map((item) => ({
    title: t(item.labelKey),
    icon: (
      <NavigationIcon className={isCollapsed ? "size-6!" : "size-[22px]!"} view={item.view} />
    ),
    isActive: currentView === item.view,
    onClick: () => onNavigate(item.view),
  }));

  const documents = [
    ...(patientSection?.items.slice(5) ?? []),
    ...(operationsSection?.items ?? []),
  ].map((item) => ({
    name: item.view === "notes" ? "Documents" : t(item.labelKey),
    icon: (
      <NavigationIcon
        className={isCollapsed ? "size-6!" : "size-[22px]!"}
        view={item.view}
      />
    ),
    isActive: currentView === item.view || (item.view === "finances" && currentView === "finances_analytics"),
    onClick: () => onNavigate(item.view),
  }));

  const secondaryItems = (configSection?.items ?? []).map((item) => ({
    title: t(item.labelKey),
    icon: (
      <NavigationIcon className="size-[22px]!" view={item.view} />
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
          <SidebarBrand collapsed={isCollapsed} onHome={() => onNavigate("dashboard")} />
          {!isCollapsed && (
            <SidebarTrigger aria-label="Réduire la barre latérale" className="sidebar-logo-toggle size-8 rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          )}
        </div>
        {isCollapsed && (
          <SidebarTrigger aria-label="Déployer la barre latérale" title="Déployer la barre latérale" className="sidebar-icon-mode-toggle absolute size-8 text-sidebar-foreground/65 hover:text-sidebar-foreground" />
        )}
      </SidebarHeader>
      <SidebarContent
        ref={navigationRef}
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
            "flex min-h-full shrink-0 flex-col [&>[data-slot=sidebar-group]]:shrink-0",
            isCollapsed ? "w-full items-center gap-4" : "gap-4"
          )}
        >

          <NavMain items={mainItems} title={t("nav.sections.patientJourney")} premiumTitle="Espace de travail" />

          <NavDocuments
            items={documents.map((item) => ({
              name: item.name,
              icon: item.icon,
              isActive: item.isActive,
              onClick: item.onClick,
            }))}
            title={t("nav.sections.operations")}
            premiumTitle="Gestion du cabinet"
          />

          {secondaryItems.length > 0 && (
            <NavSecondary className="mt-auto" items={secondaryItems} />
          )}
          {!isCollapsed && (
            <nav aria-label="Raccourcis rapides" className="premium-shortcuts">
              <p className="premium-shortcuts-heading">Accès rapides</p>
              {PREMIUM_SHORTCUTS.map((shortcut) => {
                const Icon = (isPremium
                  ? { appointment: PremiumCalendarPlus, consultation: PremiumStethoscope, patient: PremiumSearch, care: PremiumClipboardList }
                  : { appointment: CalendarPlus, consultation: Stethoscope, patient: Search, care: ClipboardList })[shortcut.id];
                return <button key={shortcut.id} type="button" data-tone={shortcut.tone}
                  onClick={() => onQuickAction?.(shortcut.id)}>
                  <Icon className="premium-shortcut-icon" aria-hidden="true" strokeWidth={1} />
                  <span>{shortcut.label}</span>
                  <span className="premium-shortcut-dot" aria-hidden="true" />
                </button>;
              })}
            </nav>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "relative z-10 shrink-0 transition-all duration-300",
          isCollapsed
            ? "mx-0 mt-auto mb-0 flex flex-col items-center gap-2 px-0 py-3"
            : "mx-0 mt-auto mb-0 bg-transparent px-3 py-3"
        )}
      >
        <div
          className={cn(
            "transition-all duration-300",
            isPremium && "board-frame sidebar-account-frame",
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
            <NavigationIcon view="parametres" className="size-6" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
