import { getCurrentWindow } from "@tauri-apps/api/window";
import { type MouseEvent, type RefObject, useCallback, useRef } from "react";
import { isTauriRuntime } from "@/services/browser-store";

const DRAG_BLOCKING_SELECTOR =
  "button, a, input, select, textarea, [role=button], [role=slider], [role=combobox], [contenteditable=true], [data-no-drag]";

export function useTauriDrag<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null) as RefObject<T>;
  const isDesktopRuntime = isTauriRuntime();

  const isBlockedTarget = useCallback(
    (event: MouseEvent) =>
      (event.target as HTMLElement).closest(DRAG_BLOCKING_SELECTOR) !== null,
    []
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isDesktopRuntime || e.button !== 0) {
        return;
      }
      if (isBlockedTarget(e)) {
        return;
      }

      // Native dragging can consume mouseup, so dblclick is not reliable.
      // Handle the second press before entering the native drag loop.
      e.preventDefault();
      const appWindow = getCurrentWindow();
      void (
        e.detail === 2 ? appWindow.toggleMaximize() : appWindow.startDragging()
      ).catch(() => undefined);
    },
    [isBlockedTarget, isDesktopRuntime]
  );

  return { ref, handleMouseDown, isDesktopRuntime };
}
