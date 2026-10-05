import type { ReactNode } from "react";
import { Panel, SkeletonBlock, ActionButton } from "../primitives";
import { cn } from "@/lib/utils";

export function WidgetShell({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  pending = false,
  showSkeleton = false,
  skeleton,
  error,
  onRetry,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  pending?: boolean;
  showSkeleton?: boolean;
  skeleton?: ReactNode;
  error?: string | null;
  onRetry?: () => void;
}) {
  const busy = pending || showSkeleton;
  return (
    <Panel
      aria-label={title}
      aria-busy={busy}
      className={className}
      bodyClassName={cn("p-5", bodyClassName)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-medium text-[16px] leading-6 tracking-[-0.02em]">
            {title}
          </h2>
          {subtitle && (
            <div className="mt-1 text-[12px] leading-5 text-ink-muted">
              {subtitle}
            </div>
          )}
        </div>
        {actions}
      </div>
      {busy ? (
        <div
          className={cn("min-h-[120px]", !showSkeleton && "opacity-0")}
          aria-hidden="true"
        >
          {skeleton ?? (
            <>
              <SkeletonBlock className="h-7 w-1/3" />
              <SkeletonBlock className="mt-4 h-16 w-full" />
            </>
          )}
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p className="text-[13px] text-ink-muted">{error}</p>
          <ActionButton quiet onClick={onRetry}>
            Réessayer
          </ActionButton>
        </div>
      ) : (
        children
      )}
    </Panel>
  );
}
