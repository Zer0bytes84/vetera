"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  { month: "Jan", expense: 31, profit: 31, earning: 31 },
  { month: "Feb", expense: 83, profit: 83, earning: 83 },
  { month: "Mar", expense: 53, profit: 53, earning: 53 },
  { month: "Apr", expense: 36, profit: 36, earning: 36 },
  { month: "May", expense: 64, profit: 64, earning: 64 },
  { month: "Jun", expense: 47, profit: 47, earning: 47 },
  { month: "Jul", expense: 95, profit: 95, earning: 95 },
  { month: "Aug", expense: 69, profit: 69, earning: 69 },
  { month: "Sep", expense: 29, profit: 29, earning: 29 },
  { month: "Oct", expense: 73, profit: 73, earning: 73 },
  { month: "Nov", expense: 27, profit: 27, earning: 27 },
  { month: "Dec", expense: 53, profit: 53, earning: 53 },
];

const chartConfig = {
  expense: {
    label: "Expense",
    color: "var(--color-blue-500)",
  },
  profit: {
    label: "Profit",
    color: "var(--color-sky-400)",
  },
  earning: {
    label: "Earning",
    color: "var(--color-sky-400)",
  },
} satisfies ChartConfig;

export default function Chart01() {
  const Countries = [
    {
      id: 1,
      title: "Earning",
      color: "bg-sky-400/50",
    },
    {
      id: 2,
      title: "Profit",
      color: "bg-sky-400",
    },
    {
      id: 3,
      title: "Expense",
      color: "bg-blue-500",
    },
  ];

  return (
    <Card className="mx-auto w-full max-w-3xl gap-8 py-6 shadow-xs">
      <CardHeader className="flex flex-col items-start justify-between gap-3 px-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <CardTitle className="font-medium text-lg">Sales Overview</CardTitle>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-3xl text-card-foreground">
              $386.53K
            </h3>
            <Badge
              className={cn("bg-teal-400/10 text-muted-foreground shadow-none")}
            >
              +18%
            </Badge>
            <span className="text-muted-foreground text-xs">
              than last year
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {Countries.map((item) => (
            <div className="flex items-center gap-1.5" key={item.id}>
              <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
              <p className="text-muted-foreground text-sm">{item.title}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: -20,
            }}
          >
            <CartesianGrid
              stroke="rgba(144, 164, 174, 0.3)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="month"
              fontSize={12}
              tickFormatter={(value) => value.slice(0, 3)}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              fontSize={12}
              tickFormatter={(value) => `${value / 10}k`}
              tickLine={false}
              tickMargin={10}
              ticks={[0, 50, 100, 150, 200, 250, 300]}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel indicator="line" />}
              cursor={false}
            />
            <Bar
              barSize={20}
              dataKey="expense"
              fill="var(--color-expense)"
              radius={[0, 0, 4, 4]}
              stackId="a"
            />
            <Bar
              barSize={20}
              dataKey="profit"
              fill="var(--color-profit)"
              radius={[0, 0, 0, 0]}
              stackId="a"
            />
            <Bar
              barSize={20}
              dataKey="earning"
              fill="var(--color-earning)"
              fillOpacity={0.5}
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
