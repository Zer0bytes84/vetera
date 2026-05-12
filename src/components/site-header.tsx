import {
  CheckmarkCircle02Icon,
  LanguageCircleIcon,
  SearchIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import i18n, {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n/config";
import { cn } from "@/lib/utils";
import { isTauriRuntime } from "@/services/browser-store";
import type { View } from "@/types";

type SiteHeaderProps = {
  title: string;
  variant?: "default" | "prototype";
  meta?: {
    count: string;
    label: string;
  };
  actionLabel?: string;
  onAction?: () => void;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserAvatar?: string | null;
  onLogout?: () => Promise<void>;
  onOpenPalette?: () => void;
  onNavigate?: (view: View) => void;
};

function ContrastIcon({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  );
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
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { ref: headerRef, handleMouseDown } = useTauriDrag();
  const [isScrolled, setIsScrolled] = useState(false);
  const isRtl = i18n.dir() === "rtl";
  const isDesktopRuntime = isTauriRuntime();

  useEffect(() => {
    const header = headerRef.current as HTMLElement | null;
    if (!header) {
      return;
    }

    // The scroll container is the parent (SidebarInset with overflow-auto)
    const scrollContainer = header.parentElement;
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 8);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const languageByShortcut = Object.fromEntries(
      SUPPORTED_LANGUAGES.map((item) => [item.shortcut, item.code])
    ) as Record<string, SupportedLanguage>;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!((event.metaKey || event.ctrlKey) && event.shiftKey)) {
        return;
      }
      const targetLanguage = languageByShortcut[event.key];
      if (!targetLanguage) {
        return;
      }
      event.preventDefault();
      void i18n.changeLanguage(targetLanguage);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const languageLabelByCode: Record<SupportedLanguage, string> = {
    fr: t("language.french"),
    en: t("language.english"),
    ar: t("language.arabic"),
    es: t("language.spanish"),
    pt: t("language.portuguese"),
    de: t("language.german"),
  };

  const iconButtonClass =
    "raycast-header-control relative inline-flex size-9 items-center justify-center rounded-xl text-foreground/75 transition-all duration-200 hover:text-foreground";

  if (variant === "prototype") {
    return (
      <header
        className={cn(
          "sticky top-0 z-30 flex h-[64px] shrink-0 items-center gap-2 px-4 lg:px-6",
          "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          // Liquid glass (macOS / iOS) — translucent surface + heavy blur + high saturation
          "raycast-header border-b",
          isScrolled && "raycast-header-scrolled",
          isScrolled
            ? "border-black/[0.10] shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:border-white/[0.12]"
            : "border-transparent shadow-none"
        )}
        onMouseDown={handleMouseDown}
        ref={headerRef}
      >
        <div className="flex w-full items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ms-1" />
          <h1 className="font-medium text-foreground text-sm sm:text-base">
            {title}
          </h1>
          {meta ? (
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              {meta.count} {meta.label}
            </div>
          ) : null}
          <div className="ms-auto flex items-center gap-2">
            <Button
              className="raycast-header-search hidden h-9 w-[200px] items-center justify-between rounded-full px-3 font-normal text-[13px] text-muted-foreground transition-all hover:text-foreground md:flex lg:w-[260px]"
              onClick={onOpenPalette}
              type="button"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  className="size-4 text-foreground/60"
                  icon={SearchIcon}
                  strokeWidth={2.2}
                />
                <span className="font-medium tracking-wide opacity-80">
                  {t("common.search")}
                </span>
              </div>
              <Kbd className="ms-auto border-border/40 bg-background/80 px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
                ⌘ K
              </Kbd>
            </Button>
            <Button
              className={iconButtonClass}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              size="icon"
              variant="outline"
            >
              <ContrastIcon className="size-4 text-foreground" size={16} />
              <span className="sr-only">{t("header.toggleTheme")}</span>
            </Button>
            {actionLabel && onAction ? (
              <Button
                className="h-8 rounded-md px-4 font-normal text-[12px]"
                onClick={onAction}
                type="button"
              >
                {actionLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[64px] shrink-0 items-center gap-2 ps-4 pe-3 lg:ps-6 lg:pe-4",
        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        // Liquid glass (macOS / iOS) — translucent surface + heavy blur + high saturation
        "raycast-header border-b md:rounded-t-[24px]",
        isScrolled && "raycast-header-scrolled",
        isScrolled
          ? "border-black/[0.10] shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] dark:border-white/[0.12]"
          : "shadow-none"
      )}
      onMouseDown={handleMouseDown}
      ref={headerRef}
    >
      <div className="flex w-full items-center gap-2">
        <SidebarTrigger className="-ms-1" />
        <div className="flex-1" />
        <div
          className={cn(
            "ms-auto flex items-center gap-2.5 pe-0.5 transition-transform duration-300"
          )}
        >
          <Button
            className="focus-ring-vibrant raycast-header-search h-9 w-[200px] items-center justify-between rounded-full px-3 font-normal text-[13px] text-muted-foreground transition-all hover:text-foreground lg:w-[260px]"
            onClick={onOpenPalette}
            type="button"
            variant="outline"
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                className="size-4 text-foreground/60"
                icon={SearchIcon}
                strokeWidth={2.2}
              />
              <span className="font-medium tracking-wide opacity-80">
                {t("common.search")}
              </span>
            </div>
            <Kbd className="ms-auto border-border/40 bg-background/80 px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground uppercase shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
              ⌘ K
            </Kbd>
          </Button>
          <Separator
            className="mx-1 h-4 bg-border/80 data-vertical:self-auto"
            orientation="vertical"
          />
          <Button
            aria-label={t("header.notifications")}
            className={iconButtonClass}
            onClick={() => onNavigate?.("taches")}
            size="icon"
            variant="outline"
          >
            <HugeiconsIcon
              className="size-4 text-foreground/85"
              icon={Task01Icon}
              strokeWidth={2}
            />
            <span className="status-dot-alive absolute end-1.5 top-1.5 size-2 rounded-full border border-background/90 bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,0.22)]" />
            <span className="sr-only">{t("header.notifications")}</span>
          </Button>
          <Button
            className={iconButtonClass}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            size="icon"
            variant="outline"
          >
            <ContrastIcon className="size-4 text-foreground" size={16} />
            <span className="sr-only">{t("header.toggleTheme")}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label={t("language.label")}
                  className={iconButtonClass}
                  size="icon"
                  type="button"
                  variant="outline"
                />
              }
            >
              <HugeiconsIcon
                className="size-4 translate-y-[0.5px]"
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
                    onClick={() => void i18n.changeLanguage(language.code)}
                  >
                    <div className="flex items-center gap-2">
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
                    </div>
                    <Kbd>⌘⇧{language.shortcut}</Kbd>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </header>
  );
}
