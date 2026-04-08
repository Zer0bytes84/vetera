import React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignCircleIcon,
} from "@hugeicons/core-free-icons"
import { StatCardProps } from "../types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor,
  iconBg,
}) => {
  const trendIcon =
    trend > 0
      ? ArrowUp01Icon
      : trend < 0
        ? ArrowDown01Icon
        : MinusSignCircleIcon
  const trendColor =
    trend > 0
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
      : trend < 0
        ? "text-rose-700 dark:text-rose-300 bg-rose-500/10"
        : "text-muted-foreground bg-muted"

  return (
    <Card className="group">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-col">
            <p className="mb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              {title}
            </p>
            <h3 className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
          </div>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <Icon size={20} strokeWidth={2} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                trendColor
              )}
            >
              <HugeiconsIcon
                icon={trendIcon}
                strokeWidth={2}
                className="size-3"
              />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </Badge>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default StatCard
