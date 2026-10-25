import PanelLeftCloseIcon from "@hugeicons/core-free-icons/PanelLeftCloseIcon";
import PanelLeftOpenIcon from "@hugeicons/core-free-icons/PanelLeftOpenIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSidebar } from "@/components/ui/sidebar";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";

/**
 * The sidebar's slide-out toggle, at the header's left edge before the
 * search, in both sidebar states (and as the menu button on a phone). Same
 * outline family and stroke as the header's other tools. Hugeicons draws
 * "PanelLeftOpen" with the arrow pointing in (to close) and "PanelLeftClose"
 * pointing out (to open): the arrow shows where the sidebar will go.
 */
export function HeaderSidebarToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = isMobile || state === "collapsed";
  const label = isMobile
    ? "Menu"
    : collapsed
      ? "Déployer la barre latérale"
      : "Réduire la barre latérale";
  return (
    <ShortcutTooltip label={label} shortcut="⌘ B">
      <button
        aria-label={label}
        className="shell-sidebar-toggle"
        data-sidebar="trigger"
        data-state={state}
        onClick={toggleSidebar}
        type="button"
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={collapsed ? PanelLeftCloseIcon : PanelLeftOpenIcon}
          size={16}
          strokeWidth={1.5}
        />
      </button>
    </ShortcutTooltip>
  );
}
