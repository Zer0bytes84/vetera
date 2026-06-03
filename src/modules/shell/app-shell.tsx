import {
  Robot,
  CheckCircle,
  Translate,
  Moon,
  Bell,
  MagnifyingGlass,
  Sun,
  CalendarBlank,
} from "@phosphor-icons/react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import { AIAgentChat } from "@/components/AIAgentChat";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import { HeroPattern } from "@/components/HeroPattern";
import { useTheme } from "@/components/theme-provider";
import { useCircularTransition } from "@/hooks/use-circular-transition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutProvider, useLayout } from "@/contexts/layout-provider";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";

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
];

const DEFAULT_VIEW: View = "dashboard";

const HASH_PREFIX_REGEX = /^#\/?/;
const PATIENT_DETAIL_PREFIX = /^patient\/([A-Za-z0-9-]+)$/;

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
      <AppShellInner />
    </LayoutProvider>
  );
}

function AppShellInner() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_VIEW;
    }
    return parseRouteFromHash(window.location.hash).currentView;
  });
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return parseRouteFromHash(window.location.hash).patientId;
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLElement>(null);

  // Protocol-style glass header — opacity driven by scroll position (continuous, not toggled)
  const { scrollY } = useScroll({ container: sidebarScrollRef });
  const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9]);
  const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8]);

  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();
  const { setThemeMode, themeMode } = useThemeMode();
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>();
  const isDesktopRuntime = isTauriRuntime();
  const { variant, collapsible } = useLayout();

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setCurrentPatientId(null);
  }, []);

  const handleNavigateToPatient = useCallback((patientId: string) => {
    setCurrentView("patient_detail");
    setCurrentPatientId(patientId);
  }, []);

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
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (event.key === "Escape" && aiAgentOpen) {
          setAiAgentOpen(false);
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAiAgentOpen((current) => !current);
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
      if (event.key === "Escape" && aiAgentOpen) {
        setAiAgentOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, handleNavigate, aiAgentOpen]);

  const content = useMemo(
    () =>
      renderView(currentView, {
        onNavigate: handleNavigate,
        onNavigateToPatient: handleNavigateToPatient,
        patientId: currentPatientId,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => setAiAgentOpen(true),
      }),
    [
      currentView,
      currentPatientId,
      handleNavigate,
      handleNavigateToPatient,
      setThemeMode,
      themeMode,
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

  const isDarkMode = theme === "dark";
  const { toggleTheme } = useCircularTransition();

  return (
    <SidebarProvider
      className={cn("relative isolate", isRtl && "rtl-shell")}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "72px",
        } as React.CSSProperties
      }
    >

      <AppSidebar
        collapsible={collapsible}
        currentUserAvatar={currentUser?.avatarUrl ?? null}
        currentUserEmail={userEmail}
        currentUserName={userDisplayName}
        currentView={currentView}
        onLogout={logout}
        onNavigate={handleNavigate}
        onOpenPalette={() => setPaletteOpen(true)}
        side={isRtl ? "right" : "left"}
        variant={variant}
      />

      <SidebarInset
        ref={sidebarScrollRef}
        className={cn(
          "overflow-y-auto !bg-transparent",
          isDesktopRuntime
            ? "max-h-[calc(100dvh-20px)]"
            : "max-h-dvh"
        )}
      >
        <HeroPattern />

        {/* biome-ignore lint/a11y/noStaticElementInteractions: header needs onMouseDown for Tauri window drag */}
        <header
          className="app-shell-header sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 backdrop-blur-sm bg-background/[var(--bg-opacity-light)] dark:bg-background/[var(--bg-opacity-dark)] transition-all duration-300 group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
          style={
            {
              "--bg-opacity-light": bgOpacityLight,
              "--bg-opacity-dark": bgOpacityDark,
            } as React.CSSProperties
          }
          onMouseDown={handleMouseDown}
          ref={headerRef}
        >
          {/* Liquid glass refraction overlay */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/[0.02] to-transparent dark:from-white/[0.03]"
            aria-hidden="true"
          />
          <div className="relative flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            {/* Header separator — Protocol exact pattern */}
            <div
              aria-hidden="true"
              className="mx-2 hidden h-5 w-px bg-zinc-900/15 dark:bg-white/30 md:block"
            />

            {/* Search trigger */}
            {/* Search trigger - Premium Dribbble Style */}
            <button
              className="group relative flex h-10 w-[300px] sm:w-[340px] items-center gap-3 rounded-full border border-black/5 bg-white/40 px-4 text-left text-sm text-muted-foreground shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:border-black/10 hover:bg-white/60 hover:text-foreground hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] dark:hover:border-white/20 dark:hover:bg-zinc-900/60"
              onClick={() => setPaletteOpen(true)}
              type="button"
            >
              <MagnifyingGlass
                weight="duotone"
                className="size-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary"
              />
              <span className="truncate flex-1 font-medium tracking-tight">
                {t("common.searchPlaceholder", {
                  defaultValue: "Rechercher partout...",
                })}
              </span>
              <kbd className="ml-auto hidden h-6 select-none items-center gap-1 rounded-full border border-black/10 bg-white/50 px-2 font-mono text-[10px] font-medium tracking-widest text-muted-foreground shadow-xs transition-colors group-hover:bg-white dark:border-white/10 dark:bg-zinc-800/50 dark:group-hover:bg-zinc-800 xl:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>

          <div className="ml-auto flex items-center gap-x-1">
              {/* AI assistant */}
              <Button
                aria-label="Assistant IA"
                className="size-9"
                onClick={() => setAiAgentOpen(true)}
                size="icon"
                variant="outline"
              >
                <Robot
                  weight="duotone"
                  className="size-5"
                />
              </Button>

              {/* Notifications */}
              <Button
                aria-label={t("header.notifications")}
                className="relative size-9"
                onClick={() => handleNavigate("taches")}
                size="icon"
                variant="outline"
              >
                <Bell
                  weight="duotone"
                  className="size-5"
                />
              </Button>

              {/* Theme toggle */}
              <Button
                aria-label={t("header.toggleTheme")}
                className="mode-toggle-button size-9"
                onClick={toggleTheme}
                size="icon"
                variant="outline"
              >
                {isDarkMode ? (
                  <Moon weight="duotone" className="size-5" />
                ) : (
                  <Sun weight="duotone" className="size-5" />
                )}
              </Button>

              {/* Language */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      aria-label={t("language.label")}
                      className="size-9"
                      size="icon"
                      variant="outline"
                    />
                  }
                >
                  <Translate
                    weight="duotone"
                    className="size-5"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="min-w-48"
                  sideOffset={8}
                >
                  {SUPPORTED_LANGUAGES.map((language) => {
                    const active = i18n.language.startsWith(language.code);
                    return (
                      <DropdownMenuItem
                        className="justify-between"
                        key={language.code}
                        onClick={() => {
                          i18n
                            .changeLanguage(language.code)
                            .catch(() => undefined);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          {active ? (
                            <CheckCircle
                              weight="duotone"
                              className="size-4 text-primary"
                            />
                          ) : (
                            <span className="size-4" />
                          )}
                          <span>{languageLabelByCode[language.code]}</span>
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Header separator — right side */}
              {currentView === "dashboard" && (
                <div
                  aria-hidden="true"
                  className="mx-2 hidden h-5 w-px bg-zinc-900/15 dark:bg-white/30 lg:block"
                />
              )}

              {/* Quick CTA on dashboard */}
              {currentView === "dashboard" && (
                <Button
                  className="ml-2 hidden lg:inline-flex h-9 items-center gap-2 rounded-xl px-4 font-medium shadow-sm transition-all duration-200"
                  onClick={() => {
                    handleNavigate("agenda");
                    setTimeout(
                      () =>
                        window.dispatchEvent(
                          new CustomEvent("vetera:new-appointment")
                        ),
                      100
                    );
                  }}
                  variant="default"
                >
                  <CalendarBlank
                    weight="duotone"
                    className="size-4"
                  />
                  {t("dashboard.quick.newAppointment", {
                    defaultValue: "Nouveau rendez-vous",
                  })}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* View content */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">{content}</div>
      </SidebarInset>

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
        onNavigateToPatient={handleNavigateToPatient}
      />

      {/* AI Agent Chat */}
      <AIAgentChat
        currentView={currentView}
        isOpen={aiAgentOpen}
        onClose={() => setAiAgentOpen(false)}
      />
    </SidebarProvider>
  );
}
