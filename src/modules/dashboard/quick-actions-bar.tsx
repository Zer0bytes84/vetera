import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar01Icon,
  UserGroupIcon,
  Invoice03Icon,
  Package02Icon,
  Task01Icon,
  BookOpenTextIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { View } from "@/types"

const ACTIONS = [
  { view: "agenda" as View, icon: Calendar01Icon, label: "Nouveau RDV", shortcut: "A" },
  { view: "patients" as View, icon: UserGroupIcon, label: "Ajouter patient", shortcut: "P" },
  { view: "finances" as View, icon: Invoice03Icon, label: "Nouvelle facture", shortcut: "F" },
  { view: "stock" as View, icon: Package02Icon, label: "Gérer stock", shortcut: "S" },
  { view: "taches" as View, icon: Task01Icon, label: "Créer tâche", shortcut: "T" },
  { view: "notes" as View, icon: BookOpenTextIcon, label: "Ajouter note", shortcut: "N" },
] as const

export function QuickActionsBar({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Accès rapide
      </span>
      <TooltipProvider>
        {ACTIONS.map((action) => (
          <Tooltip key={action.view}>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(action.view)}
                />
              }
            >
              <HugeiconsIcon icon={action.icon} strokeWidth={2} className="size-3.5" />
              {action.label}
            </TooltipTrigger>
            <TooltipContent>
              {action.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  )
}
