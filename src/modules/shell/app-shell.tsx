import { useRowSaveFlash } from "@/hooks/useRowSaveFlash";
import { ThemeControl } from "./components/theme-control";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { ToolbarIcon } from "./components/toolbar-icon";
import { HeroPattern } from "@/components/HeroPattern";
import { SaveIndicator } from "@/design-system/patterns/save-indicator";
import { useSaveIndicator } from "@/hooks/useSaveIndicator";
import {
  PatientPeek,
  PATIENT_PEEK_EVENT,
  openPatientPeek,
} from "@/modules/patients/pages/patient-peek";
import { prepareAppointment } from "./model/clinical-actions";
import {
  CheckmarkCircle01Icon,
  HelpCircleIcon,
  Logout01Icon,
  Moon01Icon,
  Settings01Icon,
  Sun01Icon,
  TranslateIcon,
  User02Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import Avatar from "@/components/Avatar";
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
  useSidebar,
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
// import { useNotificationToasts } from "@/services/notifications/useNotificationToasts";
import { NotificationCenter } from "@/modules/shell/notification-center";
import type { View } from "@/types";
import "./shell-toolbar.css";

const ALL_VIEWS: View[] = [
  "dashboard",
  "agenda",
  "clinique",
  "patients",
  "notes",
  "stock",
  "finances",
  "finances_analytics",
  "parametres",
  "equipe",
  "taches",
  "aide",
  "patient_detail",
  "assistant",
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

function DocumentsSidebarMode({ active }: { active: boolean }) {
  const { isMobile, open, setOpen } = useSidebar();
  const previousOpen = useRef<boolean | null>(null);
  const setOpenRef = useRef(setOpen);
  useEffect(() => {
    setOpenRef.current = setOpen;
  }, [setOpen]);
  useEffect(() => {
    if (isMobile) return;
    if (active) {
      if (previousOpen.current === null) previousOpen.current = open;
      setOpenRef.current(false);
    } else if (previousOpen.current !== null) {
      setOpenRef.current(previousOpen.current);
      previousOpen.current = null;
    }
  }, [active, isMobile, open]);
  return null;
}

function AppShellInner() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }
    const initialView = parseRouteFromHash(window.location.hash).currentView;
    return initialView === "assistant" ? DEFAULT_VIEW : initialView;
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
  const [aiAssistantOpen, setAiAssistantOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return parseRouteFromHash(window.location.hash).currentView === "assistant";
  });
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const [peekPatientId, setPeekPatientId] = useState<string | null>(null);
  const saveState = useSaveIndicator();
  useRowSaveFlash();
  useEffect(() => {
    const open = (event: Event) =>
      setPeekPatientId((event as CustomEvent<{ id: string }>).detail.id);
    window.addEventListener(PATIENT_PEEK_EVENT, open);
    return () => window.removeEventListener(PATIENT_PEEK_EVENT, open);
  }, []);

  useEffect(() => {
    sidebarScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView, currentPatientId]);

  const handleNavigate = useCallback((view: View) => {
    if (view === "assistant") {
      setAiAssistantOpen(true);
      return;
    }
    setCurrentView(view);
    setCurrentPatientId(null);
  }, []);

  const handleNavigateToPatient = useCallback((patientId: string) => {
    setCurrentView("patient_detail");
    setCurrentPatientId(patientId);
  }, []);

  const handleCloseAIAgent = useCallback(() => {
    setAiAssistantOpen(false);
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

  const { currentUser, logout } = useAuth();
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
  const { variant, collapsible } = useLayout();
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
      if (next.currentView === "assistant") {
        setAiAssistantOpen(true);
        setCurrentView(DEFAULT_VIEW);
        setCurrentPatientId(null);
        return;
      }
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
        handleNavigate("assistant");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        handleNavigate("notes");
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
        patientId: currentPatientId,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => handleNavigate("notes"),
        userAvatarUrl: resolvedAvatarUrl,
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

  const assistantModal = aiAssistantOpen
    ? renderView("assistant", {
        currentTheme: themeMode,
        onNavigate: handleNavigate,
        onThemeChange: setThemeMode,
        onCloseAIAgent: handleCloseAIAgent,
        patientId: currentPatientId,
        userAvatarUrl: resolvedAvatarUrl,
        userDisplayName,
      })
    : null;

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
          "--header-height": "48px",
          "--titlebar-clearance": isDesktopRuntime ? "20px" : "0px",
        } as React.CSSProperties
      }
    >
      <DocumentsSidebarMode active={currentView === "notes"} />
      <AppSidebar
        collapsible={collapsible}
        currentUserAvatar={currentUser?.avatarUrl ?? null}
        currentUserEmail={userEmail}
        currentUserName={userDisplayName}
        currentView={currentView}
        onNavigate={handleNavigate}
        side={isRtl ? "right" : "left"}
        variant={variant}
      />

      <SidebarInset
        style={
          {
            "--header-content-clearance":
              isDesktopRuntime && (variant === "minimal" || variant === "inset")
                ? "8px"
                : "var(--titlebar-clearance)",
          } as React.CSSProperties
        }
        className={cn(
          "!border-none backdrop-blur-xl",
          variant === "sidebar" &&
            "!m-0 !rounded-none !bg-white/40 dark:!bg-zinc-950/40 p-0 shadow-none ring-0",
          variant === "inset" &&
            "!rounded-t-[24px] !rounded-b-none !border-transparent !bg-transparent p-2 pb-2 shadow-none ring-0",
          variant === "minimal" &&
            "!mb-0 !rounded-t-[18px] !rounded-b-none !border-none !bg-background dark:!bg-zinc-950 p-0 shadow-sm ring-0",
          variant === "floating" &&
            "!rounded-[24px] !bg-transparent p-0 shadow-sm ring-1 ring-black/5 dark:ring-white/8",
          variant === "glass" &&
            "!rounded-[22px] !bg-transparent p-0 shadow-none ring-0",
          "transition-[background-color,border-color,border-radius,box-shadow,opacity] duration-[240ms] ease-[var(--ease-out)]",
          "md:peer-data-[variant=inset]:max-h-dvh",
          "md:peer-data-[variant=minimal]:max-h-[calc(100dvh-8px)]",
          "md:peer-data-[variant=floating]:max-h-dvh",
          "md:peer-data-[variant=glass]:max-h-[calc(100dvh-24px)]",
          "max-h-dvh",
          isDesktopRuntime &&
            variant === "minimal" &&
            "md:!mt-[calc(var(--titlebar-clearance)-8px)] md:!max-h-[calc(100dvh-var(--titlebar-clearance)+8px)]",
          "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:!ms-0",
          "md:peer-data-[variant=minimal]:peer-data-[state=collapsed]:!ms-0"
        )}
      >
        {variant === "inset" ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 rounded-t-[24px] rounded-b-none bg-white/35 shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.5),0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:bg-zinc-900/30 dark:shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.34)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 rounded-t-[24px] rounded-b-none border border-zinc-950/[0.065] shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            />
          </>
        ) : null}
        {variant === "minimal" ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-t-[18px] rounded-b-none border-zinc-950/[0.075] border-s border-t dark:border-white/12"
          />
        ) : null}
        <div
          className={cn(
            "!border-b-0 relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-none bg-background transition-[background-color,border-radius,box-shadow,opacity] duration-[240ms] ease-[var(--ease-out)] [scrollbar-gutter:stable]",
            variant === "sidebar" && "rounded-none shadow-none ring-0",
            variant === "inset" &&
              "rounded-t-[16px] rounded-b-none shadow-2xl ring-1 ring-black/10 dark:shadow-[0_20px_50px_-24px_rgba(0,0,0,0.78)] dark:ring-white/10",
            variant === "minimal" &&
              "rounded-t-[18px] rounded-b-none shadow-none ring-0",
            variant === "floating" &&
              "rounded-[22px] shadow-2xl ring-1 ring-black/10 dark:ring-white/14",
            variant === "glass" &&
              "rounded-[22px] shadow-[0_18px_55px_-32px_rgba(15,23,42,0.32)] ring-1 ring-black/[0.06] dark:shadow-[0_24px_64px_-34px_rgba(0,0,0,0.8)] dark:ring-white/10"
          )}
          ref={sidebarScrollRef}
        >
          <HeroPattern view={currentView} />
          <motion.header
            className={cn(
              "sticky top-0 z-50 flex w-full shrink-0 items-center gap-2 bg-white/[var(--bg-opacity-light)] backdrop-blur-xs will-change-transform [backface-visibility:hidden] [transform:translateZ(0)] dark:bg-zinc-900/[var(--bg-opacity-dark)] dark:backdrop-blur-sm",
              variant === "minimal" && "rounded-t-[18px]",
              variant === "glass" && "rounded-t-[22px]",
              isDesktopRuntime && "cursor-default select-none"
            )}
            data-slot="app-header"
            data-window-drag-region={isDesktopRuntime ? "true" : undefined}
            ref={headerRef}
            style={
              {
                "--bg-opacity-light": bgOpacityLight,
                "--bg-opacity-dark": bgOpacityDark,
                height:
                  "calc(var(--header-height) + var(--header-content-clearance))",
              } as React.CSSProperties
            }
          >
            {/* Hairline border (replaces border-b) — Protocol-faithful */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-full h-px bg-zinc-900/7.5 dark:bg-white/7.5"
              data-slot="app-header-separator"
            />
            <div
              className="shell-toolbar relative flex min-w-0 w-full items-center gap-3 px-4 lg:px-6"
              style={{ paddingTop: "var(--header-content-clearance)" }}
            >
              {/* Mobile navigation toggle */}
              <SidebarTrigger
                aria-label="Menu"
                className="shell-toolbar-control size-9 shrink-0 md:hidden"
              />

              <div className="hidden lg:block">
                <SaveIndicator state={saveState} />
              </div>

              <div className="shell-toolbar-actions ms-auto flex shrink-0 items-center gap-2">
                <ShortcutTooltip label="Rechercher partout" shortcut="⌘ K">
                  <button
                    type="button"
                    aria-label="Rechercher partout"
                    aria-haspopup="dialog"
                    aria-keyshortcuts="Meta+K Control+K"
                    onClick={() => setPaletteOpen(true)}
                    className="shell-toolbar-control grid size-9 shrink-0 place-items-center"
                  >
                    <ToolbarIcon name="search" />
                  </button>
                </ShortcutTooltip>
                <ShortcutTooltip label="Ouvrir l’assistant" shortcut="J">
                  <button
                    type="button"
                    aria-label="Ouvrir l’assistant"
                    aria-keyshortcuts="J"
                    onClick={() => handleNavigate("assistant")}
                    className="shell-toolbar-control grid size-9 shrink-0 place-items-center"
                  >
                    <ToolbarIcon name="assistant" />
                  </button>
                </ShortcutTooltip>
                {/* ── Notifications ──────────────────────────────────────── */}
                <NotificationCenter
                  onNavigate={handleNavigate}
                  onNavigateToPatient={handleNavigateToPatient}
                />

                {/* ── Theme button ────────────────────────────────────── */}
                <ThemeControl dark={isDarkMode} onToggle={toggleTheme} />

                {/* ── Settings + account dropdown ─────────────────────── */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Paramètres et compte"
                    className="shell-toolbar-control flex size-9 items-center justify-center"
                  >
                    <ToolbarIcon name="settings" />
                  </DropdownMenuTrigger>

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
                      <DropdownMenuSubContent
                        align="end"
                        className="min-w-44 rounded-xl border border-zinc-200/80 bg-white/95 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
                        sideOffset={4}
                      >
                        {SUPPORTED_LANGUAGES.map((language) => {
                          const active = i18n.language.startsWith(
                            language.code
                          );
                          return (
                            <DropdownMenuItem
                              className="justify-between rounded-lg text-sm"
                              key={language.code}
                              onClick={() => {
                                i18n
                                  .changeLanguage(language.code)
                                  .catch(() => undefined);
                              }}
                            >
                              <span>{languageLabelByCode[language.code]}</span>
                              {active && (
                                <HugeiconsIcon
                                  className="size-4 text-primary"
                                  icon={CheckmarkCircle01Icon}
                                  strokeWidth={1.5}
                                />
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

                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                      onClick={() => handleNavigate("aide")}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <HugeiconsIcon icon={HelpCircleIcon} size={16} strokeWidth={1.5} />
                      </div>
                      <span className="font-medium text-sm">Aide et support</span>
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
              </div>
            </div>
          </motion.header>

          {/* View content */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
            <div
              className="app-view-enter min-h-0 min-w-0 flex-1"
              key={`${currentView}:${currentPatientId ?? ""}`}
            >
              {!(
                [
                  "dashboard",
                  "patients",
                  "agenda",
                  "clinique",
                  "stock",
                  "finances",
                  "finances_analytics",
                  "equipe",
                  "notes",
                  "taches",
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
      {peekPatientId && (
        <PatientPeek
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
        onNavigateToPatient={openPatientPeek}
      />
      {aiAssistantOpen && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4 md:p-6">
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="Coworker Studio IA"
            className="pointer-events-auto relative h-[min(880px,calc(100dvh-24px))] w-[min(1140px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-white/20 bg-background/96 text-foreground shadow-2xl shadow-black/40 ring-1 ring-black/10 backdrop-blur-3xl dark:border-white/10 dark:ring-white/15"
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            role="region"
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {assistantModal}
          </motion.div>
        </div>
      )}
    </SidebarProvider>
  );
}
