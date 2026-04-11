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
import { Sparkline } from "@/components/ui/sparkline"

export type SectionCardItem = {
  title: string
  value: string
  badge?: string
  trend?: "up" | "down" | "neutral"
  summary?: string
  detail?: string
  icon?: IconSvgElement
  sparklineData?: number[]
  color?: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan"
  onClick?: () => void
}

const colorMap = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    sparkline: "#2563eb",
    badge: "bg-blue-500/10 text-blue-600",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-600",
    gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
    sparkline: "#7c3aed",
    badge: "bg-violet-500/10 text-violet-600",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    sparkline: "#059669",
    badge: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    sparkline: "#d97706",
    badge: "bg-amber-500/10 text-amber-600",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    gradient: "from-rose-500/10 via-rose-500/5 to-transparent",
    sparkline: "#e11d48",
    badge: "bg-rose-500/10 text-rose-600",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600",
    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    sparkline: "#0891b2",
    badge: "bg-cyan-500/10 text-cyan-600",
  },
}

export function SectionCardsPremium({
  items,
  className,
}: {
  items: SectionCardItem[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const colors = colorMap[item.color || "blue"]
        const trendIcon = item.trend === "down" ? ArrowDown01Icon : ArrowUp01Icon

        return (
          <Card
            key={item.title}
            className={cn(
              "group relative overflow-hidden transition-all duration-300",
              "hover:-translate-y-0.5 hover:shadow-lg",
              "cursor-pointer"
            )}
            onClick={item.onClick}
          >
            {/* Gradient background */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300",
                colors.gradient,
                "group-hover:opacity-100"
              )}
            />

            <CardHeader className="relative pb-2 pt-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-xl",
                    colors.bg,
                    "group-hover:scale-105"
                  )}
                >
                  {item.icon && (
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={2}
                      className={cn("size-5", colors.text)}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <CardTitle className="min-w-0 text-sm leading-tight font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>

                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mt-2 inline-flex max-w-full border-0 text-[11px] tabular-nums font-medium whitespace-nowrap",
                        item.trend === "up" && "bg-emerald-500/10 text-emerald-600",
                        item.trend === "down" && "bg-rose-500/10 text-rose-600",
                        item.trend === "neutral" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.trend && item.trend !== "neutral" && (
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
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="flex items-end justify-between">
                <div>
                  {/* Main value */}
                  <div className="text-2xl font-bold tabular-nums tracking-tight">
                    {item.value}
                  </div>

                  {/* Summary text */}
                  {(item.summary || item.detail) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.summary || item.detail}
                    </p>
                  )}
                </div>

                {/* Sparkline */}
                {item.sparklineData && item.sparklineData.length > 1 && (
                  <div className="mb-1">
                    <Sparkline
                      data={item.sparklineData}
                      width={70}
                      height={28}
                      color={colors.sparkline}
                      strokeWidth={2}
                      fillOpacity={0.15}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
