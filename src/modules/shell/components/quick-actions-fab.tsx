import { CalendarPlus, ClipboardList, Plus, Search, Stethoscope } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const MODE_KEY = "baitari.quick-actions.retract";

function readRetract() {
  try {
    return localStorage.getItem(MODE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * The quick actions, behind one "+" floating at the sheet's bottom right.
 * Nothing shows until it is pressed. It stays put by default; it can instead
 * step aside while the page scrolls down and come back on the way up.
 */
export function QuickActionsFab({
  onAction,
  scrollRef,
}: {
  onAction: (action: PremiumShortcut) => void;
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [retract, setRetract] = useState(readRetract);
  const [hidden, setHidden] = useState(false);
  const lastTop = useRef(0);

  useEffect(() => {
    const panel = scrollRef.current;
    if (!panel || !retract) return;
    lastTop.current = panel.scrollTop;
    const onScroll = () => {
      const top = panel.scrollTop;
      const delta = top - lastTop.current;
      // A few pixels of hysteresis, so a trackpad's jitter does not flicker it.
      if (Math.abs(delta) < 6) return;
      const atEnd = top + panel.clientHeight >= panel.scrollHeight - 4;
      setHidden(delta > 0 && top > 48 && !atEnd);
      lastTop.current = top;
    };
    panel.addEventListener("scroll", onScroll, { passive: true });
    return () => panel.removeEventListener("scroll", onScroll);
  }, [retract, scrollRef]);

  const toggleRetract = (next: boolean) => {
    setRetract(next);
    setHidden(false);
    try {
      localStorage.setItem(MODE_KEY, String(next));
    } catch {
      /* The choice simply lasts for this session. */
    }
  };

  return (
    <div
      className="quick-actions-fab"
      data-hidden={retract && hidden && !open ? "true" : undefined}
      data-no-drag
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label="Actions rapides"
          className="quick-actions-fab-button"
          data-open={open ? "true" : undefined}
        >
          <Plus aria-hidden="true" className="quick-actions-fab-glyph" strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="quick-actions-menu w-64"
          side="top"
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
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={retract}
            className="quick-actions-menu-option"
            onCheckedChange={toggleRetract}
          >
            Masquer pendant le défilement
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
