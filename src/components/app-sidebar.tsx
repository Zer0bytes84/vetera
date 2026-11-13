"use client";

import { SidebarIcon } from "@/modules/shell/components/sidebar-icon";
import {
  AccountSidebarFooter,
  type AccountMenuProps,
} from "@/modules/shell/components/account-menu";
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
import { cn } from "@/lib/utils";
import {
  CLINIC_TAB_EVENT,
  CLINIC_TAB_OPEN_EVENT,
  CLINIC_TAB_PENDING_KEY,
} from "@/modules/clinique/clinic-tab-events";
import { type ClinicTab, isClinicTabVisible, useHospitalizationEnabled } from "@/modules/clinique/clinic-services";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  currentView: View;
  onNavigate: (view: View) => void;
  /** The signed-in account, shown as the sidebar footer's profile block. */
  account?: AccountMenuProps;
};

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
  account,
  variant = "sidebar",
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
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
  // A practice without hospitalization (Paramètres > Mon cabinet) does not see its entry. The same
  // filter applies wherever the clinic entries are listed, sub-pages here or direct entries.
  const hospitalizationEnabled = useHospitalizationEnabled();
  const clinicEntries = (
    [
      { tab: "soins", title: "Soins" },
      { tab: "hospitalisation", title: "Hospitalisation" },
    ] satisfies { tab: ClinicTab; title: string }[]
  ).filter((entry) => isClinicTabVisible(entry.tab, hospitalizationEnabled));
  const subPages: Partial<Record<View, { open: boolean; children: NavItem["children"] }>> = {
    // With Soins alone there is nothing to unfold: the entry is the page.
    ...(clinicEntries.length > 1 && {
      clinique: {
        open: inClinic,
        children: clinicEntries.map((entry) => ({
          title: entry.title,
          isActive: inClinic && clinicTab === entry.tab,
          onClick: () => openClinicTab(entry.tab, currentView, onNavigate),
        })),
      },
    }),
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
      title: item.view === "notes" ? "Documents" : item.view === "clinique" && !hospitalizationEnabled ? "Soins" : t(item.labelKey),
      icon: <SidebarIcon className="size-5!" view={item.view} />,
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

          <NavMain items={mainItems} title="Espace de travail" />

          <NavMain items={managementItems} title="Gestion du cabinet" />
        </div>
      </SidebarContent>
      {/* The account block alone at the very bottom (Catalyst footer): a hairline, the avatar, the name, the email, and the account menu opening upwards. Settings live in that menu now. */}
      <SidebarFooter
        className={cn(
          "sidebar-settings-footer relative z-10 shrink-0",
          isCollapsed
            ? "mx-0 mt-auto mb-0 flex flex-col items-center gap-2 px-0 py-3"
            : "mx-0 mt-auto mb-0 bg-transparent px-4 pt-2 pb-4"
        )}
      >
        {account ? (
          isCollapsed ? (
            <AccountSidebarFooter {...account} collapsed />
          ) : (
            <div className="mt-2 border-t border-sidebar-border/70 pt-2">
              <AccountSidebarFooter {...account} />
            </div>
          )
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
