import {
  Delete02Icon,
  Folder01Icon,
  MoreHorizontalCircle01Icon,
  Share01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function NavDocuments({
  title,
  items,
}: {
  title?: string;
  items: {
    name: string;
    icon: React.ReactNode;
    onClick?: () => void;
  }[];
}) {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
        {title ?? t("nav.sections.operations")}
      </SidebarGroupLabel>
      <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
        {items.map((item) => (
          <SidebarMenuItem className="group/item" key={item.name}>
            <SidebarMenuButton
              className={cn(
                "h-10 rounded-xl !px-3 text-[15px] transition-all duration-200 ease-out",
                "hover:translate-x-0.5 hover:bg-muted/50 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "data-[active]:bg-sidebar-accent data-[active]:text-sidebar-foreground data-[active]:shadow-[inset_0_1px_0_var(--sidebar-border)]",
                "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center"
              )}
              render={<button onClick={item.onClick} type="button" />}
              tooltip={item.name}
            >
              {item.icon}
              <span className="group-data-[collapsible=icon]:hidden">
                {item.name}
              </span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    className="transition-all duration-200 ease-out hover:bg-muted/60 aria-expanded:bg-muted"
                    showOnHover
                  />
                }
              >
                <HugeiconsIcon
                  className="text-muted-foreground transition-all duration-200 group-hover:text-foreground"
                  icon={MoreHorizontalCircle01Icon}
                  strokeWidth={2}
                />
                <span className="sr-only">{t("nav.menu.more")}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isMobile ? "end" : "start"}
                className="w-24"
                side={isMobile ? "bottom" : "right"}
              >
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
                  <span>{t("nav.menu.open")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Share01Icon} strokeWidth={2} />
                  <span>{t("nav.menu.share")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  <span>{t("nav.menu.delete")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
