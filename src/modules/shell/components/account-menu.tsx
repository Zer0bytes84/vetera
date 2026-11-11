import {
  Building01Icon,
  Logout01Icon,
  Notification01Icon,
  Settings01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronsUpDown } from "lucide-react";
import Avatar from "@/components/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";

export type AccountMenuProps = {
  avatarUrl?: string | null;
  email: string;
  name: string;
  role: string;
  unreadCount: number;
  onProfile: () => void;
  /** Opens Paramètres on its « Mon cabinet » section. */
  onClinic: () => void;
  onFinances: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  onLogout: () => Promise<void> | void;
};

/**
 * The signed-in account at the bottom of the sidebar, Catalyst style: the
 * avatar, the name and the email on a quiet row, a chevron, and the full
 * account menu opening upwards (profile, clinic, notifications, finances,
 * settings, sign out). Moving it out of the header leaves the
 * header to the page: breadcrumb, search and the working actions.
 */
export function AccountSidebarFooter({
  collapsed = false,
  avatarUrl,
  email,
  name,
  role,
  unreadCount,
  onProfile,
  onClinic,
  onFinances,
  onNotifications,
  onSettings,
  onLogout,
}: AccountMenuProps & { collapsed?: boolean }) {
  const src = avatarUrl?.trim() || undefined;
  return (
    <DropdownMenu>
      <ShortcutTooltip label={`${name} · ${role}`}>
        {collapsed ? (
          <DropdownMenuTrigger
            aria-label={`Ouvrir le menu du compte de ${name}`}
            className="flex size-11 items-center justify-center rounded-xl outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Avatar className="size-8 shrink-0" name={name} size="sm" src={src} />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            aria-label={`Ouvrir le menu du compte de ${name}`}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Avatar className="size-9 shrink-0" name={name} size="sm" src={src} />
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-semibold text-sm leading-5 text-sidebar-foreground">
                {name}
              </span>
              <span className="truncate text-[13px] leading-5 text-sidebar-foreground/60">
                {email}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/50" />
          </DropdownMenuTrigger>
        )}
      </ShortcutTooltip>
      <DropdownMenuContent
        align="start"
        className="shell-account-menu w-64"
        side="top"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="shell-account-identity">
            <Avatar className="size-8 shrink-0" name={name} size="sm" src={src} />
            <span className="grid min-w-0">
              <span className="shell-account-name">{name}</span>
              <span className="shell-account-detail">{role}</span>
              <span className="shell-account-detail">{email}</span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="shell-account-item" onClick={onProfile}>
            <HugeiconsIcon icon={UserCircleIcon} strokeWidth={1.5} />
            Mon profil
          </DropdownMenuItem>
          <DropdownMenuItem className="shell-account-item" onClick={onClinic}>
            <HugeiconsIcon icon={Building01Icon} strokeWidth={1.5} />
            Mon cabinet
          </DropdownMenuItem>
          <DropdownMenuItem className="shell-account-item" onClick={onNotifications}>
            <HugeiconsIcon icon={Notification01Icon} strokeWidth={1.5} />
            Notifications
            {unreadCount > 0 ? (
              <DropdownMenuShortcut className="shell-account-count">{unreadCount}</DropdownMenuShortcut>
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem className="shell-account-item" onClick={onFinances}>
            <HugeiconsIcon icon={Wallet01Icon} strokeWidth={1.5} />
            Finances
          </DropdownMenuItem>
          <DropdownMenuItem className="shell-account-item" onClick={onSettings}>
            <HugeiconsIcon icon={Settings01Icon} strokeWidth={1.5} />
            Paramètres
            <DropdownMenuShortcut>⌘ ,</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="shell-account-item"
          onClick={() => void onLogout()}
          variant="destructive"
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={1.5} />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
