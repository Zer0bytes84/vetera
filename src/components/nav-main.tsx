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
import { SparklesIcon } from "@hugeicons/core-free-icons"

export function NavMain({
  title,
  items,
  onPrimaryAction,
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
  onAssistant?: () => void
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mt-0">
      <SidebarGroupContent>
        {title ? <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{title}</SidebarGroupLabel> : null}
        <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
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
                tooltip="Assistant"
                render={<button type="button" onClick={onAssistant} />}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">Assistant</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
