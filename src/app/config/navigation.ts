import {
  Calendar01Icon,
  DashboardSquare01Icon,
  Hospital01Icon,
  PackageIcon,
  StethoscopeIcon,
  Task01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { TFunction } from "i18next";

import type { View } from "@/types";

export const viewTitleKeys: Record<View, string> = {
  dashboard: "views.dashboard",
  agenda: "views.agenda",
  clinique: "views.clinique",
  patients: "views.patients",
  notes: "views.notes",
  stock: "views.stock",
  finances: "views.finances",
  finances_analytics: "views.finances_analytics",
  equipe: "views.equipe",
  parametres: "views.parametres",
  taches: "views.taches",
  aide: "views.aide",
  patient_detail: "views.patient_detail",
};

export const navigationSections: Array<{
  titleKey: string;
  items: Array<{ view: View; labelKey: string; icon: IconSvgElement }>;
}> = [
  {
    titleKey: "nav.sections.pilotage",
    items: [
      {
        view: "dashboard",
        labelKey: "views.dashboard",
        icon: DashboardSquare01Icon,
      },
    ],
  },
  {
    titleKey: "nav.sections.patientJourney",
    items: [
      { view: "patients", labelKey: "views.patients", icon: StethoscopeIcon },
      { view: "agenda", labelKey: "views.agenda", icon: Calendar01Icon },
      { view: "clinique", labelKey: "views.clinique", icon: Hospital01Icon },
      { view: "taches", labelKey: "views.taches", icon: Task01Icon },
    ],
  },
  {
    titleKey: "nav.sections.operations",
    items: [
      { view: "stock", labelKey: "views.stock", icon: PackageIcon },
      { view: "finances", labelKey: "views.finances", icon: Wallet01Icon },
      { view: "equipe", labelKey: "views.equipe", icon: UserGroupIcon },
    ],
  },
];

export const navigationItems = navigationSections.flatMap(
  (section) => section.items
);

export function getViewTitle(view: View, t: TFunction) {
  return t(viewTitleKeys[view]);
}
