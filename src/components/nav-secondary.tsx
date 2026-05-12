import type * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavSecondary({
  title,
  items,
  ...props
}: {
  title?: string;
  items: {
    title: string;
    icon: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      {title ? (
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
          {title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5">
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "transition-all duration-200 ease-out",
                  "hover:translate-x-0.5 hover:bg-muted/50 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                  "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:px-3 group-data-[variant=sidebar]:text-[15px] group-data-[variant=sidebar]:text-sidebar-foreground/70 group-data-[variant=sidebar]:hover:translate-x-0 group-data-[variant=sidebar]:hover:bg-sidebar-accent group-data-[variant=sidebar]:hover:text-sidebar-foreground",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
                  "group-data-[variant=sidebar]:data-[active]:bg-sidebar-accent group-data-[variant=sidebar]:data-[active]:shadow-[inset_0_1px_0_var(--sidebar-border)]",
                  item.isActive && "bg-primary/8 hover:bg-primary/12"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
              >
                {item.icon}
                <span className="group-data-[collapsible=icon]:hidden">
                  {item.title}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
