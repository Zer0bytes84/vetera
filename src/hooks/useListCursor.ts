import { useEffect, useState } from "react";

/**
 * One cursor for mouse and keyboard over a list, as in Linear.
 * Rows carry `data-list-row` and `data-row-id`; the current row gets
 * `data-current`. Hovering a row makes it current, the arrows move from
 * there, Enter opens it, Space peeks it and Escape clears it. J stays the
 * shell's assistant shortcut, so Linear's J/K are not used here. The last
 * opened row is current again when the list comes back.
 * Returns a callback ref for the list container, which may mount late.
 */
/** Index of the row the arrow keys land on; -1 when nothing is current. */
export function nextCursorIndex(
  key: "ArrowDown" | "ArrowUp",
  index: number,
  length: number
) {
  if (key === "ArrowDown") return Math.min(length - 1, index + 1);
  return index < 0 ? length - 1 : Math.max(0, index - 1);
}

export function useListCursor({
  storageKey,
  onPeek,
}: {
  /** Session key remembering the last opened row. */
  storageKey: string;
  /** Space on the current row; omitted, Space keeps its default. */
  onPeek?: (rowId: string) => void;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!container) return;
    const memoryKey = `baitari:list-cursor:${storageKey}`;
    const rows = () =>
      Array.from(container.querySelectorAll<HTMLElement>("[data-list-row]"));
    const current = () =>
      container.querySelector<HTMLElement>("[data-list-row][data-current]");
    const setCurrent = (row: HTMLElement | null, reveal = false) => {
      const previous = current();
      if (previous === row) return;
      previous?.removeAttribute("data-current");
      if (!row) return;
      row.setAttribute("data-current", "");
      if (reveal) row.scrollIntoView({ block: "nearest" });
    };
    const remember = (row: HTMLElement | null) => {
      const id = row?.dataset.rowId;
      if (!id) return;
      try {
        sessionStorage.setItem(memoryKey, id);
      } catch {
        // Private storage may be unavailable; the cursor still works.
      }
    };
    // The remembered row comes back once, when the list first shows it.
    let settled = false;
    const restore = () => {
      if (settled) return;
      let id: string | null = null;
      try {
        id = sessionStorage.getItem(memoryKey);
      } catch {
        return;
      }
      if (!id || current()) return;
      const row = rows().find((candidate) => candidate.dataset.rowId === id);
      if (row) {
        settled = true;
        setCurrent(row, true);
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      settled = true;
      const row = (event.target as Element).closest<HTMLElement>("[data-list-row]");
      if (row && container.contains(row)) setCurrent(row);
    };
    const onPointerLeave = () => setCurrent(null);
    const onClick = (event: MouseEvent) => {
      remember((event.target as Element).closest<HTMLElement>("[data-list-row]"));
    };
    const onFocusIn = (event: FocusEvent) => {
      const row = (event.target as Element).closest<HTMLElement>("[data-list-row]");
      if (row && container.contains(row)) setCurrent(row);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!container.isConnected || container.offsetParent === null) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) return;
      if (document.querySelector("[role='dialog'], [role='menu'], [role='listbox']")) return;
      const list = rows();
      if (!list.length) return;
      settled = true;
      const row = current();
      const index = row ? list.indexOf(row) : -1;
      const key = event.key;
      // Enter and Space act on the cursor unless another control has focus.
      const free = !target || target === document.body || target.hasAttribute("data-list-row");
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        setCurrent(list[nextCursorIndex(key, index, list.length)], true);
      } else if (key === "Enter" && row && free) {
        event.preventDefault();
        remember(row);
        (row.querySelector<HTMLElement>("[data-row-open]") ?? row).click();
      } else if (key === " " && row && onPeek && free) {
        event.preventDefault();
        if (row.dataset.rowId) onPeek(row.dataset.rowId);
      } else if (key === "Escape" && row) {
        setCurrent(null);
      }
    };

    restore();
    const observer = new MutationObserver(restore);
    observer.observe(container, { childList: true, subtree: true });
    container.addEventListener("pointerover", onPointerOver);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("click", onClick, true);
    container.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      container.removeEventListener("pointerover", onPointerOver);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("click", onClick, true);
      container.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [container, storageKey, onPeek]);
  return setContainer;
}
