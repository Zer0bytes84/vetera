"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare01Icon,
  Calendar01Icon,
  Task01Icon,
  StethoscopeIcon,
  ClinicIcon,
  BookOpenTextIcon,
  Package02Icon,
  WalletIcon,
  UserGroupIcon,
  Settings02Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { View } from "@/types"

type CommandPaletteProps = {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: View) => void
}

const navigationActions: Array<{
  id: View
  label: string
  sub: string
  icon: IconSvgElement
  category: string
}> = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    sub: "Vue d'ensemble",
    icon: DashboardSquare01Icon,
    category: "Pilotage",
  },
  {
    id: "agenda",
    label: "Agenda",
    sub: "Rendez-vous et planning",
    icon: Calendar01Icon,
    category: "Pilotage",
  },
  {
    id: "taches",
    label: "Tâches",
    sub: "To-do list et rappels",
    icon: Task01Icon,
    category: "Pilotage",
  },
  {
    id: "patients",
    label: "Patients",
    sub: "Dossiers médicaux",
    icon: StethoscopeIcon,
    category: "Parcours patient",
  },
  {
    id: "clinique",
    label: "Consultations",
    sub: "Suivi clinique",
    icon: ClinicIcon,
    category: "Parcours patient",
  },
  {
    id: "notes",
    label: "Notes",
    sub: "Mémos et documents",
    icon: BookOpenTextIcon,
    category: "Parcours patient",
  },
  {
    id: "stock",
    label: "Stock & Pharma",
    sub: "Inventaire produits",
    icon: Package02Icon,
    category: "Exploitation",
  },
  {
    id: "finances",
    label: "Finances",
    sub: "Facturation et recettes",
    icon: WalletIcon,
    category: "Exploitation",
  },
  {
    id: "equipe",
    label: "Équipe",
    sub: "Gestion du personnel",
    icon: UserGroupIcon,
    category: "Exploitation",
  },
  {
    id: "parametres",
    label: "Paramètres",
    sub: "Configuration",
    icon: Settings02Icon,
    category: "Configuration",
  },
]

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <CommandInput placeholder="Que souhaitez-vous faire ?" />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        {["Pilotage", "Parcours patient", "Exploitation", "Configuration"].map(
          (category) => {
            const items = navigationActions.filter(
              (a) => a.category === category
            )
            if (items.length === 0) return null
            return (
              <React.Fragment key={category}>
                <CommandGroup heading={category}>
                  {items.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={() => {
                        onNavigate(action.id)
                        onClose()
                      }}
                    >
                      <HugeiconsIcon
                        icon={action.icon}
                        strokeWidth={2}
                        className="shrink-0"
                      />
                      <span>{action.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {action.sub}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            )
          }
        )}
        <CommandGroup heading="Actions rapides">
          <CommandItem
            onSelect={() => {
              onNavigate("patients")
              onClose()
            }}
          >
            <HugeiconsIcon
              icon={StethoscopeIcon}
              strokeWidth={2}
              className="shrink-0"
            />
            <span>Nouveau patient</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onNavigate("agenda")
              onClose()
            }}
          >
            <HugeiconsIcon
              icon={Calendar01Icon}
              strokeWidth={2}
              className="shrink-0"
            />
            <span>Nouveau rendez-vous</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
