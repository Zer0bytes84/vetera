import { cn } from "@/lib/utils";

export interface StatItem {
  id: string;
  title: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

interface StatsTrendingProps {
  items: StatItem[];
  className?: string;
}

export function StatsTrending({ items, className }: StatsTrendingProps) {
  return (
    <div className={cn("overflow-hidden rounded-[16px] border border-border dark:border-border", className)}>
      <dl className="grid grid-cols-1 gap-px bg-border dark:bg-border sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const isUp = item.trendDirection === "up";
          const isDown = item.trendDirection === "down";
          
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-card dark:bg-card px-4 py-10 sm:px-6 xl:px-8"
            >
              <dt className="text-sm/6 font-medium text-muted-foreground">{item.title}</dt>
              {item.trend && (
                <dd
                  className={cn(
                    "text-xs font-medium",
                    isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                  )}
                >
                  {item.trend}
                </dd>
              )}
              <dd className="w-full flex-none text-3xl/10 font-medium tracking-tight text-foreground">
                {item.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
