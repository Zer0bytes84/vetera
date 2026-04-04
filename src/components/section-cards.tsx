import { ChartDownIcon, ChartUpIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
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
        "grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const trendIcon =
          item.trend === "down" ? ChartDownIcon : ChartUpIcon

        return (
          <Card
            key={item.title}
            className="@container/card bg-card shadow-xs"
          >
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {item.value}
              </CardTitle>
              {item.badge ? (
                <CardAction>
                  <Badge variant="outline">
                    <HugeiconsIcon icon={trendIcon} strokeWidth={2} />
                    {item.badge}
                  </Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            {(item.summary || item.detail) ? (
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                {item.summary ? (
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    {item.summary}
                    <HugeiconsIcon icon={trendIcon} strokeWidth={2} className="size-4" />
                  </div>
                ) : null}
                {item.detail ? (
                  <div className="text-muted-foreground">{item.detail}</div>
                ) : null}
              </CardFooter>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
