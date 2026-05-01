import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavSecondary({
  title,
  items,
  ...props
}: {
  title?: string
  items: {
    title: string
    icon: React.ReactNode
    isActive?: boolean
    onClick?: () => void
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      {title ? <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{title}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className="group/item">
              <SidebarMenuButton
                isActive={item.isActive}
                className={cn(
                  "transition-all duration-200 ease-out",
                  "hover:bg-muted/50 hover:translate-x-0.5 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                  "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:px-3 group-data-[variant=sidebar]:text-[15px] group-data-[variant=sidebar]:hover:translate-x-0",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
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
