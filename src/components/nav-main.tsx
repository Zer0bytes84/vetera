import { ChevronRight } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export type NavSubItem = {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
};

export type NavItem = {
  title: string;
  badge?: number;
  icon?: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  /** Sub-pages, folded under the item until it is opened or toggled. */
  children?: NavSubItem[];
  expanded?: boolean;
  onToggle?: () => void;
};

export function NavMain({
  title,
  premiumTitle,
  items,
}: {
  title?: string;
  premiumTitle?: string;
  items: NavItem[];
}) {
  const label = premiumTitle ? (
    <>
      <span className="classic-sidebar-label">{title}</span>
      <span className="premium-sidebar-label">{premiumTitle}</span>
    </>
  ) : (
    title
  );
  const groupLabelClass =
    "mb-1.5 px-2.5 font-medium t-12 text-muted-foreground uppercase tracking-[0.08em] antialiased group-data-[collapsible=icon]:hidden";
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:p-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 group-data-[collapsible=icon]:gap-2">
          {title ? (
            <SidebarGroupLabel className={groupLabelClass}>{label}</SidebarGroupLabel>
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
                <span className="min-w-0 truncate whitespace-nowrap font-sans leading-5 group-data-[collapsible=icon]:hidden">
                  {item.title}
                </span>
                {!!item.badge && <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-rose-600 px-1 t-12 font-medium text-white group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0" aria-hidden="true">{item.badge}</span>}
              </SidebarMenuButton>
              {item.children?.length ? (
                <>
                  <SidebarMenuAction
                    aria-expanded={!!item.expanded}
                    aria-label={`${item.expanded ? "Replier" : "Déplier"} les sous-pages de ${item.title}`}
                    className="sidebar-subpages-toggle"
                    data-open={item.expanded ? "true" : undefined}
                    onClick={item.onToggle}
                    showOnHover={!item.expanded}
                  >
                    <ChevronRight aria-hidden="true" className="sidebar-disclosure" data-open={item.expanded ? "true" : undefined} />
                  </SidebarMenuAction>
                  {item.expanded ? (
                    <SidebarMenuSub className="sidebar-subpages">
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            aria-current={child.isActive ? "page" : undefined}
                            className="sidebar-subpage-link"
                            isActive={child.isActive}
                            render={<button onClick={child.onClick} type="button" />}
                          >
                            <span>{child.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
