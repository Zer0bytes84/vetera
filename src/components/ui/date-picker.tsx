import { useState } from "react";
import { CalendarDays } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Compact popover calendar: 36px days. The width is explicit because a popover
 * sized from its content would otherwise let the stretchable day cells grow.
 */
export const COMPACT_CALENDAR_CLASS = "p-1 [--cell-size:--spacing(9)] w-[calc(var(--cell-size)*7+0.5rem)]";

/** Parse a civil YYYY-MM-DD day as a local date, never through UTC. */
export function parseDateValue(value?: string | null): Date | undefined {
  const match = value?.match(DAY);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface DatePickerProps {
  /** Civil day, YYYY-MM-DD, or an empty string. Same contract as a native date input. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

/**
 * The app's standard date field: French calendar, Monday first, compact popover
 * anchored under its field. Replaces native date inputs, whose WebKit picker
 * follows the system language instead of the app's.
 */
export function DatePicker({
  value, onChange, id, name, min, max, required, disabled, clearable,
  placeholder = "Choisir une date", "aria-label": ariaLabel, className, align = "start",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  const from = parseDateValue(min);
  const to = parseDateValue(max);
  const disabledDays = [
    ...(from ? [{ before: from }] : []),
    ...(to ? [{ after: to }] : []),
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        id={id}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-full min-w-0 justify-start gap-2 px-3 font-normal", !selected && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate tabular-nums">
          {selected ? selected.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : placeholder}
        </span>
      </PopoverTrigger>
      {name && <input name={name} type="hidden" value={value} />}
      {required && (
        // Keeps native form validation for required fields without exposing a second control.
        <input
          aria-hidden="true"
          className="pointer-events-none absolute size-px opacity-0"
          onChange={() => undefined}
          required
          tabIndex={-1}
          value={value}
        />
      )}
      <PopoverContent align={align} className="w-auto p-2">
        <Calendar
          className={COMPACT_CALENDAR_CLASS}
          defaultMonth={selected ?? from ?? to}
          disabled={disabledDays.length ? disabledDays : undefined}
          mode="single"
          onSelect={(date) => {
            if (!date) return;
            onChange(formatDateValue(date));
            setOpen(false);
          }}
          selected={selected}
        />
        {clearable && value && (
          <Button
            className="w-full"
            onClick={() => { onChange(""); setOpen(false); }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Effacer la date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
