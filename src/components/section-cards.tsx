import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type SectionCardItem = {
  title: string
  value: string
  badge?: string
  trend?: "up" | "down" | "neutral"
  summary?: string
  detail?: string
  icon?: IconSvgElement
}

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
        "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const trendIcon =
          item.trend === "down" ? ArrowDown01Icon : ArrowUp01Icon

        return (
          <Card key={item.title} size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              {item.icon && (
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground"
                />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold tabular-nums">
                  {item.value}
                </div>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs tabular-nums",
                      item.trend === "up" &&
                        "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
                      item.trend === "down" &&
                        "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
                      item.trend === "neutral" &&
                        "bg-muted text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item.trend !== "neutral" && (
                      <HugeiconsIcon
                        icon={trendIcon}
                        strokeWidth={2}
                        className="mr-0.5 size-3"
                      />
                    )}
                    {item.badge}
                  </Badge>
                )}
              </div>
              {(item.summary || item.detail) && (
                <p className="text-xs text-muted-foreground mt-1">
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
