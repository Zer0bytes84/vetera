"use client"

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
import { useTranslation } from "react-i18next"

const actionColors: Record<
  string,
  { bg: string; hover: string; icon: string; ring: string }
> = {
  agenda: {
    bg: "bg-blue-500/10",
    hover: "hover:bg-blue-500/20",
    icon: "text-blue-600",
    ring: "focus-visible:ring-blue-500",
  },
  patients: {
    bg: "bg-violet-500/10",
    hover: "hover:bg-violet-500/20",
    icon: "text-violet-600",
    ring: "focus-visible:ring-violet-500",
  },
  finances: {
    bg: "bg-emerald-500/10",
    hover: "hover:bg-emerald-500/20",
    icon: "text-emerald-600",
    ring: "focus-visible:ring-emerald-500",
  },
  stock: {
    bg: "bg-amber-500/10",
    hover: "hover:bg-amber-500/20",
    icon: "text-amber-600",
    ring: "focus-visible:ring-amber-500",
  },
  taches: {
    bg: "bg-cyan-500/10",
    hover: "hover:bg-cyan-500/20",
    icon: "text-cyan-600",
    ring: "focus-visible:ring-cyan-500",
  },
  notes: {
    bg: "bg-rose-500/10",
    hover: "hover:bg-rose-500/20",
    icon: "text-rose-600",
    ring: "focus-visible:ring-rose-500",
  },
}

export function QuickActionsDock({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  const { t } = useTranslation()

  const actions = [
    {
      view: "agenda" as View,
      icon: Calendar01Icon,
      label: t("dashboard.quick.newAppointment"),
      shortcut: "A",
    },
    {
      view: "patients" as View,
      icon: UserGroupIcon,
      label: t("dashboard.quick.addPatient"),
      shortcut: "P",
    },
    {
      view: "finances" as View,
      icon: Invoice03Icon,
      label: t("dashboard.quick.newInvoice"),
      shortcut: "F",
    },
    {
      view: "stock" as View,
      icon: Package02Icon,
      label: t("dashboard.quick.manageStock"),
      shortcut: "S",
    },
    {
      view: "taches" as View,
      icon: Task01Icon,
      label: t("dashboard.quick.createTask"),
      shortcut: "T",
    },
    {
      view: "notes" as View,
      icon: BookOpenTextIcon,
      label: t("dashboard.quick.addNote"),
      shortcut: "N",
    },
  ] as const

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 rounded-2xl border bg-card/80 backdrop-blur-sm p-2 shadow-sm">
          {actions.map((action) => {
            const colors = actionColors[action.view]

            return (
              <Tooltip key={action.view}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onNavigate(action.view)}
                      className={`
                        size-11 rounded-xl transition-all duration-200
                        ${colors.bg} ${colors.hover}
                        hover:scale-105 hover:-translate-y-0.5
                        active:scale-95
                        ${colors.ring}
                      `}
                    >
                      <HugeiconsIcon
                        icon={action.icon}
                        strokeWidth={2}
                        className={`size-5 ${colors.icon}`}
                      />
                    </Button>
                  }
                />
                <TooltipContent
                  side="bottom"
                  className="flex items-center gap-1.5"
                >
                  <span className="font-medium">{action.label}</span>
                  <kbd className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {action.shortcut}
                  </kbd>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
