import { parseDashboardDate } from "./model";
import { useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addMonths,
} from "date-fns";
import { ChevronDown } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type KpiPeriod = "day" | "week" | "month" | "year" | "all";
export const KPI_PERIOD_LABELS: Record<KpiPeriod, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  all: "Tout",
};
export function kpiRange(period: KpiPeriod, date: Date) {
  const starts = {
    day: startOfDay,
    week: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
    month: startOfMonth,
    year: startOfYear,
    all: startOfYear,
  };
  const ends = {
    day: endOfDay,
    week: (d: Date) => endOfWeek(d, { weekStartsOn: 1 }),
    month: endOfMonth,
    year: endOfYear,
    all: endOfYear,
  };
  return period === "all"
    ? { from: "", to: "" }
    : {
        from: format(starts[period](date), "yyyy-MM-dd"),
        to: format(ends[period](date), "yyyy-MM-dd"),
      };
}
export function kpiWithin(value: string, range: { from: string; to: string }) {
  const parsed = parseDashboardDate(value);
  const date = parsed ? format(parsed, "yyyy-MM-dd") : "";
  return (
    Boolean(date) &&
    (!range.from || date >= range.from) &&
    (!range.to || date <= range.to)
  );
}
export function kpiBuckets(period: KpiPeriod, date: Date) {
  // Today's value is complemented by seven days of context; other periods use their calendar span.
  const range = kpiRange(period, date);
  const start =
    period === "day"
      ? addDays(startOfDay(date), -6)
      : period === "all"
        ? startOfYear(date)
        : new Date(`${range.from}T12:00:00`);
  const count =
    period === "year" || period === "all"
      ? 12
      : period === "month"
        ? Math.ceil(endOfMonth(date).getDate() / 7)
        : 7;
  return Array.from({ length: count }, (_, i) => {
    const from =
      period === "year" || period === "all"
        ? addMonths(start, i)
        : addDays(start, i * (period === "month" ? 7 : 1));
    const to =
      period === "year" || period === "all"
        ? endOfMonth(from)
        : period === "month"
          ? new Date(
              Math.min(
                endOfDay(addDays(from, 6)).getTime(),
                endOfMonth(date).getTime()
              )
            )
          : endOfDay(from);
    return {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      label: from.toLocaleDateString(
        "fr-FR",
        period === "year" || period === "all"
          ? { month: "short" }
          : { day: "numeric", month: "short" }
      ),
    };
  });
}
export function KpiPeriodFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: KpiPeriod;
  onChange: (value: KpiPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground"
            aria-label={`Période ${label} : ${KPI_PERIOD_LABELS[value]}`}
          >
            {KPI_PERIOD_LABELS[value]}
            <ChevronDown className="size-3" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            onChange(next as KpiPeriod);
            setOpen(false);
          }}
        >
          {Object.entries(KPI_PERIOD_LABELS).map(([key, text]) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {text === "Tout" ? "Toutes les dates" : text}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
