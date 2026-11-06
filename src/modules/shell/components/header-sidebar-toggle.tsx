import { useSidebar } from "@/components/ui/sidebar";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";

/**
 * The sidebar's slide-out glyph, drawn for the header (5 November 2026): a
 * window with its side pane, at the tools' 18 px and 1.5 stroke. The pane is
 * tinted while the sidebar is open and empty when it is folded, and the
 * chevron points where the sidebar will go, so the state reads at a glance.
 */
function SidebarGlyph({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" focusable="false" height={18} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 24 24" width={18}>
      {open ? <path d="M3 8a3.5 3.5 0 0 1 3.5-3.5H9.5v15H6.5A3.5 3.5 0 0 1 3 16z" fill="currentColor" fillOpacity={0.18} stroke="none" /> : null}
      <rect height={15} rx={3.5} width={18} x={3} y={4.5} />
      <path d="M9.5 4.5v15" />
      <path d={open ? "M16 9.5 13.5 12l2.5 2.5" : "M14 9.5l2.5 2.5-2.5 2.5"} />
    </svg>
  );
}

/**
 * The sidebar's slide-out toggle, at the header's left edge before the
 * search, in both sidebar states (and as the menu button on a phone). A thin
 * rule after it sets the toggle apart from the search field.
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
    <>
      <ShortcutTooltip label={label} shortcut="⌘ B">
        <button
          aria-label={label}
          className="shell-sidebar-toggle"
          data-sidebar="trigger"
          data-state={state}
          onClick={toggleSidebar}
          type="button"
        >
          <SidebarGlyph open={!collapsed} />
        </button>
      </ShortcutTooltip>
      <span aria-hidden="true" className="shell-header-divider" />
    </>
  );
}
