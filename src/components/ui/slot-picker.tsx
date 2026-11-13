// TUFFUI (https://tuffui.com) · MIT License · Copyright (c) 2026 TUFFUI contributors
// Free to use. If it helps you, you can support it: https://ko-fi.com/yurigokoryan
"use client";

import { CalendarDaysIcon } from "@heroicons/react/20/solid";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Panel, Shell, ShellHeader } from "@/components/ui/surface";
import { EASE_OUT, exit } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";

/*
 * Adapted for Baitari from TuffUI's Slot Picker, week variant: one column per day under its weekday and date, a pill per
 * time, arrow keys that walk the grid like cells, a summary row and a confirm button that slide in once a time is chosen.
 * What changes:
 *  - the days are given (`days`), so a day with nothing free keeps its column and says so; slots are the clinic's real free
 *    half hours, never a suggestion (no « suggested » star: nothing recommends a time here);
 *  - no time-zone switch and no « Invite sent » state: the clinic has one clock, and confirming opens the appointment form
 *    on that time instead of ending here (`onConfirm`);
 *  - colours are our tokens, never the TuffUI theme; the chosen pill is the accent blue with white text;
 *  - text is French and never under 12 px; the confirm button is our own Button.
 */

export type Slot = {
  id: string;
  /** Local day, "2026-11-10". */
  day: string;
  /** "HH:MM", local. */
  start: string;
  end: string;
};

export type SlotPickerProps = {
  title?: string;
  subtitle?: ReactNode;
  /** Every column, in order, whether or not it has a free time. */
  days: string[];
  slots: Slot[];
  /** Words of the confirm button. */
  confirmLabel?: string;
  onConfirm?: (slot: Slot) => void;
  /** Under the panel: a footer line. */
  footer?: ReactNode;
  className?: string;
};

const dayDate = (day: string) => new Date(`${day}T00:00:00`);
const weekday = (day: string) => dayDate(day).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
const dayLabel = (day: string) => dayDate(day).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export function SlotPicker({
  title = "Choisir un créneau",
  subtitle,
  days,
  slots,
  confirmLabel = "Confirmer",
  onConfirm,
  footer,
  className,
}: SlotPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const selected = slots.find((slot) => slot.id === selectedId);
  const columns = days.map((day) => slots.filter((slot) => slot.day === day).sort((a, b) => a.start.localeCompare(b.start)));
  const firstFilled = columns.findIndex((column) => column.length);

  // Arrow keys move between times like a grid: up and down within a day, left and right across days.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
    const at = (document.activeElement as HTMLElement | null)?.dataset.cell?.split(":").map(Number);
    if (!move || !at) return;
    event.preventDefault();
    let col = at[0] + move[0];
    // Skip the days with nothing free.
    while (move[0] && col >= 0 && col < columns.length && !columns[col].length) col += move[0];
    col = Math.min(Math.max(col, 0), columns.length - 1);
    if (!columns[col].length) return;
    const row = Math.min(Math.max(at[1] + move[1], 0), columns[col].length - 1);
    grid.current?.querySelector<HTMLElement>(`[data-cell="${col}:${row}"]`)?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <Shell aria-label={title} className={cn("flex h-full flex-col", className)}>
        <ShellHeader as="h2" icon={CalendarDaysIcon} subtitle={subtitle} title={title} />
        <Panel className="flex flex-1 flex-col p-3">
          <div
            aria-label="Créneaux libres"
            className="grid gap-2"
            onKeyDown={onKeyDown}
            ref={grid}
            role="group"
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
          >
            {columns.map((column, col) => (
              <div aria-label={dayLabel(days[col])} className="flex min-w-0 flex-col gap-1.5" key={days[col]} role="group">
                <p aria-hidden="true" className="pb-1 text-center text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground first-letter:uppercase">{weekday(days[col])}</span>
                  {dayDate(days[col]).getDate()}
                </p>
                {column.length ? (
                  column.map((slot, row) => {
                    const active = slot.id === selectedId;
                    return (
                      <button
                        aria-label={`${dayLabel(slot.day)} ${slot.start}`}
                        aria-pressed={active}
                        className={cn(
                          "relative flex h-9 items-center justify-center rounded-full px-2 font-mono text-xs tabular-nums transition-[background-color,color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                          active ? "bg-[var(--tone-blue)] text-white" : "bg-foreground/[0.06] hover:bg-foreground/[0.1]",
                        )}
                        data-cell={`${col}:${row}`}
                        key={slot.id}
                        onClick={() => setSelectedId(active ? null : slot.id)}
                        tabIndex={active || (!selectedId && col === firstFilled && row === 0) ? 0 : -1}
                        type="button"
                      >
                        <span className="truncate">{slot.start}</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-1 pt-1 text-center text-xs text-muted-foreground">Complet</p>
                )}
              </div>
            ))}
          </div>
          {footer ? <div className="mt-auto pt-3">{footer}</div> : null}
        </Panel>
        <AnimatePresence initial={false}>
          {selected && (
            <motion.div
              animate={{ height: "auto", opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0, transition: exit }}
              initial={{ height: 0, opacity: 0 }}
            >
              <div className="flex items-center justify-between gap-3 pt-1.5 pr-px pb-px pl-3">
                <p className="min-w-0 truncate text-[0.8125rem]">
                  <span className="font-medium first-letter:uppercase">{dayLabel(selected.day)}</span>{" "}
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {selected.start}–{selected.end}
                  </span>
                </p>
                <Button className="rounded-full px-4" onClick={() => onConfirm?.(selected)} size="sm">
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p aria-live="polite" className="sr-only" role="status">
          {selected ? `Sélectionné : ${dayLabel(selected.day)} ${selected.start}` : ""}
        </p>
      </Shell>
    </MotionConfig>
  );
}
