"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const chartData = [
  { status: "Planifié", count: 24, color: "var(--chart-1)" },
  { status: "Terminé", count: 18, color: "var(--chart-2)" },
  { status: "En cours", count: 3, color: "var(--chart-4)" },
  { status: "Annulé", count: 2, color: "var(--muted-foreground)" },
]

const chartConfig: ChartConfig = {
  count: {
    label: "Rendez-vous",
    color: "var(--chart-1)",
  },
}

export function AppointmentsChart() {
  const total = chartData.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>Rendez-vous</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {total} total
            </Badge>
          </div>
          <CardDescription>Statut des RDV sur la semaine</CardDescription>
        </div>
        <CardAction>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            Voir agenda
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              stroke="var(--muted-foreground)"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium">{value} RDV</span>
                  )}
                />
              }
            />
            <Bar
              dataKey="count"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
