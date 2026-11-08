// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

/*
 * Adapted for Baitari: counts characters of the dictation (not tokens); the segment colours are our tones.
 * Icons are lucide (`strokeWidth={2.5}` for what Phosphor drew bold); colours are our tokens (`brand`, `positive`,
 * `negative`, `warning` are our tones; never the TuffUI theme); text is French, never under 12 px; no demo data.
 */

import { Lock, TriangleAlert } from "lucide-react";
import { MotionConfig } from "motion/react";
import { RollingNumber } from "@/components/ui/rolling-number";
import { Tag } from "@/components/ui/status-pill";
import { Panel, Shell } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** One part of what is counted (here: characters of the dictation). */
export type ContextSegment = {
  id: string;
  label: string;
  tokens: number;
  /** Secondary text under the label. */
  detail?: string;
  /** Marks a segment that is always kept. */
  pinned?: boolean;
  /** Any CSS color. Defaults to the built-in palette by position. */
  color?: string;
};

export type ContextWindowMeterProps = {
  data: { limit: number; segments: ContextSegment[]; model?: string };
  /** Share of the limit (0–1) where the warning zone starts. */
  warnAt?: number;
  /** `card` for a panel, `inline` for a single row in a composer footer. */
  variant?: "card" | "inline";
  className?: string;
};

// Segment colours: our own tones, in order (blue, violet, green, amber, rose, quiet grey).
const palette = [
  "var(--tone-blue)",
  "var(--tone-violet)",
  "var(--tone-green)",
  "var(--tone-amber)",
  "var(--tone-rose)",
  "var(--muted-foreground)",
];

export const formatTokens = (n: number) =>
  n < 1000
    ? `${Math.round(n)}`
    : `${(n / 1000).toFixed(n < 100_000 ? 1 : 0).replace(".", ",")} k`;

/** Splits the limit into `count` cells and colors each by the segment that fills it. */
function fillCells(
  segments: { tokens: number; color: string }[],
  limit: number,
  count: number,
) {
  const cells: (string | null)[] = [];
  for (const s of segments) {
    // Every non-empty segment gets at least one cell, so small ones stay visible.
    const n = s.tokens > 0 ? Math.max(1, Math.round((s.tokens / limit) * count)) : 0;
    for (let i = 0; i < n && cells.length < count; i++) cells.push(s.color);
  }
  while (cells.length < count) cells.push(null);
  return cells;
}

export function ContextWindowMeter({
  data,
  warnAt = 0.8,
  variant = "card",
  className,
}: ContextWindowMeterProps) {
  const { limit, segments } = data;
  const used = segments.reduce((n, s) => n + s.tokens, 0);
  const ratio = used / limit;
  const warning = ratio >= warnAt;
  const colored = segments.map((s, i) => ({
    ...s,
    color: s.color ?? palette[i % palette.length],
  }));
  const inline = variant === "inline";
  const count = inline ? 20 : 100;
  const cells = fillCells(colored, limit, count);
  const percent = Math.round(ratio * 100);

  const grid = (
    <div
      role="meter"
      aria-label="Longueur de la dictée"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={used}
      aria-valuetext={`${used.toLocaleString("fr-FR")} sur ${limit.toLocaleString("fr-FR")} caractères (${percent} %)`}
      className={cn(
        "grid",
        inline ? "w-28 grid-cols-[repeat(20,1fr)] gap-px" : "grid-cols-20 gap-1",
      )}
    >
      {cells.map((color, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "transition-colors duration-200 ease-out motion-reduce:duration-0",
            inline ? "h-2.5 rounded-[2px]" : "aspect-square rounded-[3px]",
            !color &&
              (i >= Math.round(warnAt * count)
                ? "bg-warning/20"
                : "bg-foreground/[0.07]"),
          )}
          style={{ background: color ?? undefined }}
        />
      ))}
    </div>
  );

  const announcement = warning
      ? "Limite de la dictée proche"
      : "";

  if (inline) {
    return (
      <MotionConfig reducedMotion="user">
        <div className={cn("flex items-center gap-2 text-xs", className)}>
          {warning && (
            <TriangleAlert
             
              className="size-3.5 text-warning"
              aria-label="Proche de la limite"
            />
          )}
          {grid}
          <span className="font-mono text-muted-foreground tabular-nums">
            <span className={cn("text-foreground", warning && "text-warning")}>
              <RollingNumber value={formatTokens(used)} />
            </span>
            {" / "}
            {formatTokens(limit)}
          </span>
          <p role="status" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-label="Longueur de la dictée" className={cn("max-w-md", className)}>
        <Panel className="p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="text-[0.8125rem] text-muted-foreground">
              Dictée
              {data.model && (
                <Tag className="ml-2 rounded-full px-2 text-foreground">{data.model}</Tag>
              )}
            </h3>
          </div>
          <p className="mb-4 flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-[1.5rem] leading-tight font-medium tracking-tight tabular-nums",
                warning && "text-warning",
              )}
            >
              <RollingNumber value={formatTokens(used)} />
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">
              sur {formatTokens(limit)} · <RollingNumber value={`${percent} %`} /> utilisé
            </span>
          </p>
          {grid}
          <p
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs",
              warning ? "text-warning" : "text-muted-foreground",
            )}
          >
            {warning && (
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {warning
              ? `Zone d’alerte : ${formatTokens(Math.max(limit - used, 0))} caractères restants`
              : `Les cases teintées marquent les derniers ${100 - Math.round(warnAt * 100)} %`}
          </p>
        </Panel>
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1 px-3 py-3 @sm:grid-cols-2">
          {colored.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5 py-1">
              <span
                aria-hidden="true"
                className="mt-1 size-2.5 shrink-0 rounded-[3px]"
                style={{ background: s.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-[0.8125rem]">
                  {s.label}
                  {s.pinned && (
                    <Lock
                     
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-label="Conservé"
                    />
                  )}
                </span>
                {s.detail && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.detail}
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatTokens(s.tokens)}
              </span>
            </li>
          ))}
        </ul>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </Shell>
    </MotionConfig>
  );
}
