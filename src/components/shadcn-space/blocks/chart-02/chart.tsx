"use client";

import { Label, Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const chartData = [
  { browser: "Website", visitors: 60, fill: "var(--color-blue-500)" },
  { browser: "Marketplace", visitors: 20, fill: "var(--color-sky-400)" },
  {
    browser: "Affiliate",
    visitors: 20,
    fill: "var(--color-sky-400)",
    fillOpacity: 0.5,
  },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  Website: {
    label: "Website",
    color: "var(--color-blue-500)",
  },
  Marketplace: {
    label: "Marketplace",
    color: "var(--color-sky-400)",
  },
  Affiliate: {
    label: "Affiliate",
    color: "var(--color-sky-400)",
  },
} satisfies ChartConfig;

export default function Chart02() {
  const CustomerSegmentation = [
    {
      id: 1,
      customer: "Website ",
      tagColor: "muted-foreground",
      borderColor: "bg-blue-500",
      badgeColor: "bg-teal-400/10",
      earning: 18_356,
      growthPercentage: "+4.7%",
    },
    {
      id: 2,
      customer: "Marketplace",
      tagColor: "muted-foreground",
      borderColor: "bg-sky-400",
      badgeColor: "bg-teal-400/10",
      earning: 4590,
      growthPercentage: "+2.1%",
    },
    {
      id: 3,
      customer: "Affiliate",
      tagColor: "muted-foreground",
      borderColor: "bg-sky-400/50",
      badgeColor: "bg-teal-400/10",
      earning: 4385,
      growthPercentage: "-1.7%",
    },
  ];

  return (
    <Card className="mx-auto h-full w-full max-w-96 gap-6 py-6 shadow-xs">
      <CardHeader className="px-6">
        <CardTitle>
          <h4 className="font-medium text-lg">Earning Reports</h4>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-8 px-6">
        <ChartContainer
          className="aspect-square max-h-[200px]"
          config={chartConfig}
        >
          <PieChart
            margin={{
              top: -20,
            }}
          >
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              endAngle={-270}
              innerRadius={65}
              nameKey="browser"
              startAngle={90}
              strokeWidth={50}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-muted-foreground text-sm"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 10}
                        >
                          Total
                        </tspan>
                        <tspan
                          className="fill-foreground font-medium text-xl"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                        >
                          $27,850
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-col gap-3">
          {CustomerSegmentation.map((item) => (
            <div className="flex items-center justify-between" key={item.id}>
              <div className="flex items-center gap-2">
                <div className={cn(item.borderColor, "h-4 w-1 rounded-full")} />
                <h6 className={cn("font-normal text-sm leading-tight")}>
                  {item.customer}
                </h6>
              </div>
              <div className="flex items-center gap-1.5">
                <h6 className="font-medium text-sm">${item.earning}</h6>
                <Badge
                  className={cn(
                    item.badgeColor,
                    `text-${item.tagColor}`,
                    "shadow-none"
                  )}
                >
                  {item.growthPercentage}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
