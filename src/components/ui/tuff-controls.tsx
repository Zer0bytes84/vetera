// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { Check, Minus, Search, X, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * The small controls TuffUI's Data Table is built from (their Action Button, Choice Controls, Text Field and Empty State),
 * adapted for Baitari in one file: round quiet buttons, the borderless checkbox that fills with the accent, the round
 * search field, the empty state. Colours are our tokens (never the TuffUI theme); icons are lucide, line weight for what
 * Phosphor drew bold; text is French and never under 12 px. They sit beside our own Button, Checkbox and Input, which
 * keep their look elsewhere in the app.
 */

const base =
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-[background-color,color,scale,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

/** Quiet round text button: no fill until hovered. */
export function QuietButton({
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        base,
        "h-8 gap-1.5 px-3.5 text-[0.8125rem] text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

/** Round, icon-only quiet button. `label` is its accessible name (no native tooltip: the label is for assistive tech). */
export function IconButton({
  icon: Icon,
  label,
  className,
  type = "button",
  strokeWidth = 2,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  icon: LucideIcon;
  label: string;
  strokeWidth?: number;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        base,
        "size-8 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
        className,
      )}
      type={type}
      {...props}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={strokeWidth} />
    </button>
  );
}

/** Borderless checkbox: a tinted square that fills with the accent and a bold check. */
export function TuffCheckbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean | "mixed";
  onCheckedChange?: (checked: boolean) => void;
}) {
  const on = checked !== false;
  return (
    <button
      aria-checked={checked}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[6px] shadow-[inset_0_1px_2px_rgb(0_0_0/0.14)] transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.92] disabled:opacity-40 dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]",
        on
          ? "bg-brand text-white"
          : "bg-foreground/[0.12] hover:bg-foreground/[0.18]",
        className,
      )}
      onClick={() => onCheckedChange?.(checked !== true)}
      role="checkbox"
      type="button"
      {...props}
    >
      {checked === "mixed" ? (
        <Minus aria-hidden="true" className="size-3" strokeWidth={3} />
      ) : (
        checked && (
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        )
      )}
    </button>
  );
}

const control =
  "w-full bg-foreground/[0.06] text-sm text-foreground outline-none transition-[background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-muted-foreground hover:bg-foreground/[0.08] focus-visible:bg-foreground/[0.1] disabled:opacity-40";

/** Round search field with its glyph, and a clear button while there is text. */
export function SearchField({
  className,
  onClear,
  value,
  placeholder = "Rechercher",
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "className"> & {
  className?: string;
  onClear?: () => void;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
      <input
        aria-label={placeholder}
        className={cn(
          control,
          "h-9 rounded-full pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden",
        )}
        id={id}
        placeholder={placeholder}
        type="search"
        value={value}
        {...props}
      />
      {onClear && value !== undefined && value !== "" && (
        <button
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,scale] duration-150 hover:bg-foreground/[0.08] hover:text-foreground active:scale-[0.92]"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

/** Empty state, compact (a row, for an empty list inside a panel) or centred. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
  className,
}: {
  icon?: LucideIcon;
  /** On the right of a compact empty state. */
  action?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex",
        compact
          ? "items-center gap-3 px-3 py-3 text-left"
          : "flex-col items-center px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center bg-foreground/[0.06] text-muted-foreground",
            compact ? "size-9 rounded-xl" : "mb-4 size-12 rounded-2xl",
          )}
        >
          <Icon className={compact ? "size-4" : "size-5"} strokeWidth={2} />
        </div>
      )}
      <div className={cn("min-w-0", compact && "flex-1")}>
        <p className={cn("font-medium", compact ? "text-sm" : "text-[1rem]")}>
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "text-[0.8125rem] text-pretty text-muted-foreground",
              compact ? "mt-0.5" : "mx-auto mt-1 max-w-xs",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
