import {
  Activity, CalendarDays, CircleHelp, ClipboardList, FileText, Hospital,
  LayoutDashboard, Package, Pill, Search, Settings2, Stethoscope, UsersRound, Wallet,
  type LucideIcon,
} from "lucide-react";
import type { View } from "@/types";

const icons: Partial<Record<View, LucideIcon>> = {
  dashboard: LayoutDashboard,
  patients: Stethoscope,
  patient_detail: Stethoscope,
  agenda: CalendarDays,
  clinique: Hospital,
  taches: ClipboardList,
  soins: Pill,
  notes: FileText,
  stock: Package,
  finances: Wallet,
  finances_analytics: Activity,
  equipe: UsersRound,
  parametres: Settings2,
  aide: CircleHelp,
};

export function PremiumSidebarIcon({
  view, className, size = 20, ...rest
}: {
  view: View;
  className?: string;
  size?: number;
  [key: string]: unknown;
}) {
  const Icon = icons[view] ?? Search;
  return <Icon size={size} strokeWidth={1} className={className} aria-hidden="true" {...rest} />;
}
