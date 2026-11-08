import {
  Building01Icon,
  Logout01Icon,
  Notification01Icon,
  Settings01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@/lib/hugeicons";
import { HugeiconsIcon } from "@hugeicons/react";
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

/**
 * The signed-in account at the header's right end, as in the usual software:
 * the avatar confirms at a glance whose session this is, and opens every
 * account action (those of the former sidebar card and settings menu).
 */
export function AccountMenu({
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
}: {
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
}) {
  const src = avatarUrl?.trim() || undefined;
  return (
    <>
    {/* The same thin rule as between the sidebar button and the search, between the icons and the account. */}
    <span aria-hidden="true" className="shell-header-divider" />
    <DropdownMenu>
      <ShortcutTooltip label={`${name} · ${role}`}>
        <DropdownMenuTrigger
          aria-label={`Ouvrir le menu du compte de ${name}`}
          className="shell-account-trigger"
        >
          <Avatar className="shell-account-avatar" name={name} size="sm" src={src} />
        </DropdownMenuTrigger>
      </ShortcutTooltip>
      <DropdownMenuContent align="end" className="shell-account-menu w-64" sideOffset={8}>
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
    </>
  );
}
