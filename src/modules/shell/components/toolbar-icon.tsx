import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SVGProps } from "react";
import { Moon02Icon, Search01Icon, Sun03Icon } from "@/lib/hugeicons";

type ToolbarIconName =
  | "search"
  | "assistant"
  | "notifications"
  | "settings"
  | "sun"
  | "moon";
const toolbarGlyphs = {
  search: Search01Icon,
  assistant: AiMagicIcon,
  notifications: Notification03Icon,
  settings: FilterHorizontalIcon,
  sun: Sun03Icon,
  moon: Moon02Icon,
};

/** One consistent outline family for every header action and chrome mode. */
export function ToolbarIcon({
  name,
  strokeWidth = 1.5,
  size = 18,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: ToolbarIconName;
  size?: number;
}) {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      focusable="false"
      icon={toolbarGlyphs[name]}
      size={size}
      strokeWidth={Number(strokeWidth)}
      {...props}
    />
  );
}
