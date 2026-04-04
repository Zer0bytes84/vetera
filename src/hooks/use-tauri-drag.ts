import { useCallback, useRef, type RefObject } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { isTauriRuntime } from "@/services/browser-store"

export function useTauriDrag<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null) as RefObject<T>

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isTauriRuntime()) return
    if (e.button !== 0) return

    const target = e.target as HTMLElement
    if (
      target.closest(
        "button, a, input, select, textarea, [role=button], [data-no-drag]"
      )
    ) {
      return
    }

    const appWindow = getCurrentWindow()

    if (e.detail === 2) {
      appWindow.toggleMaximize()
    } else {
      appWindow.startDragging()
    }
  }, [])

  return { ref, handleMouseDown }
}
