import { getCurrentWindow } from "@tauri-apps/api/window"
import { useTauriDrag } from "@/hooks/use-tauri-drag"
import { isTauriRuntime } from "@/services/browser-store"

export function TitleBar() {
  const isDesktopRuntime = isTauriRuntime()
  const appWindow = isDesktopRuntime ? getCurrentWindow() : null
  const { ref: titleRef, handleMouseDown } = useTauriDrag<HTMLDivElement>()

  if (!isDesktopRuntime) {
    return null
  }

  return (
    <div
      ref={titleRef}
      onMouseDown={handleMouseDown}
      className="flex h-9 items-center px-4 select-none"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => appWindow?.close()}
          className="group flex size-3 items-center justify-center rounded-full bg-[#ff5f57] transition-all hover:bg-[#ff3b30]"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            className="text-black/60 opacity-0 group-hover:opacity-100"
          >
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => appWindow?.minimize()}
          className="group flex size-3 items-center justify-center rounded-full bg-[#febc2e] transition-all hover:bg-[#f5a623]"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            className="text-black/60 opacity-0 group-hover:opacity-100"
          >
            <path
              d="M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => appWindow?.toggleMaximize()}
          className="group flex size-3 items-center justify-center rounded-full bg-[#28c840] transition-all hover:bg-[#1db954]"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            className="text-black/60 opacity-0 group-hover:opacity-100"
          >
            <rect
              x="2"
              y="2"
              width="8"
              height="8"
              rx="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
