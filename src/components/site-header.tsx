import { SearchIcon, Sun03Icon } from "@hugeicons/core-free-icons"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

  return (
    <header
      ref={headerRef}
      onMouseDown={handleMouseDown}
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
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
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="hidden items-center gap-2 text-muted-foreground md:flex"
            onClick={onOpenPalette}
          >
            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
            <span className="text-sm">Rechercher...</span>
            <Kbd className="ml-2">K</Kbd>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full border-border/70 bg-background text-muted-foreground shadow-none hover:bg-muted/40 hover:text-foreground"
                />
              }
            >
              <HugeiconsIcon
                icon={Sun03Icon}
                strokeWidth={2}
                className="size-4.5"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64">
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(value) =>
                  setTheme(value as "light" | "dark" | "system")
                }
              >
                <DropdownMenuRadioItem value="light">
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
