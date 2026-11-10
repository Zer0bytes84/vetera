import { useRowSaveFlash } from "@/hooks/useRowSaveFlash";
import { MedicalActReminderPrompt } from "@/modules/patient-reminders/medical-act-reminder-prompt";
import { ThemeControl } from "./components/theme-control";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { ToolbarIcon } from "./components/toolbar-icon";
import { AccountMenu } from "./components/account-menu";
import { firstNameOf } from "@/utils/display-format";
import { HeaderBreadcrumb } from "./components/header-breadcrumb";
import { HeaderSearch } from "./components/header-search";
import { HeaderSidebarToggle } from "./components/header-sidebar-toggle";
import { HeaderQuickActions } from "./components/header-quick-actions";
import { roleLabel } from "@/lib/user-role";
import { requestSettingsSection } from "@/lib/settings-navigation";
import type { PremiumShortcut } from "@/lib/visual-style";
import { useSidebarTone } from "@/lib/sidebar-tone";
import { HeroPattern } from "@/components/HeroPattern";
import { SaveIndicator } from "@/design-system/patterns/save-indicator";
import { useSaveIndicator } from "@/hooks/useSaveIndicator";
import {
  PatientPeek,
  PATIENT_PEEK_EVENT,
  type PatientPeekDetail,
  openPatientPeek,
} from "@/modules/patients/pages/patient-peek";
import { prepareAppointment } from "./model/clinical-actions";
import { requestCreation } from "./model/creation-request";
import { WhatsNewGate } from "@/modules/release-notes/whats-new-dialog";
import {
  Logout01Icon,
  Settings01Icon,
  TranslateIcon,
  User02Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useScroll, useTransform } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ASSISTANT_TOGGLE_EVENT,
  type AssistantOpenOptions,
} from "@/modules/consultations/assistant-events";
import { ConsultationAssistantPanel } from "@/modules/consultations/components/consultation-assistant-panel";

const QuickConsultation = lazy(() => import("@/modules/clinique/components/quick-consultation"));

const LocalConsultationAssistant = lazy(
  () => import("@/modules/consultations/components/local-consultation-assistant")
);

import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import { useIsPremium } from "@/modules/dashboard/v2/use-is-premium";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import { SectionGarden } from "@/components/SectionGarden";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { FocusProvider } from "@/contexts/focus-provider";
import { LayoutProvider, useLayout } from "@/contexts/layout-provider";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import {
  readCachedProfile,
  subscribeToCachedProfile,
} from "@/lib/profile-cache";
import { cn } from "@/lib/utils";
import { getViewTitle } from "@/app/config/navigation";
import { useNotificationCenter } from "@/services/notifications/useNotificationCenter";
import { NotificationCenter } from "@/modules/shell/notification-center";
import type { View } from "@/types";
import "./shell-toolbar.css";

const ALL_VIEWS: View[] = [
  "dashboard",
  "agenda",
  "clinique",
  "flux",
  "patients",
  "notes",
  "stock",
  "finances",
  "finances_analytics",
  "parametres",
  "equipe",
  "taches",
  "soins",
  "patient_detail",
];

const DEFAULT_VIEW: View = "dashboard";

const HASH_PREFIX_REGEX = /^#\/?/;
const PATIENT_DETAIL_PREFIX = /^patient\/([A-Za-z0-9_-]+)$/;

export interface RouteState {
  currentView: View;
  patientId: string | null;
}

function parseRouteFromHash(hash: string): RouteState {
  const raw = hash.replace(HASH_PREFIX_REGEX, "").trim();
  if (!raw) {
    return { currentView: DEFAULT_VIEW, patientId: null };
  }
  const match = raw.match(PATIENT_DETAIL_PREFIX);
  if (match) {
    return { currentView: "patient_detail", patientId: match[1] };
  }
  return {
    currentView: ALL_VIEWS.includes(raw as View) ? (raw as View) : DEFAULT_VIEW,
    patientId: null,
  };
}

