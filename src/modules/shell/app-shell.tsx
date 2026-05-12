import {
  Calendar01Icon,
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  Moon02Icon,
  SearchIcon,
  Sun03Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderView } from "@/app/config/view-registry";
import { useThemeMode } from "@/app/hooks/use-theme-mode";
import { AIAgentChat } from "@/components/AIAgentChat";
import { AppSidebar } from "@/components/app-sidebar";
import CommandPalette from "@/components/CommandPalette";
import { SiteHeader } from "@/components/site-header";
import { useTheme } from "@/components/theme-provider";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
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

function getCompactHeaderTitle(view: View) {
  switch (view) {
    case "patients":
      return "🐾 Patients";
    case "agenda":
      return "📅 Agenda";
    case "clinique":
      return "🩺 Clinique";
    case "notes":
      return "📝 Notes";
    case "stock":
      return "📦 Stock";
    case "finances":
      return "💳 Finances";
    case "finances_analytics":
      return "📈 Finances";
    case "equipe":
      return "👥 Equipe";
    case "parametres":
      return "⚙️ Parametres";
    case "taches":
      return "✅ Taches";
    case "aide":
      return "❓ Aide";
    default:
      return "🏠 Vue d'ensemble";
  }
}

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

function getViewFromHash(hash: string): View {
  const rawHash = hash.replace(/^#\/?/, "").trim();
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
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const { currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  const { variant, collapsible } = useLayout();
  const shellVariant =
    variant === "inset" || variant === "floating" ? "sidebar" : variant;
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>();
  const isDesktopRuntime = isTauriRuntime();

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  };

  const sidebarHeaderButtonClass =
    "raycast-header-control relative inline-flex size-10 items-center justify-center rounded-xl text-foreground/75 transition-all duration-200 ease-out hover:text-foreground";

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

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ne pas intercepter si on est dans un input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Laisser les dialogs internes gerer Escape pour eviter les doubles fermetures.
        if (event.key === "Escape" && aiAgentOpen) {
          setAiAgentOpen(false);
        }
        return;
      }

      // Cmd/Ctrl + K: Command palette
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }

      // Cmd/Ctrl + J: AI Agent
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAiAgentOpen((current) => !current);
        return;
      }

      // Cmd/Ctrl + N: Nouveau patient
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

      // Cmd/Ctrl + R: Nouveau rendez-vous
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
        event.preventDefault();
        handleNavigate("agenda");
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("vetera:new-appointment")),
          150
        );
        return;
      }

      // Cmd/Ctrl + F: Recherche globale
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // ESC: Fermer les modales ou revenir en arrière
      if (event.key === "Escape" && aiAgentOpen) {
        setAiAgentOpen(false);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, handleNavigate, paletteOpen, aiAgentOpen]);

  const content = useMemo(
    () =>
      renderView(currentView, {
        onNavigate: handleNavigate,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => setAiAgentOpen(true),
      }),
    [currentView, handleNavigate, setThemeMode, themeMode, setAiAgentOpen]
  );

  const currentUserName =
    currentUser?.displayName || currentUser?.email || "Utilisateur";
  const currentUserEmail = currentUser?.email || "local@baitari.app";
  return (
    <div className="neo-app-shell flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
      {isDesktopRuntime && (
        <div
          className="flex h-8 shrink-0 items-center border-border border-b bg-muted/30"
          data-tauri-drag-region
        />
      )}
      <SidebarProvider
        className={cn("!min-h-0 flex-1 overflow-hidden", isRtl && "rtl-shell")}
        dir={isRtl ? "rtl" : "ltr"}
        style={
          {
            "--sidebar-width": shellVariant === "sidebar" ? "18.5rem" : "16rem",
            "--sidebar-width-icon":
              shellVariant === "sidebar" ? "4.5rem" : "3rem",
            "--header-height": "calc(var(--spacing) * 14)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          collapsible={collapsible}
          currentUserAvatar={currentUser?.avatarUrl}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          currentView={currentView}
          onLogout={logout}
          onNavigate={handleNavigate}
          onOpenPalette={() => setPaletteOpen(true)}
          side={isRtl ? "right" : "left"}
          variant={shellVariant}
        />
        <SidebarInset className="relative isolate flex min-h-0 flex-col overflow-hidden bg-background">
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
            onScroll={(event) =>
              setIsHeaderScrolled(event.currentTarget.scrollTop > 8)
            }
          >
            {shellVariant === "sidebar" ? (
              <header
                className={cn(
                  "raycast-header sticky top-0 z-30 flex h-[66px] shrink-0 items-center border-b px-4 md:px-5 lg:px-6",
                  "transition-all duration-200 ease-out",
                  isHeaderScrolled && "raycast-header-scrolled"
                )}
                onMouseDown={handleMouseDown}
                ref={headerRef}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SidebarTrigger className="raycast-header-control size-10 rounded-xl text-muted-foreground hover:text-foreground" />
                  <Breadcrumb className="min-w-0">
                    {currentView === "dashboard" ? (
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-[16px] text-foreground">
                          Dashboard
                        </span>
                        <div className="mx-1 h-4 w-px bg-border" />
                        <span className="text-[14px] text-muted-foreground">
                          {(() => {
                            const h = new Date().getHours();
                            if (h < 12) {
                              return "\uD83C\uDF05 Bonjour, Docteur";
                            }
                            if (h < 18) {
                              return "\u2600\uFE0F Bon apr\u00E8s-midi, Docteur";
                            }
                            return "\uD83C\uDF19 Bonsoir, Docteur";
                          })()}
                        </span>
                      </div>
                    ) : (
                      <BreadcrumbList className="gap-2 text-[16px]">
                        <BreadcrumbPage className="font-semibold text-foreground">
                          {getCompactHeaderTitle(currentView)}
                        </BreadcrumbPage>
                      </BreadcrumbList>
                    )}
                  </Breadcrumb>
                </div>
                <div className="ms-auto hidden items-center gap-3 md:flex">
                  <Button
                    aria-label={t("common.search", {
                      defaultValue: "Rechercher",
                    })}
                    className="raycast-header-search hidden h-10 w-[214px] justify-between rounded-xl px-3 font-normal text-[13px] text-muted-foreground hover:text-foreground xl:flex"
                    onClick={() => setPaletteOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <span className="flex min-w-0 items-center gap-2">
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
                    </span>
                    <Kbd className="ms-2">⌘ K</Kbd>
                  </Button>
                  <Button
                    aria-label={t("header.notifications")}
                    className={sidebarHeaderButtonClass}
                    onClick={() => handleNavigate("taches")}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      className="size-4"
                      icon={Task01Icon}
                      strokeWidth={2}
                    />
                    <span className="absolute end-2 top-2 size-2 rounded-full border border-background bg-rose-500" />
                    <span className="sr-only">{t("header.notifications")}</span>
                  </Button>
                  <Button
                    aria-label={t("header.toggleTheme")}
                    className={sidebarHeaderButtonClass}
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <HugeiconsIcon
                      className="size-4"
                      icon={theme === "dark" ? Sun03Icon : Moon02Icon}
                      strokeWidth={2}
                    />
                    <span className="sr-only">{t("header.toggleTheme")}</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={t("language.label")}
                          className={sidebarHeaderButtonClass}
                          size="icon"
                          type="button"
                          variant="outline"
                        />
                      }
                    >
                      <HugeiconsIcon
                        className="size-4"
                        icon={LanguageCircleIcon}
                        strokeWidth={2}
                      />
                      <span className="sr-only">{t("language.label")}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-56"
                      sideOffset={8}
                    >
                      {SUPPORTED_LANGUAGES.map((language) => {
                        const active = i18n.language.startsWith(language.code);
                        return (
                          <DropdownMenuItem
                            className="justify-between"
                            key={language.code}
                            onClick={() =>
                              void i18n.changeLanguage(language.code)
                            }
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
                            <Kbd>⌘⇧{language.shortcut}</Kbd>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {currentView === "dashboard" ? (
                    <Button
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
                      <HugeiconsIcon
                        data-icon="inline-start"
                        icon={Calendar01Icon}
                        strokeWidth={2}
                      />
                      {t("dashboard.quick.newAppointment", {
                        defaultValue: "Nouveau RDV",
                      })}
                    </Button>
                  ) : null}
                </div>
              </header>
            ) : (
              <SiteHeader
                currentUserAvatar={currentUser?.avatarUrl}
                currentUserEmail={currentUserEmail}
                currentUserName={currentUserName}
                onLogout={logout}
                onNavigate={handleNavigate}
                onOpenPalette={() => setPaletteOpen(true)}
                title={
                  currentView === "dashboard"
                    ? "🏠 Vue d'ensemble"
                    : getCompactHeaderTitle(currentView)
                }
                variant="default"
              />
            )}
            <div
              className={cn(
                "min-h-0 flex-1",
                currentView !== "dashboard" &&
                  "app-view-surface prospeo-dashboard",
                currentView !== "dashboard" && theme === "dark" && "prospeo-dark"
              )}
            >
              {content}
            </div>
          </div>
        </SidebarInset>

        {/* Command Palette */}
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigate={handleNavigate}
        />

        {/* AI Agent Chat - Style Claude */}
        <AIAgentChat
          currentView={currentView}
          isOpen={aiAgentOpen}
          onClose={() => setAiAgentOpen(false)}
        />
      </SidebarProvider>
    </div>
  );
}
