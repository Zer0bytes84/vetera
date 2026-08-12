"use client";

import {
  ArrowRight01Icon,
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
  onFinances?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
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
                aria-label={`Ouvrir le menu du compte de ${user.name}`}
                className="!gap-2 group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!rounded-xl group-data-[collapsible=icon]:!p-0 h-12 min-w-0 flex-1 rounded-[14px] px-2 transition-colors hover:bg-sidebar-accent/75 aria-expanded:bg-sidebar-accent [@media(max-height:820px)]:h-11"
                size="lg"
                tooltip={`Menu du compte de ${user.name}`}
              />
            }
          >
            <Avatar
              className="size-8 rounded-full ring-1 ring-sidebar-border/70 transition-all group-data-[collapsible=icon]:size-8"
              name={user.name}
              size="sm"
              src={normalizedAvatar}
            />
            <div className="grid min-w-0 flex-1 text-start text-xs leading-tight group-data-[collapsible=icon]:hidden">
              <span
                className="sidebar-user-name truncate font-medium text-[13px] text-sidebar-foreground tracking-[-0.015em] antialiased"
                title={user.name}
              >
                {user.name}
              </span>
              <span className="mt-0.5 truncate text-[10.5px] text-sidebar-foreground/55">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              aria-hidden="true"
              className="sidebar-user-more ms-1 size-4 shrink-0 text-sidebar-foreground/55 transition-colors group-hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
              icon={ArrowRight01Icon}
              strokeWidth={1.5}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 rounded-[16px] border-border/80 p-1.5 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.32)] dark:shadow-[0_22px_52px_-26px_rgba(0,0,0,0.7)]"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                  <Avatar
                    className="size-10 rounded-full ring-1 ring-border/70"
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
              <DropdownMenuItem
                className="h-9 rounded-[10px]"
                onClick={onProfile}
              >
                <HugeiconsIcon
                  className="size-5"
                  icon={UserCircleIcon}
                  strokeWidth={1.5}
                />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-9 rounded-[10px]"
                onClick={onFinances}
              >
                <HugeiconsIcon
                  className="size-5"
                  icon={Wallet01Icon}
                  strokeWidth={1.5}
                />
                Finances
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-9 rounded-[10px]"
                onClick={onNotifications}
              >
                <HugeiconsIcon
                  className="size-5"
                  icon={Notification01Icon}
                  strokeWidth={1.5}
                />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-9 rounded-[10px]"
                onClick={onSettings}
              >
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
