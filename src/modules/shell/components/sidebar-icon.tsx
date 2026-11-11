import {
  BanknotesIcon,
  BeakerIcon,
  BuildingOffice2Icon,
  CalendarDateRangeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UserIcon,
  ViewColumnsIcon,
} from "@heroicons/react/20/solid";
import type { ComponentType, SVGProps } from "react";
import type { View } from "@/types";

/**
 * The sidebar's icons, Catalyst style: Heroicons in their solid (filled)
 * variant, one glyph per view, shared by both visual themes so the
 * navigation reads the same in Clean and in Premium.
 */
export const sidebarViewIcons: Partial<
  Record<View, ComponentType<SVGProps<SVGSVGElement>>>
> = {
  dashboard: Squares2X2Icon,
  patients: UserIcon,
  patient_detail: UserIcon,
  agenda: CalendarDateRangeIcon,
  clinique: BuildingOffice2Icon,
  soins: BeakerIcon,
  flux: ViewColumnsIcon,
  taches: ClipboardDocumentListIcon,
  notes: DocumentTextIcon,
  stock: CubeIcon,
  finances: BanknotesIcon,
  finances_analytics: BanknotesIcon,
  equipe: UserGroupIcon,
  parametres: Cog6ToothIcon,
};

export function SidebarIcon({
  view,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "name"> & { view: View }) {
  const Icon = sidebarViewIcons[view] ?? Squares2X2Icon;
  return <Icon aria-hidden="true" focusable="false" height={20} width={20} {...props} />;
}
