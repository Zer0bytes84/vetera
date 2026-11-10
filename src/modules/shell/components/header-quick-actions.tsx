import {
  CalendarPlus,
  ClipboardList,
  FilePlus,
  Package,
  Plus,
  Receipt,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PREMIUM_SHORTCUTS, type PremiumShortcut } from "@/lib/visual-style";
import "@/modules/shell/quick-actions.css";

const ICONS = {
  appointment: CalendarPlus,
  patient: UserPlus,
  consultation: Stethoscope,
  care: ClipboardList,
  document: FilePlus,
  product: Package,
  invoice: Receipt,
} satisfies Record<PremiumShortcut, unknown>;

/**
 * The quick actions, behind one "+" in the header, at the same place on every page: one row of creations in the order of the
 * patient's path through the practice. It opens as a floating glass bar centred under the button.
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
    <DropdownMenu orientation="horizontal">
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
        align="center"
        aria-label="Actions rapides"
        className="quick-actions-menu"
        collisionPadding={16}
        side="bottom"
        sideOffset={10}
      >
        {PREMIUM_SHORTCUTS.map((shortcut) => {
          const Icon = ICONS[shortcut.id];
          return (
            <DropdownMenuItem
              className="quick-actions-menu-item"
              key={shortcut.id}
              onClick={() => onAction(shortcut.id)}
            >
              <Icon aria-hidden="true" strokeWidth={1.5} />
              <span>{shortcut.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
