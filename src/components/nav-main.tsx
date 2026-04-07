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
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {title ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={item.isActive}
                render={<button type="button" onClick={item.onClick} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
