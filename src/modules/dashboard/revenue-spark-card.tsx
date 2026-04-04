import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowUp01Icon,
  Invoice03Icon,
} from "@hugeicons/core-free-icons"

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
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Invoice03Icon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
              <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            </div>
            <CardDescription>Évolution récente des encaissements</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px] tabular-nums">
            <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} className="size-3" />
            {delta >= 0 ? "+" : ""}
            {delta}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {formatCompactAmount(total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Encaissement cumulé sur la fenêtre visible
          </p>
        </div>

        <ChartContainer
          config={chartConfig}
          className="h-[140px] w-full"
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
              radius={[8, 8, 2, 2]}
            />
          </BarChart>
        </ChartContainer>

        <Button variant="outline" size="sm" className="mt-auto w-full" onClick={onNavigate}>
          Ouvrir les finances
        </Button>
      </CardContent>
    </Card>
  )
}
