// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: suggestions of what to search for, as chips or cards, in French.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import { RotateCw, ArrowUpRight, type LucideIcon } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { IconButton } from "@/components/ui/action-button";
import { IconTile } from "@/components/ui/surface";
import { EASE_OUT, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

export interface PromptSuggestion {
  /** Second line on cards; ignored by chips. */
  hint?: string;
  icon?: LucideIcon;
  id: string;
  /** Text to run; defaults to the title. */
  prompt?: string;
  title: string;
}

export interface PromptSuggestionsProps {
  className?: string;
  data: PromptSuggestion[];
  heading?: string;
  /** Shows a refresh button (chips) that asks for new suggestions. */
  onRefresh?: () => void;
  onSelect: (suggestion: PromptSuggestion, prompt: string) => void;
  refreshing?: boolean;
  /** `cards` for an empty chat, `chips` for follow-ups under an answer. */
  variant?: "cards" | "chips";
}

const STAGGER = 0.04;

export function PromptSuggestions({
  data,
  variant = "cards",
  onSelect,
  onRefresh,
  refreshing = false,
  heading,
  className,
}: PromptSuggestionsProps) {
  const send = (s: PromptSuggestion) => onSelect(s, s.prompt ?? s.title);
  const appear = (i: number) => ({
    initial: { opacity: 0, y: 6 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: EASE_OUT, delay: i * STAGGER },
    },
    exit: { opacity: 0, transition: exit },
  });

  if (variant === "chips") {
    return (
      <MotionConfig reducedMotion="user">
        <div className={cn("flex w-full flex-col gap-2", className)}>
          {heading && (
            <p className="px-1 font-medium text-muted-foreground text-xs">
              {heading}
            </p>
          )}
          <ul
            aria-busy={refreshing || undefined}
            aria-label={heading ?? "Suggestions"}
            className="flex flex-wrap items-center gap-1.5"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {data.map((s, i) => (
                <motion.li key={s.id} layout="position" {...appear(i)}>
                  <button
                    className="flex h-8 max-w-80 items-center gap-1.5 rounded-full bg-foreground/[0.06] pr-2.5 pl-3.5 text-[0.8125rem] transition-[background-color,scale,opacity] duration-150 ease-out hover:bg-foreground/[0.1] active:scale-[0.97] disabled:opacity-50"
                    disabled={refreshing}
                    onClick={() => send(s)}
                    type="button"
                  >
                    <span className="truncate">{s.title}</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3 shrink-0 text-muted-foreground"
                      strokeWidth={2.5}
                    />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
            {onRefresh && (
              <li>
                <IconButton
                  className={cn(
                    "[&_svg]:transition-transform",
                    refreshing &&
                      "[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none"
                  )}
                  disabled={refreshing}
                  icon={RotateCw}
                  iconWeight="bold"
                  label="Plus de suggestions"
                  onClick={onRefresh}
                />
              </li>
            )}
          </ul>
          <p aria-live="polite" className="sr-only" role="status">
            {refreshing ? "Chargement de nouvelles suggestions" : ""}
          </p>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "@container flex w-full max-w-xl flex-col gap-3",
          className
        )}
      >
        {heading && <p className="px-1 font-medium text-[1rem]">{heading}</p>}
        <ul
          aria-label={heading ?? "Suggestions de recherche"}
          className="grid @md:grid-cols-2 grid-cols-1 gap-2"
        >
          {data.map((s, i) => (
            <motion.li key={s.id} {...appear(i)}>
              <button
                className="group flex h-full w-full items-center gap-3 rounded-[1.125rem] bg-surface p-1.5 pr-3.5 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-surface-raised active:scale-[0.98]"
                onClick={() => send(s)}
                type="button"
              >
                {s.icon && <IconTile icon={s.icon} />}
                <span className={cn("min-w-0 flex-1 py-1", !s.icon && "pl-2")}>
                  <span className="block truncate font-medium text-[0.8125rem]">
                    {s.title}
                  </span>
                  {s.hint && (
                    <span className="block truncate text-muted-foreground text-xs">
                      {s.hint}
                    </span>
                  )}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-[opacity,translate] duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                  strokeWidth={2.5}
                />
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </MotionConfig>
  );
}
