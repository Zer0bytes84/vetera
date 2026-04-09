import { useEffect, useState } from "react"
import { SearchIcon, Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useTauriDrag } from "@/hooks/use-tauri-drag"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { View } from "@/types"

type SiteHeaderProps = {
  title: string
  onOpenPalette?: () => void
  onNavigate?: (view: View) => void
}

export function SiteHeader({
  title,
  onOpenPalette,
  onNavigate,
}: SiteHeaderProps) {
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

  return (
    <header
      ref={headerRef}
      onMouseDown={handleMouseDown}
      className={`sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:px-6 ${
        isScrolled
          ? 'site-header-glass border-black/[0.06] dark:border-white/[0.08]'
          : 'bg-background'
      }`}
    >
      <div className="flex w-full items-center gap-1 lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <div className="min-w-0 flex-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <span className="text-sm text-muted-foreground">Dashboard</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-3 pr-4 sm:pr-6 lg:pr-8">
          <Button
            type="button"
            variant="outline"
            className="hidden h-10 w-full max-w-[280px] lg:max-w-[400px] items-center justify-between rounded-full bg-muted/30 hover:bg-muted/60 px-4 text-sm text-muted-foreground transition-all md:flex border-border/40 shadow-sm backdrop-blur-md"
            onClick={onOpenPalette}
          >
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="size-4.5" />
              <span>Rechercher ou demander à l'IA...</span>
            </div>
            <Kbd className="ml-2 border-none bg-background/40 shadow-none">⌘ K</Kbd>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full relative"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <HugeiconsIcon
              icon={Sun03Icon}
              strokeWidth={2}
              className="size-4.5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
            />
            <HugeiconsIcon
              icon={Moon02Icon}
              strokeWidth={2}
              className="size-4.5 absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
            />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
