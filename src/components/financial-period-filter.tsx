import { useState } from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { CalendarDays, ChevronDown } from "@/lib/icons";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type FinancialPeriod = "day" | "week" | "month" | "year";
export function financialPeriodRange(period: FinancialPeriod, anchor: Date) {
  const starts = {
    day: startOfDay,
    week: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
    month: startOfMonth,
    year: startOfYear,
  };
  const ends = {
    day: endOfDay,
    week: (d: Date) => endOfWeek(d, { weekStartsOn: 1 }),
    month: endOfMonth,
    year: endOfYear,
  };
  return {
    from: format(starts[period](anchor), "yyyy-MM-dd"),
    to: format(ends[period](anchor), "yyyy-MM-dd"),
  };
}
export function FinancialPeriodFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const parse = (value: string) =>
    value ? new Date(`${value}T12:00:00`) : undefined;
  const display = (value: string) =>
    format(parse(value)!, "d MMM yyyy", { locale: fr });
  const label =
    from && to
      ? from === to
        ? display(from)
        : `${display(from)} – ${display(to)}`
      : from
        ? `Depuis le ${display(from)}`
        : to
          ? `Jusqu’au ${display(to)}`
          : "Toutes les dates";
  const apply = (start: string, end: string) => {
    onChange(start, end);
    setOpen(false);
  };
  return (
    <div className="flex items-center">
      <Popover
        onOpenChange={(next) => {
          if (next) {
            setDraft({ from: parse(from), to: parse(to) });
          }
          setOpen(next);
        }}
        open={open}
      >
        <PopoverTrigger
          render={
            <Button
              aria-label={`Choisir la période : ${label}`}
              className="h-[30px] list-filter-control gap-1.5 rounded-full bg-background px-2.5 font-medium text-xs"
              variant="outline"
            >
              <CalendarDays className="size-3.5 text-muted-foreground" />
              <span>{label}</span>
              <ChevronDown className="ml-1 size-3 text-muted-foreground" />
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-2xl p-0"
          sideOffset={8}
        >
          <div className="border-b px-4 py-3">
            <p className="font-semibold">Période</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Choisissez un raccourci ou deux dates.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:border-r sm:border-b-0">
              {(
                [
                  ["day", "Aujourd’hui"],
                  ["week", "Cette semaine"],
                  ["month", "Ce mois"],
                  ["year", "Cette année"],
                ] as const
              ).map(([key, text]) => (
                <Button
                  className="justify-start rounded-lg text-xs"
                  key={key}
                  onClick={() => {
                    const r = financialPeriodRange(key, new Date());
                    apply(r.from, r.to);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {text}
                </Button>
              ))}
              <Button
                className="justify-start rounded-lg text-muted-foreground text-xs"
                onClick={() => apply("", "")}
                size="sm"
                variant="ghost"
              >
                Toutes les dates
              </Button>
            </div>
            <Calendar
              className="p-3 [--cell-size:--spacing(8)]"
              defaultMonth={parse(from) ?? new Date()}
              locale={fr}
              mode="range"
              onSelect={setDraft}
              selected={draft}
              weekStartsOn={1}
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-3 py-3">
            <span className="text-muted-foreground text-xs">
              {draft?.from
                ? `${format(draft.from, "dd/MM/yyyy")}${draft.to ? ` – ${format(draft.to, "dd/MM/yyyy")}` : " · Date de fin à choisir"}`
                : "Aucune date sélectionnée"}
            </span>
            <Button
              className="rounded-lg"
              disabled={!draft?.from}
              onClick={() =>
                draft?.from &&
                apply(
                  format(draft.from, "yyyy-MM-dd"),
                  format(draft.to ?? draft.from, "yyyy-MM-dd")
                )
              }
              size="sm"
            >
              Appliquer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
