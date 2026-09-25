import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-1.5">
          {title ? (
            <SidebarGroupLabel className="mb-1.5 px-2.5 font-semibold text-[10px] text-zinc-500 uppercase tracking-widest antialiased group-data-[collapsible=icon]:hidden">
              {title}
            </SidebarGroupLabel>
          ) : null}
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                aria-label={item.title}
                className="sidebar-nav-link group-data-[collapsible=icon]:size-9.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
                tooltip={item.title}
              >
                <div
                  className="sidebar-nav-icon"
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
    </SidebarGroup>
  );
}
