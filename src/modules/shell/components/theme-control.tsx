import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ToolbarIcon } from "./toolbar-icon";
import { MOTION } from "@/design-system/motion";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";

export function ThemeControl({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <ShortcutTooltip label="Changer le thème" shortcut="D">
      <button
        aria-label="Changer le thème"
        aria-keyshortcuts="D"
        type="button"
        onClick={onToggle}
        className="shell-toolbar-control relative grid size-9 shrink-0 place-items-center overflow-hidden"
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.span
            key={dark ? "dark" : "light"}
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center"
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, filter: "blur(0px)" }
            }
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
            }
            transition={reduced ? { duration: MOTION.fast } : MOTION.icon}
          >
            <ToolbarIcon name={dark ? "moon" : "sun"} />
          </motion.span>
        </AnimatePresence>
      </button>
    </ShortcutTooltip>
  );
}
