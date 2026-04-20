import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  Calendar01Icon,
  ChartLineData01Icon,
  DashboardSquare01Icon,
  Doctor01Icon,
  File01Icon,
  Folder01Icon,
  Home04Icon,
  Money01Icon,
  Note01Icon,
  Settings01Icon,
  StethoscopeIcon,
  UserIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (view: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HugeiconType = any

interface CommandItemData {
  id: string
  label: string
  icon: HugeiconType
  shortcut?: string
  href: string
  category: string
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const { t } = useTranslation()
  const [search, setSearch] = React.useState("")
  const isClosingRef = React.useRef(false)

  // Raccourci clavier Cmd+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!isClosingRef.current) {
          onOpenChange(!open)
        }
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open])

  // Reset search quand le dialog s'ouvre
  React.useEffect(() => {
    if (open) {
      isClosingRef.current = false
      setSearch("")
    }
  }, [open])

  const commands: CommandItemData[] = [
    // Navigation principale
    {
      id: "dashboard",
      label: t("commandPalette.dashboard", { defaultValue: "Tableau de bord" }),
      icon: DashboardSquare01Icon,
      shortcut: "⌘D",
      href: "/",
      category: t("commandPalette.navigation", { defaultValue: "Navigation" }),
    },
    {
      id: "patients",
      label: t("commandPalette.patients", { defaultValue: "Patients" }),
      icon: UserMultipleIcon,
      shortcut: "⌘P",
      href: "/patients",
      category: t("commandPalette.navigation", { defaultValue: "Navigation" }),
    },
    {
      id: "agenda",
      label: t("commandPalette.agenda", { defaultValue: "Agenda" }),
      icon: Calendar01Icon,
      shortcut: "⌘A",
      href: "/agenda",
      category: t("commandPalette.navigation", { defaultValue: "Navigation" }),
    },
    {
      id: "clinique",
      label: t("commandPalette.clinique", { defaultValue: "Clinique" }),
      icon: StethoscopeIcon,
      shortcut: "⌘C",
      href: "/clinique",
      category: t("commandPalette.navigation", { defaultValue: "Navigation" }),
    },
    // Actions rapides
    {
      id: "new-consultation",
      label: t("commandPalette.newConsultation", { defaultValue: "Nouvelle consultation" }),
      icon: Doctor01Icon,
      href: "/clinique",
      category: t("commandPalette.actions", { defaultValue: "Actions" }),
    },
    {
      id: "new-patient",
      label: t("commandPalette.newPatient", { defaultValue: "Nouveau patient" }),
      icon: UserIcon,
      href: "/patients",
      category: t("commandPalette.actions", { defaultValue: "Actions" }),
    },
    {
      id: "notes",
      label: t("commandPalette.notes", { defaultValue: "Notes" }),
      icon: Note01Icon,
      href: "/notes",
      category: t("commandPalette.navigation", { defaultValue: "Navigation" }),
    },
    // Exploitation
    {
      id: "finances",
      label: t("commandPalette.finances", { defaultValue: "Finances" }),
      icon: Money01Icon,
      href: "/finances",
      category: t("commandPalette.exploitation", { defaultValue: "Exploitation" }),
    },
    {
      id: "stock",
      label: t("commandPalette.stock", { defaultValue: "Stock" }),
      icon: Folder01Icon,
      href: "/stock",
      category: t("commandPalette.exploitation", { defaultValue: "Exploitation" }),
    },
    {
      id: "rapports",
      label: t("commandPalette.reports", { defaultValue: "Rapports" }),
      icon: ChartLineData01Icon,
      href: "/rapports",
      category: t("commandPalette.exploitation", { defaultValue: "Exploitation" }),
    },
    // Paramètres
    {
      id: "settings",
      label: t("commandPalette.settings", { defaultValue: "Paramètres" }),
      icon: Settings01Icon,
      shortcut: "⌘,",
      href: "/parametres",
      category: t("commandPalette.settingsCat", { defaultValue: "Paramètres" }),
    },
    {
      id: "help",
      label: t("commandPalette.help", { defaultValue: "Aide et documentation" }),
      icon: File01Icon,
      href: "/aide",
      category: t("commandPalette.settingsCat", { defaultValue: "Paramètres" }),
    },
  ]

  const handleSelect = (command: CommandItemData) => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    
    // Naviguer d'abord, puis fermer
    if (onNavigate) {
      onNavigate(command.href.replace("/", ""))
    }
    onOpenChange(false)
    // Ne pas reset search ici - attendre que le dialog se ferme complètement
  }
  
  // Gestion de la touche ESC - fermeture simple sans animation complexe
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isClosingRef.current) {
      e.preventDefault()
      isClosingRef.current = true
      onOpenChange(false)
    }
  }

  // Grouper par catégorie
  const groupedCommands = commands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = []
    }
    acc[command.category].push(command)
    return acc
  }, {} as Record<string, CommandItemData[]>)

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Seulement permettre la fermeture si on est pas déjà en train de fermer
      if (!newOpen && isClosingRef.current) return
      onOpenChange(newOpen)
    }}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0",
          "max-w-[640px] w-[calc(100%-2rem)]",
          "rounded-[24px] border border-border bg-card shadow-2xl"
        )}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {t("commandPalette.title", { defaultValue: "Recherche rapide" })}
        </DialogTitle>
        <Command 
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center border-b border-border px-4">
            <HugeiconsIcon
              icon={Home04Icon}
              strokeWidth={2}
              className="mr-2 h-5 w-5 shrink-0 text-muted-foreground"
            />
            <CommandInput
              placeholder={t("commandPalette.placeholder", { defaultValue: "Rechercher une commande ou naviguer..." })}
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none ml-2 hidden h-7 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto py-2">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {t("commandPalette.noResults", { defaultValue: "Aucune commande trouvée." })}
            </CommandEmpty>
            {Object.entries(groupedCommands).map(([category, items], index) => (
              <React.Fragment key={category}>
                {index > 0 && <CommandSeparator className="my-1" />}
                <CommandGroup heading={category} className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5",
                        "cursor-pointer select-none",
                        "text-sm text-foreground",
                        "transition-colors duration-150",
                        "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                        "hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80">
                        <HugeiconsIcon
                          icon={item.icon}
                          strokeWidth={2}
                          className="h-4 w-4 text-muted-foreground"
                        />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
                          {item.shortcut}
                        </kbd>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                <span>{t("commandPalette.navigate", { defaultValue: "Naviguer" })}</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                <span>{t("commandPalette.select", { defaultValue: "Sélectionner" })}</span>
              </div>
            </div>
            <span>{t("commandPalette.close", { defaultValue: "ESC pour fermer" })}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
