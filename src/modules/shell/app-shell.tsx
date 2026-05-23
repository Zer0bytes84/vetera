import {
  BotIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  Moon02Icon,
  Notification03Icon,
  SearchIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import { AIAgentChat } from "@/components/AIAgentChat";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
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
import { Separator } from "@/components/ui/separator";
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
];

const DEFAULT_VIEW: View = "dashboard";

const HASH_PREFIX_REGEX = /^#\/?/;

function getViewFromHash(hash: string): View {
  const rawHash = hash.replace(HASH_PREFIX_REGEX, "").trim();
  if (!rawHash) {
    return DEFAULT_VIEW;
  }
  return ALL_VIEWS.includes(rawHash as View) ? (rawHash as View) : DEFAULT_VIEW;
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
    return getViewFromHash(window.location.hash);
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiAgentOpen, setAiAgentOpen] = useState(false);

  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();
  const { setThemeMode, themeMode } = useThemeMode();
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>();
  const isDesktopRuntime = isTauriRuntime();
  const { variant, collapsible } = useLayout();

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  useEffect(() => {
    const hash = `#/${currentView}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [currentView]);

  useEffect(() => {
    const handleHashChange = () => {
      const nextView = getViewFromHash(window.location.hash);
      setCurrentView((previousView) =>
        previousView === nextView ? previousView : nextView
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
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => setAiAgentOpen(true),
      }),
    [currentView, handleNavigate, setThemeMode, themeMode]
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
      className={cn("relative isolate", isDesktopRuntime && "pt-5", isRtl && "rtl-shell")}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {isDesktopRuntime && (
        <div
          className="fixed inset-x-0 top-0 z-[60] flex h-5 items-center bg-sidebar"
          data-tauri-drag-region
        />
      )}

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

      <SidebarInset>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: header needs onMouseDown for Tauri window drag */}
        <header
          className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
          onMouseDown={handleMouseDown}
          ref={headerRef}
        >
          <div className="flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator
              className="mx-2 data-vertical:h-4 data-vertical:self-auto"
              orientation="vertical"
            />

            {/* Search trigger */}
            <button
              className="flex w-[280px] items-center gap-2 rounded-lg border border-neutral-200/50 bg-white px-3 py-1.5 text-left text-sm text-zinc-500 transition-all hover:border-neutral-300/60 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-zinc-400 dark:hover:border-neutral-600/60"
              onClick={() => setPaletteOpen(true)}
              type="button"
            >
              <HugeiconsIcon
                className="size-4 shrink-0"
                icon={SearchIcon}
                strokeWidth={2}
              />
              <span className="truncate">
                {t("common.searchPlaceholder", {
                  defaultValue: "Rechercher...",
                })}
              </span>
              <Kbd className="ml-auto hidden xl:inline-flex">⌘ K</Kbd>
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
                <HugeiconsIcon
                  className="size-5"
                  icon={BotIcon}
                  strokeWidth={2}
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
                <HugeiconsIcon
                  className="size-5"
                  icon={Notification03Icon}
                  strokeWidth={2}
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
                <HugeiconsIcon
                  className="size-5"
                  icon={isDarkMode ? Sun03Icon : Moon02Icon}
                  strokeWidth={2}
                />
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
                  <HugeiconsIcon
                    className="size-5"
                    icon={LanguageCircleIcon}
                    strokeWidth={2}
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
                            <HugeiconsIcon
                              className="size-4 text-primary"
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
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

              {/* Quick CTA on dashboard */}
              {currentView === "dashboard" && (
                <Button
                  className="ml-2 hidden lg:inline-flex"
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
                  size="sm"
                  variant="default"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={Calendar01Icon}
                    strokeWidth={2}
                  />
                  {t("dashboard.quick.newAppointment", {
                    defaultValue: "Nouveau RDV",
                  })}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* View content */}
        <div className="flex flex-1 flex-col gap-4 py-4">{content}</div>
      </SidebarInset>

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
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
