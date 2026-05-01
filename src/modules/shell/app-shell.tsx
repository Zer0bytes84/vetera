import { useEffect, useMemo, useState, useCallback } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { AIAgentChat } from "@/components/AIAgentChat"
import CommandPalette from "@/components/CommandPalette"
import { SiteHeader } from "@/components/site-header"
import { useTheme } from "@/components/theme-provider"
import {
  Appointment02Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  Moon02Icon,
  SearchIcon,
  Sun03Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { useAuth } from "@/contexts/AuthContext"
import { LayoutProvider, useLayout } from "@/contexts/layout-provider"
import type { View } from "@/types"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config"

import { renderView } from "@/app/config/view-registry"
import { useThemeMode } from "@/app/hooks/use-theme-mode"
import { useTauriDrag } from "@/hooks/use-tauri-drag"
import { isTauriRuntime } from "@/services/browser-store"

function getHeaderGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return { text: "Bonjour", emoji: "☀️" }
  if (hour < 18) return { text: "Bon apres-midi", emoji: "🌤️" }
  return { text: "Bonsoir", emoji: "🌙" }
}

function getCompactHeaderTitle(view: View) {
  switch (view) {
    case "patients":
      return "🐾 Patients"
    case "agenda":
      return "📅 Agenda"
    case "clinique":
      return "🩺 Clinique"
    case "notes":
      return "📝 Notes"
    case "stock":
      return "📦 Stock"
    case "finances":
      return "💳 Finances"
    case "finances_analytics":
      return "📈 Finances"
    case "equipe":
      return "👥 Equipe"
    case "parametres":
      return "⚙️ Parametres"
    case "taches":
      return "✅ Taches"
    case "aide":
      return "❓ Aide"
    default:
      return "🏠 Vue d'ensemble"
  }
}

export function AppShell() {
  return (
    <LayoutProvider>
      <AppShellInner />
    </LayoutProvider>
  )
}

