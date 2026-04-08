"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const chartData = [
  { time: "Lun", nouveaux: 3, recurrences: 12 },
  { time: "Mar", nouveaux: 5, recurrences: 15 },
  { time: "Mer", nouveaux: 2, recurrences: 10 },
  { time: "Jeu", nouveaux: 7, recurrences: 18 },
  { time: "Ven", nouveaux: 4, recurrences: 20 },
  { time: "Sam", nouveaux: 6, recurrences: 14 },
  { time: "Dim", nouveaux: 1, recurrences: 8 },
]

const chartConfig: ChartConfig = {
  nouveaux: {
    label: "Nouveaux",
    color: "var(--chart-1)",
  },
  recurrences: {
    label: "Récurrences",
    color: "var(--chart-5)",
  },
}

export function PatientsChart() {
  const totals = chartData.reduce(
    (acc, d) => ({
      nouveaux: acc.nouveaux + d.nouveaux,
      recurrences: acc.recurrences + d.recurrences,
    }),
    { nouveaux: 0, recurrences: 0 }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <CardTitle>Patients</CardTitle>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--chart-1)]" />
                <span className="text-muted-foreground">Nouveaux</span>
                <span className="font-semibold">{totals.nouveaux}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--chart-5)]" />
                <span className="text-muted-foreground">Récurrences</span>
                <span className="font-semibold">{totals.recurrences}</span>
              </div>
            </div>
          </div>
          <CardDescription>Affluence sur la semaine</CardDescription>
        </div>
        <CardAction>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            Voir patients
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
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
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="nouveaux"
              type="monotone"
              stroke="var(--color-nouveaux)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="recurrences"
              type="monotone"
              stroke="var(--color-recurrences)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
