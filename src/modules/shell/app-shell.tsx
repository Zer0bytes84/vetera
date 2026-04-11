import { useEffect, useMemo, useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { AIAgentPanel } from "@/components/ai-agent-panel"
import CommandPalette from "@/components/CommandPalette"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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
  const { currentUser, logout } = useAuth()
  const { themeMode, setThemeMode } = useThemeMode()
  const { variant, collapsible } = useLayout()

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
        onNavigate: setCurrentView,
        currentTheme: themeMode,
        onThemeChange: setThemeMode,
      }),
    [currentView, setThemeMode, themeMode]
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
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--sidebar-width-icon": "calc(var(--spacing) * 16)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        side={isRtl ? "right" : "left"}
        variant={variant}
        collapsible={collapsible}
        currentView={currentView}
        onNavigate={setCurrentView}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        currentUserAvatar={currentUser?.avatarUrl}
        onLogout={logout}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenAIAgent={() => setAiAgentOpen(true)}
      />
      <SidebarInset className="relative isolate flex min-h-0 flex-col overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -top-32 right-0 transform-gpu blur-[80px] sm:-top-40"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="relative right-0 aspect-[1155/678] w-[24rem] translate-x-1/4 rotate-[30deg] mix-blend-multiply bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:w-[48rem] sm:translate-x-1/3 dark:mix-blend-screen dark:opacity-[0.12]"
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute top-[30%] right-0 transform-gpu blur-[80px]"
          >
            <div
              style={{
                clipPath:
                  "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
              }}
              className="relative right-0 aspect-[1155/678] w-[24rem] translate-x-1/4 mix-blend-multiply bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:w-[48rem] sm:translate-x-1/3 dark:mix-blend-screen dark:opacity-[0.12]"
            />
          </div>
        </div>
        <SiteHeader
          title={getViewTitle(currentView, t)}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          currentUserAvatar={currentUser?.avatarUrl}
          onLogout={logout}
          onOpenPalette={() => setPaletteOpen(true)}
          onNavigate={setCurrentView}
        />
        <div className="flex flex-1 flex-col">{content}</div>
      </SidebarInset>

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(view) => setCurrentView(view)}
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
