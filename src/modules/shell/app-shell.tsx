import {
  CheckmarkCircle01Icon,
  HelpCircleIcon,
  Logout01Icon,
  Moon01Icon,
  Search01Icon,
  Settings01Icon,
  SparklesIcon,
  Sun01Icon,
  TranslateIcon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useScroll, useTransform } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import { AIAgentChat } from "@/components/AIAgentChat";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import { HeroPattern } from "@/components/HeroPattern";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { FocusProvider } from "@/contexts/focus-provider";
import { LayoutProvider, useLayout } from "@/contexts/layout-provider";
import { useCircularTransition } from "@/hooks/use-circular-transition";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config";
import { cn } from "@/lib/utils";
// import { useNotificationToasts } from "@/services/notifications/useNotificationToasts";
import { NotificationCenter } from "@/modules/shell/notification-center";
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
  const [aiAgentOpen, setAiAgentOpen] = useState(false);
  const sidebarScrollRef = useRef<HTMLElement>(null);

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setCurrentPatientId(null);
  }, []);

  const handleNavigateToPatient = useCallback((patientId: string) => {
    setCurrentView("patient_detail");
    setCurrentPatientId(patientId);
  }, []);

  // useNotificationToasts(handleNavigate, handleNavigateToPatient);

  // Protocol-style glass header — opacity driven by scroll position (continuous, not toggled)
  const { scrollY } = useScroll({ container: sidebarScrollRef });
  const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9]);
  const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8]);

  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();
  const { setThemeMode, themeMode } = useThemeMode();
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>();
  const { variant, collapsible } = useLayout();

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
      className={cn(
        "relative isolate bg-white dark:bg-zinc-950",
        isRtl && "rtl-shell"
      )}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "56px",
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
        className={cn(
          "!bg-white/40 dark:!bg-zinc-950/40 !pb-2 p-2 backdrop-blur-xl",
          "!border-none !rounded-t-[24px] !rounded-b-none md:peer-data-[variant=inset]:!border-transparent shadow-sm ring-1 ring-black/5 dark:ring-white/5",
          "transition-all duration-300",
          "md:peer-data-[variant=inset]:max-h-dvh",
          "md:peer-data-[variant=floating]:max-h-dvh",
          "max-h-dvh",
          "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:!ms-0 md:peer-data-[variant=inset]:mt-2 md:peer-data-[variant=inset]:mr-2 md:peer-data-[variant=inset]:mb-2!"
        )}
      >
        <div
          className="!border-b-0 relative flex h-full flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-t-[16px] rounded-b-none bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300 dark:bg-zinc-950 dark:ring-white/10"
          ref={sidebarScrollRef}
        >
          <HeroPattern />

          {/* biome-ignore lint/a11y/noStaticElementInteractions: header needs onMouseDown for Tauri window drag */}
          <header
            className={cn(
              "app-shell-header sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 bg-background/[var(--bg-opacity-light)] backdrop-blur-xs transition-colors duration-300 dark:bg-background/[var(--bg-opacity-dark)] dark:backdrop-blur-sm",
              "group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
            )}
            onMouseDown={handleMouseDown}
            ref={headerRef}
            style={
              {
                "--bg-opacity-light": bgOpacityLight,
                "--bg-opacity-dark": bgOpacityDark,
              } as React.CSSProperties
            }
          >
            {/* Hairline border (replaces border-b) — Protocol-faithful */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-full h-px translate-y-px bg-zinc-900/7.5 dark:bg-white/7.5"
            />
            <div className="relative flex w-full items-center gap-2 px-4 lg:px-6">
              {/* Search trigger - Premium Dribbble Style */}
              <button
                className="group relative flex h-10 w-[300px] items-center gap-3 rounded-full border border-black/5 bg-white/40 px-4 text-left text-muted-foreground text-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md transition-all duration-300 hover:border-black/10 hover:bg-white/60 hover:text-foreground hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)] sm:w-[340px] dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] dark:hover:border-white/20 dark:hover:bg-zinc-900/60"
                onClick={() => setPaletteOpen(true)}
                type="button"
              >
                <HugeiconsIcon
                  className="size-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary"
                  icon={Search01Icon}
                  strokeWidth={1.5}
                />
                <span className="flex-1 truncate font-medium tracking-tight">
                  {t("common.searchPlaceholder", {
                    defaultValue: "Rechercher partout...",
                  })}
                </span>
                <kbd className="ml-auto hidden h-6 select-none items-center gap-1 rounded-full border border-black/10 bg-white/50 px-2 font-medium font-mono text-[10px] text-muted-foreground tracking-widest shadow-xs transition-colors group-hover:bg-white xl:flex dark:border-white/10 dark:bg-zinc-800/50 dark:group-hover:bg-zinc-800">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>

              <div className="ml-auto flex items-center gap-x-1.5">
                {/* ── Aide et support ────────────────────────────────────── */}
                <Button
                  aria-label="Aide et support"
                  className="h-9 gap-1.5 rounded-full border border-black/8 bg-white/40 px-3 font-semibold text-xs shadow-none hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => handleNavigate("aide")}
                  size="sm"
                  variant="outline"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={HelpCircleIcon}
                    strokeWidth={1.5}
                  />
                  <span className="hidden sm:inline">Aide</span>
                </Button>

                {/* ── Notifications ──────────────────────────────────────── */}
                <NotificationCenter
                  onNavigate={handleNavigate}
                  onNavigateToPatient={handleNavigateToPatient}
                />

                {/* ── Avatar + Dropdown ───────────────────────────────── */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Mon compte"
                    className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ring-2 ring-transparent transition-all duration-200 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
                  >
                    {currentUser?.avatarUrl ? (
                      <img
                        alt={userDisplayName}
                        className="h-10 w-10 rounded-full object-cover"
                        src={currentUser.avatarUrl}
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-semibold text-base text-white shadow-sm">
                        {userDisplayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* Online indicator */}
                    <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-64 rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95"
                    sideOffset={16}
                  >
                    {/* User info header */}
                    <div className="mb-1 flex items-center gap-3 px-3 py-2.5">
                      {currentUser?.avatarUrl ? (
                        <img
                          alt={userDisplayName}
                          className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                          src={currentUser.avatarUrl}
                        />
                      ) : (
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 font-semibold text-sm text-white">
                          {userDisplayName.charAt(0).toUpperCase()}
                        </span>
                      )}
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

                    {/* AI Assistant */}
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                      onClick={() => setAiAgentOpen(true)}
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20">
                        <HugeiconsIcon
                          className="size-4 text-violet-600 dark:text-violet-400"
                          icon={SparklesIcon}
                          strokeWidth={1.5}
                        />
                      </div>
                      <span className="font-medium text-sm">Assistant IA</span>
                      <kbd className="ml-auto h-5 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] text-muted-foreground dark:border-white/10 dark:bg-white/5">
                        ⌘J
                      </kbd>
                    </DropdownMenuItem>

                    {/* Theme toggle */}
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                      onClick={toggleTheme}
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                        {isDarkMode ? (
                          <HugeiconsIcon
                            className="size-4 text-amber-600 dark:text-amber-400"
                            icon={Moon01Icon}
                            strokeWidth={1.5}
                          />
                        ) : (
                          <HugeiconsIcon
                            className="size-4 text-amber-600 dark:text-amber-400"
                            icon={Sun01Icon}
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <span className="font-medium text-sm">
                        {isDarkMode ? "Mode sombre" : "Mode clair"}
                      </span>
                    </DropdownMenuItem>

                    {/* Language submenu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-100/80 dark:hover:bg-white/5">
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
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
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
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-white/10" />

                    {/* Profile */}
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
                      onClick={() => handleNavigate("equipe")}
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
              </div>
            </div>
          </header>

          {/* View content */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
            {content}
          </div>
        </div>
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
