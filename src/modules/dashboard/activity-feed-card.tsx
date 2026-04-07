import { HugeiconsIcon } from "@hugeicons/react"
import {
  Clock01Icon,
  Invoice03Icon,
  UserCircle02Icon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type ActivityItem = {
  id: string
  type: "appointment" | "transaction" | "patient"
  label: string
  detail: string
  time: Date
}

const TYPE_META: Record<
  ActivityItem["type"],
  { icon: typeof Clock01Icon; iconClass: string; bgClass: string }
> = {
  appointment: {
    icon: Calendar01Icon,
    iconClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  transaction: {
    icon: Invoice03Icon,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  patient: {
    icon: UserCircle02Icon,
    iconClass: "text-violet-600 dark:text-violet-400",
    bgClass: "bg-violet-500/10",
  },
}

function formatRelative(date: Date, now: Date) {
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

export function ActivityFeedCard({
  items,
}: {
  items: ActivityItem[]
}) {
  const now = new Date()

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Clock01Icon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
          />
          <CardTitle className="text-sm font-medium">Activité récente</CardTitle>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {items.length} événement{items.length > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 pt-0">
        {items.length > 0 ? (
          <div className="space-y-0">
            {items.slice(0, 6).map((item, i) => {
              const meta = TYPE_META[item.type]
              return (
                <div key={item.id}>
                  {i > 0 && <Separator className="my-2" />}
                  <div className="flex items-start gap-3 py-1">
                    <div
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                        meta.bgClass
                      )}
                    >
                      <HugeiconsIcon
                        icon={meta.icon}
                        strokeWidth={2}
                        className={cn("size-3.5", meta.iconClass)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
                      {formatRelative(item.time, now)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-6">
            <p className="text-xs text-muted-foreground">
              Aucune activité récente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