export function AppShell() {
  return (
    <LayoutProvider>
      <FocusProvider>
        <AppShellInner />
      </FocusProvider>
    </LayoutProvider>
  );
}

function AppShellInner() {
  const { t, i18n } = useTranslation();
  const isPremium = useIsPremium();
  const isRtl = i18n.dir() === "rtl";

  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }
    return parseRouteFromHash(window.location.hash).currentView;
  });
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") {
        return null;
      }
      return parseRouteFromHash(window.location.hash).patientId;
    }
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const [peekPatientId, setPeekPatientId] = useState<string | null>(null);
  const [peekFollows, setPeekFollows] = useState(false);
  const saveState = useSaveIndicator();
  useRowSaveFlash();
  useEffect(() => {
    const open = (event: Event) => {
      const { id, follow = false, toggle = false } = (
        event as CustomEvent<PatientPeekDetail>
      ).detail;
      setPeekFollows(follow);
      setPeekPatientId((current) => (toggle && current === id ? null : id));
    };
    window.addEventListener(PATIENT_PEEK_EVENT, open);
    return () => window.removeEventListener(PATIENT_PEEK_EVENT, open);
  }, []);

  const [assistantPatientId, setAssistantPatientId] = useState<string | undefined>(undefined);
  const [assistantAppointmentId, setAssistantAppointmentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleAssistantToggle = (event: Event) => {
      const custom = event as CustomEvent<AssistantOpenOptions>;
      if (custom.detail?.open !== undefined) {
        setAiAssistantOpen(custom.detail.open);
      } else {
        setAiAssistantOpen((prev) => !prev);
      }
      if (custom.detail?.patientId) {
        setAssistantPatientId(custom.detail.patientId);
      } else {
        setAssistantPatientId(undefined);
      }
      if (custom.detail?.appointmentId) {
        setAssistantAppointmentId(custom.detail.appointmentId);
      } else {
        setAssistantAppointmentId(undefined);
      }
    };
    window.addEventListener(ASSISTANT_TOGGLE_EVENT, handleAssistantToggle);
    return () => window.removeEventListener(ASSISTANT_TOGGLE_EVENT, handleAssistantToggle);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAiAssistantOpen((prev) => {
          const next = !prev;
          if (!next) setIsAssistantCollapsed(false);
          return next;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Every navigation lands at the very top, the page's stats band whole: a click on the page already shown included
  // (navigationTick), and while the page fills in (lazy view, data read after the first paint, which in the desktop app comes
  // later than the paint) it stays pinned at zero until the person scrolls themselves.
  const [navigationTick, setNavigationTick] = useState(0);
  useEffect(() => {
    const panel = sidebarScrollRef.current;
    if (!panel) return;
    panel.scrollTo({ top: 0, behavior: "instant" });
    let pinned = true;
    const release = () => {
      pinned = false;
    };
    const keep = () => {
      if (pinned && panel.scrollTop !== 0) panel.scrollTo({ top: 0, behavior: "instant" });
    };
    const content = panel.querySelector<HTMLElement>("[data-slot='shell-view-content']") ?? panel;
    const resize = new ResizeObserver(keep);
    resize.observe(content);
    panel.addEventListener("scroll", keep, { passive: true });
    const inputs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    for (const type of inputs) panel.addEventListener(type, release, { passive: true });
    const stop = window.setTimeout(release, 2500);
    return () => {
      window.clearTimeout(stop);
      resize.disconnect();
      panel.removeEventListener("scroll", keep);
      for (const type of inputs) panel.removeEventListener(type, release);
    };
  }, [currentView, currentPatientId, navigationTick]);

  useEffect(() => {
    const panel = sidebarScrollRef.current;
    if (!panel) return;
    const content = panel.querySelector<HTMLElement>(".app-view-enter");
    const updateScrollGeometry = () => {
      const style = getComputedStyle(panel);
      const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      const scrollbarWidth = Math.max(0, panel.offsetWidth - panel.clientWidth - borders);
      panel.style.setProperty("--shell-scrollbar-width", `${scrollbarWidth}px`);
      const action = panel.querySelector<HTMLElement>('[aria-keyshortcuts="N"], [data-slot="page-header-actions"]');
      if (action) {
        const top = action.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
        panel.style.setProperty("--shell-scroll-start", `${Math.max(0, top)}px`);
      }
    };
    const observer = new ResizeObserver(updateScrollGeometry);
    observer.observe(panel);
    if (content) observer.observe(content);
    let frame = requestAnimationFrame(updateScrollGeometry);
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateScrollGeometry);
    });
    mutations.observe(panel, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [currentView, currentPatientId]);

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setCurrentPatientId(null);
    setNavigationTick((tick) => tick + 1);
  }, []);

  const handleNavigateToPatient = useCallback((patientId: string) => {
    setPeekPatientId(null);
    setCurrentView("patient_detail");
    setCurrentPatientId(patientId);
    setNavigationTick((tick) => tick + 1);
  }, []);

  const handleCloseAIAgent = useCallback(() => {
    setAiAssistantOpen(false);
    setIsAssistantCollapsed(false);
    const hash =
      currentView === "patient_detail" && currentPatientId
        ? `#/patient/${currentPatientId}`
        : `#/${currentView}`;
    window.history.replaceState(null, "", hash);
  }, [currentPatientId, currentView]);

  // useNotificationToasts(handleNavigate, handleNavigateToPatient);

  // Protocol-style glass header — opacity driven by scroll position (continuous, not toggled)
  const { scrollY } = useScroll({ container: sidebarScrollRef });
  const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9]);
  const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8]);

  const { unreadCount, criticalCount } = useNotificationCenter();
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const pageTitle =
    currentView === "patient_detail"
      ? "Dossier patient"
      : getViewTitle(currentView, t);

  const { currentUser, logout } = useAuth();
  useSidebarTone(currentUser?.id);
  const [consultationPickerOpen, setConsultationPickerOpen] = useState(false);
  useEffect(() => {
    // The palette's Nouvelle consultation opens the same patient picker.
    const openPicker = () => setConsultationPickerOpen(true);
    window.addEventListener("vetera:quick-consultation", openPicker);
    return () => window.removeEventListener("vetera:quick-consultation", openPicker);
  }, []);

  const handleQuickAction = useCallback((action: PremiumShortcut) => {
    if (action === "consultation") { setConsultationPickerOpen(true); return; }
    if (action === "patient" || action === "document" || action === "product" || action === "invoice") {
      const page: Record<typeof action, View> = { patient: "patients", document: "notes", product: "stock", invoice: "finances" };
      handleNavigate(page[action]);
      requestCreation(action);
      return;
    }
    if (action === "care") sessionStorage.setItem("vetera:pending-care-form", "true");
    else prepareAppointment();
    handleNavigate(action === "care" ? "soins" : "agenda");
    const event = action === "care" ? "vetera:plan-care" : "vetera:new-appointment";
    window.setTimeout(() => window.dispatchEvent(new Event(event)), 150);
  }, [handleNavigate]);
  const [cachedAvatarUrl, setCachedAvatarUrl] = useState(
    () => readCachedProfile(currentUser?.email)?.avatarUrl ?? ""
  );

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }
    return subscribeToCachedProfile((event) => {
      if (
        event.detail.email.toLowerCase() === currentUser.email?.toLowerCase()
      ) {
        setCachedAvatarUrl(event.detail.profile.avatarUrl ?? "");
      }
    });
  }, [currentUser?.email]);

  const resolvedAvatarUrl =
    currentUser?.avatarUrl ||
    readCachedProfile(currentUser?.email)?.avatarUrl ||
    cachedAvatarUrl;
  const { setThemeMode, themeMode, toggleTheme, isDarkMode } = useThemeMode();
  const {
    handleMouseDown: handleWindowMouseDown,
    isDesktopRuntime,
    ref: headerRef,
  } = useTauriDrag<HTMLElement>(true);
  const { collapsible } = useLayout();
  const previousDecorView = useRef<string | null>(null);
  useEffect(() => {
    const route = `${currentView}:${currentPatientId ?? ""}`;
    if (previousDecorView.current === route) return;
    previousDecorView.current = route;
  }, [currentView, currentPatientId]);

  useEffect(() => {
    let hash = `#/${currentView}`;
    if (currentView === "patient_detail" && currentPatientId) {
      hash = `#/patient/${currentPatientId}`;
    }
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [currentView, currentPatientId]);

  useEffect(() => {
    const handleHashChange = () => {
      const next = parseRouteFromHash(window.location.hash);
      setCurrentView((previousView) =>
        previousView === next.currentView ? previousView : next.currentView
      );
      setCurrentPatientId((previousId) =>
        previousId === next.patientId ? previousId : next.patientId
      );
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keyboard router branches by key
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        handleNavigate("parametres");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (
        !(event.metaKey || event.ctrlKey || event.altKey) &&
        event.key.toLowerCase() === "n"
      ) {
        event.preventDefault();
        prepareAppointment();
        handleNavigate("agenda");
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("vetera:new-appointment")),
          150
        );
        return;
      }
      if (
        !(event.metaKey || event.ctrlKey || event.altKey) &&
        event.key.toLowerCase() === "j"
      ) {
        event.preventDefault();
        setAiAssistantOpen(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAiAssistantOpen((prev) => !prev);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (currentView === "patients") {
          window.dispatchEvent(new CustomEvent("vetera:new-patient"));
        } else {
          handleNavigate("patients");
          setTimeout(
            () => window.dispatchEvent(new CustomEvent("vetera:new-patient")),
            150
          );
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleNavigate("agenda");
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("vetera:new-appointment")),
          150
        );
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, handleNavigate]);

  const content = useMemo(
    () =>
      renderView(currentView, {
        onNavigate: handleNavigate,
        onNavigateToPatient: openPatientPeek,
        // The patients' list goes straight to the full record: no quick-read panel in between.
        onOpenPatientRecord: handleNavigateToPatient,
        patientId: currentPatientId,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => handleNavigate("notes"),
        userDisplayName:
          currentUser?.displayName || currentUser?.email || "Utilisateur",
      }),
    [
      currentView,
      currentPatientId,
      handleNavigate,
      handleNavigateToPatient,
      setThemeMode,
      themeMode,
      currentUser?.displayName,
      currentUser?.email,
      resolvedAvatarUrl,
    ]
  );

  const userDisplayName =
    currentUser?.displayName || currentUser?.email || "Utilisateur";
  const userEmail = currentUser?.email || "local@baitari.app";

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  };


  return (
    <SidebarProvider
      onMouseDownCapture={(event) => {
        const target = event.target as HTMLElement;
        // Portalled dialogs/menus must never become window drag surfaces.
        if (!event.currentTarget.contains(target)) return;
        if (target.closest('[role="dialog"], [role="menu"], [data-no-drag]'))
          return;
        if (
          target.closest('[data-window-drag-region="true"]') ||
          (isDesktopRuntime &&
            event.clientY >= 4 &&
            event.clientY < 20 &&
            event.clientX > 80)
        ) {
          handleWindowMouseDown(event);
        }
      }}
      defaultOpen={true}
      className={cn("relative isolate !bg-sidebar", isRtl && "rtl-shell")}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        {
          "--header-height": isPremium ? "60px" : "72px",
          "--titlebar-clearance": isDesktopRuntime ? "20px" : "0px",
        } as React.CSSProperties
      }
    >
      <WhatsNewGate />
      {consultationPickerOpen && <Suspense fallback={null}><QuickConsultation open onOpenChange={setConsultationPickerOpen} onNavigate={handleNavigate}/></Suspense>}
      <AppSidebar
        collapsible={collapsible}
        currentView={currentView}
        onNavigate={handleNavigate}
        side={isRtl ? "right" : "left"}
        variant="sidebar"
      />

      <SidebarInset
        style={
          {
            "--header-content-clearance": "var(--titlebar-clearance)",
          } as React.CSSProperties
        }
        className={cn(
          "!border-none backdrop-blur-xl",
          "!m-0 !rounded-none !bg-white/40 dark:!bg-zinc-950/40 p-0 shadow-none ring-0",
          "transition-[margin,background-color,border-color,border-radius,box-shadow,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          aiAssistantOpen && !isAssistantCollapsed && "sm:mr-[var(--assistant-width)]",
          "max-h-dvh"
        )}
      >
        <div
          className={cn(
            "!border-b-0 relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none bg-background transition-[background-color,border-radius,box-shadow,opacity] duration-[240ms] ease-[var(--ease-out)] [scrollbar-gutter:auto]",
            "rounded-none shadow-none ring-0"
          )}
          data-slot="shell-scroll-panel"
          ref={sidebarScrollRef}
        >
          <HeroPattern />
          <motion.header
            className={cn(
              "sticky top-0 z-40 flex w-full shrink-0 items-center",
              !isPremium && "border-b border-black/[0.06] dark:border-white/[0.08]",
              !isPremium && "bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl backdrop-saturate-150",
              !isPremium && "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_20px_-2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_24px_-2px_rgba(0,0,0,0.4)]",
              isPremium && "!border-none !shadow-none",
              isDesktopRuntime && "cursor-default select-none"
            )}
            data-slot="app-header"
            data-window-drag-region={isDesktopRuntime ? "true" : undefined}
            ref={headerRef}
            style={
              {
                "--bg-opacity-light": bgOpacityLight,
                "--bg-opacity-dark": bgOpacityDark,
                height: isPremium
                  ? "60px"
                  : "calc(var(--header-height) + var(--header-content-clearance))",
              } as React.CSSProperties
            }
          >
            <div
              className="shell-toolbar relative flex min-w-0 w-full items-center justify-between gap-3 px-4 lg:px-6"
              data-header-page={currentView}
              style={{
                alignSelf: "stretch",
                minHeight: isPremium ? "60px" : "72px",
                height: isPremium ? "60px" : undefined,
                paddingBlock: isPremium ? "0px" : "12px",
                boxSizing: "border-box",
              }}
            >
              {/* 1. GAUCHE : Logo & Titre classique de page OU recherche (Premium et Clean) */}
              {isPremium ? (
                <div className="shell-toolbar-leading flex min-w-0 flex-1 items-center gap-2.5">
                  <HeaderSidebarToggle />
                  <span aria-hidden="true" className="shell-header-divider" />
                  <HeaderBreadcrumb fallbackTitle={pageTitle} greetingName={currentView === "dashboard" ? firstNameOf(currentUser?.displayName, "Docteur") : undefined} onNavigate={handleNavigate} />
                </div>
              ) : (
                <div className="shell-toolbar-leading flex min-w-0 flex-1 sm:flex-initial items-center gap-2.5">
                  <SidebarTrigger
                    aria-label="Menu"
                    className="shell-toolbar-control size-9 shrink-0 md:hidden"
                  />
                  <div className="shell-toolbar-identity flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleNavigate("dashboard")}
                      className="group hidden sm:flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg p-0.5"
                      aria-label="Aller au tableau de bord Baitari"
                    >
                      <Logo collapsed variant="refined" size="sm" className="shrink-0 transition-transform group-hover:scale-105" />
                    </button>
                    <div className="hidden sm:block h-4 w-px bg-black/10 dark:bg-white/15 shrink-0" />
                    <h1 className="truncate font-heading font-semibold t-16 md:t-18 tracking-[-0.02em] text-foreground">
                      {pageTitle}
                    </h1>
                    <div data-slot="header-save-indicator" className="hidden sm:block">
                      <SaveIndicator state={saveState} />
                    </div>
                  </div>
                </div>
              )}

              {saveState !== "idle" && <div className="premium-header-save-indicator" data-slot="premium-header-save-indicator"><SaveIndicator state={saveState} /></div>}

              {/* 2. Search, then a thin rule, then the tools */}
              {isPremium && (
                <>
                  <HeaderSearch onOpen={() => setPaletteOpen(true)} open={paletteOpen} />
                  <span aria-hidden="true" className="shell-header-divider" />
                </>
              )}

              {/* 3. DROITE : Actions */}
              <div className="shell-toolbar-actions flex shrink-0 items-center justify-end gap-2">
                {isPremium ? (
                  <>
                    {/* 0. Quick actions: the same place on every page */}
                    <HeaderQuickActions className="topIcon" onAction={handleQuickAction} />

                    {/* 1. Theme toggle */}
                    <ThemeControl dark={isDarkMode} onToggle={toggleTheme} />

                    {/* 3. Assistant IA */}
                    <ShortcutTooltip label="Assistant IA" shortcut="⌘ J">
                      <button
                        type="button"
                        aria-label="Ouvrir l'Assistant IA (⌘J)"
                        aria-haspopup="dialog"
                        aria-keyshortcuts="Meta+J Control+J"
                        onClick={() =>
                          setAiAssistantOpen((prev) => {
                            const next = !prev;
                            if (!next) setIsAssistantCollapsed(false);
                            return next;
                          })
                        }
                        className={cn(
                          "topIcon",
                          aiAssistantOpen && "!bg-primary !text-primary-foreground"
                        )}
                      >
                        <ToolbarIcon name="assistant" />
                      </button>
                    </ShortcutTooltip>

                    <ShortcutTooltip label="Notifications">
                      <button ref={notificationsButtonRef} type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(current => !current)} className="topIcon relative">
                        <ToolbarIcon name="notifications" />
                        {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 t-12 text-primary-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                      </button>
                    </ShortcutTooltip>

                    <NotificationCenter
                      hideTrigger
                      open={notificationsOpen}
                      onOpenChange={setNotificationsOpen}
                      anchor={notificationsButtonRef}
                      onNavigate={handleNavigate}
                      onNavigateToPatient={handleNavigateToPatient}
                    />
                  </>
                ) : (
                  <>
                    {/* Quick actions: the same place on every page */}
                    <HeaderQuickActions
                      className="shell-toolbar-control grid size-9 shrink-0 place-items-center rounded-full"
                      onAction={handleQuickAction}
                    />

                    {/* Mobile search button */}
                    <ShortcutTooltip label="Rechercher partout" shortcut="⌘ K">
                      <button
                        type="button"
                        aria-label="Rechercher partout"
                        aria-haspopup="dialog"
                        aria-keyshortcuts="Meta+K Control+K"
                        onClick={() => setPaletteOpen(true)}
                        className="shell-toolbar-control grid size-9 shrink-0 place-items-center sm:!hidden"
                      >
                        <ToolbarIcon name="search" />
                      </button>
                    </ShortcutTooltip>

                    {/* Assistant IA button (unique) */}
                    <ShortcutTooltip label="Assistant IA" shortcut="⌘ J">
                      <button
                        type="button"
                        aria-label="Ouvrir l'Assistant IA (⌘J)"
                        aria-haspopup="dialog"
                        aria-keyshortcuts="Meta+J Control+J"
                        onClick={() =>
                          setAiAssistantOpen((prev) => {
                            const next = !prev;
                            if (!next) setIsAssistantCollapsed(false);
                            return next;
                          })
                        }
                        className={cn(
                          "shell-toolbar-control flex size-9 items-center justify-center rounded-full transition",
                          aiAssistantOpen && "!bg-primary !text-primary-foreground shadow-xs"
                        )}
                      >
                        <ToolbarIcon name="assistant" className="size-4 shrink-0" />
                      </button>
                    </ShortcutTooltip>

                    {/* Notifications button with unread count badge */}
                    <ShortcutTooltip label="Notifications">
                      <button
                        ref={notificationsButtonRef}
                        type="button"
                        aria-label="Notifications"
                        onClick={() => setNotificationsOpen((prev) => !prev)}
                        className={cn(
                          "shell-toolbar-control relative flex size-9 items-center justify-center rounded-full transition",
                          notificationsOpen && "!bg-accent !text-accent-foreground"
                        )}
                      >
                        <ToolbarIcon name="notifications" className="size-4 shrink-0" />
                        {unreadCount > 0 && (
                          <span
                            aria-label={`${unreadCount} notifications`}
                            className={cn(
                              "absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full t-12 font-bold text-white shadow-xs",
                              criticalCount > 0 ? "bg-rose-500" : "bg-amber-500"
                            )}
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </button>
                    </ShortcutTooltip>

                    <NotificationCenter
                      hideTrigger
                      open={notificationsOpen}
                      onOpenChange={setNotificationsOpen}
                      anchor={notificationsButtonRef}
                      onNavigate={handleNavigate}
                      onNavigateToPatient={handleNavigateToPatient}
                    />

                    {/* ── Theme button ────────────────────────────────────── */}
                    <ThemeControl dark={isDarkMode} onToggle={toggleTheme} />

                    {/* ── Settings + account dropdown ─────────────────────── */}
                    <DropdownMenu>
                      <ShortcutTooltip label="Paramètres et compte">
                        <DropdownMenuTrigger
                          ref={settingsButtonRef}
                          aria-label="Paramètres et compte"
                          className="shell-toolbar-control flex size-9 items-center justify-center rounded-full"
                        >
                          <ToolbarIcon name="settings" />
                        </DropdownMenuTrigger>
                      </ShortcutTooltip>

                      <DropdownMenuContent
                        align="end"
                        className="w-64 rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
                        sideOffset={8}
                      >
                        {/* User info header */}
                        <div className="mb-1 flex items-center gap-3 px-3 py-2.5">
                          <Avatar
                            className="size-10 shrink-0"
                            name={userDisplayName}
                            size="md"
                            src={resolvedAvatarUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm text-zinc-900 dark:text-white">
                              {userDisplayName}
                            </p>
                            <p className="truncate text-muted-foreground text-xs">
                              {userEmail}
                            </p>
                          </div>
                        </div>

                        <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-white/10" />

                        <DropdownMenuItem
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                          onClick={() => window.setTimeout(() => setNotificationsOpen(true), 0)}
                        >
                          <ToolbarIcon name="notifications" />
                          <span className="font-medium text-sm">Notifications</span>
                        </DropdownMenuItem>

                        {/* Language submenu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-100/80 dark:hover:bg-white/5">
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                              <HugeiconsIcon
                                className="size-4 text-sky-600 dark:text-sky-400"
                                icon={TranslateIcon}
                                strokeWidth={1.5}
                              />
                            </div>
                            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                              Langue
                            </span>
                            <span className="ml-auto font-semibold text-muted-foreground text-xs uppercase">
                              {i18n.language.slice(0, 2)}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-48 rounded-xl border border-zinc-200/80 bg-white/95 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95">
                            {SUPPORTED_LANGUAGES.map(({ code: lang }) => {
                              const isSelected = i18n.language === lang;
                              return (
                                <DropdownMenuItem
                                  key={lang}
                                  className={cn(
                                    "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm",
                                    isSelected && "font-semibold text-primary"
                                  )}
                                  onClick={async () => {
                                    await i18n.changeLanguage(lang);
                                  }}
                                >
                                  <span>{languageLabelByCode[lang]}</span>
                                  {isSelected && (
                                    <div className="size-1.5 rounded-full bg-primary" />
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-white/10" />

                        {/* Profile */}
                        <DropdownMenuItem
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                          onClick={() => handleNavigate("parametres")}
                        >
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10">
                            <HugeiconsIcon
                              className="size-4 text-zinc-600 dark:text-zinc-400"
                              icon={User02Icon}
                              strokeWidth={1.5}
                            />
                          </div>
                          <span className="font-medium text-sm">Mon profil</span>
                        </DropdownMenuItem>

                        {/* Settings */}
                        <DropdownMenuItem
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                          onClick={() => handleNavigate("parametres")}
                        >
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10">
                            <HugeiconsIcon
                              className="size-4 text-zinc-600 dark:text-zinc-400"
                              icon={Settings01Icon}
                              strokeWidth={1.5}
                            />
                          </div>
                          <span className="font-medium text-sm">Paramètres</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-white/10" />

                        {/* Logout */}
                        <DropdownMenuItem
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-rose-600 focus:bg-rose-50 focus:text-rose-600 dark:text-rose-400 dark:focus:bg-rose-500/10"
                          onClick={async () => {
                            await logout();
                          }}
                        >
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/20">
                            <HugeiconsIcon
                              className="size-4 text-rose-600 dark:text-rose-400"
                              icon={Logout01Icon}
                              strokeWidth={1.5}
                            />
                          </div>
                          <span className="font-medium text-sm">Déconnexion</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* 4. Le compte : l'avatar, en haut à droite, ouvre le menu du compte */}
              {isPremium && (
                <AccountMenu
                  avatarUrl={resolvedAvatarUrl}
                  email={userEmail}
                  name={userDisplayName}
                  onFinances={() => handleNavigate("finances")}
                  onLogout={logout}
                  onNotifications={() => window.setTimeout(() => setNotificationsOpen(true), 0)}
                  onClinic={() => {
                    requestSettingsSection("mon-cabinet");
                    handleNavigate("parametres");
                  }}
                  onProfile={() => handleNavigate("parametres")}
                  onSettings={() => handleNavigate("parametres")}
                  role={roleLabel(currentUser?.role, currentUser?.email)}
                  unreadCount={unreadCount}
                />
              )}

              {/* Windows: the same thin rule between the avatar and the window controls (shown by window-controls.css). */}
              <span aria-hidden="true" className="shell-header-divider window-controls-divider" />
            </div>
          </motion.header>

          {/* View content */}
          <div data-slot="shell-view-content" className="flex min-h-0 flex-1 flex-col gap-4 py-4">
            <div
              className="app-view-enter min-h-0 min-w-0 flex-1"
              key={`${currentView}:${currentPatientId ?? ""}`}
            >
              {!(
                [
                  "dashboard",
                  "patients",
                  "patient_detail",
                  "agenda",
                  "clinique",
                  "stock",
                  "finances",
                  "finances_analytics",
                  "equipe",
                  "notes",
                  "taches",
                  "soins",
                  "parametres",
                ] as View[]
              ).includes(currentView) && (
                <SectionGarden view={currentView} onNavigate={handleNavigate} />
              )}
              {content}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Command Palette */}
      <MedicalActReminderPrompt />
      {peekPatientId && (
        <PatientPeek
          follow={peekFollows}
          patientId={peekPatientId}
          onClose={() => setPeekPatientId(null)}
          onOpenFull={() => {
            const id = peekPatientId;
            setPeekPatientId(null);
            handleNavigateToPatient(id);
          }}
        />
      )}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
        onNavigateToPatient={handleNavigateToPatient}
      />
      <ConsultationAssistantPanel
        open={aiAssistantOpen}
        onCollapsedChange={setIsAssistantCollapsed}
      >
        {aiAssistantOpen && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
                Ouverture de l’assistant…
              </div>
            }
          >
            <LocalConsultationAssistant
              patientId={assistantPatientId ?? currentPatientId ?? undefined}
              appointmentId={assistantAppointmentId}
              onClose={handleCloseAIAgent}
            />
          </Suspense>
        )}
      </ConsultationAssistantPanel>
    </SidebarProvider>
  );
}
