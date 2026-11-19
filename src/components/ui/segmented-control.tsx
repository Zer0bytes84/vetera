// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: unchanged from TuffUI apart from this note. Its tokens (`surface-raised`, `foreground`,
 * `muted-foreground`) are ours and exist in `tokens.css`; the sliding pill uses `motion` and `lib/motion-tokens`.
 * Used for every choice in a group in Paramètres (theme, mode, font, sidebar tint, layout).
 */

import { MotionConfig, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  disabled?: boolean;
  label: React.ReactNode;
  value: T;
}

export interface SegmentedProps<T extends string = string> {
  className?: string;
  defaultValue?: T;
  /** Accessible name for the group. */
  label: string;
  onValueChange?: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  value?: T;
}

/**
 * Segmented control with a sliding active pill. Pointer changes slide the pill;
 * arrow-key changes jump instantly, since keyboard actions should never wait.
 */
export function Segmented<T extends string = string>({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  label,
  size = "sm",
  className,
}: SegmentedProps<T>) {
  const [inner, setInner] = useState<T>(defaultValue ?? options[0]?.value);
  const value = valueProp ?? inner;
  const [instant, setInstant] = useState(false);
  const pillId = useId();
  const ref = useRef<HTMLDivElement>(null);

  const select = (next: T, fromKeyboard: boolean) => {
    setInstant(fromKeyboard);
    if (valueProp === undefined) {
      setInner(next);
    }
    onValueChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      e.key
    ];
    if (!step) {
      return;
    }
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const at = enabled.findIndex((o) => o.value === value);
    const next = enabled[(at + step + enabled.length) % enabled.length];
    if (!next) {
      return;
    }
    select(next.value, true);
    ref.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
      ?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-label={label}
        className={cn(
          "inline-flex items-center rounded-full bg-foreground/[0.05] p-0.5",
          size === "sm" ? "h-8" : "h-9",
          className
        )}
        onKeyDown={onKeyDown}
        ref={ref}
        role="radiogroup"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              aria-checked={active}
              className={cn(
                "relative h-full rounded-full font-medium transition-[color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-40",
                size === "sm" ? "px-3 text-[0.8125rem]" : "px-4 text-sm",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-value={option.value}
              disabled={option.disabled}
              key={option.value}
              onClick={(e) => select(option.value, e.detail === 0)}
              role="radio"
              tabIndex={active ? 0 : -1}
              type="button"
            >
              {active && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-surface-raised"
                  layoutId={pillId}
                  transition={instant ? { duration: 0 } : spring}
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>
    </MotionConfig>
  );
}
