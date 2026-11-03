import type { SVGProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon";
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon";
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon";
import { Search01Icon, Sun03Icon, Moon02Icon } from "@/lib/hugeicons";

type ToolbarIconName = "search" | "assistant" | "notifications" | "settings" | "sun" | "moon";
const toolbarGlyphs = {
  search: Search01Icon,
  assistant: AiMagicIcon,
  notifications: Notification03Icon,
  settings: FilterHorizontalIcon,
  sun: Sun03Icon,
  moon: Moon02Icon,
};

/** One consistent outline family for every header action and chrome mode. */
export function ToolbarIcon({ name, strokeWidth = 1.5, size = 18, ...props }: Omit<SVGProps<SVGSVGElement>, "name"> & { name: ToolbarIconName; size?: number }) {
  return <HugeiconsIcon icon={toolbarGlyphs[name]} size={size} strokeWidth={Number(strokeWidth)} aria-hidden="true" focusable="false" {...props} />;
}
