import type * as React from "react";
import {
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
      className={cn("relative flex w-full min-w-0 flex-col p-0!", className)}
      data-sidebar="group"
      data-slot="sidebar-group"
      {...props}
    >
      {title ? (
        <SidebarGroupLabel className="mb-1.5 px-2.5 font-semibold text-[10px] text-zinc-500 uppercase tracking-widest antialiased group-data-[collapsible=icon]:hidden">
          {title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1.5">
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "h-9 rounded-md px-2.5 font-medium text-sm tracking-tight antialiased transition-all duration-200 ease-out",
                  item.isActive
                    ? "border border-black/5 bg-zinc-100/80 text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-white/5 dark:bg-zinc-800/60 dark:text-white dark:shadow-none"
                    : "text-zinc-700 hover:bg-zinc-100/50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200",
                  "group-data-[variant=sidebar]:h-9 group-data-[variant=sidebar]:rounded-md group-data-[variant=sidebar]:px-2.5 group-data-[variant=sidebar]:text-sm",
                  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
              >
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center transition-colors duration-200",
                    item.isActive
                      ? "text-black dark:text-white"
                      : "text-zinc-600 group-hover/item:text-black dark:text-zinc-400 dark:group-hover/item:text-white"
                  )}
                >
                  {item.icon}
                </div>
                <span className="truncate font-sans leading-relaxed group-data-[collapsible=icon]:hidden">
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
