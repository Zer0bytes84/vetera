import { ToolbarIcon } from "./toolbar-icon";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The search field in the header, at the left beside the sidebar toggle
 * (moved from the sidebar on 5 November 2026). It is only the container: a
 * click opens the same command palette as ⌘K / Ctrl+K, with the same engine
 * and results. `open` mirrors the palette, so the field reads as active while
 * the user types in it. Below 560 px of header it gives way to the search
 * icon among the tools (shell-toolbar.css).
 */
export function HeaderSearch({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  return (
    <div className="shell-header-search-slot">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        aria-label={`Rechercher (${isMac ? "⌘K" : "Ctrl+K"})`}
        className="shell-header-search-field"
        onClick={onOpen}
        type="button"
      >
        <ToolbarIcon className="shell-header-search-icon" name="search" size={16} />
        <span className="shell-header-search-placeholder">Rechercher un patient, une page…</span>
        <kbd className="shell-header-search-key">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
    </div>
  );
}
