import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface SectionCardItem {
  badge: string;
  footerDescription: string;
  footerTitle: string;
  title: string;
  trend: "up" | "down" | "neutral";
  value: string;
}

export function SectionCards({ items }: { items: SectionCardItem[] }) {
  return (
    <div className="grid gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {items.map((item, idx) => {
        const isUp = item.trend === "up";
        const isDown = item.trend === "down";
        const TrendIcon = isUp
          ? TrendingUp
          : isDown
            ? TrendingDown
            : TrendingUp;
        return (
          <Card className="@container/card" key={idx}>
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
                {item.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendIcon />
                  {item.badge}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {item.footerTitle} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                {item.footerDescription}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
