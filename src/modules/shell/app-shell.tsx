import { useEffect, useMemo, useState, useCallback, useTransition } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { AIAgentPanel } from "@/components/ai-agent-panel"
import CommandPalette from "@/components/CommandPalette"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import { LayoutProvider, useLayout } from "@/contexts/layout-provider"
import type { View } from "@/types"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

import { getViewTitle } from "../../app/config/navigation"
import { renderView } from "../../app/config/view-registry"
import { useThemeMode } from "../../app/hooks/use-theme-mode"

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
  const [isPending, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)
  const { currentUser, logout } = useAuth()
  const { themeMode, setThemeMode } = useThemeMode()
  const { variant, collapsible } = useLayout()

  // Navigation avec skeleton loading
  const handleNavigate = useCallback((view: View) => {
    setIsNavigating(true)
    startTransition(() => {
      setCurrentView(view)
      // Petit délai pour montrer le skeleton (minimum 300ms pour éviter le flash)
      setTimeout(() => {
        setIsNavigating(false)
      }, 300)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((current) => !current)
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault()
        setAiAgentOpen((current) => !current)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const content = useMemo(
    () =>
      renderView(currentView, {
        onNavigate: handleNavigate,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
      }),
    [currentView, handleNavigate, setThemeMode, themeMode]
  )

  // Skeleton de chargement pendant la navigation
  const NavigationSkeleton = () => (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-8 w-48" />
          <Skeleton variant="shimmer" className="h-4 w-64" />
        </div>
        <Skeleton variant="shimmer" className="h-10 w-32 rounded-lg" />
      </div>
      
      {/* Content skeleton grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex min-h-[358px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-4">
            <div className="relative min-h-[186px] overflow-hidden rounded-[18px] border border-border/50 bg-muted/30 px-4 py-4">
              <div className="mb-3 space-y-2">
                <Skeleton variant="shimmer" className="h-2 w-20" />
                <Skeleton variant="shimmer" className="h-5 w-24" />
              </div>
              <Skeleton variant="shimmer" className="h-[100px] w-full" />
            </div>
            <div className="mt-auto space-y-2 px-1.5 pt-5">
              <Skeleton variant="shimmer" className="h-4 w-3/4" />
              <Skeleton variant="shimmer" className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Secondary content skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton variant="shimmer" className="h-[300px] w-full rounded-[24px]" />
        <Skeleton variant="shimmer" className="h-[300px] w-full rounded-[24px]" />
        <Skeleton variant="shimmer" className="h-[300px] w-full rounded-[24px]" />
      </div>
    </div>
  )

  const currentUserName =
    currentUser?.displayName || currentUser?.email || "Utilisateur"
  const currentUserEmail = currentUser?.email || "local@vetera.app"

  return (
    <SidebarProvider
      dir={isRtl ? "rtl" : "ltr"}
      className={cn("!min-h-0 h-svh overflow-hidden", isRtl && "rtl-shell")}
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
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
        onOpenAIAgent={() => setAiAgentOpen(true)}
      />
      <SidebarInset className="relative isolate flex min-h-0 flex-col overflow-y-auto">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-background" />
        <SiteHeader
          title={getViewTitle(currentView, t)}
          variant="default"
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          currentUserAvatar={currentUser?.avatarUrl}
          onLogout={logout}
          onOpenPalette={() => setPaletteOpen(true)}
          onNavigate={handleNavigate}
        />
        <div className="flex flex-1 flex-col">
          {isNavigating ? <NavigationSkeleton /> : content}
        </div>
      </SidebarInset>

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* AI Agent Slide-over Panel */}
      {aiAgentOpen && (
        <div className={cn("fixed inset-0 z-50 flex", isRtl ? "justify-start" : "justify-end")}>
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setAiAgentOpen(false)}
          />
          <div
            className={cn(
              "relative z-10 flex h-full w-full max-w-sm animate-in flex-col border-border bg-background shadow-2xl duration-300",
              isRtl ? "border-r slide-in-from-left" : "border-l slide-in-from-right"
            )}
          >
            <AIAgentPanel
              isOpen={aiAgentOpen}
              onClose={() => setAiAgentOpen(false)}
            />
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
