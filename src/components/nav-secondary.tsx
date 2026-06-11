import type * as React from "react";
import { ChevronDown } from "lucide-react";
import {
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
        <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 antialiased">
          {title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5 gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "h-8 rounded-md px-2.5 text-[13px] font-medium tracking-tight antialiased transition-all duration-200 ease-out",
                  item.isActive
                    ? "bg-zinc-100/80 dark:bg-zinc-800/60 text-black dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none border border-black/5 dark:border-white/5"
                    : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-black dark:hover:text-zinc-200",
                  "group-data-[variant=sidebar]:h-8 group-data-[variant=sidebar]:rounded-md group-data-[variant=sidebar]:px-2.5 group-data-[variant=sidebar]:text-[13px]",
                  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
              >
                <div className={cn(
                  "flex items-center justify-center shrink-0 transition-colors duration-200",
                  item.isActive ? "text-black dark:text-white" : "text-zinc-600 group-hover/item:text-black dark:text-zinc-400 dark:group-hover/item:text-white"
                )}>
                  {item.icon}
                </div>
                <span className="truncate group-data-[collapsible=icon]:hidden font-sans leading-relaxed">
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

