import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import { isTauriRuntime } from "@/services/browser-store";

export function TitleBar() {
  const isDesktopRuntime = isTauriRuntime();
  const appWindow = isDesktopRuntime ? getCurrentWindow() : null;
  const { ref: titleRef, handleMouseDown } = useTauriDrag<HTMLDivElement>();

  if (!isDesktopRuntime) {
    return null;
  }

  return (
    <div
      className="flex h-9 select-none items-center px-4"
      onMouseDown={handleMouseDown}
      ref={titleRef}
    >
      <div className="flex items-center gap-2">
        <button
          className="group flex size-3 items-center justify-center rounded-full bg-[#ea580c] transition-all hover:bg-[#dc2626]"
          onClick={() => appWindow?.close()}
          type="button"
        >
          <svg
            className="text-black/60 opacity-0 group-hover:opacity-100"
            height="8"
            viewBox="0 0 12 12"
            width="8"
          >
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <button
          className="group flex size-3 items-center justify-center rounded-full bg-[#febc2e] transition-all hover:bg-[#f5a623]"
          onClick={() => appWindow?.minimize()}
          type="button"
        >
          <svg
            className="text-black/60 opacity-0 group-hover:opacity-100"
            height="8"
            viewBox="0 0 12 12"
            width="8"
          >
            <path
              d="M2 6h8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <button
          className="group flex size-3 items-center justify-center rounded-full bg-[#28c840] transition-all hover:bg-[#1db954]"
          onClick={() => appWindow?.toggleMaximize()}
          type="button"
        >
          <svg
            className="text-black/60 opacity-0 group-hover:opacity-100"
            height="8"
            viewBox="0 0 12 12"
            width="8"
          >
            <rect
              fill="none"
              height="8"
              rx="1"
              stroke="currentColor"
              strokeWidth="1.5"
              width="8"
              x="2"
              y="2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
