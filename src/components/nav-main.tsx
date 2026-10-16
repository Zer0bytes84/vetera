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
  premiumTitle,
  items,
}: {
  title?: string;
  premiumTitle?: string;
  items: {
    title: string;
    badge?: number;
    icon?: React.ReactNode;
    isActive?: boolean;
    onClick?: () => void;
  }[];
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-2">
          {title ? (
            <SidebarGroupLabel className="mb-1.5 px-2.5 font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em] antialiased group-data-[collapsible=icon]:hidden">
              {premiumTitle ? <><span className="classic-sidebar-label">{title}</span><span className="premium-sidebar-label">{premiumTitle}</span></> : title}
            </SidebarGroupLabel>
          ) : null}
          {items.map((item) => (
            <SidebarMenuItem className="group/item" key={item.title}>
              <SidebarMenuButton
                aria-label={item.badge ? `${item.title}, ${item.badge} soins en retard` : item.title}
                className="sidebar-nav-link group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:[&_svg]:size-[26px]!"
                isActive={item.isActive}
                render={<button onClick={item.onClick} type="button" />}
                tooltip={item.title}
              >
                <div
                  className="sidebar-nav-icon"
                >
                  {item.icon}
                </div>
                <span className="min-w-0 whitespace-normal break-words font-sans leading-5 group-data-[collapsible=icon]:hidden">
                  {item.title}
                </span>
                {!!item.badge && <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-rose-600 px-1 text-[12px] font-medium text-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0" aria-hidden="true">{item.badge}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
