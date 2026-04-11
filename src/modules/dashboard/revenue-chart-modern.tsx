"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon, Coins01Icon } from "@hugeicons/core-free-icons"
import { useTranslation } from "react-i18next"

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
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return `${value}`
}

type RevenuePoint = {
  time: string
  encaissements: number
  depenses: number
}

export function RevenueChartModern({
  data,
  onNavigate,
}: {
  data: RevenuePoint[]
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  
  const totals = React.useMemo(() => {
    return data.reduce(
      (acc, d) => ({
        encaissements: acc.encaissements + d.encaissements,
        depenses: acc.depenses + d.depenses,
      }),
      { encaissements: 0, depenses: 0 }
    )
  }, [data])

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <HugeiconsIcon
                icon={Coins01Icon}
                strokeWidth={2}
                className="size-5 text-emerald-600"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {t("dashboard.revenue.title", { defaultValue: "Flux financiers" })}
                </CardTitle>
                <div className="flex gap-1.5">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-0 bg-emerald-500/10 text-emerald-600 text-xs font-medium"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" />
                    +{formatAmount(totals.encaissements)}k
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-0 bg-rose-500/10 text-rose-600 text-xs font-medium"
                  >
                    <span className="size-2 rounded-full bg-rose-500" />
                    -{formatAmount(totals.depenses)}k
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-xs">
                {t("dashboard.revenue.description", { defaultValue: "Évolution sur les 7 derniers jours" })}
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={onNavigate}
            >
              {t("dashboard.viewDetails", { defaultValue: "Voir détails" })}
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
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
              barSize={16}
            />
            <Bar
              dataKey="encaissements"
              fill="var(--color-encaissements)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
