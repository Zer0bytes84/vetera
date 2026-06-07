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
import { motion } from "framer-motion";

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
            <SidebarMenuItem className="group/item relative" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "relative h-9 rounded-xl !px-3 text-[13.5px] font-medium transition-colors duration-200 ease-out",
                  item.isActive
                    ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                    : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-zinc-900/5 dark:hover:bg-white/5",
                  "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:!px-3 group-data-[variant=sidebar]:text-[15px]",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
              >
                {item.isActive && (
                  <motion.div
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 rounded-xl bg-zinc-900/5 dark:bg-white/10 z-0"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 35
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className={cn(
                    "transition-colors duration-200",
                    item.isActive ? "text-zinc-900 dark:text-zinc-50" : "text-inherit"
                  )}>
                    {item.icon}
                  </span>
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </div>
  );
}
