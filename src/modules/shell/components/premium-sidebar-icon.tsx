import { Squares2X2Icon } from "@heroicons/react/20/solid";
import type { View } from "@/types";
import { sidebarViewIcons } from "./sidebar-icon";

/**
 * The Premium sidebar draws the same solid glyphs as Clean (see
 * sidebar-icon): one icon set for the whole application.
 */
export function PremiumSidebarIcon({
  view,
  className,
  size = 20,
}: {
  view: View;
  className?: string;
  size?: number;
}) {
  const Icon = sidebarViewIcons[view] ?? Squares2X2Icon;
  return <Icon aria-hidden="true" className={className} height={size} width={size} />;
}
