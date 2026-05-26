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
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                className={cn(
                  "h-10 rounded-xl !px-3 text-[15px] transition-all duration-200 ease-out",
                  "hover:translate-x-0.5 hover:bg-muted/50 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                  "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  "data-[active]:bg-sidebar-accent data-[active]:text-sidebar-foreground data-[active]:shadow-[inset_0_1px_0_var(--sidebar-border)]",
                  "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center",
                  item.isActive && "bg-primary/8 text-foreground hover:bg-primary/12"
                )}
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
                tooltip={item.title}
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
