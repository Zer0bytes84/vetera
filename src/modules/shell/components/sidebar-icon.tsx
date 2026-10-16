import type { SVGProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { navigationItems } from "@/app/config/navigation";
import type { View } from "@/types";
import { ToolbarIcon } from "./toolbar-icon";

export function SidebarIcon({ view, ...props }: Omit<SVGProps<SVGSVGElement>, "name"> & { view: View }) {
  if (view === "soins") return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M8 13h8m-4-4v8"/></svg>;
  if (view === "parametres") return <ToolbarIcon name="settings" {...props} />;
  if (view === "assistant") return <ToolbarIcon name="assistant" {...props} />;
  const navigationView = view === "patient_detail" ? "patients" : view === "finances_analytics" ? "finances" : view;
  const item = navigationItems.find((entry) => entry.view === navigationView) ?? navigationItems[0];
  return <HugeiconsIcon {...props} icon={item.icon} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}
