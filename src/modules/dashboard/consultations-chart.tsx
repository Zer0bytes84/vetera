"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

const chartData = [
  { time: "08:00", consultations: 4, chirurgies: 0, urgences: 1 },
  { time: "09:00", consultations: 6, chirurgies: 1, urgences: 0 },
  { time: "10:00", consultations: 5, chirurgies: 2, urgences: 2 },
  { time: "11:00", consultations: 8, chirurgies: 1, urgences: 1 },
  { time: "12:00", consultations: 3, chirurgies: 0, urgences: 0 },
  { time: "14:00", consultations: 7, chirurgies: 1, urgences: 1 },
  { time: "15:00", consultations: 6, chirurgies: 2, urgences: 0 },
  { time: "16:00", consultations: 4, chirurgies: 1, urgences: 1 },
  { time: "17:00", consultations: 2, chirurgies: 0, urgences: 0 },
  { time: "Now", consultations: 1, chirurgies: 0, urgences: 0 },
]

const chartConfig: ChartConfig = {
  consultations: {
    label: "Consultations",
    color: "var(--chart-1)",
  },
  chirurgies: {
    label: "Chirurgies",
    color: "var(--chart-2)",
  },
  urgences: {
    label: "Urgences",
    color: "var(--chart-4)",
  },
}

export function ConsultationsChart() {
  const totals = chartData.reduce(
    (acc, d) => ({
      consultations: acc.consultations + d.consultations,
      chirurgies: acc.chirurgies + d.chirurgies,
      urgences: acc.urgences + d.urgences,
    }),
    { consultations: 0, chirurgies: 0, urgences: 0 }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle>Activité clinique</CardTitle>
            <div className="flex gap-1.5">
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 size-2 rounded-full bg-[var(--chart-1)]" />
                {totals.consultations}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 size-2 rounded-full bg-[var(--chart-2)]" />
                {totals.chirurgies} chir.
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1 size-2 rounded-full bg-[var(--chart-4)]" />
                {totals.urgences} urg.
              </Badge>
            </div>
          </div>
          <CardDescription>Répartition des actes sur la journée</CardDescription>
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
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillConsultations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-consultations)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-consultations)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillChirurgies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chirurgies)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--color-chirurgies)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
            <Area
              dataKey="urgences"
              type="monotone"
              fill="var(--color-urgences)"
              stroke="var(--color-urgences)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              dataKey="chirurgies"
              type="monotone"
              fill="url(#fillChirurgies)"
              stroke="var(--color-chirurgies)"
              strokeWidth={2}
              stackId="1"
            />
            <Area
              dataKey="consultations"
              type="monotone"
              fill="url(#fillConsultations)"
              stroke="var(--color-consultations)"
              strokeWidth={2}
              stackId="1"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
