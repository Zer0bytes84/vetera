import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Package02Icon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

import { Badge } from "./badge"
import { Card, CardContent } from "./card"

export function StatTile({
  title,
  value,
  detail,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  detail: string
  trend: number
  icon: typeof Package02Icon
}) {
  const positive = trend >= 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-text-secondary text-sm font-medium">{title}</p>
              <p className="text-3xl font-semibold tracking-[-0.04em]">
                {value}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={positive ? "success" : "warning"}
                className="gap-1"
              >
                {positive ? (
                  <HugeiconsIcon
                    icon={ArrowUp01Icon}
                    strokeWidth={2}
                    className="size-3"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                    className="size-3"
                  />
                )}
                {Math.abs(trend).toFixed(0)}%
              </Badge>
              <span className="text-sm text-muted-foreground">{detail}</span>
            </div>
          </div>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl bg-[var(--surface-200)]",
              positive
                ? "text-[var(--accent)]"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            <HugeiconsIcon icon={Icon} strokeWidth={2} className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
