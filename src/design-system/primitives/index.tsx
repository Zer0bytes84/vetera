import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
export const press =
  "transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50";

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card", className)} {...props} />;
}
export function Panel({
  children,
  className,
  bodyClassName,
  ...props
}: HTMLAttributes<HTMLElement> & { bodyClassName?: string }) {
  return (
    <section
      className={cn("rounded-panel bg-frame p-1 shadow-hairline", className)}
      {...props}
    >
      <div
        className={cn(
          "min-w-0 rounded-body bg-surface text-ink",
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
export function Stat({
  label,
  value,
  detail,
  compact,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display font-medium leading-tight tabular-nums tracking-[-0.035em]",
          compact ? "text-[28px]" : "text-[34px]"
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1.5 text-[12px] text-ink-muted">{detail}</p>}
    </div>
  );
}
export type SignalTone = "critical" | "watch" | "positive" | "quiet" | "info";
const signals: Record<SignalTone, string> = {
  critical: "bg-signal-critical/10 text-rose-700 dark:text-rose-300",
  watch: "bg-signal-watch/10 text-amber-800 dark:text-amber-300",
  positive: "bg-signal-positive/10 text-emerald-700 dark:text-emerald-300",
  quiet: "bg-signal-quiet/10 text-ink-muted",
  info: "bg-secondary/10 text-sky-700 dark:text-sky-300",
};
export function SignalBadge({
  tone = "quiet",
  children,
  icon,
}: {
  tone?: SignalTone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium leading-none",
        signals[tone]
      )}
    >
      {icon}
      {children}
    </span>
  );
}
export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-frame hover:text-ink",
        focusRing,
        press,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
  compact,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-center gap-3",
        compact ? "px-4 py-5" : "px-5 py-8"
      )}
    >
      {icon && (
        <span className="text-ink-muted" aria-hidden="true">
          {icon}
        </span>
      )}
      <div>
        <p className="font-display font-medium text-[14px] text-ink">{title}</p>
        {description && (
          <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
export function SkeletonBlock({
  className,
  visible = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { visible?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-control bg-frame",
        visible && "animate-skeleton motion-reduce:animate-none",
        !visible && "opacity-0",
        className
      )}
      {...props}
    />
  );
}
export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-hairline bg-surface-raised px-1 py-0.5 font-sans text-[10px] text-ink-muted">
      {children}
    </kbd>
  );
}
export function ActionButton({
  children,
  quiet = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { quiet?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[30px] items-center justify-center gap-1.5 rounded-control px-3 text-xs font-medium",
        quiet
          ? "bg-frame text-ink hover:bg-signal-quiet/15"
          : "crm-primary-control bg-primary text-primary-foreground hover:bg-primary/90",
        focusRing,
        press,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
