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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { View } from "@/types"
import { useTranslation } from "react-i18next"

export function QuickActionsBar({
  onNavigate,
}: {
  onNavigate: (view: View) => void
}) {
  const { t } = useTranslation()
  const actions = [
    { view: "agenda" as View, icon: Calendar01Icon, label: t("dashboard.quick.newAppointment"), shortcut: "A" },
    { view: "patients" as View, icon: UserGroupIcon, label: t("dashboard.quick.addPatient"), shortcut: "P" },
    { view: "finances" as View, icon: Invoice03Icon, label: t("dashboard.quick.newInvoice"), shortcut: "F" },
    { view: "stock" as View, icon: Package02Icon, label: t("dashboard.quick.manageStock"), shortcut: "S" },
    { view: "taches" as View, icon: Task01Icon, label: t("dashboard.quick.createTask"), shortcut: "T" },
    { view: "notes" as View, icon: BookOpenTextIcon, label: t("dashboard.quick.addNote"), shortcut: "N" },
  ] as const

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardDescription>{t("dashboard.quick.title")}</CardDescription>
        <CardTitle className="text-xl tracking-[-0.04em]">
          {t("dashboard.quick.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <TooltipProvider>
            {actions.map((action) => (
              <Tooltip key={action.view}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start rounded-2xl px-4 text-left"
                      onClick={() => onNavigate(action.view)}
                    />
                  }
                >
                  <HugeiconsIcon
                    icon={action.icon}
                    strokeWidth={2}
                    className="size-4 text-foreground/80"
                  />
                  <span className="flex-1 truncate">{action.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {action.shortcut}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {action.label} ({action.shortcut})
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
