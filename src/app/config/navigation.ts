import {
  BookOpenTextIcon,
  Calendar01Icon,
  ClinicIcon,
  DashboardSquare01Icon,
  HelpCircleIcon,
  Package02Icon,
  Settings02Icon,
  StethoscopeIcon,
  Task01Icon,
  UserGroupIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import type { View } from "@/types"

export const viewTitles: Record<View, string> = {
  dashboard: "Tableau de bord",
  agenda: "Agenda clinique",
  clinique: "Clinique",
  patients: "Patients",
  notes: "Notes",
  stock: "Produits",
  finances: "Finances",
  finances_analytics: "Analyse financière",
  equipe: "Équipe",
  parametres: "Configuration",
  taches: "Tâches & rappels",
  aide: "Centre d'aide",
}

export const navigationSections: Array<{
  title: string
  items: Array<{ view: View; label: string; icon: IconSvgElement }>
}> = [
  {
    title: "Pilotage",
    items: [
      { view: "dashboard", label: "Tableau de bord", icon: DashboardSquare01Icon },
    ],
  },
  {
    title: "Parcours patient",
    items: [
      { view: "patients", label: "Patients", icon: StethoscopeIcon },
      { view: "agenda", label: "Agenda", icon: Calendar01Icon },
      { view: "clinique", label: "Consultations", icon: ClinicIcon },
      { view: "notes", label: "Notes", icon: BookOpenTextIcon },
      { view: "taches", label: "Rappels", icon: Task01Icon },
    ],
  },
  {
    title: "Exploitation",
    items: [
      { view: "stock", label: "Produits", icon: Package02Icon },
      { view: "finances", label: "Finances", icon: WalletIcon },
      { view: "equipe", label: "Équipe", icon: UserGroupIcon },
    ],
  },
  {
    title: "Configuration",
    items: [
      { view: "parametres", label: "Paramètres", icon: Settings02Icon },
      { view: "aide", label: "Aide", icon: HelpCircleIcon },
    ],
  },
]

export const navigationItems = navigationSections.flatMap((section) => section.items)
