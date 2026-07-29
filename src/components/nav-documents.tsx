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
      <SidebarGroupLabel className="mb-1.5 px-2.5 font-semibold text-[10px] text-zinc-500 uppercase tracking-widest antialiased group-data-[collapsible=icon]:hidden">
        {title ?? t("nav.sections.operations")}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1.5">
        {items.map((item) => (
          <SidebarMenuItem className="group/item" key={item.name}>
            <SidebarMenuButton
              className={cn(
                "h-9 rounded-lg px-2.5 font-medium text-sm tracking-tight antialiased transition-all duration-200 ease-out",
                item.isActive
                  ? "!bg-zinc-950/[0.055] !text-zinc-950 dark:!bg-white/[0.08] dark:!text-zinc-100"
                  : "text-zinc-700 hover:!bg-zinc-950/[0.045] hover:!text-zinc-950 dark:text-zinc-400 dark:hover:!bg-white/[0.06] dark:hover:!text-zinc-100",
                "group-data-[collapsible=icon]:size-9.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:px-0"
              )}
              isActive={item.isActive}
              render={<button onClick={item.onClick} type="button" />}
              tooltip={item.name}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center transition-colors duration-200",
                  item.isActive
                    ? "!text-zinc-950 dark:!text-zinc-100"
                    : "text-zinc-600 group-hover/item:!text-zinc-950 dark:text-zinc-400 dark:group-hover/item:!text-zinc-100"
                )}
              >
                {item.icon}
              </div>
              <span className="truncate font-sans leading-relaxed group-data-[collapsible=icon]:hidden">
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
