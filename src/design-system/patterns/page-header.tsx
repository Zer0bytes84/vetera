import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import "@/design-system/page-header-line.css";

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
 * The one page header of the app, on the model of the dashboard's welcome line: one line of text, « Titre : note », the page's
 * actions on the right, no icon tile and no rule under it. Pages keep their own actions and pass them as is.
 * `icon` and `kicker` are accepted for callers that still pass them, and are not drawn.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
}: {
  /** @deprecated Not drawn: the header is text only. */
  icon?: ReactNode;
  title: ReactNode;
  /** The note after the title: a few words, « liste du cabinet ». */
  subtitle?: ReactNode;
  /** @deprecated Not drawn: the header is a single line. */
  kicker?: ReactNode;
  /** Way back to the parent list, sitting before the title. */
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
        className={cn("page-header page-header-line", className)}
        data-page-title={typeof title === "string" ? title : undefined}
        data-slot="page-header"
      >
        <div className="page-header-lead">
          {back && <div className="page-header-back shrink-0">{back}</div>}
          <h1 className="page-header-title">
            <span className="page-header-name">{title}</span>
            {subtitle ? <span className="page-header-note">{" : "}{subtitle}</span> : null}
          </h1>
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
