import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  type Package02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";
import { Card, CardContent } from "./card";

export function StatTile({
  title,
  value,
  detail,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  trend: number;
  icon: typeof Package02Icon;
}) {
  const positive = trend >= 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium text-sm text-text-secondary">{title}</p>
              <p className="font-semibold text-3xl tracking-[-0.04em]">
                {value}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="gap-1"
                variant={positive ? "success" : "warning"}
              >
                {positive ? (
                  <HugeiconsIcon
                    className="size-3"
                    icon={ArrowUp01Icon}
                    strokeWidth={2}
                  />
                ) : (
                  <HugeiconsIcon
                    className="size-3"
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                  />
                )}
                {Math.abs(trend).toFixed(0)}%
              </Badge>
              <span className="text-muted-foreground text-sm">{detail}</span>
            </div>
          </div>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl bg-[var(--surface-200)]",
              positive
                ? "text-[var(--accent)]"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            <HugeiconsIcon className="size-5" icon={Icon} strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
