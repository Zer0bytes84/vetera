"use client";

import {
  MoreVerticalIcon,
  Notification01Icon,
  Settings01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Avatar from "@/components/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  onProfile?: () => void;
  onFinances?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
}

export function NavUser({
  user,
  onProfile,
  onFinances,
  onNotifications,
  onSettings,
}: NavUserProps) {
  const { isMobile } = useSidebar();
  const normalizedAvatar =
    typeof user.avatar === "string" &&
    user.avatar.trim() &&
    !["undefined", "null", "nan"].includes(user.avatar.trim().toLowerCase())
      ? user.avatar.trim()
      : undefined;
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex w-full min-w-0 flex-row items-center justify-between gap-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="h-10 min-w-0 flex-1 !gap-1 rounded-lg px-1 transition-all hover:bg-zinc-950/[0.03] aria-expanded:bg-sidebar-accent group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 dark:hover:bg-white/[0.04] [@media(max-height:820px)]:h-9"
                size="lg"
              />
            }
          >
            <Avatar
              className="size-7.5 rounded-full shadow-sm transition-all group-data-[collapsible=icon]:size-8"
              name={user.name}
              size="sm"
              src={normalizedAvatar}
            />
            <div className="ms-1 grid min-w-0 flex-1 text-start text-xs leading-tight group-data-[collapsible=icon]:hidden">
              <span
                className="sidebar-user-name truncate font-medium text-[12.5px] text-foreground tracking-tight antialiased"
                title={user.name}
              >
                {user.name}
              </span>
              <span className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              className="sidebar-user-more ms-0.5 size-3 text-muted-foreground/45 transition-colors group-hover:text-foreground group-data-[collapsible=icon]:hidden"
              icon={MoreVerticalIcon}
              strokeWidth={1.5}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-1 py-1.5 text-left text-sm">
                  <Avatar
                    className="size-10 rounded-full shadow-sm"
                    name={user.name}
                    size="md"
                    src={normalizedAvatar}
                  />
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium text-[15px] tracking-tight antialiased">
                      {user.name}
                    </span>
                    <span className="truncate text-muted-foreground/80 text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onProfile}>
                <HugeiconsIcon
                  className="size-5"
                  icon={UserCircleIcon}
                  strokeWidth={1.5}
                />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFinances}>
                <HugeiconsIcon
                  className="size-5"
                  icon={Wallet01Icon}
                  strokeWidth={1.5}
                />
                Finances
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNotifications}>
                <HugeiconsIcon
                  className="size-5"
                  icon={Notification01Icon}
                  strokeWidth={1.5}
                />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSettings}>
                <HugeiconsIcon
                  className="size-5"
                  icon={Settings01Icon}
                  strokeWidth={1.5}
                />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
