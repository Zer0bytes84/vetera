"use client";

import { SidebarIcon } from "@/modules/shell/components/sidebar-icon";
import { PremiumSidebarIcon } from "@/modules/shell/components/premium-sidebar-icon";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import "@/modules/shell/premium-sidebar.css";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { navigationSections } from "@/app/config/navigation";
import { SidebarBrand } from "@/components/mascot/sidebar-brand";
import { NavMain, type NavItem } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { SearchIcon } from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import {
  CLINIC_TAB_EVENT,
  CLINIC_TAB_OPEN_EVENT,
  CLINIC_TAB_PENDING_KEY,
} from "@/modules/clinique/clinic-tab-events";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentView: View;
  onNavigate: (view: View) => void;
  onSearch?: () => void;
};

type ClinicTab = "soins" | "hospitalisation";

/** Opens a section of Soins & hospitalisation, mounted or not. */
function openClinicTab(tab: ClinicTab, currentView: View, onNavigate: (view: View) => void) {
  if (currentView === "clinique" || currentView === "soins") {
    window.dispatchEvent(new CustomEvent(CLINIC_TAB_OPEN_EVENT, { detail: tab }));
    return;
  }
  sessionStorage.setItem(CLINIC_TAB_PENDING_KEY, tab);
  onNavigate("clinique");
}

export function AppSidebar({
  currentView,
  onNavigate,
  onSearch,
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

  // The section shown inside Soins & hospitalisation, reported by the workspace.
  const [clinicTab, setClinicTab] = React.useState<ClinicTab>("soins");
  React.useEffect(() => {
    const onTab = (event: Event) => setClinicTab((event as CustomEvent<ClinicTab>).detail);
    window.addEventListener(CLINIC_TAB_EVENT, onTab);
    return () => window.removeEventListener(CLINIC_TAB_EVENT, onTab);
  }, []);
  // Sub-pages unfold with their page; a toggle overrides that until the next visit.
  const [toggled, setToggled] = React.useState<{ view: View; open: Partial<Record<View, boolean>> }>({ view: currentView, open: {} });
  const unfolded = toggled.view === currentView ? toggled.open : {};

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

  const inClinic = currentView === "clinique" || currentView === "soins";
  const subPages: Partial<Record<View, { open: boolean; children: NavItem["children"] }>> = {
    clinique: {
      open: inClinic,
      children: [
        { title: "Soins", isActive: inClinic && clinicTab === "soins", onClick: () => openClinicTab("soins", currentView, onNavigate) },
        { title: "Hospitalisation", isActive: inClinic && clinicTab === "hospitalisation", onClick: () => openClinicTab("hospitalisation", currentView, onNavigate) },
      ],
    },
    finances: {
      open: currentView === "finances" || currentView === "finances_analytics",
      children: [
        { title: t("views.finances_analytics"), isActive: currentView === "finances_analytics", onClick: () => onNavigate("finances_analytics") },
      ],
    },
  };

  const toNavItem = (item: { view: View; labelKey: string }): NavItem => {
    const sub = subPages[item.view];
    const expanded = unfolded[item.view] ?? sub?.open ?? false;
    return {
      title: item.view === "notes" ? "Documents" : t(item.labelKey),
      icon: (
        <NavigationIcon className={isCollapsed ? "size-6!" : "size-[22px]!"} view={item.view} />
      ),
      isActive:
        currentView === item.view ||
        (item.view === "clinique" && currentView === "soins") ||
        (item.view === "finances" && currentView === "finances_analytics"),
      onClick: () => onNavigate(item.view),
      children: sub?.children,
      expanded,
      onToggle: () => setToggled({ view: currentView, open: { ...unfolded, [item.view]: !expanded } }),
    };
  };

  const mainItems = [
    ...(overviewSection?.items ?? []),
    ...(patientSection?.items.slice(0, 5) ?? []),
  ].map(toNavItem);

  const managementItems = [
    ...(patientSection?.items.slice(5) ?? []),
    ...(operationsSection?.items ?? []),
  ].map(toNavItem);

  const settingsActive = currentView === "parametres";

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
            "pointer-events-none absolute top-full z-50 h-px bg-zinc-900/7.5 transition-[left,width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-white/12",
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
        </div>
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

          {onSearch ? (
            isCollapsed ? (
              <ShortcutTooltip label="Rechercher" shortcut="⌘ K">
                <button
                  aria-label="Rechercher (⌘K)"
                  aria-haspopup="dialog"
                  aria-keyshortcuts="Meta+K Control+K"
                  className="flex size-11 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  onClick={onSearch}
                  type="button"
                >
                  <HugeiconsIcon className="size-5" icon={SearchIcon} strokeWidth={1.5} />
                </button>
              </ShortcutTooltip>
            ) : (
              <button
                aria-label="Ouvrir la palette de commandes (⌘K)"
                aria-haspopup="dialog"
                aria-keyshortcuts="Meta+K Control+K"
                className="group flex h-[calc(var(--premium-nav-row)+6px)] w-full items-center gap-2.5 rounded-full border border-sidebar-foreground/20 bg-transparent pl-2.5 pr-3.5 text-left text-sidebar-foreground/75 transition-colors hover:border-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                onClick={onSearch}
                type="button"
              >
                <HugeiconsIcon className="size-[18px] shrink-0 opacity-80 transition-opacity group-hover:opacity-100" icon={SearchIcon} strokeWidth={1.5} />
                <span className="flex-1 truncate text-sm font-medium">Rechercher</span>
                <kbd className="pointer-events-none inline-flex items-center rounded-md bg-sidebar-accent px-2.5 py-1 font-mono t-12 font-semibold tracking-tight text-sidebar-foreground/85 shadow-sm">
                  ⌘K
                </kbd>
              </button>
            )
          ) : null}

          <NavMain items={mainItems} title={t("nav.sections.patientJourney")} premiumTitle="Espace de travail" />

          <NavMain
            items={managementItems}
            title={t("nav.sections.operations")}
            premiumTitle="Gestion du cabinet"
          />
        </div>
      </SidebarContent>
      {/* Settings alone in the footer: no rule, the spacing sets it apart. */}
      <SidebarFooter
        className={cn(
          "sidebar-settings-footer relative z-10 shrink-0",
          isCollapsed
            ? "mx-0 mt-auto mb-0 flex flex-col items-center gap-2 px-0 py-3"
            : "mx-0 mt-auto mb-0 bg-transparent px-4 pt-2 pb-4"
        )}
      >
        <ShortcutTooltip label="Paramètres" shortcut="⌘ ,">
          <button
            aria-label="Paramètres"
            aria-current={settingsActive ? "page" : undefined}
            className={cn(
              "sidebar-settings-button flex items-center text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              isCollapsed ? "size-11 justify-center rounded-xl" : "h-[var(--premium-nav-row)] w-full justify-start gap-2.5 rounded-lg px-2.5",
              settingsActive && "bg-sidebar-accent text-sidebar-foreground"
            )}
            data-active={settingsActive ? "true" : undefined}
            onClick={() => onNavigate("parametres")}
            type="button"
          >
            {isCollapsed ? (
              <NavigationIcon view="parametres" className="size-6" />
            ) : (
              <>
                <span className="sidebar-nav-icon">
                  <NavigationIcon view="parametres" className="size-5" />
                </span>
                <span className="min-w-0 truncate leading-5">Paramètres</span>
              </>
            )}
          </button>
        </ShortcutTooltip>
      </SidebarFooter>
    </Sidebar>
  );
}
