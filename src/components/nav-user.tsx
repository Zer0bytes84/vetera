"use client";

import {
  MoreVerticalIcon,
  Notification01Icon,
  Settings01Icon,
  UserCircleIcon,
  Wallet01Icon,
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
  onFinances?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
};

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
  const fallback = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex w-full flex-row items-center justify-between gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 h-10 flex-1 rounded-lg px-1.5 transition-all hover:bg-zinc-950/[0.03] aria-expanded:bg-sidebar-accent dark:hover:bg-white/[0.04] [@media(max-height:820px)]:h-9"
                size="lg"
              />
            }
          >
            <Avatar className="size-8 rounded-full border border-border/50 shadow-sm transition-all group-data-[collapsible=icon]:size-8">
              <AvatarImage alt={user.name} src={normalizedAvatar} />
              <AvatarFallback className="rounded-full bg-primary/10 font-medium text-[11px] text-primary">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="ms-1.5 grid min-w-0 flex-1 text-start text-xs leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium text-[13px] text-foreground tracking-tight antialiased">
                {user.name}
              </span>
              <span className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              className="ms-auto size-3.5 text-muted-foreground/45 transition-colors group-hover:text-foreground group-data-[collapsible=icon]:hidden"
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
                  <Avatar className="size-10 rounded-full border border-border/50 shadow-sm">
                    <AvatarImage alt={user.name} src={normalizedAvatar} />
                    <AvatarFallback className="rounded-full bg-primary/10 font-medium text-primary text-sm">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
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
