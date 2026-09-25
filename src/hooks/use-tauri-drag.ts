import { getCurrentWindow } from "@tauri-apps/api/window";
import { type MouseEvent, type RefObject, useCallback, useEffect, useRef } from "react";
import { isTauriRuntime } from "@/services/browser-store";

const DRAG_BLOCKING_SELECTOR =
  "button, a, label, input, select, textarea, summary, [role=button], [role=slider], [role=combobox], [role=menuitem], [role=tab], [role=switch], [role=checkbox], [role=radio], [contenteditable=true], [data-no-drag]";

const DOUBLE_CLICK_DELAY_MS = 500;
const DOUBLE_CLICK_DISTANCE_PX = 6;

export function useTauriDrag<T extends HTMLElement = HTMLElement>(waitForMovement = false) {
  const ref = useRef<T>(null) as RefObject<T>;
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);
  const lastPressRef = useRef({ at: 0, x: 0, y: 0 });
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

      if (waitForMovement) {
        cleanupRef.current?.();
        const appWindow = getCurrentWindow();
        // Leave simple clicks in the webview so the OS click count remains
        // reliable. Enter the native drag loop only after an actual movement.
        if (e.detail === 2) {
          e.preventDefault();
          void appWindow.toggleMaximize().catch(console.error);
          return;
        }
        const { screenX, screenY } = e;
        const cleanup = () => {
          document.removeEventListener("mousemove", move);
          document.removeEventListener("mouseup", cleanup);
          window.removeEventListener("blur", cleanup);
          cleanupRef.current = null;
        };
        const move = (event: globalThis.MouseEvent) => {
          if (!(event.buttons & 1)) {
            cleanup();
            return;
          }
          if (Math.hypot(event.screenX - screenX, event.screenY - screenY) < 4) return;
          cleanup();
          void appWindow.startDragging().catch(console.error);
        };
        cleanupRef.current = cleanup;
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", cleanup);
        window.addEventListener("blur", cleanup);
        return;
      }

      // Native dragging can consume mouseup, so a React dblclick handler is not
      // reliable. Detect the second press before entering the native drag loop.
      const now = performance.now();
      const previousPress = lastPressRef.current;
      const isNearPreviousPress =
        Math.abs(e.clientX - previousPress.x) <= DOUBLE_CLICK_DISTANCE_PX &&
        Math.abs(e.clientY - previousPress.y) <= DOUBLE_CLICK_DISTANCE_PX;
      const isDoublePress =
        e.detail >= 2 ||
        (now - previousPress.at <= DOUBLE_CLICK_DELAY_MS &&
          isNearPreviousPress);

      lastPressRef.current = isDoublePress
        ? { at: 0, x: 0, y: 0 }
        : { at: now, x: e.clientX, y: e.clientY };

      e.preventDefault();
      const appWindow = getCurrentWindow();
      void (
        isDoublePress ? appWindow.toggleMaximize() : appWindow.startDragging()
      ).catch(() => undefined);
    },
    [isBlockedTarget, isDesktopRuntime, waitForMovement]
  );

  return { ref, handleMouseDown, isDesktopRuntime };
}
