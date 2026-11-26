import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ShortcutTooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>
        {label}
        {shortcut && (
          <kbd className="t-12 ml-2 rounded border border-current/25 px-1 font-mono">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
