"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Notification01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
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
};

export function NavUser({
  user,
  onProfile,
  onFinances,
  onNotifications,
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
                className="group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 aria-expanded:bg-sidebar-accent [@media(max-height:820px)]:h-10 h-11 px-2.5 hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.04] rounded-lg transition-all"
                size="lg"
              />
            }
          >
            <Avatar className="size-9 rounded-full shadow-sm [@media(max-height:820px)]:size-8 border border-border/50 transition-all group-data-[collapsible=icon]:size-8">
              <AvatarImage alt={user.name} src={normalizedAvatar} />
              <AvatarFallback className="rounded-full bg-primary/10 text-primary text-sm font-medium">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 ms-2 text-start text-sm group-data-[collapsible=icon]:hidden [@media(max-height:820px)]:text-[13px] leading-tight">
              <span className="truncate font-medium tracking-tight text-[14px] antialiased">{user.name}</span>
              <span className="truncate text-[11px] text-muted-foreground/80 mt-0.5">{user.email}</span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalIcon}
              strokeWidth={1.5}
              className="ms-auto size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground group-data-[collapsible=icon]:hidden [@media(max-height:820px)]:size-3.5"
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
                  <Avatar className="size-10 rounded-full shadow-sm border border-border/50">
                    <AvatarImage alt={user.name} src={normalizedAvatar} />
                    <AvatarFallback className="rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium tracking-tight text-[15px] antialiased">{user.name}</span>
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
                <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} className="size-5" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFinances}>
                <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.5} className="size-5" />
                Finances
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNotifications}>
                <HugeiconsIcon icon={Notification01Icon} strokeWidth={1.5} className="size-5" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
