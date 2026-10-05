import type { SVGProps } from "react";

type ToolbarIconName = "search" | "assistant" | "notifications" | "settings" | "sun" | "moon";

/** Filled silhouettes for the compact header controls. */
export function ToolbarIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: ToolbarIconName }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {name === "search" && (
        <path fillRule="evenodd" clipRule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.5 13.5l4.8 4.8a1.5 1.5 0 0 0 2.12-2.12l-4.8-4.8A7.5 7.5 0 0 0 10.5 3Zm-4.75 7.5a4.75 4.75 0 1 1 9.5 0 4.75 4.75 0 0 1-9.5 0Z" />
      )}
      {name === "assistant" && (
        <path d="m11 2 2.6 6.4L20 11l-6.4 2.6L11 20l-2.6-6.4L2 11l6.4-2.6L11 2Zm8 13 1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15Z" />
      )}
      {name === "notifications" && (
        <path d="M10.5 3a1.5 1.5 0 0 1 3 0v.7A6 6 0 0 1 18 9.5V13c0 1.6.7 3 1.8 4.1a1.1 1.1 0 0 1-.8 1.9H5a1.1 1.1 0 0 1-.8-1.9A5.8 5.8 0 0 0 6 13V9.5a6 6 0 0 1 4.5-5.8V3ZM9 20h6a3 3 0 0 1-6 0Z" />
      )}
      {name === "settings" && (
        <path fillRule="evenodd" clipRule="evenodd" d="m9.5 2-.6 2.5-1.5.9L5 4.7 2.5 9l1.8 1.8v2.4L2.5 15 5 19.3l2.4-.7 1.5.9.6 2.5h5l.6-2.5 1.5-.9 2.4.7 2.5-4.3-1.8-1.8v-2.4L21.5 9 19 4.7l-2.4.7-1.5-.9-.6-2.5h-5ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
      )}
      {name === "moon" && (
        <path d="M20.8 14.2A9 9 0 0 1 9.8 3.1a.8.8 0 0 0-1.1-.9A10 10 0 1 0 21.7 15.3a.8.8 0 0 0-.9-1.1Z" />
      )}
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="5" />
          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
        </>
      )}
    </svg>
  );
}
