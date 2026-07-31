import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetShellProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
}

export function WidgetShell({
  action,
  children,
  className,
  contentClassName,
  description,
  icon: Icon,
  iconClassName,
  title,
}: WidgetShellProps) {
  return (
    <Card
      className={cn(
        "dashboard-v2-widget h-full min-w-0 border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.02),0_12px_32px_-26px_rgba(15,23,42,0.35)]",
        className
      )}
    >
      <CardHeader className="min-h-16 border-border/75 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700 ring-1 ring-zinc-950/5 dark:bg-white/7 dark:text-zinc-200 dark:ring-white/8",
              iconClassName
            )}
          >
            <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate font-semibold text-[15px] tracking-[-0.015em]">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="mt-0.5 truncate text-xs">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
        {action ? (
          <CardAction className="self-center">{action}</CardAction>
        ) : null}
      </CardHeader>
      <CardContent className={cn("flex-1 p-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-label="Chargement du widget"
      className={cn(
        "h-[360px] animate-pulse rounded-2xl border border-border/80 bg-card p-5",
        className
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-zinc-100 dark:bg-white/8" />
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-zinc-100 dark:bg-white/8" />
          <div className="h-2.5 w-44 rounded-full bg-zinc-100 dark:bg-white/8" />
        </div>
      </div>
      <div className="mt-8 h-[230px] rounded-xl bg-zinc-100/70 dark:bg-white/6" />
    </div>
  );
}
