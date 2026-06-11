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
    isActive?: boolean;
    onClick?: () => void;
  }[];
}) {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-2.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 antialiased">
        {title ?? t("nav.sections.operations")}
      </SidebarGroupLabel>
      <SidebarMenu className="group-data-[collapsible=icon]:gap-1.5 gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem className="group/item" key={item.name}>
            <SidebarMenuButton
              className={cn(
                "h-8 rounded-lg px-2.5 text-[13px] font-medium tracking-tight antialiased transition-all duration-200 ease-out",
                item.isActive
                  ? "bg-zinc-100/80 dark:bg-zinc-800/60 text-black dark:text-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none border border-black/5 dark:border-white/5"
                  : "text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:text-black dark:hover:text-zinc-200",
                "group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-xl"
              )}
              isActive={item.isActive}
              render={<button onClick={item.onClick} type="button" />}
              tooltip={item.name}
            >
              <div className={cn(
                "flex items-center justify-center shrink-0 transition-colors duration-200",
                item.isActive ? "text-black dark:text-white" : "text-zinc-600 group-hover/item:text-black dark:text-zinc-400 dark:group-hover/item:text-white"
              )}>
                {item.icon}
              </div>
              <span className="truncate group-data-[collapsible=icon]:hidden font-sans leading-relaxed">
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
                  strokeWidth={1.5}
                />
                <span className="sr-only">{t("nav.menu.more")}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isMobile ? "end" : "start"}
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Folder01Icon} strokeWidth={1.5} />
                  <span>{t("nav.menu.open")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Share01Icon} strokeWidth={1.5} />
                  <span>{t("nav.menu.share")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
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
