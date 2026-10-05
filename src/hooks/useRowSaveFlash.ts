import { useEffect } from "react";

/** A write acknowledgement belongs to the visible row, not another spinner. */
export function useRowSaveFlash() {
  useEffect(() => {
    const running = new Map<Element, Animation>();
    const frames = new Set<number>();
    const flash = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      const frame = requestAnimationFrame(() => {
        frames.delete(frame);
        document
          .querySelectorAll<HTMLElement>("[data-row-id]")
          .forEach((row) => {
            if (row.dataset.rowId !== id) return;
            running.get(row)?.cancel();
            const animation = row.animate(
              [
                {
                  backgroundColor:
                    "color-mix(in srgb, var(--primary) 8%, transparent)",
                },
                { backgroundColor: getComputedStyle(row).backgroundColor },
              ],
              { duration: 1200, easing: "cubic-bezier(0.2, 0, 0, 1)" }
            );
            running.set(row, animation);
            animation.onfinish = () => {
              running.delete(row);
            };
          });
      });
      frames.add(frame);
    };
    window.addEventListener("sqlite-row-saved", flash);
    return () => {
      window.removeEventListener("sqlite-row-saved", flash);
      frames.forEach((frame) => cancelAnimationFrame(frame));
      running.forEach((animation) => animation.cancel());
    };
  }, []);
}
