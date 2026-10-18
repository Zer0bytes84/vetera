import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * A host (the clinical workspace) can hand a navigation bar to the header of
 * whatever page it shows: the bar then sits right under the common header.
 * `claim` tells the host the header took it, so it does not draw it twice.
 */
export const PageSubnavContext = createContext<{
  node: ReactNode;
  claim: (claimed: boolean) => void;
} | null>(null);

/**
 * The one page header of the app: icon in a tile, 24 px title, 13 px subtitle,
 * actions on the right. Pages keep their own actions and pass them as is.
 * The premium-page-* classes keep the existing Premium engraving.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  kicker,
  back,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small line above the title (a date, a parent section). */
  kicker?: ReactNode;
  /** Way back to the parent list, shown before the title. */
  back?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const subnav = useContext(PageSubnavContext);
  const claim = subnav?.claim;
  useLayoutEffect(() => {
    claim?.(true);
    return () => claim?.(false);
  }, [claim]);
  return (
    <>
      <div
        className={cn(
          "page-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
          className,
        )}
        data-slot="page-header"
      >
        <div className="min-w-0">
          {back && <div className="page-header-back mb-2">{back}</div>}
          <div className="premium-page-head min-w-0">
            <div className="premium-page-head-main flex min-w-0 items-start gap-3.5">
              {icon && (
                <div
                  aria-hidden="true"
                  className="premium-page-icon page-header-icon grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground [&_svg]:size-5"
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {kicker && (
                  <div className="page-header-kicker t-12 text-muted-foreground">
                    {kicker}
                  </div>
                )}
                <h1 className="premium-page-title page-header-title font-heading font-medium t-24 leading-tight tracking-[-0.03em] text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="premium-page-note page-header-subtitle mt-1 t-13 text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {actions && (
          <div
            className="page-header-actions flex shrink-0 flex-wrap items-center gap-2"
            data-slot="page-header-actions"
          >
            {actions}
          </div>
        )}
      </div>
      {subnav?.node}
    </>
  );
}
