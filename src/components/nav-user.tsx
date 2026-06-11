"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Notification01Icon,
  UserCircleIcon,
  Wallet01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      <SidebarMenuItem className="flex flex-row items-center justify-between w-full gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="flex-1 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!p-0 aria-expanded:bg-sidebar-accent [@media(max-height:820px)]:h-9 h-10 px-1.5 hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.04] rounded-lg transition-all"
                size="lg"
              />
            }
          >
            <Avatar className="size-8 rounded-full shadow-sm border border-border/50 transition-all group-data-[collapsible=icon]:size-8">
              <AvatarImage alt={user.name} src={normalizedAvatar} />
              <AvatarFallback className="rounded-full bg-primary/10 text-primary text-[11px] font-medium">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 min-w-0 ms-1.5 text-start text-xs group-data-[collapsible=icon]:hidden leading-tight">
              <span className="truncate font-medium tracking-tight text-[13px] text-foreground antialiased">{user.name}</span>
              <span className="truncate text-[10px] text-muted-foreground/70 mt-0.5">{user.email}</span>
            </div>
            <HugeiconsIcon
              icon={MoreVerticalIcon}
              strokeWidth={1.5}
              className="ms-auto size-3.5 text-muted-foreground/45 transition-colors group-hover:text-foreground group-data-[collapsible=icon]:hidden"
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

        {/* Settings Button on the right of More dots */}
        <div className="group-data-[collapsible=icon]:hidden flex items-center">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSettings?.();
            }}
            className="size-7 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-zinc-950/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            size="icon-sm"
            variant="ghost"
            title="Paramètres"
          >
            <HugeiconsIcon icon={Settings01Icon} className="size-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
