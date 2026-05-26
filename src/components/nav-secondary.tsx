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
  className,
  ...props
}: {
  title?: string;
  items: {
    title: string;
    icon: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  }[];
} & React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-0!", className)}
      {...props}
    >
      {title ? (
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-1 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">
          {title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5 gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "h-9 rounded-xl !px-3 text-[13.5px] font-medium transition-all duration-200 ease-out",
                  "text-sidebar-foreground/65 hover:text-sidebar-foreground",
                  "hover:bg-muted/50",
                  "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:!px-3 group-data-[variant=sidebar]:text-[15px] group-data-[variant=sidebar]:text-sidebar-foreground/70 group-data-[variant=sidebar]:hover:translate-x-0 group-data-[variant=sidebar]:hover:bg-sidebar-accent group-data-[variant=sidebar]:hover:text-sidebar-foreground",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
                  "group-data-[variant=sidebar]:data-[active]:bg-sidebar-accent group-data-[variant=sidebar]:data-[active]:shadow-[inset_0_1px_0_var(--sidebar-border)]",
                  item.isActive && "bg-primary/8 text-foreground hover:bg-primary/12"
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
    </div>
  );
}
