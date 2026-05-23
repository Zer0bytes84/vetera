import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ClinicalActivityPoint = {
  date: string;
  consultations: number;
  interventions: number;
};

const chartConfig = {
  consultations: {
    label: "Consultations",
    color: "var(--primary)",
  },
  interventions: {
    label: "Interventions",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  data,
}: {
  data: ClinicalActivityPoint[];
}) {
  const [timeRange, setTimeRange] = React.useState<string[]>(["90d"]);

  const filteredData = React.useMemo(() => {
    const referenceDate = data.length
      ? new Date(data[data.length - 1].date)
      : new Date();
    const active = timeRange[0] ?? "90d";
    let daysToSubtract = 90;
    if (active === "30d") {
      daysToSubtract = 30;
    } else if (active === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return data.filter((item) => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Activité clinique</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Consultations et interventions sur la période
          </span>
          <span className="@[540px]/card:hidden">Période sélectionnée</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            className="*:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex hidden"
            onValueChange={setTimeRange}
            value={timeRange}
            variant="outline"
          >
            <ToggleGroupItem value="90d">90 jours</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 jours</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="aspect-auto h-[250px] w-full"
          config={chartConfig}
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient
                id="fillConsultations"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-consultations)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-consultations)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillInterventions"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-interventions)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-interventions)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("fr-FR", {
                  month: "short",
                  day: "numeric",
                });
              }}
              tickLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) =>
                    new Date(
                      value as string | number | Date
                    ).toLocaleDateString("fr-FR", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
              }
              cursor={false}
            />
            <Area
              dataKey="interventions"
              fill="url(#fillInterventions)"
              stackId="a"
              stroke="var(--color-interventions)"
              type="natural"
            />
            <Area
              dataKey="consultations"
              fill="url(#fillConsultations)"
              stackId="a"
              stroke="var(--color-consultations)"
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