function AppShellInner() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === "rtl"
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [aiAgentOpen, setAiAgentOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { themeMode, setThemeMode } = useThemeMode()
  const { variant, collapsible } = useLayout()
  const { ref: headerRef, handleMouseDown } = useTauriDrag<HTMLElement>()
  const isDesktopRuntime = isTauriRuntime()

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  }

  const sidebarHeaderButtonClass =
    "relative inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background text-foreground/75 shadow-xs transition-all duration-200 ease-out hover:bg-muted/50 hover:text-foreground"

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ne pas intercepter si on est dans un input/textarea
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Laisser les dialogs internes gerer Escape pour eviter les doubles fermetures.
        if (event.key === "Escape" && aiAgentOpen) {
          setAiAgentOpen(false)
        }
        return
      }

      // Cmd/Ctrl + K: Command palette
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((current) => !current)
        return
      }

      // Cmd/Ctrl + J: AI Agent
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault()
        setAiAgentOpen((current) => !current)
        return
      }

      // Cmd/Ctrl + N: Nouveau patient
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault()
        if (currentView !== "patients") {
          handleNavigate("patients")
          setTimeout(() => window.dispatchEvent(new CustomEvent("vetera:new-patient")), 150)
        } else {
          window.dispatchEvent(new CustomEvent("vetera:new-patient"))
        }
        return
      }

      // Cmd/Ctrl + R: Nouveau rendez-vous
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
        event.preventDefault()
        handleNavigate("agenda")
        setTimeout(() => window.dispatchEvent(new CustomEvent("vetera:new-appointment")), 150)
        return
      }

      // Cmd/Ctrl + F: Recherche globale
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault()
        setPaletteOpen(true)
        return
      }

      // ESC: Fermer les modales ou revenir en arrière
      if (event.key === "Escape") {
        if (aiAgentOpen) {
          setAiAgentOpen(false)
          return
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentView, handleNavigate, paletteOpen, aiAgentOpen])

  const content = useMemo(
    () =>
      renderView(currentView, {
        onNavigate: handleNavigate,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
        onOpenAIAgent: () => setAiAgentOpen(true),
      }),
    [currentView, handleNavigate, setThemeMode, themeMode, setAiAgentOpen]
  )

  const currentUserName =
    currentUser?.displayName || currentUser?.email || "Utilisateur"
  const currentUserEmail = currentUser?.email || "local@baitari.app"
  const headerGreeting = getHeaderGreeting(new Date())
  const headerFirstName = currentUserName.trim().split(" ")[0] || "Docteur"

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      {isDesktopRuntime && (
        <div 
          data-tauri-drag-region 
    className="flex h-8 shrink-0 items-center border-b border-black/[0.035] dark:border-white/[0.05] bg-background/40 backdrop-blur-2xl saturate-[1.2] supports-[backdrop-filter]:bg-background/40" 
        />
      )}
      <SidebarProvider
        dir={isRtl ? "rtl" : "ltr"}
        className={cn("flex-1 overflow-hidden !min-h-0", isRtl && "rtl-shell")}
      style={
        {
          "--sidebar-width": variant === "sidebar" ? "17.5rem" : "16rem",
          "--sidebar-width-icon": variant === "sidebar" ? "4.5rem" : "3rem",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        side={isRtl ? "right" : "left"}
        variant={variant}
        collapsible={collapsible}
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        currentUserAvatar={currentUser?.avatarUrl}
        onLogout={logout}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <SidebarInset className="vibrant-bg relative isolate flex min-h-0 flex-col overflow-hidden">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-background bg-dot-pattern opacity-50" />
        {variant === "sidebar" ? (
          <header
            ref={headerRef}
            onMouseDown={handleMouseDown}
            className={cn(
              "sticky top-0 z-30 flex h-[64px] shrink-0 items-center px-4 md:px-5 lg:px-6",
              "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
              // Keep the header color aligned with the app chrome in dark mode
              "relative isolate bg-white/30 supports-[backdrop-filter]:bg-white/14",
              "dark:bg-[rgba(12,14,18,0.32)] dark:supports-[backdrop-filter]:bg-[rgba(12,14,18,0.18)]",
              "backdrop-blur-[36px] backdrop-saturate-[200%] backdrop-contrast-[1.05]",
              // Glass top highlight (soft toolbar shine)
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
              "before:bg-gradient-to-r before:from-transparent before:via-white/65 before:to-transparent",
              "dark:before:via-white/14",
              // Hairline divider (very faint until scrolled)
    "border-b border-black/[0.06] dark:border-white/[0.05]"
  )}
>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <SidebarTrigger className="size-9 rounded-xl border border-border/70 bg-background shadow-xs hover:bg-muted/50" />
              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="gap-2 text-[17px]">
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {currentView === "dashboard"
                      ? `${headerGreeting.text} ${headerFirstName} ${headerGreeting.emoji}`
                      : getCompactHeaderTitle(currentView)}
                  </BreadcrumbPage>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="ms-auto hidden items-center gap-3 md:flex">
              <Button
                type="button"
                variant="outline"
                className="hidden h-10 w-[214px] justify-between rounded-xl border-border/65 bg-background/78 px-3 text-[13px] font-normal text-muted-foreground shadow-xs hover:bg-muted/45 hover:text-foreground xl:flex"
                onClick={() => setPaletteOpen(true)}
                aria-label={t("common.search", { defaultValue: "Rechercher" })}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <HugeiconsIcon
                    icon={SearchIcon}
                    strokeWidth={2}
                    className="size-4 shrink-0"
                  />
                  <span className="truncate">
                    {t("common.searchPlaceholder", { defaultValue: "Rechercher..." })}
                  </span>
                </span>
                <Kbd className="ms-2">⌘ K</Kbd>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={sidebarHeaderButtonClass}
                onClick={() => handleNavigate("taches")}
                aria-label={t("header.notifications")}
              >
                <HugeiconsIcon
                  icon={Task01Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                <span className="absolute top-2 end-2 size-2 rounded-full border border-background bg-rose-500" />
                <span className="sr-only">{t("header.notifications")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={sidebarHeaderButtonClass}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={t("header.toggleTheme")}
              >
                <HugeiconsIcon
                  icon={theme === "dark" ? Sun03Icon : Moon02Icon}
                  strokeWidth={2}
                  className="size-4"
                />
                <span className="sr-only">{t("header.toggleTheme")}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={sidebarHeaderButtonClass}
                      aria-label={t("language.label")}
                    />
                  }
                >
                  <HugeiconsIcon
                    icon={LanguageCircleIcon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  <span className="sr-only">{t("language.label")}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
                  {SUPPORTED_LANGUAGES.map((language) => {
                    const active = i18n.language.startsWith(language.code)
                    return (
                      <DropdownMenuItem
                        key={language.code}
                        onClick={() => void i18n.changeLanguage(language.code)}
                        className="justify-between"
                      >
                        <span className="flex items-center gap-2">
                          {active ? (
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              strokeWidth={2}
                              className="size-4 text-primary"
                            />
                          ) : (
                            <span className="size-4" />
                          )}
                          <span>{languageLabelByCode[language.code]}</span>
                        </span>
                        <Kbd>⌘⇧{language.shortcut}</Kbd>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              {currentView === "dashboard" ? (
                <Button
                  variant="default"
                  onClick={() => {
                    handleNavigate("agenda")
                    setTimeout(
                      () =>
                        window.dispatchEvent(
                          new CustomEvent("vetera:new-appointment")
                        ),
                      100
                    )
                  }}
                >
                  <HugeiconsIcon
                    icon={Calendar01Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  {t("dashboard.quick.newAppointment", { defaultValue: "Nouveau RDV" })}
                </Button>
              ) : null}
            </div>
          </header>
        ) : (
          <SiteHeader
            title={currentView === "dashboard" ? "🏠 Vue d'ensemble" : getCompactHeaderTitle(currentView)}
            variant="default"
            currentUserName={currentUserName}
            currentUserEmail={currentUserEmail}
            currentUserAvatar={currentUser?.avatarUrl}
            onLogout={logout}
            onOpenPalette={() => setPaletteOpen(true)}
            onNavigate={handleNavigate}
          />
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {content}
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
        isOpen={aiAgentOpen}
        onClose={() => setAiAgentOpen(false)}
        currentView={currentView}
      />
    </SidebarProvider>
    </div>
  )
}
