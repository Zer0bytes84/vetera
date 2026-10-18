import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon } from "@/lib/hugeicons";
import { cn } from "@/lib/utils";

/**
 * The one loading error of the app: icon, 13 px #5D5D5D message and a
 * "Réessayer" button. It draws no frame of its own, so it sits in the frame
 * of the section that hosts it.
 */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Réessayer",
  className,
}: {
  message: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("error-state flex items-start gap-3 py-3", className)}
      data-slot="error-state"
      role="alert"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-px shrink-0 text-[color:var(--ink-muted,#7f7f7f)]"
        icon={AlertCircleIcon}
        size={18}
        strokeWidth={1.5}
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <p className="t-13 leading-5 text-[color:var(--ink-soft,#5d5d5d)]">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} size="sm" type="button" variant="outline">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
