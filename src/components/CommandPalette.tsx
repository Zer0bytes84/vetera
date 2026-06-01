"use client";

import {
  BookOpenTextIcon,
  Calendar01Icon,
  ClinicIcon,
  DashboardSquare01Icon,
  Package02Icon,
  Settings02Icon,
  StethoscopeIcon,
  Task01Icon,
  UserGroupIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Fragment } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { View } from "@/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}

const navigationActions: Array<{
  id: View;
  label: string;
  sub: string;
  icon: IconSvgElement;
  category: string;
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
];

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  return (
    <CommandDialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        <CommandInput placeholder="Que souhaitez-vous faire ?" />
        <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        {["Pilotage", "Parcours patient", "Exploitation", "Configuration"].map(
          (category) => {
            const items = navigationActions.filter(
              (a) => a.category === category
            );
            if (items.length === 0) {
              return null;
            }
            return (
              <Fragment key={category}>
                <CommandGroup heading={category}>
                  {items.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={() => {
                        onNavigate(action.id);
                        onClose();
                      }}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-gradient-to-b from-white to-zinc-50 shadow-[0_2px_4px_rgba(0,0,0,0.02)] dark:border-white/10 dark:from-zinc-800 dark:to-zinc-900">
                        <HugeiconsIcon
                          className="size-4 text-zinc-700 dark:text-zinc-300"
                          icon={action.icon}
                          strokeWidth={2}
                        />
                      </div>
                      <div className="ml-2 flex flex-col items-start justify-center gap-0.5">
                        <span className="text-sm font-medium leading-none text-foreground">
                          {action.label}
                        </span>
                        <span className="text-[11px] font-medium leading-none text-muted-foreground/70">
                          {action.sub}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </Fragment>
            );
          }
        )}
        <CommandGroup heading="Actions rapides">
          <CommandItem
            onSelect={() => {
              onNavigate("patients");
              onClose();
            }}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <HugeiconsIcon
                className="size-4"
                icon={StethoscopeIcon}
                strokeWidth={2}
              />
            </div>
            <span className="ml-2 font-medium">Nouveau patient</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onNavigate("agenda");
              onClose();
            }}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <HugeiconsIcon
                className="size-4"
                icon={Calendar01Icon}
                strokeWidth={2}
              />
            </div>
            <span className="ml-2 font-medium">Nouveau rendez-vous</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
