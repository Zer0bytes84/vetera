import type { SVGProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { navigationItems } from "@/app/config/navigation";
import type { View } from "@/types";
import { ToolbarIcon } from "./toolbar-icon";

export function SidebarIcon({ view, ...props }: Omit<SVGProps<SVGSVGElement>, "name"> & { view: View }) {
  if (view === "parametres") return <ToolbarIcon name="settings" {...props} />;
  if (view === "assistant") return <ToolbarIcon name="assistant" {...props} />;
  const navigationView = view === "patient_detail" ? "patients" : view === "finances_analytics" ? "finances" : view;
  const item = navigationItems.find((entry) => entry.view === navigationView) ?? navigationItems[0];
  return <HugeiconsIcon {...props} icon={item.icon} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}
