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

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    icon: React.ReactNode
    onClick?: () => void
  }[]
}) {
  const { isMobile } = useSidebar()
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mt-0">
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Exploitation</SidebarGroupLabel>
      <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton render={<button type="button" onClick={item.onClick} />} tooltip={item.name}>
              {item.icon}
              <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuAction
                    showOnHover
                    className="aria-expanded:bg-muted"
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalCircle01Icon} strokeWidth={2} />
                <span className="sr-only">More</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
                  <span>Ouvrir</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HugeiconsIcon icon={Share01Icon} strokeWidth={2} />
                  <span>Partager</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                  <span>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
