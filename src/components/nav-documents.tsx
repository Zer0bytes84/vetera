import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreHorizontalCircle01Icon, Folder01Icon, Share01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function NavDocuments({
  title,
  items,
}: {
  title?: string
  items: {
    name: string
    icon: React.ReactNode
    onClick?: () => void
  }[]
}) {
  const { t } = useTranslation()
  const { isMobile } = useSidebar()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mt-0">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{title ?? t("nav.sections.operations")}</SidebarGroupLabel>
      <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
        {items.map((item) => (
          <SidebarMenuItem key={item.name} className="group/item">
            <SidebarMenuButton
              render={<button type="button" onClick={item.onClick} />}
              tooltip={item.name}
              className={cn(
                "transition-all duration-200 ease-out",
                "hover:bg-muted/50 hover:translate-x-0.5 hover:shadow-[0_0_0_1px_rgba(15,23,42,0.06)]",
                "group-data-[variant=sidebar]:h-10 group-data-[variant=sidebar]:rounded-xl group-data-[variant=sidebar]:px-3 group-data-[variant=sidebar]:text-[15px] group-data-[variant=sidebar]:hover:translate-x-0"
              )}
            >
              {item.icon}
              <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    className="transition-all duration-200 ease-out hover:bg-muted/60 aria-expanded:bg-muted"
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} className="text-muted-foreground transition-all duration-200 group-hover:text-foreground" />
                <span className="sr-only">{t("nav.menu.more")}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
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
  )
}
