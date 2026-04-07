import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUp01Icon, Invoice03Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type RevenuePoint = {
  label: string
  revenue: number
}

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function formatCompactAmount(value: number) {
  return `${new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
  }).format(value)} DA`
}

export function RevenueSparkCard({
  total,
  delta,
  points,
  onNavigate,
}: {
  total: number
  delta: number
  points: RevenuePoint[]
  onNavigate: () => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Revenus</CardTitle>
        <Badge variant="outline" className="gap-1 text-xs tabular-nums">
          <HugeiconsIcon
            icon={ArrowUp01Icon}
            strokeWidth={2}
            className="size-3"
          />
          {delta >= 0 ? "+" : ""}
          {delta}%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">
          {formatCompactAmount(total)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Encaissement cumulé sur la fenêtre visible
        </p>
        <ChartContainer
          config={chartConfig}
          className="mt-4 h-[140px] w-full"
          initialDimension={{ width: 320, height: 140 }}
        >
          <BarChart data={points}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium tabular-nums">
                      {formatCompactAmount(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={onNavigate}
        >
          Ouvrir les finances
        </Button>
      </CardContent>
    </Card>
  )
}
