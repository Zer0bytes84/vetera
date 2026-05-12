import { cn } from "@/lib/utils";

// Keyframes pour l'animation shimmer
const shimmerStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

function Skeleton({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "shimmer" | "card" | "text";
}) {
  const baseStyles = "relative overflow-hidden rounded-2xl bg-muted";

  const variants = {
    default: "animate-pulse",
    shimmer:
      "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
    card: "animate-pulse rounded-[24px] border border-border/50",
    text: "animate-pulse rounded-md",
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

// Skeleton spécifiques pour le dashboard
function DashboardCardSkeleton() {
  return (
    <>
      <style>{shimmerStyles}</style>
      <div className="flex min-h-[358px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-4">
        <div className="relative min-h-[186px] overflow-hidden rounded-[18px] border border-border/50 bg-muted/30 px-4 py-4">
          <div className="mb-3 space-y-2">
            <Skeleton className="h-2 w-20" variant="shimmer" />
            <Skeleton className="h-5 w-24" variant="shimmer" />
            <Skeleton className="h-2 w-32" variant="shimmer" />
          </div>
          <Skeleton className="h-[100px] w-full" variant="shimmer" />
        </div>
        <div className="mt-auto space-y-2 px-1.5 pt-5">
          <Skeleton className="h-4 w-3/4" variant="shimmer" />
          <Skeleton className="h-3 w-full" variant="shimmer" />
          <Skeleton className="h-3 w-2/3" variant="shimmer" />
        </div>
      </div>
    </>
  );
}

function DashboardMetricSkeleton() {
  return (
    <div className="flex min-h-[132px] flex-col justify-between px-4 py-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" variant="shimmer" />
        <Skeleton className="h-6 w-20" variant="shimmer" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-8 rounded-full" variant="shimmer" />
        <Skeleton className="h-2 w-20" variant="shimmer" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" variant="shimmer" />
        <Skeleton className="h-8 w-20 rounded-lg" variant="shimmer" />
      </div>
      <Skeleton className="w-full flex-1 rounded-xl" variant="shimmer" />
    </div>
  );
}

export {
  ChartSkeleton,
  DashboardCardSkeleton,
  DashboardMetricSkeleton,
  Skeleton,
};
