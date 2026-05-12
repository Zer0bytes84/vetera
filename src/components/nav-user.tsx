"use client";

import {
  Logout01Icon,
  MoreVerticalCircle01Icon,
  Notification03Icon,
  Settings02Icon,
  UserCircle02Icon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type NavUserProps = {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  onProfile?: () => void;
  onSettings?: () => void;
  onFinances?: () => void;
  onNotifications?: () => void;
  onLogout?: () => void | Promise<void>;
};

export function NavUser({
  user,
  onProfile,
  onSettings,
  onFinances,
  onNotifications,
  onLogout,
}: NavUserProps) {
  const { isMobile } = useSidebar();
  const normalizedAvatar =
    typeof user.avatar === "string" &&
    user.avatar.trim() &&
    !["undefined", "null", "nan"].includes(user.avatar.trim().toLowerCase())
      ? user.avatar.trim()
      : undefined;
  const fallback = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 aria-expanded:bg-muted [@media(max-height:820px)]:h-10"
                size="lg"
              />
            }
          >
            <Avatar className="size-8 rounded-lg [@media(max-height:820px)]:size-7">
              <AvatarImage alt={user.name} src={normalizedAvatar} />
              <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:hidden [@media(max-height:820px)]:text-[13px]">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-foreground/70 text-xs [@media(max-height:820px)]:text-[11px]">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              className="ms-auto size-4 group-data-[collapsible=icon]:hidden [@media(max-height:820px)]:size-3.5"
              icon={MoreVerticalCircle01Icon}
              strokeWidth={2}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage alt={user.name} src={normalizedAvatar} />
                    <AvatarFallback className="rounded-lg">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onProfile}>
                <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFinances}>
                <HugeiconsIcon icon={WalletIcon} strokeWidth={2} />
                Finances
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNotifications}>
                <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSettings}>
                <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                Parametres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void onLogout?.()}>
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              Deconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
