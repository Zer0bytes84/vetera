import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
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

export function NavMain({
  title,
  items,
}: {
  title?: string;
  items: {
    title: string;
    icon?: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  }[];
}) {
  const { t } = useTranslation();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupContent>
        <SidebarMenu className="group-data-[collapsible=icon]:gap-2">

          {title ? (
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              {title}
            </SidebarGroupLabel>
          ) : null}
          {items.map((item) => (
            <SidebarMenuItem className="group/item relative" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "relative h-10 rounded-xl !px-3 text-[15px] transition-colors duration-200 ease-out",
                  item.isActive
                    ? "text-zinc-900 dark:text-zinc-50 font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-zinc-900/5 dark:hover:bg-white/5",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
                tooltip={item.title}
              >
                {item.isActive && (
                  <motion.div
                    layoutId="active-nav-main-item"
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
    </SidebarGroup>
  );
}
