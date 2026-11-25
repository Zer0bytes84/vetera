import { useEffect, useRef, type ReactNode } from "react";
import { useRememberedRows } from "@/hooks/useRememberedRows";
import { announce } from "@/lib/announce";
import { cn } from "@/lib/utils";
import "./stat-card.css";
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

/** One shape of the sheen, for a list or a table drawing its own skeleton (inside an element marked `loading-skeleton`). */
export const SkeletonShape = ({ className }: { className?: string }) => <Shape className={className ?? ""} />;

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

/** Holds the place of `count` stat cards (see stat-card.tsx, whose grid it borrows: stat-card.css), line for line, so the row does not move when they arrive. */
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

/**
 * A region of a page that is read (a list of groups, a board, a record's panels): while `busy`, it holds the height the
 * region had last time on this computer (`memoryKey`; `fallbackHeight` the very first time), drawn as rows of the sheen;
 * once read, it shows its content and remembers that content's height for the next time. With `revealed` false the place
 * is held but nothing is drawn yet (useDelayedSkeleton: no flash on a fast read).
 */
export function SkeletonRegion({
  busy,
  revealed = true,
  label,
  memoryKey,
  fallbackHeight,
  className,
  children,
}: {
  busy: boolean;
  revealed?: boolean;
  label: string;
  memoryKey: string;
  fallbackHeight: number;
  className?: string;
  children: ReactNode;
}) {
  const { reserved, measure } = useRememberedRows<HTMLDivElement>(memoryKey, { rows: 1, rowHeight: fallbackHeight }, "block");
  if (!busy) return <div className={className} data-skeleton-region={memoryKey} ref={measure}>{children}</div>;
  // Empty last time: nothing to hold, nothing drawn (a class such as `empty:hidden` keeps the layout the same).
  if (reserved.rowHeight === 0) return <div className={className} data-skeleton-region={memoryKey} hidden />;
  const lines = Math.max(1, Math.floor((reserved.rowHeight - 16) / 64));
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn("loading-skeleton loading-skeleton-region", className, !revealed && "invisible")}
      data-skeleton-region={memoryKey}
      data-slot="loading-skeleton"
      role="status"
      style={{ height: reserved.rowHeight }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div className="loading-skeleton-region-row" key={i}>
          <Shape className="loading-skeleton-avatar" />
          <div className="loading-skeleton-lines">
            <Shape className="loading-skeleton-line loading-skeleton-l1" />
            <Shape className="loading-skeleton-line loading-skeleton-l3" />
          </div>
        </div>
      ))}
    </div>
  );
}
