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
import { SparklesIcon, Calendar01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function NavMain({
  title,
  items,
  onPrimaryAction,
  onSecondaryAction,
  onAssistant,
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
  onAssistant?: () => void
}) {
  const { t } = useTranslation()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mt-0">
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
          <SidebarMenuItem className="mb-1 flex flex-row items-center gap-2 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:flex-col">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="flex h-8 min-w-8 flex-1 items-center gap-2.5 rounded-md bg-foreground px-3 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
            >
              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background">
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.5} className="size-3 text-foreground" />
              </div>
              <span className="group-data-[collapsible=icon]:hidden">Nouveau patient</span>
            </button>
            <Button
              size="icon"
              className="size-8 shrink-0 bg-background group-data-[collapsible=icon]:hidden"
              variant="outline"
              onClick={onSecondaryAction}
            >
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4" />
              <span className="sr-only">Agenda</span>
            </Button>
          </SidebarMenuItem>
          {title ? <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{title}</SidebarGroupLabel> : null}
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                render={<button type="button" onClick={item.onClick} />}
              >
                {item.icon}
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {onAssistant ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t("nav.assistant")}
                render={<button type="button" onClick={onAssistant} />}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">{t("nav.assistant")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
