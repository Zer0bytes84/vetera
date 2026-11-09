import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SkeletonBlock } from "../primitives";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { ErrorState } from "./error-state";
import { cn } from "@/lib/utils";

export function WidgetShell({
  icon,
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
  /** The tile in the band's header, as on the dashboard's bands. */
  icon?: LucideIcon;
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
  // The legacy `frame` / `card` classes drew a square box: the widget is a rounded shell now, as on the dashboard.
  const own = (className ?? "")
    .split(/\s+/)
    .filter((token) => token && token !== "frame" && token !== "card")
    .join(" ");
  return (
    <Shell aria-busy={busy} aria-label={title} className={cn("flex flex-col", own)}>
      <ShellHeader aside={actions} as="h2" icon={icon} subtitle={subtitle} title={title} />
      <Panel className={cn("flex-1 p-5", bodyClassName)}>
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
          <ErrorState className="py-0" message={error} onRetry={onRetry} />
        ) : (
          children
        )}
      </Panel>
    </Shell>
  );
}
