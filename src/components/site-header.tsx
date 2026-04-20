import { useEffect, useState } from "react"
import {
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  Notification02Icon,
  SearchIcon,
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
import { isTauriRuntime } from "@/services/browser-store"

type SiteHeaderProps = {
  title: string
  variant?: "default" | "prototype"
  meta?: {
    count: string
    label: string
  }
  actionLabel?: string
  onAction?: () => void
  currentUserName?: string
  currentUserEmail?: string
  currentUserAvatar?: string | null
  onLogout?: () => Promise<void>
  onOpenPalette?: () => void
  onNavigate?: (view: View) => void
}

function ContrastIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  )
}

export function SiteHeader({
  title,
  variant = "default",
  meta,
  actionLabel,
  onAction,
  onOpenPalette,
  onNavigate,
}: SiteHeaderProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { ref: headerRef, handleMouseDown } = useTauriDrag()
  const [isScrolled, setIsScrolled] = useState(false)
  const isRtl = i18n.dir() === "rtl"
  const isDesktopRuntime = isTauriRuntime()

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
    "relative inline-flex size-9 items-center justify-center rounded-xl border border-border/60 bg-background/50 text-primary shadow-xs backdrop-blur-[2px] transition-all hover:border-primary hover:bg-primary/10"

  if (variant === "prototype") {
    return (
      <header
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/82 lg:px-6",
          "transition-[width,height] duration-300 ease-linear",
          isScrolled ? "border-border" : "border-border/70"
        )}
      >
        <div className="flex w-full items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ms-1" />
          <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
          <h1 className="text-sm font-medium text-foreground sm:text-base">
            {title}
          </h1>
          {meta ? (
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {meta.count} {meta.label}
            </div>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="hidden h-9 w-[200px] lg:w-[240px] items-center justify-between rounded-full border-border/50 bg-muted/30 px-3 text-[13px] font-normal text-muted-foreground shadow-xs backdrop-blur-[2px] transition-all hover:bg-muted/50 hover:border-border md:flex"
              onClick={onOpenPalette}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={SearchIcon}
                  strokeWidth={2.2}
                  className="size-4 text-foreground/60"
                />
                <span className="font-medium tracking-wide opacity-80">{t("common.search")}</span>
              </div>
              <Kbd className="ms-auto border-border/40 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.02)]">⌘ K</Kbd>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={iconButtonClass}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <ContrastIcon size={16} className="size-4 text-foreground" />
              <span className="sr-only">{t("header.toggleTheme")}</span>
            </Button>
            {actionLabel && onAction ? (
              <Button
                type="button"
                className="h-8 rounded-md px-4 text-[12px] font-normal"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      ref={headerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 overflow-hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ps-4 pe-3 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:ps-6 lg:pe-4",
        "border-black/[0.06] dark:border-white/[0.04]"
      )}
    >
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ms-1" />
        <Separator orientation="vertical" className="mx-2 h-5 data-vertical:self-auto" />
        <div className="flex-1" />
        <div className={cn("ms-auto flex items-center gap-2.5 pe-0.5 transition-transform duration-300")}>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-[200px] lg:w-[240px] items-center justify-between rounded-full border-border/50 bg-muted/30 px-3 text-[13px] font-normal text-muted-foreground shadow-xs backdrop-blur-[2px] transition-all hover:bg-muted/50 hover:border-border"
            onClick={onOpenPalette}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={SearchIcon}
                strokeWidth={2.2}
                className="size-4 text-foreground/60"
              />
              <span className="font-medium tracking-wide opacity-80">{t("common.search")}</span>
            </div>
            <Kbd className="ms-auto border-border/40 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground shadow-[0_1px_1px_rgba(0,0,0,0.02)]">⌘ K</Kbd>
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4 bg-border/80 data-vertical:self-auto" />
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
            <span className="absolute top-1.5 end-1.5 size-2 rounded-full border border-background/90 bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.22)]" />
            <span className="sr-only">{t("header.notifications")}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={iconButtonClass}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <ContrastIcon size={16} className="size-4 text-foreground" />
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
              <HugeiconsIcon icon={LanguageCircleIcon} strokeWidth={2} className="size-4 translate-y-[0.5px]" />
              <span className="sr-only">{t("language.label")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-56" align={isRtl ? "start" : "end"} sideOffset={8}>
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
