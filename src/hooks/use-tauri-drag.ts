import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useRef,
} from "react";
import { isTauriRuntime } from "@/services/browser-store";

const DRAG_BLOCKING_SELECTOR =
  "button, a, input, select, textarea, [role=button], [data-no-drag]";

export function useTauriDrag<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null) as RefObject<T>;
  const isDesktopRuntime = isTauriRuntime();

  const isBlockedTarget = useCallback(
    (event: MouseEvent) =>
      (event.target as HTMLElement).closest(DRAG_BLOCKING_SELECTOR) !== null,
    []
  );

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isDesktopRuntime || e.button !== 0 || e.detail !== 1) {
      return;
    }
    if (isBlockedTarget(e)) {
      return;
    }

    void getCurrentWindow()
      .startDragging()
      .catch(() => undefined);
  }, [isBlockedTarget, isDesktopRuntime]);

  const handleDoubleClick = useCallback((e: MouseEvent) => {
    if (!isDesktopRuntime || isBlockedTarget(e)) {
      return;
    }

    void getCurrentWindow()
      .toggleMaximize()
      .catch(() => undefined);
  }, [isBlockedTarget, isDesktopRuntime]);

  return { ref, handleDoubleClick, handleMouseDown, isDesktopRuntime };
}
