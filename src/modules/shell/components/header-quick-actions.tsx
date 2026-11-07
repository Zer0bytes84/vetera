import {
  CalendarPlus,
  ClipboardList,
  Plus,
  Search,
  Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PREMIUM_SHORTCUTS, type PremiumShortcut } from "@/lib/visual-style";
import "@/modules/shell/quick-actions.css";

const ICONS = {
  appointment: CalendarPlus,
  consultation: Stethoscope,
  patient: Search,
  care: ClipboardList,
} satisfies Record<PremiumShortcut, unknown>;

/** Only the shortcuts the shell already binds are shown beside their action. */
const KEYS: Partial<Record<PremiumShortcut, string>> = {
  appointment: "N",
  patient: "⌘ K",
};

/**
 * The quick actions, behind one "+" in the header, at the same place on every page. It replaces the floating button of the
 * sheet's corner: the same four actions in the same menu, which opens under the button.
 */
export function HeaderQuickActions({
  onAction,
  className,
}: {
  onAction: (action: PremiumShortcut) => void;
  /** The look of the header's own round buttons, which differs between the two skins of the shell. */
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Actions rapides"
        className={cn("header-quick-actions", className)}
        data-no-drag
      >
        <Plus
          aria-hidden="true"
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="quick-actions-menu w-80"
        side="bottom"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="quick-actions-menu-label">
            Actions rapides
          </DropdownMenuLabel>
          {PREMIUM_SHORTCUTS.map((shortcut) => {
            const Icon = ICONS[shortcut.id];
            return (
              <DropdownMenuItem
                className="quick-actions-menu-item"
                data-tone={shortcut.tone}
                key={shortcut.id}
                onClick={() => onAction(shortcut.id)}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} />
                <span>{shortcut.label}</span>
                {KEYS[shortcut.id] ? (
                  <DropdownMenuShortcut className="quick-actions-menu-key">
                    {KEYS[shortcut.id]}
                  </DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
