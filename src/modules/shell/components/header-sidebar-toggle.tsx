import { useSidebar } from "@/components/ui/sidebar";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";

/**
 * The sidebar's panel glyph, in the manner of Claude Desktop and Codex: a rounded
 * window with its side pane marked by a rule. The pane is tinted while the sidebar
 * is open and empty when it is folded, so the state reads at a glance. Same 24 px
 * grid and 1.5 stroke as the other header icons; the size comes from the header.
 */
function SidebarGlyph({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" height={18} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24" width={18}>
      {open ? <path d="M3 8.5A4 4 0 0 1 7 4.5h2.5v15H7a4 4 0 0 1-4-4z" fill="currentColor" fillOpacity={0.22} stroke="none" /> : null}
      <rect height={15} rx={4} width={18} x={3} y={4.5} />
      <path d="M9.5 4.5v15" />
    </svg>
  );
}

/**
 * The sidebar's slide-out toggle, at the header's left edge before the
 * search, in both sidebar states (and as the menu button on a phone). It is a
 * `topIcon` like the tools on the right, so it takes their button in every skin.
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
          className="topIcon shell-sidebar-toggle"
          data-sidebar="trigger"
          data-state={state}
          onClick={toggleSidebar}
          type="button"
        >
          <SidebarGlyph open={!collapsed} />
        </button>
      </ShortcutTooltip>
  );
}
