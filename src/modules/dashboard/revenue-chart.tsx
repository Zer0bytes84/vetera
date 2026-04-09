"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const chartConfig: ChartConfig = {
  encaissements: {
    label: "Encaissements",
    color: "var(--chart-1)",
  },
  depenses: {
    label: "Dépenses",
    color: "var(--chart-3)",
  },
}

function formatAmount(value: number) {
  return `${(value / 1000).toFixed(1)}k`
}

type RevenuePoint = {
  time: string
  encaissements: number
  depenses: number
}

export function RevenueChart({
  data,
  onNavigate,
}: {
  data: RevenuePoint[]
  onNavigate: () => void
}) {
  const totalEncaissements = React.useMemo(
    () => data.reduce((sum, d) => sum + d.encaissements, 0),
    [data]
  )
  const totalDepenses = React.useMemo(
    () => data.reduce((sum, d) => sum + d.depenses, 0),
    [data]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>Flux financiers</CardTitle>
            <div className="flex gap-1.5">
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 size-2 rounded-full bg-[var(--chart-1)]" />
                +{formatAmount(totalEncaissements)} DA
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 size-2 rounded-full bg-[var(--chart-3)]" />
                -{formatAmount(totalDepenses)} DA
              </Badge>
            </div>
          </div>
          <CardDescription>Évolution sur les 7 derniers jours</CardDescription>
        </div>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={onNavigate}
          >
            Voir détails
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              fontSize={12}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              stroke="var(--muted-foreground)"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--border)', opacity: 0.1 }}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium">
                      {Number(value).toLocaleString("fr-DZ")} DA
                    </span>
                  )}
                />
              }
            />
            <Bar
              dataKey="depenses"
              fill="var(--color-depenses)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="encaissements"
              fill="var(--color-encaissements)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
