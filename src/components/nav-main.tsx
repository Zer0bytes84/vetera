"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavMain({
  title,
  items,
  onPrimaryAction,
  onSecondaryAction,
  showQuickActions = true,
}: {
  title?: string
  items: {
    title: string
    icon?: React.ReactNode
    isActive?: boolean
    onClick?: () => void
  }[]
  onPrimaryAction?: () => void
  onSecondaryAction?: () => void
  showQuickActions?: boolean
}) {
  const { t } = useTranslation()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mt-0">
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
          {showQuickActions ? (
            <SidebarMenuItem className="mt-3 mb-1 flex flex-row items-center gap-2 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:flex-col">
              <button
                type="button"
                onClick={onPrimaryAction}
                className={cn(
                  "flex h-8 min-w-8 flex-1 items-center gap-2.5 rounded-lg px-3 text-sm font-medium",
                  "bg-primary text-primary-foreground",
                  "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15)]",
                  "transition-all duration-200 ease-out",
                  "hover:bg-primary/90 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)]",
                  "active:scale-[0.98] active:shadow-[0_1px_4px_-1px_rgba(0,0,0,0.1)]"
                )}
              >
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.5} className="size-3 text-primary-foreground" />
                </div>
                <span className="group-data-[collapsible=icon]:hidden">Nouveau patient</span>
              </button>
              <Button
                size="icon"
                className={cn(
                  "size-8 shrink-0 bg-background group-data-[collapsible=icon]:hidden",
                  "transition-all duration-200 ease-out",
                  "hover:bg-muted/60 hover:translate-x-0.5",
                  "active:scale-95"
                )}
                variant="outline"
                onClick={onSecondaryAction}
              >
                <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
                <span className="sr-only">Agenda</span>
              </Button>
            </SidebarMenuItem>
          ) : null}
          {title ? <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{title}</SidebarGroupLabel> : null}
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className="group/item">
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                className={cn(
                  "transition-all duration-200 ease-out",
                  "hover:bg-muted/50 hover:translate-x-0.5 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                  "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:px-3 group-data-[variant=sidebar]:text-[15px] group-data-[variant=sidebar]:hover:translate-x-0",
                  "group-data-[variant=sidebar]:data-[active]:bg-background group-data-[variant=sidebar]:data-[active]:shadow-[0_1px_0_rgba(15,23,42,0.04),0_0_0_1px_rgba(15,23,42,0.06)]",
                  item.isActive && "bg-primary/8 hover:bg-primary/12"
                )}
                render={<button type="button" onClick={item.onClick} />}
              >
                {item.icon}
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
