import { useId } from "react";
import { cn } from "@/lib/utils";
import "./stat-card.css";

/*
 * A stat card of the Data Answer reference, redrawn by hand on 19 November 2026 after the UI SDK bench. A group named by
 * its label; a large value with its unit smaller. `tone` is what the figure means for the practice (takings are good
 * news, expenses are not), never a direction. A change, when there is one, is said in words for assistive tech
 * (« en hausse de 12,4 % sur octobre »), since an arrow and a sign read poorly; its sparkline is decorative.
 */

export type StatTone = "positive" | "negative" | "neutral";
export type StatDelta = {
  text: string;
  spoken: string;
  trend: "up" | "down" | "flat";
};

export function StatCard({
  label,
  value,
  unit,
  tone = "neutral",
  delta,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: StatTone;
  delta?: StatDelta;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      aria-labelledby={`${id}-label`}
      className={cn("stat-card", className)}
      data-slot="stat-card"
      data-tone={tone}
      role="group"
    >
      <p className="stat-card-label" id={`${id}-label`}>
        {tone !== "neutral" ? (
          <span aria-hidden="true" className="stat-card-tone" />
        ) : null}
        {label}
      </p>
      <div className="stat-card-row">
        <p className="stat-card-value">
          {value}
          {unit ? <span className="stat-card-unit">{unit}</span> : null}
        </p>
      </div>
      {delta ? (
        <span className="stat-card-delta" data-trend={delta.trend}>
          <span className="sr-only">{delta.spoken}</span>
          <svg
            aria-hidden="true"
            className="stat-card-arrow"
            height="12"
            viewBox="0 0 20 20"
            width="12"
          >
            <path
              d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z"
              fill="currentColor"
            />
          </svg>
          <span aria-hidden="true">{delta.text}</span>
        </span>
      ) : null}
    </div>
  );
}

/** One to four cards in a row, 6 px apart on their band; at most two per row below 44rem. */
export function StatCardGrid({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="stat-card-grid-frame">
      <div
        className="stat-card-grid"
        data-count={Math.min(4, Math.max(1, count))}
      >
        {children}
      </div>
    </div>
  );
}
