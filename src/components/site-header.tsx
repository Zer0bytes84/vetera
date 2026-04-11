import { useEffect, useState } from "react"
import {
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  Moon02Icon,
  Notification02Icon,
  SearchIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useTauriDrag } from "@/hooks/use-tauri-drag"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { View } from "@/types"
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/config"
import { useTranslation } from "react-i18next"

type SiteHeaderProps = {
  title: string
  currentUserName?: string
  currentUserEmail?: string
  currentUserAvatar?: string | null
  onLogout?: () => Promise<void>
  onOpenPalette?: () => void
  onNavigate?: (view: View) => void
}

export function SiteHeader({
  title,
  currentUserName = "Utilisateur",
  currentUserEmail = "local@vetera.app",
  currentUserAvatar,
  onLogout,
  onOpenPalette,
  onNavigate,
}: SiteHeaderProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { ref: headerRef, handleMouseDown } = useTauriDrag()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const header = headerRef.current as HTMLElement | null
    if (!header) return

    // The scroll container is the parent (SidebarInset with overflow-auto)
    const scrollContainer = header.parentElement
    if (!scrollContainer) return

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 8)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const languageByShortcut = Object.fromEntries(
      SUPPORTED_LANGUAGES.map((item) => [item.shortcut, item.code])
    ) as Record<string, SupportedLanguage>

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return
      const targetLanguage = languageByShortcut[event.key]
      if (!targetLanguage) return
      event.preventDefault()
      void i18n.changeLanguage(targetLanguage)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  }
  const iconButtonClass =
    "relative inline-flex size-9 items-center justify-center rounded-xl border-border/80 bg-background/60 text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-background/75"

  return (
    <header
      ref={headerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b pl-4 pr-3 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:pl-6 lg:pr-4",
        "site-header-glass border-black/[0.06] dark:border-white/[0.04]",
        !isScrolled && "shadow-none border-transparent"
      )}
    >
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <div
          className={cn(
            "ml-auto flex items-center gap-2 pr-0.5 transition-transform duration-300"
          )}
        >
          <Button
            type="button"
            variant="outline"
            className="h-8 w-[280px] items-center justify-between rounded-lg border-border/70 bg-background/45 px-3 text-sm text-muted-foreground shadow-sm backdrop-blur-md transition-all hover:bg-background/65"
            onClick={onOpenPalette}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon
              icon={SearchIcon}
              strokeWidth={2.1}
              className="size-4 text-foreground/80"
            />
              <span>{t("common.search")}</span>
            </div>
            <Kbd className="ml-2 border-none bg-background/60 shadow-none">⌘ K</Kbd>
          </Button>
          <Separator
            orientation="vertical"
            className="mx-1 h-4 bg-border/80 data-vertical:self-auto"
          />
          <Button
            variant="outline"
            size="icon"
            className={iconButtonClass}
            onClick={() => onNavigate?.("taches")}
            aria-label={t("header.notifications")}
          >
            <HugeiconsIcon
              icon={Notification02Icon}
              strokeWidth={2}
              className="size-4 text-foreground/85"
            />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full border border-background/90 bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.22)]" />
            <span className="sr-only">{t("header.notifications")}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={iconButtonClass}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <HugeiconsIcon
              icon={Sun03Icon}
              strokeWidth={2}
              className="size-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
            />
            <HugeiconsIcon
              icon={Moon02Icon}
              strokeWidth={2}
              className="size-4 absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
            />
            <span className="sr-only">{t("header.toggleTheme")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className={iconButtonClass}
                  type="button"
                  aria-label={t("language.label")}
                />
              }
            >
              <HugeiconsIcon
                icon={LanguageCircleIcon}
                strokeWidth={2}
                className="size-4 translate-y-[0.5px]"
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
                    <div className="flex items-center gap-2">
                      {active ? (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-primary" />
                      ) : (
                        <span className="size-4" />
                      )}
                      <span>{languageLabelByCode[language.code]}</span>
                    </div>
                    <Kbd>⌘⇧{language.shortcut}</Kbd>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </header>
  )
}
