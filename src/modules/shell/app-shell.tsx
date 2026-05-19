import {
  BotIcon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDown,
  LanguageCircleIcon,
  Logout01Icon,
  Menu01Icon,
  Moon02Icon,
  Notification03Icon,
  SearchIcon,
  Settings01Icon,
  Sun03Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { navigationSections } from "@/app/config/navigation";
import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import { AIAgentChat } from "@/components/AIAgentChat";
import Avatar from "@/components/Avatar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "@/components/catalyst/sidebar";
import { SidebarLayout } from "@/components/catalyst/sidebar-layout";
import CommandPalette from "@/components/CommandPalette";
import Logo from "@/components/Logo";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutProvider } from "@/contexts/layout-provider";
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
const WHITESPACE_REGEX = /\s+/;

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setThemeMode, themeMode } = useThemeMode();
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>();
  const isDesktopRuntime = isTauriRuntime();

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
    setSidebarOpen(false);
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
      if (event.key === "Escape") {
        if (aiAgentOpen) {
          setAiAgentOpen(false);
        }
        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, handleNavigate, aiAgentOpen, sidebarOpen]);

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
  const userShortName =
    userDisplayName.split("@")[0].trim().split(WHITESPACE_REGEX)[0] ||
    "Utilisateur";

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  };

  const isDarkMode = theme === "dark";

  const renderNavItem = (item: {
    view: View;
    labelKey: string;
    // biome-ignore lint/suspicious/noExplicitAny: hugeicons type
    icon: any;
  }) => {
    const isActive = currentView === item.view;
    return (
      <SidebarItem
        current={isActive}
        key={item.view}
        onClick={() => handleNavigate(item.view)}
      >
        <span data-slot="icon">
          <HugeiconsIcon icon={item.icon} strokeWidth={2} />
        </span>
        <SidebarLabel>{t(item.labelKey)}</SidebarLabel>
      </SidebarItem>
    );
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="bAItari workspace"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left font-medium text-sm/5 text-zinc-950 transition-colors hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5"
                type="button"
              />
            }
          >
            <Logo
              className="[&_.logo-mark-shell]:bg-transparent"
              flatMark
              isDarkMode={isDarkMode}
              size="sm"
            />
            <HugeiconsIcon
              className="ml-auto size-4 text-zinc-500 dark:text-zinc-400"
              icon={ChevronDown}
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-56"
            sideOffset={4}
          >
            <div className="px-2 py-1.5">
              <p className="font-medium text-foreground text-sm">bAItari</p>
              <p className="truncate text-muted-foreground text-xs">
                Clinique vétérinaire
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate("parametres")}>
              <HugeiconsIcon
                className="size-4"
                icon={Settings01Icon}
                strokeWidth={2}
              />
              <span>Paramètres clinique</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {navigationSections[0]?.items.map(renderNavItem)}
        </SidebarSection>

        <SidebarSection>
          <SidebarHeading>
            {t(navigationSections[1]?.titleKey ?? "")}
          </SidebarHeading>
          {navigationSections[1]?.items.map(renderNavItem)}
        </SidebarSection>

        <SidebarSection>
          <SidebarHeading>
            {t(navigationSections[2]?.titleKey ?? "")}
          </SidebarHeading>
          {navigationSections[2]?.items.map(renderNavItem)}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          {navigationSections[3]?.items.map(renderNavItem)}
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="User menu"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-950/5 dark:hover:bg-white/5"
                type="button"
              />
            }
          >
            <Avatar
              className="border-0 shadow-none ring-0"
              name={userDisplayName}
              size="sm"
              src={currentUser?.avatarUrl ?? undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm text-zinc-950 dark:text-white">
                {userShortName}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {userEmail}
              </p>
            </div>
            <HugeiconsIcon
              className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400"
              icon={ChevronDown}
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56" sideOffset={4}>
            <div className="px-2 py-1.5">
              <p className="font-medium text-foreground text-sm">
                {userShortName}
              </p>
              <p className="truncate text-muted-foreground text-xs">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate("equipe")}>
              <HugeiconsIcon
                className="size-4"
                icon={User02Icon}
                strokeWidth={2}
              />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleNavigate("parametres")}>
              <HugeiconsIcon
                className="size-4"
                icon={Settings01Icon}
                strokeWidth={2}
              />
              <span>Paramètres</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400"
              onClick={async () => {
                await logout();
              }}
            >
              <HugeiconsIcon
                className="size-4"
                icon={Logout01Icon}
                strokeWidth={2}
              />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <div
      className={cn(
        "relative isolate flex h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950",
        isRtl && "rtl-shell"
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {isDesktopRuntime && (
        <div
          className="fixed inset-x-0 top-0 z-[60] flex h-5 items-center bg-zinc-100 dark:bg-zinc-950"
          data-tauri-drag-region
        />
      )}

      {/* Sidebar on desktop */}
      <div
        className={cn(
          "fixed inset-y-0 w-64 max-lg:hidden",
          isRtl ? "right-0" : "left-0",
          isDesktopRuntime && "top-5"
        )}
      >
        {sidebarContent}
      </div>

      {/* Sidebar on mobile (overlay) */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={cn(
              "fixed inset-y-0 w-full max-w-80 p-2",
              isRtl ? "right-0" : "left-0"
            )}
          >
            <div className="flex h-full flex-col rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
              <div className="-mb-3 flex justify-end px-4 pt-3">
                <button
                  aria-label="Close sidebar"
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5"
                  onClick={() => setSidebarOpen(false)}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-5"
                    icon={Cancel01Icon}
                    strokeWidth={2}
                  />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="flex items-center px-4 lg:hidden">
        <button
          aria-label="Open sidebar"
          className="-m-2.5 p-2.5 text-zinc-700 dark:text-zinc-200"
          onClick={() => setSidebarOpen(true)}
          type="button"
        >
          <HugeiconsIcon className="size-6" icon={Menu01Icon} strokeWidth={2} />
        </button>
      </header>

      {/* Content (Catalyst inset card) */}
      <main
        className={cn(
          "flex flex-1 flex-col overflow-x-hidden pb-2 lg:min-w-0 lg:pt-2",
          isRtl ? "lg:pr-64 lg:pl-2" : "lg:pr-2 lg:pl-64",
          isDesktopRuntime && "lg:pt-7"
        )}
      >
        <div className="app-inset-card flex grow flex-col overflow-x-hidden overflow-y-auto lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
          {/* Sticky toolbar inside the inset card */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: header needs onMouseDown for Tauri window drag */}
          <header
            className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-x-3 border-zinc-950/5 border-b bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:rounded-t-lg dark:border-white/5 dark:bg-zinc-900/95"
            onMouseDown={handleMouseDown}
            ref={headerRef}
          >
            {/* Search trigger */}
            <button
              className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5"
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

            <div className="flex items-center gap-x-1">
              {/* AI assistant */}
              <Button
                aria-label="Assistant IA"
                className="size-9 rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => setAiAgentOpen(true)}
                size="icon"
                variant="ghost"
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
                className="relative size-9 rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => handleNavigate("taches")}
                size="icon"
                variant="ghost"
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
                className="size-9 rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => setTheme(isDarkMode ? "light" : "dark")}
                size="icon"
                variant="ghost"
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
                      className="size-9 rounded-lg text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                      size="icon"
                      variant="ghost"
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
          </header>

          {/* View content */}
          <div className="min-w-0 flex-1">{content}</div>
        </div>
      </main>

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
    </div>
  );
}
