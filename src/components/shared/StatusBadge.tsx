import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
  children: ReactNode;
}

export function StatusBadge({
  className,
  variant = "outline",
  children,
}: StatusBadgeProps) {
  return (
    <Badge
      className={cn("border-transparent", className)}
      variant={variant}
    >
      {children}
    </Badge>
  );
}

interface StockStatusBadgeProps {
  isExpired: boolean | undefined;
  isOut: boolean | undefined;
  isLow: boolean | undefined;
}

export function StockStatusBadge({
  isExpired,
  isOut,
  isLow,
}: StockStatusBadgeProps) {
  const meta = isExpired
    ? { label: "Expiré", className: "bg-violet-500/10 text-violet-700 dark:text-violet-300" }
    : isOut
      ? { label: "Rupture", className: "bg-red-500/10 text-red-700 dark:text-red-300" }
      : isLow
        ? { label: "Stock Bas", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
        : { label: "OK", className: "bg-green-500/10 text-green-700 dark:text-green-300" };

  return (
    <StatusBadge className={meta.className}>
      {meta.label}
    </StatusBadge>
  );
}
