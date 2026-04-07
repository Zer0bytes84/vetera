import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type SectionCardItem = {
  title: string
  value: string
  badge?: string
  trend?: "up" | "down"
  summary?: string
  detail?: string
  icon?: IconSvgElement
}

const ACCENT_CLASSES = [
  { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
]

export function SectionCards({
  items,
  className,
}: {
  items: SectionCardItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item, index) => {
        const trendIcon = item.trend === "down" ? ChartDownIcon : ChartUpIcon
        const accent = ACCENT_CLASSES[index % ACCENT_CLASSES.length]

        return (
          <Card key={item.title} className="@container/card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              {item.icon ? (
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    accent.bg
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    strokeWidth={1.8}
                    className={cn("size-4", accent.text)}
                  />
                </div>
              ) : item.badge ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1 text-xs tabular-nums",
                    item.trend === "up" &&
                      "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
                    item.trend === "down" &&
                      "border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                  )}
                >
                  <HugeiconsIcon
                    icon={trendIcon}
                    strokeWidth={2}
                    className="size-3"
                  />
                  {item.badge}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
                {item.value}
              </div>
              {(item.summary || item.detail) && (
                <p className="text-xs text-muted-foreground">
                  {item.summary || item.detail}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
