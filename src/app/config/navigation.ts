import {
  BookOpenText,
  CalendarBlank,
  CheckSquareOffset,
  Gear,
  Hospital,
  Package,
  Question,
  SquaresFour,
  Stethoscope,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
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
};

export const navigationSections: Array<{
  titleKey: string;
  items: Array<{ view: View; labelKey: string; icon: Icon }>;
}> = [
  {
    titleKey: "nav.sections.pilotage",
    items: [
      {
        view: "dashboard",
        labelKey: "views.dashboard",
        icon: SquaresFour,
      },
    ],
  },
  {
    titleKey: "nav.sections.patientJourney",
    items: [
      { view: "patients", labelKey: "views.patients", icon: Stethoscope },
      { view: "agenda", labelKey: "views.agenda", icon: CalendarBlank },
      { view: "clinique", labelKey: "views.clinique", icon: Hospital },
      { view: "notes", labelKey: "views.notes", icon: BookOpenText },
      { view: "taches", labelKey: "views.taches", icon: CheckSquareOffset },
    ],
  },
  {
    titleKey: "nav.sections.operations",
    items: [
      { view: "stock", labelKey: "views.stock", icon: Package },
      { view: "finances", labelKey: "views.finances", icon: Wallet },
      { view: "equipe", labelKey: "views.equipe", icon: UsersThree },
    ],
  },
  {
    titleKey: "nav.sections.configuration",
    items: [
      {
        view: "parametres",
        labelKey: "views.parametres",
        icon: Gear,
      },
      { view: "aide", labelKey: "views.aide", icon: Question },
    ],
  },
];

export const navigationItems = navigationSections.flatMap(
  (section) => section.items
);

export function getViewTitle(view: View, t: TFunction) {
  return t(viewTitleKeys[view]);
}
