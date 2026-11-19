import { useEffect, useRef, type ReactNode } from "react";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utils";
import "./loading-skeleton.css";

/*
 * The loading placeholders of the Data Answer reference (TuffUI's Loading Skeleton, redrawn by hand on 19 November
 * 2026 after the UI SDK bench): « Message » for an assistant's answer, « Cards » for a row of stat cards. One effect,
 * the sheen, still under reduced motion. The region is a status named by what loads, marked busy; its shapes are hidden
 * from assistive tech; when the content arrives, `doneLabel` is announced once.
 */

type Props = { busy?: boolean; label: string; doneLabel?: string; className?: string; children?: ReactNode };

function useDoneAnnouncement(busy: boolean, doneLabel?: string) {
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy && doneLabel) announce(doneLabel);
    wasBusy.current = busy;
  }, [busy, doneLabel]);
}

const Shape = ({ className }: { className: string }) => <span aria-hidden="true" className={cn("loading-skeleton-shape", className)} data-slot="loading-skeleton-shape" />;

export function MessageSkeleton({ busy = true, label, doneLabel, className, children }: Props) {
  useDoneAnnouncement(busy, doneLabel);
  return (
    <div aria-busy={busy} aria-label={busy ? label : undefined} className={cn("loading-skeleton loading-skeleton-message", className)} data-busy={busy ? "" : undefined} data-slot="loading-skeleton" role="status">
      {busy ? (
        <>
          <span className="sr-only">{label}</span>
          <div className="loading-skeleton-question"><Shape className="loading-skeleton-pill" /></div>
          <div className="loading-skeleton-answer">
            <Shape className="loading-skeleton-avatar" />
            <div className="loading-skeleton-lines">
              {["l1", "l2", "l3", "l4"].map((line) => <Shape className={`loading-skeleton-line loading-skeleton-${line}`} key={line} />)}
            </div>
          </div>
        </>
      ) : children}
    </div>
  );
}

/** Holds the place of `count` stat cards (see stat-card.tsx), line for line, so the row does not move when they arrive. */
export function CardsSkeleton({ busy = true, label, doneLabel, className, children, count = 4, withHeader = true }: Props & { count?: 2 | 3 | 4; withHeader?: boolean }) {
  useDoneAnnouncement(busy, doneLabel);
  return (
    <div aria-busy={busy} aria-label={busy ? label : undefined} className={cn("loading-skeleton loading-skeleton-cards", className)} data-busy={busy ? "" : undefined} data-slot="loading-skeleton" role="status">
      {busy ? (
        <div className="loading-skeleton-band">
          <span className="sr-only">{label}</span>
          {withHeader ? (
            <div className="loading-skeleton-header">
              <Shape className="loading-skeleton-tile" />
              <div className="loading-skeleton-heading"><Shape className="loading-skeleton-title" /><Shape className="loading-skeleton-subtitle" /></div>
            </div>
          ) : null}
          <div className="stat-card-grid-frame"><div className="stat-card-grid" data-count={count}>
            {["c1", "c2", "c3", "c4"].slice(0, count).map((card) => (
              <div className="loading-skeleton-card" key={card}>
                <Shape className="loading-skeleton-card-label" />
                <div className="loading-skeleton-card-row"><Shape className="loading-skeleton-card-value" /></div>
                <Shape className="loading-skeleton-card-chip" />
              </div>
            ))}
          </div></div>
        </div>
      ) : children}
    </div>
  );
}
