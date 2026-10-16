import { ToolbarIcon } from "./toolbar-icon";
import { ShortcutTooltip } from "@/design-system/patterns/shortcut-tooltip";
import { useCircularTransition } from "@/hooks/use-circular-transition";

export function ThemeControl({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: () => void;
}) {
  const { startTransition } = useCircularTransition();
  return (
    <ShortcutTooltip label="Changer le thème" shortcut="D">
      <button
        aria-label="Changer le thème"
        aria-keyshortcuts="D"
        type="button"
        onClick={(event) => {
          if (event.detail === 0) {
            onToggle();
            return;
          }
          startTransition({ x: event.clientX, y: event.clientY }, onToggle);
        }}
        className="shell-toolbar-control relative grid size-9 shrink-0 place-items-center overflow-hidden"
      >
        <ToolbarIcon name={dark ? "moon" : "sun"} />
      </button>
    </ShortcutTooltip>
  );
}
